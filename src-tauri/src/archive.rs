//! Read-only ZIP inventory. Never extracts, decompresses, renders, or writes archive members.
//! The importer is deliberately conservative until format-aware parsing is implemented.

use serde::Serialize;
use std::{
    fs::File,
    io::{Read, Seek},
    path::Path,
};
use zip::ZipArchive;

const MAX_ZIP_ENTRIES: usize = 250_000;
const MAX_NAME_BYTES: usize = 4_096;
const MAX_RETURNED_FILES: usize = 5_000;
const CATEGORIES: [(&str, &str); 9] = [
    ("photos", "Photos"),
    ("videos", "Videos"),
    ("messages", "Messages"),
    ("posts", "Posts"),
    ("comments", "Comments"),
    ("reactions", "Reactions"),
    ("friends", "Friends"),
    ("profile", "Profile"),
    ("other", "Other files"),
];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SectionSummary {
    id: &'static str,
    label: &'static str,
    count: usize,
    bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ArchiveEntry {
    path: String,
    section: &'static str,
    bytes: u64,
    kind: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveReport {
    archive_name: String,
    format_hint: &'static str,
    total_files: usize,
    total_uncompressed_bytes: u64,
    displayed_files: usize,
    entries: Vec<ArchiveEntry>,
    sections: Vec<SectionSummary>,
}

/// Called through local Tauri IPC after a native file picker selection.
/// No path or archive contents are transmitted to any web service.
#[tauri::command]
pub fn inspect_archive(path: String) -> Result<ArchiveReport, String> {
    let source = Path::new(&path);
    if !source.is_file() {
        return Err("Choose an existing ZIP file on your computer.".into());
    }
    if !source
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("zip"))
    {
        return Err("Offline currently supports .zip archives only.".into());
    }
    let input = File::open(source)
        .map_err(|_| "The archive could not be opened. Check file permissions and try again.")?;
    let zip = ZipArchive::new(input)
        .map_err(|_| "This ZIP cannot be read. It may be damaged or use an unsupported format.")?;
    let name = source
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Archive.zip")
        .to_owned();
    scan_zip(zip, name)
}

fn safe_entry_name(name: &str) -> Option<String> {
    if name.is_empty() || name.len() > MAX_NAME_BYTES || name.contains('\0') {
        return None;
    }
    let clean = name.replace('\\', "/");
    if clean.starts_with('/')
        || clean.split('/').any(|part| {
            part == ".." || part.contains(':') || part.chars().any(char::is_control)
        })
    {
        return None;
    }
    Some(clean)
}

fn classify(path: &str) -> &'static str {
    let lower = path.to_ascii_lowercase();
    let basename = lower.rsplit('/').next().unwrap_or("");
    let extension = basename.rsplit('.').next().unwrap_or("");

    if ["jpg", "jpeg", "png", "gif", "heic", "heif", "webp", "bmp", "tif", "tiff", "avif"]
        .contains(&extension)
    {
        return "photos";
    }
    if ["mp4", "mov", "m4v", "avi", "mkv", "webm", "3gp"].contains(&extension) {
        return "videos";
    }
    if lower.contains("message") || lower.contains("inbox/") || lower.contains("chat") {
        return "messages";
    }
    if lower.contains("comment") {
        return "comments";
    }
    if lower.contains("reaction") || lower.contains("like") {
        return "reactions";
    }
    if lower.contains("friend") || lower.contains("follower") {
        return "friends";
    }
    if lower.contains("posts/") || lower.contains("/posts") || lower.contains("timeline") {
        return "posts";
    }
    if lower.contains("profile") || lower.contains("personal_information") {
        return "profile";
    }
    "other"
}

