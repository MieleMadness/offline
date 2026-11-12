//! Read-only preflight for prospective Offline Complete AI model packs.
//! Checks archive structure and streamed SHA-256; never extracts or executes assets.
//! SELF-DECLARED CHECKSUMS ARE NOT A TRUST SIGNATURE. No pack is activatable yet.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs::File, io::{Read, Seek}, path::Path};
use zip::ZipArchive;

const MAX_PACK_BYTES: u64 = 3 * 1024 * 1024 * 1024;
const MAX_ASSET_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const MAX_MANIFEST_BYTES: u64 = 64 * 1024;
const MAX_ENTRIES: usize = 20;
const MODEL_PATH: &str = "model/embeddinggemma-2-text-vision-440m.litertlm";
const LICENSE_PATH: &str = "legal/Apache-2.0.txt";
const NOTICES_PATH: &str = "legal/THIRD_PARTY_NOTICES.md";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Manifest {
    schema_version: u8,
    model_id: String,
    model_variant: String,
    runtime_family: String,
    assets: Vec<Asset>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Asset {
    path: String,
    bytes: u64,
    sha256: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackInspection {
    model_id: String,
    variant: String,
    asset_count: usize,
    verified_bytes: u64,
    checksums_match: bool,
    publisher_authenticated: bool,
    ready_to_activate: bool,
    message: &'static str,
}

fn clean_name(name: &str) -> bool {
    name.len() <= 180
        && !name.is_empty()
        && !name.starts_with('/')
        && !name.contains('\\')
        && name.split('/').all(|part| !part.is_empty() && part != "." && part != "..")
        && name.bytes().all(|b| b.is_ascii_alphanumeric()
            || matches!(b, b'.' | b'_' | b'-' | b'/'))
}

fn valid_asset(path: &str) -> bool {
    path == MODEL_PATH
        || path == LICENSE_PATH
        || path == NOTICES_PATH
        || (path.starts_with("runtime/")
            && path.len() > "runtime/".len()
            && (path.ends_with(".wasm") || path.ends_with(".js")
                || path.ends_with(".json") || path.ends_with(".data")))
}

fn validate_manifest(manifest: &Manifest) -> Result<(), String> {
    if manifest.schema_version != 1
        || manifest.model_id != "google/embeddinggemma-2"
        || manifest.model_variant != "text-vision-440m"
        || manifest.runtime_family != "mediapipe-universal-embedder-web"
        || manifest.assets.len() < 4
        || manifest.assets.len() >= MAX_ENTRIES
    {
        return Err("This is not a supported Offline EmbeddingGemma 2 pack manifest.".into());
    }
    let mut names = std::collections::HashSet::new();
    let mut total = 0u64;
    for asset in &manifest.assets {
        if !clean_name(&asset.path)
            || !valid_asset(&asset.path)
            || !names.insert(asset.path.to_ascii_lowercase())
            || asset.bytes == 0
            || asset.bytes > MAX_ASSET_BYTES
            || asset.sha256.len() != 64
            || !asset.sha256.bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err("The model-pack manifest contains an invalid, duplicate, or unsupported asset.".into());
        }
        total = total.checked_add(asset.bytes)
            .ok_or("The model pack's declared size is invalid.")?;
        if total > MAX_PACK_BYTES {
            return Err("The model pack exceeds the supported 3 GiB limit.".into());
        }
    }
    if !names.contains(MODEL_PATH)
        || !names.contains(&LICENSE_PATH.to_ascii_lowercase())
        || !names.contains(&NOTICES_PATH.to_ascii_lowercase())
        || !manifest.assets.iter().any(|asset| asset.path.starts_with("runtime/") && asset.path.ends_with(".wasm"))
    {
        return Err("The model pack requires a text/vision model, a WASM runtime, the Apache license, and notices.".into());
    }
    Ok(())
}

fn inspect_zip<R: Read + Seek>(mut zip: ZipArchive<R>) -> Result<PackInspection, String> {
    if zip.len() < 5 || zip.len() > MAX_ENTRIES {
        return Err("The model pack has an unsupported number of ZIP entries.".into());
    }
    let mut entry_names = HashMap::new();
    let mut total = 0u64;
    for index in 0..zip.len() {
        let entry = zip.by_index(index).map_err(|_| "The model pack has a damaged ZIP entry.")?;
        let name = entry.name();
        if !clean_name(name)
            || entry.is_dir()
            || entry.enclosed_name().is_none()
            || entry.unix_mode().is_some_and(|mode| (mode & 0o170000) == 0o120000)
        {
            return Err("The model pack contains an unsafe ZIP entry.".into());
        }
        if entry_names.insert(name.to_ascii_lowercase(), index).is_some() {
            return Err("The model pack contains duplicate ZIP entries.".into());
        }
        if name != "manifest.json" && !valid_asset(name) {
            return Err("The model pack contains an unlisted or unsupported file type.".into());
        }
        if entry.size() > MAX_ASSET_BYTES || (name == "manifest.json" && entry.size() > MAX_MANIFEST_BYTES) {
            return Err("The model pack contains an oversized file.".into());
        }
        if entry.size() > entry.compressed_size().saturating_mul(1000).saturating_add(1024) {
            return Err("The model pack contains a suspiciously compressed file.".into());
        }
        total = total.checked_add(entry.size())
            .ok_or("The model pack's size is invalid.")?;
        if total > MAX_PACK_BYTES {
            return Err("The model pack exceeds the supported 3 GiB limit.".into());
        }
    }

    let bytes = {
        let mut entry = zip.by_name("manifest.json")
            .map_err(|_| "The model pack is missing its manifest.json.")?;
        let mut data = Vec::new();
        (&mut entry).take(MAX_MANIFEST_BYTES + 1)
            .read_to_end(&mut data).map_err(|_| "Cannot read the model pack manifest.")?;
        if data.len() as u64 > MAX_MANIFEST_BYTES {
            return Err("The model pack manifest is oversized.".into());
        }
        data
    };
    let manifest: Manifest = serde_json::from_slice(&bytes)
        .map_err(|_| "The model pack manifest is invalid JSON or has unsupported fields.")?;
    validate_manifest(&manifest)?;

    if entry_names.len() != manifest.assets.len() + 1 {
        return Err("The model pack contains assets missing from the manifest.".into());
    }
    let mut checked = 0u64;
    for asset in &manifest.assets {
        let mut file = zip.by_name(&asset.path)
            .map_err(|_| "A model-pack asset is missing.")?;
        if file.size() != asset.bytes {
            return Err("An asset's declared size does not match the ZIP.".into());
        }
        let mut digest = Sha256::new();
        let mut buffer = [0u8; 64 * 1024];
        let mut actual = 0u64;
        loop {
            let count = file.read(&mut buffer)
                .map_err(|_| "An asset could not be read or is damaged.")?;
            if count == 0 {
                break;
            }
            actual = actual.checked_add(count as u64)
                .ok_or("The model-pack asset size overflowed.")?;
            if actual > asset.bytes {
                return Err("An asset exceeds its declared length.".into());
            }
            digest.update(&buffer[..count]);
        }
        if actual != asset.bytes
            || !format!("{:x}", digest.finalize()).eq_ignore_ascii_case(&asset.sha256)
        {
            return Err("A model-pack asset failed its SHA-256/length check.".into());
        }
        checked = checked.checked_add(actual)
            .ok_or("The model-pack total length overflowed.")?;
    }
    Ok(PackInspection {
        model_id: manifest.model_id,
        variant: manifest.model_variant,
        asset_count: manifest.assets.len(),
        verified_bytes: checked,
        checksums_match: true,
        publisher_authenticated: false,
        ready_to_activate: false,
        message: "Local file checksums match this pack's manifest. This does NOT authenticate its publisher; the pack cannot be executed or activated.",
    })
}

/// File picker must supply an explicit local .offlineai file. No writes/extraction.
#[tauri::command]
pub async fn inspect_offline_ai_pack(path: String) -> Result<PackInspection, String> {
    let selected = Path::new(&path);
    if !selected.is_absolute()
        || !selected.is_file()
        || !selected.extension().and_then(|ext| ext.to_str())
            .is_some_and(|ext| ext.eq_ignore_ascii_case("offlineai"))
    {
        return Err("Choose an existing local .offlineai model-pack file.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let file = File::open(&path)
            .map_err(|_| "Cannot open the selected model pack.")?;
        if file.metadata().map_err(|_| "Cannot read the model pack's size.")?.len() > MAX_PACK_BYTES {
            return Err("The model pack exceeds the supported 3 GiB limit.".into());
        }
        let zip = ZipArchive::new(file)
            .map_err(|_| "The selected model pack is not a readable ZIP container.")?;
        inspect_zip(zip)
    })
    .await.map_err(|_| "Model-pack inspection was interrupted.")?
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine;
    use std::io::{Cursor, Write};
    use zip::write::SimpleFileOptions;

    fn sample_asset(bytes: &[u8]) -> String {
        format!("{:x}", Sha256::digest(bytes))
    }

    fn build_zip(tamper: bool, suspicious: bool, extra: bool) -> Vec<u8> {
        let model = b"FICTIONAL MODEL BYTES — DO NOT RUN";
        let runtime = b"FICTIONAL WASM BYTES — DO NOT RUN";
        let license = b"Apache License Version 2.0";
        let notices = b"Google DeepMind EmbeddingGemma 2 fictional attribution";
        let data: Vec<(&str, &[u8])> = vec![
            (MODEL_PATH, model),
            ("runtime/universal-embedder.wasm", runtime),
            (LICENSE_PATH, license),
            (NOTICES_PATH, notices),
        ];
        let assets: Vec<_> = data.iter().map(|(path, contents)| serde_json::json!({
            "path":path, "bytes":contents.len(),
            "sha256":if tamper && *path == MODEL_PATH {
                "a".repeat(64) } else { sample_asset(contents) }
        })).collect();
        let manifest = serde_json::json!({
            "schemaVersion":1, "modelId":"google/embeddinggemma-2",
            "modelVariant":"text-vision-440m",
            "runtimeFamily":"mediapipe-universal-embedder-web",
            "assets":assets,
        }).to_string();
        let file = Cursor::new(Vec::new());
        let mut zip = zip::ZipWriter::new(file);
        zip.start_file("manifest.json", SimpleFileOptions::default()).unwrap();
        zip.write_all(manifest.as_bytes()).unwrap();
        for (path, contents) in data {
            zip.start_file(path, SimpleFileOptions::default()).unwrap();
            zip.write_all(contents).unwrap();
        }
        if suspicious {
            zip.start_file("../outside.exe", SimpleFileOptions::default()).unwrap();
            zip.write_all(b"unsafe").unwrap();
        }
        if extra {
            zip.start_file("runtime/unlisted.js", SimpleFileOptions::default()).unwrap();
            zip.write_all(b"extra").unwrap();
        }
        zip.finish().unwrap().into_inner()
    }

    #[test]
    fn accepts_synthetic_integrity_but_never_authenticates_or_runs_it() {
        let bytes = build_zip(false, false, false);
        let inspection = inspect_zip(ZipArchive::new(Cursor::new(bytes)).unwrap()).unwrap();
        assert_eq!(inspection.asset_count, 4);
        assert_eq!(inspection.model_id, "google/embeddinggemma-2");
        assert!(inspection.checksums_match);
        assert!(!inspection.publisher_authenticated);
        assert!(!inspection.ready_to_activate);
        assert!(inspection.message.contains("NOT authenticate"));
    }

    #[test]
    fn rejects_wrong_hash_and_unlisted_files() {
        for bytes in [build_zip(true, false, false), build_zip(false, false, true)] {
            assert!(inspect_zip(ZipArchive::new(Cursor::new(bytes)).unwrap()).is_err());
        }
    }

    #[test]
    fn rejects_path_escape_even_with_valid_manifest() {
        let bytes = build_zip(false, true, false);
        let err = inspect_zip(ZipArchive::new(Cursor::new(bytes)).unwrap()).err().unwrap();
        assert!(err.contains("unsafe ZIP entry"));
    }

    #[test]
    fn rejects_invalid_model_and_duplicate_or_bad_manifest_assets() {
        let base = Manifest {
            schema_version: 1,
            model_id: "google/embeddinggemma-2".into(),
            model_variant: "text-vision-440m".into(),
            runtime_family: "mediapipe-universal-embedder-web".into(),
            assets: vec![
                Asset { path: MODEL_PATH.into(), bytes: 123, sha256: "a".repeat(64) },
                Asset { path: "runtime/component.wasm".into(), bytes: 123, sha256: "b".repeat(64) },
                Asset { path: LICENSE_PATH.into(), bytes: 123, sha256: "c".repeat(64) },
                Asset { path: NOTICES_PATH.into(), bytes: 123, sha256: "d".repeat(64) },
            ],
        };
        assert!(validate_manifest(&base).is_ok());
        let mut bad = base;
        bad.assets[0].path = "../models/bad.litertlm".into();
        assert!(validate_manifest(&bad).is_err());
    }

    #[test]
    fn rejects_non_pack_paths_without_attempting_to_read_archives() {
        tauri::async_runtime::block_on(async {
            assert!(inspect_offline_ai_pack("family-json.zip".into()).await.is_err());
        });
    }
}
