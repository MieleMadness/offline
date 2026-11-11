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

## v0.5.0 additions

A PIN derives the encryption key using the existing KDF. PINs have less entropy than long passphrases and can be guessed offline by someone who copies a snapshot. The enrollment UI requires 8–20 digits. UI attempt throttling would not prevent offline guessing.

Local AI requests send selected content to the installed Ollama service on loopback. Read [the search boundary](LOCAL_AI_SEARCH.md) before enabling it for private data.


## Portable encrypted backup (v0.5.1 development)

Unlocked users can copy the already AES-256-GCM encrypted IndexedDB snapshot into a local .offlinevault file. The JSON envelope contains visible profile name, accent, ID and ciphertext length; actual social content stays encrypted using the existing PIN/passphrase-derived key and owner-specific authenticated data. Import verifies decryption and basic schema before creating the saved snapshot; existing saved copies cannot be overwritten. Native backup IO caps files at 128 MiB and uses no-overwrite hard-link finalization.

Threat limits: A copied backup can be attacked offline, especially when protected by an 8-digit PIN. Backup files do not authenticate all visible metadata. Original Facebook ZIP and media files are not included. This is an early recovery mechanism, not a third-party-audited secure backup solution. Filesystems lacking hard-link support may reject backup writes. Never commit backup files to Git.


## v0.7.0 — Read-only image preview boundaries

The app may read image bytes on demand from a user-selected ZIP via local Tauri IPC. No archive member is extracted or written to disk. The reader enforces relative member names, unique ZIP paths, a 250,000-entry directory cap and a 4 MiB uncompressed image cap. Only JPEG, PNG, GIF and WebP are allowed, with basic magic-signature checking; SVG, HTML, web URLs, video and executable resources cannot be rendered as images. This basic filter is not a full decoder or malware scanner; image decompression bombs and native codec vulnerabilities require further assessment.

The ZIP connection path exists only in the mounted active-profile component memory and is cleared on lock or profile switch. Reconnecting a saved preview checks inventory names and sizes, but not a cryptographic file signature. The preview's encrypted backup contains source references but no ZIP or media binaries. Do not upload private images or ZIP files to test logs or GitHub.


### ZIP duplicate-member qualification (v0.7.2)

The image reader rejects multiple matching names **when the ZIP library exposes them as distinct entries**. The library may resolve or collapse ambiguous duplicate-name members before the reader's scan; the current reader does not independently parse the raw central directory. This edge case requires separate ZIP parser acceptance and should not be advertised as comprehensive duplicate-directory protection.
