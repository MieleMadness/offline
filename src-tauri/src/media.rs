//! Bounded on-demand image reads directly from the selected Facebook ZIP.
//! No extraction, temp files, source HTML execution or network requests.
use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::Serialize;
use std::{fs::File, io::{Read, Seek}, path::Path};
use zip::ZipArchive;

const MAX_ZIP_ENTRIES: usize = 250_000;
const MAX_IMAGE_BYTES: u64 = 4 * 1024 * 1024;

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

fn read_image<R: Read + Seek>(mut zip: ZipArchive<R>, path: &str) -> Result<ArchiveImage, String> {
    if zip.len() > MAX_ZIP_ENTRIES { return Err("The ZIP exceeds the supported directory limit.".into()); }
    if !safe_zip_member(path) { return Err("Invalid image reference in archive.".into()); }
    let mut found = None;
    for index in 0..zip.len() {
        let member = zip.by_index(index).map_err(|_| "Could not inspect archive media.".to_string())?;
        if member.name() == path {
            if found.is_some() { return Err("Duplicate image filenames are ambiguous.".into()); }
            if member.is_dir() || member.enclosed_name().is_none() {
                return Err("Unsafe image reference in archive.".into());
            }
            if member.size() > MAX_IMAGE_BYTES {
                return Err("This image is above the 4 MiB preview safety limit.".into());
            }
            found = Some(index);
        }
    }
    let index = found.ok_or("The original ZIP does not contain this image.")?;
    let mut entry = zip.by_index(index).map_err(|_| "The image could not be opened.".to_string())?;
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
pub fn read_archive_image(path: String, member: String) -> Result<ArchiveImage, String> {
    let source = Path::new(&path);
    if !source.is_file() || !source.extension().and_then(|x| x.to_str())
        .is_some_and(|x| x.eq_ignore_ascii_case("zip"))
    {
        return Err("Connect the original ZIP archive to view photos.".into());
    }
    let input = File::open(source).map_err(|_| "The original ZIP could not be opened.".to_string())?;
    let zip = ZipArchive::new(input).map_err(|_| "The original ZIP is damaged or unsupported.".to_string())?;
    read_image(zip, &member)
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
    fn reads_supported_image_without_extraction() {
        let image = read_image(fixture(&[("photos/a.png", PNG)]), "photos/a.png").unwrap();
        assert_eq!(image.mime, "image/png");
        assert_eq!(STANDARD.decode(image.data).unwrap(), PNG);
    }

    #[test]
    fn rejects_unsafe_references_and_non_image_bytes() {
        for unsafe_path in ["../photos/a.png", "photos/../../x.png", "/photos/a.png",
            "C:/photos/a.png", "photos\\a.png", "photos/./a.png", "https://host/a.png"] {
            assert!(read_image(fixture(&[("photos/a.png", PNG)]), unsafe_path).is_err());
        }
        assert!(read_image(fixture(&[("photos/a.png", b"<script>")]), "photos/a.png").is_err());
        assert!(read_image(fixture(&[("photos/a.svg", b"<svg/>")]), "photos/a.svg").is_err());
    }

    #[test]
    fn rejects_missing_duplicate_and_oversized_members() {
        assert!(read_image(fixture(&[("photos/a.png", PNG)]), "photos/missing.png").is_err());
        // ZipWriter intentionally rejects duplicate names; construct a duplicate
        // via a synthetic ZIP directory patch to exercise the reader guard.
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        for name in ["photos/a.png", "photos/b.png"] {
            writer.start_file(name, SimpleFileOptions::default()
                .compression_method(CompressionMethod::Stored)).unwrap();
            writer.write_all(PNG).unwrap();
        }
        let mut bytes = writer.finish().unwrap().into_inner();
        let target = b"photos/b.png";
        let replacement = b"photos/a.png";
        let mut replaced = 0;
        for i in 0..bytes.len().saturating_sub(target.len() - 1) {
            if &bytes[i..i + target.len()] == target {
                bytes[i..i + target.len()].copy_from_slice(replacement);
                replaced += 1;
            }
        }
        assert_eq!(replaced, 2, "expected one local and one central directory filename");
        if let Ok(duplicate_zip) = ZipArchive::new(Cursor::new(bytes)) {
            assert!(read_image(duplicate_zip, "photos/a.png").is_err());
        } // A ZIP parser rejecting the duplicate directory also satisfies this contract.
        let huge = vec![0u8; MAX_IMAGE_BYTES as usize + 1];
        assert!(read_image(fixture(&[("photos/huge.png", &huge)]), "photos/huge.png").is_err());
    }
}
