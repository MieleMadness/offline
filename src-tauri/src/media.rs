//! Bounded on-demand image reads directly from the selected Facebook ZIP.
//! No extraction, temp files, source HTML execution or network requests.
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::{collections::HashSet, fs::File, io::{Read, Seek}, path::Path};
use zip::ZipArchive;

const MAX_ZIP_ENTRIES: usize = 250_000;
const MAX_IMAGE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_PAGE_ITEMS: usize = 100;
const MAX_PHOTO_QUERY_BYTES: usize = 256;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PhotoMember {
    path: String,
    section: &'static str,
    bytes: u64,
    kind: String,
    zip_index: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PhotoPage {
    total: usize,
    offset: usize,
    entries: Vec<PhotoMember>,
}

/// Only list formats the bounded reader can display. Others remain in ZIP.
fn preview_extension(name: &str) -> Option<&'static str> {
    let extension = name.rsplit('.').next()?.to_ascii_lowercase();
    match extension.as_str() {
        "jpg" | "jpeg" => Some("jpg"),
        "png" => Some("png"),
        "gif" => Some("gif"),
        "webp" => Some("webp"),
        _ => None,
    }
}

fn list_photo_members<R: Read + Seek>(
    mut zip: ZipArchive<R>, offset: usize, limit: usize, query: &str
) -> Result<PhotoPage, String> {
    if zip.len() > MAX_ZIP_ENTRIES {
        return Err("The ZIP exceeds the supported directory limit.".into());
    }
    if limit == 0 || limit > MAX_PAGE_ITEMS || offset > MAX_ZIP_ENTRIES {
        return Err("Invalid photograph page bounds.".into());
    }
    if query.len() > MAX_PHOTO_QUERY_BYTES || query.chars().any(char::is_control) {
        return Err("The photo search text is too long or invalid.".into());
    }

    let needle = query.trim().to_lowercase();
    let mut seen = HashSet::new();
    let mut entries = Vec::with_capacity(limit);
    let mut total = 0_usize;
    for index in 0..zip.len() {
        // Directory metadata only: no images are decompressed by this command.
        let item = zip.by_index(index)
            .map_err(|_| "The ZIP contains unreadable media metadata.".to_string())?;
        if item.is_dir() { continue; }
        let Some(kind) = preview_extension(item.name()) else { continue; };
        if !safe_zip_member(item.name()) || item.enclosed_name().is_none() {
            return Err("The archive contains an unsafe photo reference.".into());
        }
        if !seen.insert(item.name().to_owned()) {
            return Err("The archive has ambiguous duplicate photo names.".into());
        }
        if item.size() > MAX_IMAGE_BYTES || !item.name().to_lowercase().contains(&needle) {
            continue;
        }
        if total >= offset && entries.len() < limit {
            entries.push(PhotoMember {
                path: item.name().to_owned(),
                section: "photos",
                bytes: item.size(),
                kind: kind.to_owned(),
                zip_index: index,
            });
        }
        total += 1;
    }
    Ok(PhotoPage { total, offset, entries })
}

fn open_original_zip(path: &str) -> Result<ZipArchive<File>, String> {
    let source = Path::new(path);
    if !source.is_file() || !source.extension().and_then(|x| x.to_str())
        .is_some_and(|x| x.eq_ignore_ascii_case("zip"))
    {
        return Err("Connect the original ZIP archive to view photos.".into());
    }
    let input = File::open(source)
        .map_err(|_| "The original ZIP could not be opened.".to_string())?;
    ZipArchive::new(input)
        .map_err(|_| "The original ZIP is damaged or unsupported.".to_string())
}

#[tauri::command]
pub fn list_archive_photos(
    path: String, offset: usize, limit: usize, query: String
) -> Result<PhotoPage, String> {
    list_photo_members(open_original_zip(&path)?, offset, limit, &query)
}


#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveImage {
    mime: &'static str,
    data: String,
}

fn supported_mime(path: &str, bytes: &[u8]) -> Option<&'static str> {
    let ext = path.rsplit('.').next()?.to_ascii_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" if bytes.starts_with(&[0xff, 0xd8, 0xff]) => Some("image/jpeg"),
        "png" if bytes.starts_with(&[0x89, b'P', b'N', b'G', 13, 10, 26, 10]) => Some("image/png"),
        "gif" if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") => Some("image/gif"),
        "webp" if bytes.len() >= 12 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" => Some("image/webp"),
        _ => None,
    }
}

