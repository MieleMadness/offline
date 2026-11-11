# Security model — first desktop slice

## Trust boundary
The imported ZIP and all member names are untrusted. Source archives are opened read-only using local filesystem handles. v0.1.0 only walks the ZIP directory; it does **not** unzip or parse archive member bytes.

## Controls implemented
- Native file chooser constrained to ZIP selections, with a Rust-side extension/file check.
- ZIP metadata validation and reject malformed archives.
- Reject path traversal, Windows drive-style paths, absolute paths, control characters and oversized names.
- Limit total ZIP directory entries to 250,000 and truncate UI listing to 5,000 files while keeping accurate category counts.
- React escapes filenames; imported HTML is never executed or rendered.
- Tauri capabilities are scoped to core defaults and the native open dialog.
- Source ZIPs are not copied, edited, or uploaded by any code in v0.1.0.

## Next safety gates before content viewers
- Content-level compressed-size and decompression budgets; streaming extraction only when explicitly authorized.
- Whitelist image/media decoding, sanitize imported text/HTML, never load remote URLs found in exports.
- Persistent SQLite schema migration tests; archive identity and idempotent imports.
- Large ZIP, malformed member, Unicode and adversarial fixture matrix.
- Windows installer code-signing and update-channel security audit before distribution.

Do not test with real personal exports in CI or commit logs.
