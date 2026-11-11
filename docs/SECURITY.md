# Offline security boundaries — development

## Current version v0.4.1
Offline is an offline-first Windows app that opens user-owned ZIP exports read-only. It never requests Facebook credentials or intentionally sends archive contents to any server. **Do not put private exports in Git, GitHub Actions, automated logs or screenshots.**

### Input parsing
- Rust ZIP inspection rejects traversal/absolute/control-character names. Source ZIP is never extracted or modified.
- JSON data is decoded and normalized using bounded byte limits.
- HTML data is parsed as inert DOM/text by native Rust; raw exported HTML is never embedded in the WebView or executed, and imported images/remote URLs are not loaded.
- Imported strings are rendered by React as escaped text, not `dangerouslySetInnerHTML`.
- Candidate file cap 1,000; max file 4 MiB; aggregate text bytes 48 MiB; capped records and messages. Malformed or unsupported files should be reported, not silently invented.
- Current HTML parsing handles selected layouts and UTF-8 encoding only. Expand fixtures before claiming broad support.

### Saved previews

Ordinary session previews remain accessible through the picker. Saving an encrypted copy is opt-in. The WebView stores one authenticated ciphertext per profile in IndexedDB. Web Crypto derives a non-exportable AES-256-GCM key using PBKDF2-HMAC-SHA-256 (600,000 iterations, fresh 128-bit salt per enrollment). Every write uses a fresh 96-bit nonce. Associated data binds the database format and profile ID. The encrypted payload includes the ZIP inventory, social records and import diagnostics. Replacing a snapshot checks its previous revision in the same write transaction.

The app keeps the decrypted preview and key in the active profile component. Switching, locking or closing drops those references. JavaScript and OS-managed memory cannot guarantee erasure. Shared Windows accounts, administrators, malware, crash dumps and a person at an already-unlocked desktop remain outside this boundary. Original ZIPs, visible profile names, snapshot sizes and the existence of a snapshot remain observable. The app does not escrow passwords. Retain original ZIPs outside the app and protect them with Windows file permissions. Browser data loss can destroy the saved copy.

### Before general availability
- Use a reviewed per-profile storage/key management design with authenticated encryption and secure per-profile unlocking (or OS-account separation).
- Test leakage of messages, search, thumbnails, temporary files, logs and backups between profiles.
- Have explicit owner approval for sharing. Never automatically share messages, searches, device security, precise locations or ads data.
- Explain recovery implications of lost keys. Original externally owned ZIP archives are not silently deleted when a profile is removed.

### Additional gates
- Extend HTML/JSON schema-variant fixtures and Unicode/date handling.
- Defend against decompression bombs, unexpected MIME, symlinks/extracted folders (when supported), and HTML/resource injection.
- Test large archives, cancellation, corruption and partial progress without hangs.
- Perform manual Windows UI/accessibility checks before releasing installer, and choose code signing/reproducible dependency lockfiles.