fn safe_zip_member(name: &str) -> bool {
    !name.is_empty() && name.len() <= 4096 && !name.chars().any(char::is_control)
        && !name.contains('\\') && !name.starts_with('/')
        && !name.split('/').any(|s| s.is_empty() || s == "." || s == ".." || s.contains(':'))
}

fn read_image<R: Read + Seek>(mut zip: ZipArchive<R>, path: &str, preferred_index: Option<usize>) -> Result<ArchiveImage, String> {
    if zip.len() > MAX_ZIP_ENTRIES { return Err("The ZIP exceeds the supported directory limit.".into()); }
    if !safe_zip_member(path) { return Err("Invalid image reference in archive.".into()); }
    let index = if let Some(index) = preferred_index {
        // A native photo-listing result can pass an exact ZIP directory index.
        // Verify the filename before reading; arbitrary indices cannot access
        // another file or bypass the preview MIME and size restrictions.
        if index >= zip.len() {
            return Err("The photo index is no longer valid for this ZIP.".into());
        }
        let item = zip.by_index(index)
            .map_err(|_| "The image entry cannot be inspected.".to_string())?;
        if item.name() != path {
            return Err("This image index does not match the chosen photo.".into());
        }
        if item.is_dir() || item.enclosed_name().is_none() {
            return Err("Unsafe image reference in archive.".into());
        }
        index
    } else {
        // Inline post/message references do not carry a ZIP directory index.
        // Preserve the conservative full-directory ambiguity check for them.
        let mut found = None;
        for candidate in 0..zip.len() {
            let member = zip.by_index(candidate)
                .map_err(|_| "Could not inspect archive media.".to_string())?;
            if member.name() == path {
                if found.is_some() {
                    return Err("Duplicate image filenames are ambiguous.".into());
                }
                if member.is_dir() || member.enclosed_name().is_none() {
                    return Err("Unsafe image reference in archive.".into());
                }
                if member.size() > MAX_IMAGE_BYTES {
                    return Err("This image is above the 4 MiB preview safety limit.".into());
                }
                found = Some(candidate);
            }
        }
        found.ok_or("The original ZIP does not contain this image.")?
    };
    let mut entry = zip.by_index(index).map_err(|_| "The image could not be opened.".to_string())?;
    if entry.size() > MAX_IMAGE_BYTES {
        return Err("This image is above the 4 MiB preview safety limit.".into());
    }
    let mut bytes = Vec::with_capacity(entry.size() as usize);
    entry.by_ref().take(MAX_IMAGE_BYTES + 1).read_to_end(&mut bytes)
        .map_err(|_| "The archived image could not be read.".to_string())?;
    if bytes.len() as u64 > MAX_IMAGE_BYTES {
        return Err("This image exceeds the 4 MiB preview safety limit.".into());
    }
    let mime = supported_mime(path, &bytes).ok_or(
        "This file is not a supported JPEG, PNG, GIF or WebP image."
    )?;
    Ok(ArchiveImage { mime, data: STANDARD.encode(&bytes) })
}

#[tauri::command]
pub fn read_archive_image(
    path: String, member: String, index: Option<usize>
) -> Result<ArchiveImage, String> {
    read_image(open_original_zip(&path)?, &member, index)
}

/// A separate, strictly bounded decode gate for local embedding inference.
/// Reject animated, oversized or malformed images before calling MediaPipe.
/// Original source ZIP is read-only and never extracted.
fn read_ai_image<R: Read + Seek>(
    zip: ZipArchive<R>, path: &str, index: Option<usize>,
) -> Result<ArchiveImage, String> {
    let image = read_image(zip, path, index)?;
    if !matches!(image.mime, "image/jpeg" | "image/png") {
        return Err("AI similarity supports JPEG and PNG images only.".into());
    }
    let bytes = STANDARD.decode(&image.data)
        .map_err(|_| "Could not decode the selected image bytes.")?;
    let dimensions = imagesize::blob_size(&bytes)
        .map_err(|_| "This image header is damaged or unsupported.")?;
    if dimensions.width == 0 || dimensions.height == 0
        || dimensions.width.saturating_mul(dimensions.height) > 25_000_000
    {
        return Err("This image is above the AI 25-megapixel safety limit.".into());
    }
    Ok(image)
}

