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


## v0.9.0: Sensitive account-data display controls

The Your Data panel conceals names, details and source paths by default for data categories classified as searches, locations, security, connected-app/off-platform activity and personal account details. The global Search library also conceals the corresponding data result titles, snippets and paths until the user explicitly reveals them. Reveal state clears on search or category changes. These are UI display controls, **not an encryption boundary**: parsed data still exists in the unlocked workspace memory. Messages, posts and optional opt-in local model inference may show sensitive content. Do not claim that a masked category hides all private data within Offline; lock a saved profile to protect access, and avoid sharing an unlocked screen.


## v0.10.0 — Non-destructive import and source coverage safeguards

A native ZIP can pass filename and UTF-8 checks yet decode no useful social content. The frontend now refuses to replace a preview when the new archive contains no readable records and no media inventory. A previously present preview is staged for explicit review, and an encrypted snapshot cannot be replaced without an extra typed confirmation. Snapshot updates use owner-specific authenticated ciphertext and expected-revision IndexedDB transactions; original ZIP files are never changed. The confirmation is a user-experience protection against accidental data loss, not a security boundary against another person with access to the unlocked Windows session. Media-only exports are honestly labeled as inventory. Full native acceptance, integrity verification and storage-failure tests remain necessary.


## v0.11.0 — Full-screen viewer and photo memory lifecycle

Photo pages now render at most 24 gallery image components at once; changing pages unmounts previous image components and releases their React-held base64/data URLs. The full-screen viewer renders only the currently selected image. This reduces unbounded gallery memory retention but is not a formal process-wide memory limit or a native-thumbnail decoding pipeline. The ZIP path stays in the active profile's mounted Library session and disconnects on lock/profile switch. Viewer keyboard Escape, arrow navigation and focus management are local UI operations. Unsupported image decodes show a fallback; image parser/codec security remains an external review item.


## v0.12.0 — Bounded complete-ZIP photo directory and source binding

The native photo-list command reads only ZIP directory metadata from a user-selected local file, within 250,000 ZIP entries, limiting output to 1–100 photos (the UI requests 24), search text to 256 UTF-8 bytes and eligible MIME extensions to JPEG/PNG/GIF/WebP. It excludes candidates above 4 MiB and rejects unsafe/ambiguous photo paths when the ZIP library exposes them. It never extracts image bytes, uploads content or writes a persistent index.

The list includes exact ZIP directory indices to avoid a repeated linear filename scan for every gallery photo. The image reader verifies the index still identifies the requested filename, validates size and basic MIME signatures, then bounds the read. Inline post/message image paths retain the conservative full-scan lookup. These are **same-file consistency checks, not cryptographic source authentication**: another local process can replace the ZIP, and the library does not independently authenticate duplicate central-directory entries. Opening each image still reparses ZIP metadata; benchmark real-world large archives before v1.0. A disconnected profile can only show photos from its saved, bounded first-5,000-file inventory.

The v0.12.0 review also restored the active import operation guard, protecting against overlapping local imports. This is a user-experience/race prevention step, not a privilege boundary.