fn scan_zip<R: Read + Seek>(
    mut archive: ZipArchive<R>,
    archive_name: String,
) -> Result<ArchiveReport, String> {
    if archive.len() > MAX_ZIP_ENTRIES {
        return Err(format!(
            "This ZIP contains more than {MAX_ZIP_ENTRIES} entries. Large-archive support is planned for a later release."
        ));
    }

    let mut sections: Vec<SectionSummary> = CATEGORIES
        .iter()
        .map(|&(id, label)| SectionSummary {
            id,
            label,
            count: 0,
            bytes: 0,
        })
        .collect();
    let mut entries = Vec::new();
    let mut total_files = 0_usize;
    let mut total_uncompressed_bytes = 0_u64;
    let mut looks_like_facebook = false;

    for index in 0..archive.len() {
        // by_index reads the ZIP directory metadata. No uncompression is performed.
        let entry = archive
            .by_index(index)
            .map_err(|_| "The ZIP contains unreadable file metadata.")?;
        if entry.is_dir() {
            continue;
        }
        let name = safe_entry_name(entry.name())
            .ok_or("The archive has an unsafe or unsupported file path.")?;
        if entry.enclosed_name().is_none() {
            return Err("The archive contains a path that could escape its folder.".into());
        }

        let lower = name.to_ascii_lowercase();
        if lower.contains("your_facebook_activity/")
            || lower.starts_with("facebook/")
            || lower.contains("facebook_information/")
            || lower.starts_with("messages/inbox/")
        {
            looks_like_facebook = true;
        }
        let section = classify(&name);
        let bytes = entry.size();
        total_files += 1;
        total_uncompressed_bytes = total_uncompressed_bytes.saturating_add(bytes);
        if let Some(stat) = sections.iter_mut().find(|s| s.id == section) {
            stat.count += 1;
            stat.bytes = stat.bytes.saturating_add(bytes);
        }
        if entries.len() < MAX_RETURNED_FILES {
            let extension = lower
                .rsplit('/')
                .next()
                .and_then(|file| file.rsplit_once('.'))
                .map(|(_, ext)| ext)
                .unwrap_or("file")
                .chars()
                .take(12)
                .collect();
            entries.push(ArchiveEntry {
                path: name,
                section,
                bytes,
                kind: extension,
            });
        }
    }

    let displayed_files = entries.len();
    Ok(ArchiveReport {
        archive_name,
        format_hint: if looks_like_facebook {
            "Facebook-style export"
        } else {
            "ZIP archive"
        },
        total_files,
        total_uncompressed_bytes,
        displayed_files,
        entries,
        sections,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Write};
    use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

    fn fixture(files: &[(&str, &[u8])]) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut output = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, bytes) in files {
            output
                .start_file(*name, SimpleFileOptions::default().compression_method(CompressionMethod::Stored))
                .expect("create zip member");
            output.write_all(bytes).expect("write zip member");
        }
        let buffer = output.finish().expect("finish zip").into_inner();
        ZipArchive::new(Cursor::new(buffer)).expect("open synthetic zip")
    }

    #[test]
    fn recognizes_categories() {
        assert_eq!(classify("your_facebook_activity/posts/your_posts_1.json"), "posts");
        assert_eq!(classify("messages/inbox/A/message_1.json"), "messages");
        assert_eq!(classify("photos/portrait.heic"), "photos");
        assert_eq!(classify("photos/movie.mov"), "videos");
        assert_eq!(classify("connections/friends/your_friends.json"), "friends");
        assert_eq!(classify("account/profile_information.json"), "profile");
    }

    #[test]
    fn rejects_unsafe_paths_before_reading_contents() {
        for bad in ["../secrets.json", "/etc/password", "C:\\Windows\\file", "foo/../../x", "foo\0bar"] {
            assert!(safe_entry_name(bad).is_none(), "accepted {bad:?}");
        }
        assert!(safe_entry_name("messages/inbox/x.json").is_some());
    }

    #[test]
    fn inspects_synthetic_archives_without_extracting_members() {
        let zip = fixture(&[
            ("your_facebook_activity/posts/your_posts_1.json", b"{}"),
            ("messages/inbox/person/message_1.json", b"[]"),
            ("photos/childhood.jpg", b"fake-image"),
        ]);
        let report = scan_zip(zip, "test.zip".into()).expect("inspect zip");
        assert_eq!(report.total_files, 3);
        assert_eq!(report.total_uncompressed_bytes, 14);
        assert_eq!(report.displayed_files, 3);
        assert_eq!(report.format_hint, "Facebook-style export");
        assert_eq!(report.sections.iter().find(|s| s.id == "photos").unwrap().count, 1);
        assert!(report.entries.iter().any(|entry| entry.section == "messages"));
    }

    #[test]
    fn reports_unknown_file_types_in_other_files() {
        let report = scan_zip(fixture(&[("misc/metadata.xml", b"abc")]), "unknown.zip".into())
            .expect("inspect zip");
        assert_eq!(report.format_hint, "ZIP archive");
        assert_eq!(report.entries[0].section, "other");
    }
}
