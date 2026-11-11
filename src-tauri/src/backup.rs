//! Portable encrypted preview backup. Never writes decrypted social records or an original ZIP.
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const MAX_BACKUP_BYTES: u64 = 128 * 1024 * 1024;

fn checked_path(path: &Path) -> Result<(), String> {
    if !path.is_absolute()
        || !path.extension().and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("offlinevault"))
        || !path.parent().is_some_and(Path::is_dir)
    {
        return Err("Select a local .offlinevault file in an existing folder.".into());
    }
    Ok(())
}

fn read_backup(path: &Path) -> Result<String, String> {
    checked_path(path)?;
    let input = File::open(path).map_err(|_| "The backup file could not be opened.".to_string())?;
    if input.metadata().map_err(|_| "Cannot inspect this backup.".to_string())?.len() > MAX_BACKUP_BYTES {
        return Err("This backup exceeds the 128 MiB safety limit.".into());
    }
    let mut contents = Vec::new();
    input.take(MAX_BACKUP_BYTES + 1).read_to_end(&mut contents)
        .map_err(|_| "The backup file could not be read.".to_string())?;
    if contents.len() as u64 > MAX_BACKUP_BYTES {
        return Err("This backup exceeds the 128 MiB safety limit.".into());
    }
    String::from_utf8(contents).map_err(|_| "The backup must be valid UTF-8.".to_string())
}

fn unique_temporary_path(destination: &Path, attempt: u32) -> Result<PathBuf, String> {
    let elapsed = SystemTime::now().duration_since(UNIX_EPOCH)
        .map_err(|_| "The computer clock is unavailable.".to_string())?.as_nanos();
    let basename = destination.file_name().and_then(|s| s.to_str()).unwrap_or("backup");
    Ok(destination.with_file_name(format!(".{basename}.{}.{}.{}.tmp", std::process::id(), elapsed, attempt)))
}

fn write_backup(path: &Path, contents: &str) -> Result<(), String> {
    checked_path(path)?;
    if contents.is_empty() || contents.len() as u64 > MAX_BACKUP_BYTES {
        return Err("Encrypted backup data is empty or exceeds 128 MiB.".into());
    }
    if path.exists() {
        return Err("A backup already exists at this location. Choose a new filename.".into());
    }
    // Write to a private temporary file, then finalize with an atomic no-clobber hard link.
    let mut created = None;
    for attempt in 0..5 {
        let temporary = unique_temporary_path(path, attempt)?;
        match OpenOptions::new().write(true).create_new(true).open(&temporary) {
            Ok(file) => { created = Some((temporary, file)); break; }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(_) => return Err("Cannot create a backup in the selected folder.".into()),
        }
    }
    let (temporary, mut file) = created.ok_or("Could not reserve a temporary backup filename.")?;
    let result = (|| -> Result<(), String> {
        file.write_all(contents.as_bytes()).map_err(|_| "The backup write failed. Check disk space.".to_string())?;
        file.sync_all().map_err(|_| "The backup could not be flushed to disk.".to_string())?;
        drop(file);
        fs::hard_link(&temporary, path)
            .map_err(|_| "Could not safely finalize backup. Check filesystem support or choose a new filename.".to_string())?;
        Ok(())
    })();
    let _ = fs::remove_file(&temporary);
    result
}

#[tauri::command]
pub fn read_encrypted_backup_file(path: String) -> Result<String, String> {
    read_backup(Path::new(&path))
}

#[tauri::command]
pub fn save_encrypted_backup_file(path: String, content: String) -> Result<(), String> {
    write_backup(Path::new(&path), &content)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_file(suffix: &str) -> PathBuf {
        let unique = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        std::env::temp_dir().join(format!("offline-synthetic-{unique}-{suffix}.offlinevault"))
    }

    #[test]
    fn roundtrip_cannot_overwrite_existing_backup() {
        let file = test_file("roundtrip");
        write_backup(&file, r#"{"format":"offline.encrypted-backup","synthetic":true}"#).unwrap();
        assert_eq!(read_backup(&file).unwrap(), r#"{"format":"offline.encrypted-backup","synthetic":true}"#);
        assert!(write_backup(&file, "second").is_err());
        assert!(read_backup(&file).unwrap().contains("synthetic"));
        fs::remove_file(file).unwrap();
    }

    #[test]
    fn rejects_invalid_utf8_in_a_selected_backup_file() {
        let file = test_file("invalid-utf8");
        fs::write(&file, [0xff_u8, 0xfe_u8, 0xfd_u8]).unwrap();
        assert!(read_backup(&file).unwrap_err().contains("UTF-8"));
        fs::remove_file(file).unwrap();
    }

    #[test]
    fn rejects_wrong_extensions_missing_files_and_oversized_input() {
        let file = test_file("missing");
        assert!(read_backup(&file).is_err());
        assert!(write_backup(&file.with_extension("txt"), "test").is_err());
        assert!(write_backup(&file, "").is_err());
        // A sparse temporary file tests the limit without allocating 128 MiB.
        let large = test_file("large");
        let f = File::create(&large).unwrap();
        f.set_len(MAX_BACKUP_BYTES + 1).unwrap();
        assert!(read_backup(&large).is_err());
        fs::remove_file(large).unwrap();
    }
}