#[tauri::command]
pub fn read_archive_ai_image(
    path: String, member: String, index: Option<usize>
) -> Result<ArchiveImage, String> {
    read_ai_image(open_original_zip(&path)?, &member, index)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Cursor, Write};
    use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

    fn fixture(files: &[(&str, &[u8])]) -> ZipArchive<Cursor<Vec<u8>>> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for &(name, contents) in files {
            writer.start_file(name, SimpleFileOptions::default()
                .compression_method(CompressionMethod::Stored)).unwrap();
            writer.write_all(contents).unwrap();
        }
        let bytes = writer.finish().unwrap().into_inner();
        ZipArchive::new(Cursor::new(bytes)).unwrap()
    }

    const PNG: &[u8] = &[0x89, b'P', b'N', b'G', 13, 10, 26, 10, 0, 0, 0, 0];

    #[test]
    fn ai_image_gate_rejects_animated_wrong_index_and_oversized_pixels() {
        // Completely synthetic 2x2 PNG with no family content.
        let png = STANDARD.decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==").unwrap();
        let gif = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff";
        let small = fixture(&[("photos/synthetic.png", &png), ("photos/animated.gif", gif)]);
        assert_eq!(read_ai_image(small, "photos/synthetic.png", Some(0)).unwrap().mime, "image/png");

        let only_gif = fixture(&[("photos/animated.gif", gif)]);
        assert!(read_ai_image(only_gif, "photos/animated.gif", Some(0)).unwrap_err().contains("JPEG and PNG"));

        let different = fixture(&[("photos/synthetic.png", &png)]);
        assert!(read_ai_image(different, "photos/wrong.png", Some(0)).is_err());

        // Valid PNG signature and dimensions header, but exceeds 25 MP.
        let mut enormous = png.clone();
        enormous[16..20].copy_from_slice(&100_000_u32.to_be_bytes());
        enormous[20..24].copy_from_slice(&100_000_u32.to_be_bytes());
        let oversize_zip = fixture(&[("photos/too-large.png", &enormous)]);
        assert!(read_ai_image(oversize_zip, "photos/too-large.png", Some(0))
            .unwrap_err().contains("25-megapixel"));
    }

    #[test]
    fn generated_large_zip_lists_real_photo_bytes_after_five_thousand_members() {
        // The Windows [rust] acceptance workflow generates this entirely
        // fictional ZIP. Ordinary local cargo test remains self-contained
        // when OFFLINE_ACCEPTANCE_FIXTURES is not configured.
        let Some(root) = std::env::var_os("OFFLINE_ACCEPTANCE_FIXTURES") else { return; };
        let path = std::path::PathBuf::from(root).join("large-5125-photos.zip");
        let open = || {
            let file = std::fs::File::open(&path).unwrap_or_else(|error| {
                panic!("Required fictional fixture {} could not open: {error}", path.display())
            });
            ZipArchive::new(file).expect("generated ZIP should be valid")
        };

        // The first ZIP member is index.html; member 5,101 is photo #5,100.
        // This asserts the native service, not a mocked list or in-memory ZIP.
        let page = list_photo_members(open(), 5_100, 24, "synthetic")
            .expect("list images past the old 5,000-path inventory cutoff");
        assert_eq!(page.total, 5_125);
        assert_eq!(page.offset, 5_100);
        assert_eq!(page.entries.len(), 24);
        assert_eq!(page.entries[0].path, "photos/synthetic_005100.png");
        assert_eq!(page.entries[0].zip_index, 5_101);
        assert_eq!(page.entries[23].path, "photos/synthetic_005123.png");

        let image = read_image(open(), &page.entries[0].path, Some(page.entries[0].zip_index))
            .expect("decode local fictional PNG bytes using the indexed ZIP reader");
        assert_eq!(image.mime, "image/png");
        let bytes = STANDARD.decode(image.data).expect("valid base64 image");
        assert!(bytes.starts_with(&[0x89, b'P', b'N', b'G', 13, 10, 26, 10]));
        assert!(bytes.windows(4).any(|part| part == b"IDAT".as_slice()));

        let last_page = list_photo_members(open(), 5_124, 24, "").unwrap();
        assert_eq!(last_page.total, 5_125);
        assert_eq!(last_page.entries.len(), 1);
        assert_eq!(last_page.entries[0].path, "photos/synthetic_005124.png");

        // An index from this page cannot silently select a different image.
        assert!(read_image(open(), "photos/synthetic_005101.png",
            Some(page.entries[0].zip_index)).is_err());
    }

    #[test]
    fn lists_paginated_photos_across_an_inventory_larger_than_five_thousand() {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for index in 0..5_125 {
            let name = format!("photos/synthetic_{index:05}.png");
            writer.start_file(name, SimpleFileOptions::default()
                .compression_method(CompressionMethod::Stored)).unwrap();
            writer.write_all(PNG).unwrap();
        }
        writer.start_file("photos/not_an_image.svg", SimpleFileOptions::default()).unwrap();
        writer.write_all(b"<svg/>").unwrap();
        let bytes = writer.finish().unwrap().into_inner();

        let page = list_photo_members(
            ZipArchive::new(Cursor::new(bytes.clone())).unwrap(),
            5_100, 24, "synthetic"
        ).unwrap();
        assert_eq!(page.total, 5_125);
        assert_eq!(page.entries.len(), 24);
        assert_eq!(page.entries[0].path, "photos/synthetic_05100.png");
        assert_eq!(page.entries[23].path, "photos/synthetic_05123.png");
        assert_eq!(page.entries[0].zip_index, 5_100);
        let last = list_photo_members(
            ZipArchive::new(Cursor::new(bytes.clone())).unwrap(),
            5_124, 24, ""
        ).unwrap();
        assert_eq!(last.entries.len(), 1);
        assert_eq!(last.entries[0].path, "photos/synthetic_05124.png");

        // Exact-directory-index reads avoid another full scan per thumbnail.
        let image = read_image(
            ZipArchive::new(Cursor::new(bytes.clone())).unwrap(),
            &page.entries[0].path, Some(page.entries[0].zip_index)
        ).unwrap();
        assert_eq!(image.mime, "image/png");
        assert!(read_image(
            ZipArchive::new(Cursor::new(bytes)).unwrap(),
            "photos/synthetic_05101.png", Some(page.entries[0].zip_index)
        ).is_err());
    }

    #[test]
    fn rejects_invalid_photo_list_requests() {
        assert!(list_photo_members(fixture(&[("photos/a.png", PNG)]), 0, 0, "").is_err());
        assert!(list_photo_members(fixture(&[("photos/a.png", PNG)]), 0, 101, "").is_err());
        assert!(list_photo_members(fixture(&[("photos/a.png", PNG)]), 0, 24, &"a".repeat(257)).is_err());
        assert!(list_photo_members(fixture(&[("photos/a.png", PNG)]), 0, 24, "foo\nbar").is_err());
        assert!(read_image(fixture(&[("photos/a.png", PNG)]), "photos/a.png", Some(999)).is_err());
    }

    #[test]
    fn reads_supported_image_without_extraction() {
        let image = read_image(fixture(&[("photos/a.png", PNG)]), "photos/a.png", None).unwrap();
        assert_eq!(image.mime, "image/png");
        assert_eq!(STANDARD.decode(image.data).unwrap(), PNG);
    }

    #[test]
    fn rejects_unsafe_references_and_non_image_bytes() {
        for unsafe_path in ["../photos/a.png", "photos/../../x.png", "/photos/a.png",
            "C:/photos/a.png", "photos\\a.png", "photos/./a.png", "https://host/a.png"] {
            assert!(read_image(fixture(&[("photos/a.png", PNG)]), unsafe_path, None).is_err());
        }
        assert!(read_image(fixture(&[("photos/a.png", b"<script>")]), "photos/a.png", None).is_err());
        assert!(read_image(fixture(&[("photos/a.svg", b"<svg/>")]), "photos/a.svg", None).is_err());
    }

    #[test]
    fn rejects_missing_oversized_and_mislabeled_members() {
        assert!(read_image(fixture(&[("photos/a.png", PNG)]), "photos/missing.png", None).is_err());
        assert!(read_image(fixture(&[("photos/fake.jpg", PNG)]), "photos/fake.jpg", None).is_err());
        let huge = vec![0u8; MAX_IMAGE_BYTES as usize + 1];
        assert!(read_image(fixture(&[("photos/huge.png", &huge)]), "photos/huge.png", None).is_err());
    }
}
