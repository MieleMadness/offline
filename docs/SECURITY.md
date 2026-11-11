# Offline security boundaries — development

## Current version v0.3.0
Offline is an offline-first Windows app that opens user-owned ZIP exports read-only. It never requests Facebook credentials or intentionally sends archive contents to any server. **Do not put private exports in Git, GitHub Actions, automated logs or screenshots.**

### Input parsing
- Rust ZIP inspection rejects traversal/absolute/control-character names. Source ZIP is never extracted or modified.
- JSON data is decoded and normalized using bounded byte limits.
- HTML data is parsed as inert DOM/text by native Rust; raw exported HTML is never embedded in the WebView or executed, and imported images/remote URLs are not loaded.
- Imported strings are rendered by React as escaped text, not `dangerouslySetInnerHTML`.
- Candidate file cap 1,000; max file 4 MiB; aggregate text bytes 48 MiB; capped records and messages. Malformed or unsupported files should be reported, not silently invented.
- Current HTML parsing handles selected layouts and UTF-8 encoding only. Expand fixtures before claiming broad support.

### Family profile protection (current)
- Local profile switcher separates preview state by ID while Offline is open.
- Family profile names and display colors are saved as local application preferences. Archive content is memory-only and does not persist after restart.
- There is **no real per-profile login, access control, vault encryption, or secure sharing** in v0.3.0. Someone using the same Windows OS account may switch profiles. Never call this a security lock.
- Import destination is captured before asynchronous parsing; switching profiles is disabled during an active import.
- Treat every future profile-scoped database query, full-text index, thumbnail cache and export as a sensitive isolation boundary.

### Required before real persistent family vault
- Use a reviewed per-profile storage/key management design with authenticated encryption and secure per-profile unlocking (or OS-account separation).
- Test leakage of messages, search, thumbnails, temporary files, logs and backups between profiles.
- Have explicit owner approval for sharing. Never automatically share messages, searches, device security, precise locations or ads data.
- Explain recovery implications of lost keys. Original externally owned ZIP archives are not silently deleted when a profile is removed.

### Additional gates
- Extend HTML/JSON schema-variant fixtures and Unicode/date handling.
- Defend against decompression bombs, unexpected MIME, symlinks/extracted folders (when supported), and HTML/resource injection.
- Test large archives, cancellation, corruption and partial progress without hangs.
- Perform manual Windows UI/accessibility checks before releasing installer, and choose code signing/reproducible dependency lockfiles.
