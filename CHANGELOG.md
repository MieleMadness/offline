# Changelog

## v0.7.0 — On-demand archive photo previews (development)

- Added Photographs gallery with lazy image display, search and bounded page batches.
- Native on-demand read-only ZIP image service for JPEG, PNG, GIF and WebP up to 4 MiB, with safety checks on names, signatures, size and duplicate entries.
- Recognized local image references in selected JSON/HTML post and Messenger export records, displaying them inline when available.
- Original ZIP connection is temporary, current-profile scoped and rechecked against the saved inventory after unlocking; photos are not included in encrypted backups.
- Added synthetic path, MIME, ZIP reader and reconnection tests. Full compatibility, codec security, native UI acceptance and video/HEIC remain pending.


## v0.6.0 — Family profile lifecycle (development)

- Added a dedicated family-management screen with accessible rename and removal actions.
- Profile renames preserve the immutable owner identity, keeping encrypted snapshots associated with their original key.
- Deleting a profile requires exact typed-name confirmation and acknowledges possible data loss. The saved encrypted snapshot is removed using an IndexedDB revision guard, then memory-only content and profile metadata are cleared. No other owner's records are changed, and original ZIP/portable backups remain untouched.
- Added synthetic tests for independent family identities, duplicate name validation and safe active-profile reassignment after deletion.
- The baseline v0.5.2 Windows compile and Rust/frontend tests passed; v0.6.0 native UI acceptance is pending.


## v0.5.2 — Windows compile correction

- Fixed an ambiguous Rust `by_ref` call in the portable backup reader found by the on-demand Windows compilation. The same bounded `Read::take` guard remains in place.
- Synchronized npm, Cargo, Tauri, on-screen and GitHub Actions version labels at 0.5.2. Native build and recovery acceptance are tracked separately.


## v0.5.1 — Encrypted backup and recovery (development)

- Export an unlocked encrypted profile snapshot into a portable .offlinevault file without decrypting social content for disk export. The native save operation is bounded and never overwrites a destination.
- Recover on a fresh family library or into an existing profile only when it has no saved copy. Validate the original secret, restored owner ID and archive structure before writing.
- Add synthetic tests for serialization, corruption, wrong secrets and owner binding, plus native backup file tests.
- Still pending: native Windows recovery acceptance, large backup stress tests, security review and full-media storage integration.


## v0.5.1 — Keyword search correction (development)

- Prevented a matching conversation title from returning every message as a false content match. Search yields individual matching messages, or one thread summary when only the title or participants match.
- Corrected synthetic search test expectations, kept results profile-scoped, and synchronized package, Cargo, Tauri, desktop and CI versions after the failed 0.5.0 fast test.

## v0.5.0 — Workspace PIN and local search preview

- Added a unified Search library screen with instant keyword lookup across a single unlocked profile’s imported posts, messages and data records. Date and section filters, provenance and bounded results work without Ollama.
- Moved optional local AI search into the Search library screen instead of showing it above every archive section.

- Set an 8–20 digit encryption PIN or change an unlocked workspace’s secret. Older passphrase snapshots remain readable.
- Search sampled text by meaning and selected ZIP images by visual content through a locally installed Ollama model. No model download occurs automatically.
- Real inference acceptance is pending. The installed model failed to load with synthetic input on this computer.


## v0.4.1 — Encrypted saved previews (development)

- Optional per-profile encrypted snapshot. Enrollment locks the preview immediately. Unlocking restores posts, conversations, account records and the ZIP inventory. Switching owners unmounts the unlocked view.
- Hold the import owner from file selection through completion. A replacement commits to local storage before the new preview is displayed.
- Read UTF-8 JSON with a byte-order mark and HTML machine-readable timestamps in supported layouts.
- The initial 0.4.0 local test run failed on a raw ArrayBuffer comparison. The 0.4.1 test compares ciphertext bytes and checks rejection of the wrong owner, wrong password and altered ciphertext.

Local Windows verification passed 14 frontend tests and 14 Rust tests, the production frontend bundle, and a native debug executable with packaged assets. Three synthetic profiles exercised HTML, JSON and mixed imports. The encrypted snapshot required the passphrase after manual lock, switching and process restart. No installer or security audit is included.

## v0.3.0 — Native-verified family and HTML/JSON preview

- Introduced family profile names, selectable accent avatars and a visible profile switcher.
- Assigned each in-memory ZIP preview to an explicit family profile; separated content on switching.
- Added a read-only, non-executing HTML adapter for commonly exported post, Messenger and data page structures.
- Routed bounded HTML and JSON file reads to the same social archive UI model.
- Added a format-aware import summary displaying HTML/JSON scans, skipped files and limitations.
- Added synthetic Rust HTML-only, mixed JSON/HTML and HTML message/post tests, plus TypeScript profile validation tests.
- Added a brand guide, family access/privacy specification, format compatibility plan and phased roadmap through 1.0.
- Synced package, Tauri, Rust and CI labels at 0.3.0. Full Windows verification is on demand.

**Known limits:** Profiles are organizational, not password locks; content is in memory and resets on exit. HTML parser only recognizes selected layouts; imported HTML is never executed. No actual media previews, persistent family vault, broad format compatibility, or release installer. Frontend checks, Rust tests and Windows compilation passed on PR #8.

## v0.2.0 — Verified technical baseline

- Chronological social-media-style timeline and posts filter.
- Messenger-style inbox and dated messages with participant names.
- "Your Data" category explorer from supported JSON records.
- Read-only bounded native JSON import and file provenance.
- Fast frontend PR checks, opt-in Windows CI, local PowerShell verifier.
- GitHub frontend and Windows native checks passed before merge; no public installer.

## v0.1.0 — Verified initial desktop baseline

- Tauri desktop ZIP inspector with read-only metadata scanning.
- Source file categories, counts, filename browsing and basic tests.
- Imported UI/UX Pro Max, Impeccable and Emil design skills; created project rules.
