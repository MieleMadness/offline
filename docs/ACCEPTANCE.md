# Offline — Family archive acceptance checklist

Start with the [reproducible fictional Facebook ZIP generator](SYNTHETIC_FIXTURES.md). Use synthetic archives for development and public CI. Never commit real Facebook exports, photos, private chats, passwords, PINs or .offlinevault backups.

## Automated and interactive gates

- [x] v0.8.0 TypeScript, frontend unit tests and production frontend bundle
- [x] v0.7.2 Rust tests and Windows executable build (verified baseline)
- [ ] v0.8.0 Rust tests and Windows executable build
- [ ] Interactive Windows UI, keyboard and screen-reader acceptance

## HTML/JSON import and profile isolation

1. Import a synthetic JSON Facebook ZIP into family member Alex. Verify posts, Messenger parts, photos, file inventory, warning notices and read-only source ZIP.
2. Import a synthetic HTML ZIP into a separate family profile Taylor. Verify HTML posts, sender names, local date formatting, and unsupported-record notices.
3. Switch owners and verify no other profile's search results, preview, search query or ZIP path appears.

**Why:** the two formats have distinct parsers, but the same profile-safe interface.

## Messenger filters and older history

1. Open a thread with at least 650 synthetic messages. The 250 newest should show first; use Show older messages and verify scrolling position remains stable.
2. Filter sender, year, attachment-only and keyword independently, then in combination. Check the matching count and empty states.
3. Pick a date range including messages at local 00:00 and 23:59, and confirm the next day's messages are excluded.
4. Reverse start and end dates: verify the error message and zero matches. Use Clear filters to reset.
5. Switch threads: all prior thread-specific filters should reset. Search another thread for text with matching participants and verify no leakage.

**Why:** common search tasks must not hide valid history, cross family boundaries or confuse date ranges.

## Photo and media safety

1. Connect the same ZIP used for import. Verify small JPEG, PNG, GIF and WebP files show on demand.
2. Choose a different ZIP inventory: the app must reject it. Lock/switch profiles: the source ZIP association must be cleared.
3. Verify SVG, HTML masquerading as PNG, images over 4 MiB, remote URLs, HEIC and video do not get represented as supported image previews.
4. Unsupported post and Messenger attachments should still be counted and acknowledged, not silently invented.

**Why:** previews must use bounded native reads and inert, local-only media.

## Encryption, backup and deletion

1. Save an encrypted preview, lock, switch to another profile and unlock. Confirm only the correct owner sees content.
2. Export an encrypted portable backup and recover into an empty family library with the original PIN or passphrase.
3. Attempt recovery with an incorrect secret and into a profile with an existing encrypted preview. Both must fail without overwriting.
4. Rename a profile; its encrypted snapshot must remain accessible using the original owner identity.
5. Delete a profile with typed confirmation, then verify other profiles, original ZIPs and independent backups remain intact.
6. Test unavailable disks, insufficient storage, malformed ZIPs and cancelled file selections without corrupting current data.

**Why:** family loss or recovery must never silently overwrite another family member's data.

## Release blockers

This is a planned checklist, **not evidence the interactive tests have passed**. Real-world redacted Facebook format acceptance, image codec security, large archive performance, backup/storage failure, accessibility and independent security review remain incomplete. The desktop preview is not a general-availability installer.


## Your Data privacy and provenance acceptance (v0.9.0)

1. Open a synthetic export containing a login event, search query, location, advertising record and reaction. Verify categories and counts derive only from records in the ZIP.
2. Confirm search/location/security/off-platform/account values and source paths start hidden. Reveal them intentionally; switch category or change the global search and verify masking returns.
3. In Search library, find an imported sensitive data record. Its title, excerpt and source should be hidden by default, and revealed only after pressing Show private values.
4. Select a record year, including an undated record, and verify only matching entries appear. Expand source provenance for a non-concealed item and confirm the original ZIP path is shown, without opening web URLs.
5. Load over 60 synthetic data records; the list should initially show 50 and support Show more. Confirm private values never appear in logs, error notices or public tests.

**Why:** Data may include security and location details. An understandable account-data explorer must not silently expose those fields during ordinary search or screen sharing.


## v0.10.0 — Import safety smoke tests

1. With an encrypted saved profile open, select a synthetic ZIP containing only index.html and empty JSON. Confirm an informative error and verify the original encrypted snapshot revision is unchanged.
2. Select a synthetic photo-only ZIP. Confirm it is labeled **media/file inventory only**, never as decoded posts/messages.
3. Select a second valid JSON or HTML ZIP while an existing saved preview is unlocked. Confirm the review screen accurately shows both archive filenames and approximate counts, with **Keep current preview** as the safest action.
4. Confirm **Replace encrypted preview** is disabled until exactly REPLACE is typed. Cancel, lock or switch profiles; the pending ZIP must not leak into another family workspace.
5. Confirm replacement works only when explicitly requested, updates a single owner, and leaves original ZIPs unchanged. Simulate storage failure and a stale snapshot revision; previously saved contents must remain intact.
6. Check timestamps from Unix seconds, named millisecond fields, 13-digit millisecond numeric strings and explicit HTML dates. Ambiguous local strings must remain undated.

**Why:** importing another Facebook download must never silently destroy the only saved copy of prior memories.


## v0.11.0 — Photo gallery paging and full-size viewer

1. Import a synthetic ZIP with 53 supported small images. Confirm Photographs starts at page 1 with 24 items, page 2 has 24, page 3 has 5. Jump backward and verify the count remains correct. Confirm prior pages do not leave image components mounted.
2. Open an image with mouse and keyboard. Use Left/Right arrow keys, Previous/Next controls, and Escape. Confirm the first/last image controls are disabled at boundaries, the dialog has accessible labels, focus stays inside while open and returns sensibly when closed.
3. Search for a filename while on a later gallery page. Confirm navigation resets to the matching first page and the viewer never shows a photo outside the filtered results.
4. Inspect a corrupted-but-magic-matched JPEG and an unsupported file. The viewer must display Preview unavailable, without attempting a remote fetch or executing active markup.
5. Navigate a large synthetic photo library while observing RAM and CPU. The 24-item page limit bounds mounted components but does not guarantee overall memory usage, decoder correctness or ZIP scan speed; report regressions before release.

**Why:** A family photo archive needs efficient browsing, accessible controls and truthful failures rather than unlimited decoded media in one WebView.


## v0.12.0 — Complete archive photo paging and import races

1. Generate the fictional ZIP inventory with at least 10,125 photos using [Synthetic test archives](SYNTHETIC_FIXTURES.md). Import it into a fresh family profile, connect the original ZIP and confirm **Photographs** reports all eligible image paths, not merely the first 5,000.
2. Browse to an image beyond index 5,000. Verify it renders through the native ZIP index, then open the viewer, cross a page boundary with arrow keys and close. Confirm the returned page number matches the selected photo and focus is restored appropriately.
3. Search for a unique filename near the end of the ZIP and confirm the server-side query returns it. Change searches during a slow page request and switch profiles; no stale photos should display in another family profile.
4. Test an unavailable/moved ZIP, an overlong query, a mismatched native index, unsafe member names, unsupported types and a photo larger than 4 MiB. The app must show a bounded error state without extraction or changing the original ZIP.
5. Rapidly trigger the import picker twice while parsing a ZIP and verify the in-flight import guard prevents overlapping dialogs and the existing preview remains intact until replacement confirmation.
6. Record CPU/RAM and page-query latency for 10k/100k-entry ZIPs. A successful synthetic path test does not establish production-scale performance; keep that release blocker open until measured.

**Why:** families can have exports far larger than 5,000 files, but indexing must not sacrifice privacy, UI responsiveness or recoverability.


## Native fictional-export integration gate (development)

The Windows milestone job now generates fictional HTML/JSON ZIPs locally and runs the production Rust reader against them. Confirm all native fixture tests report green when the `OFFLINE_ACCEPTANCE_FIXTURES` variable is set: JSON posts/messages/data, HTML posts/messages/media, empty/malformed import cases and mixed seconds/milliseconds dates. This closes a gap between testing the fixture generator and testing the actual import adapter. It does not replace a human Windows UI walkthrough or real-format redacted export acceptance.


## v0.13.0 — Unsigned Windows test executable artifact

1. Trigger one full native Windows build with `[windows]` in a draft PR title. Confirm the executable and SHA-256 checksum are generated only after TypeScript/frontend and Rust build gates pass.
2. Download the temporary artifact following [Windows preview instructions](TEST_WINDOWS_PREVIEW.md) and verify the SHA-256 fingerprint before opening it.
3. Use a disposable Windows account or VM and import **fictional** JSON/HTML fixture ZIPs. Perform manual feed, Messenger, privacy, photo navigation, backup/recovery and profile isolation checks. Capture only synthetic screenshots.
4. Confirm a targeted `[rust]` PR run does **not** upload the executable; that mode must run the native fixture tests without packaging the application.
5. Keep v1.0 installer and code-signing tasks open until real-export format, accessibility, performance and independent security acceptance.


## v0.14.0 — Family profile catalog recovery and blocked-storage checks

1. Create a fictional family profile and save an encrypted preview. Restart and confirm the original owner ID, profile label and PIN/passphrase still unlock it.
2. Simulate blocked or quota-limited localStorage **before** creating/renaming a profile. Confirm the operation fails and the UI does not claim the profile was created or updated.
3. With an encrypted fictional backup prepared, block profile metadata writes and attempt recovery. Confirm the backup is rejected **before** an encrypted snapshot is committed; restore normal storage and retry successfully.
4. Simulate an IndexedDB transaction failure after catalog staging. Confirm the previous catalog is restored and the original `.offlinevault` file remains usable.
5. Delete a fictional profile after typing confirmation. Confirm only that owner's encrypted saved preview and catalog entry disappear, and another family member still unlocks normally.
6. Simulate a crash between localStorage and IndexedDB transactions. Document the residual non-atomic state and verify recovery using an independent encrypted backup. **This manual crash/power-loss acceptance is not covered by unit tests.**

**Why:** account labels and encrypted ciphertext live in different browser stores. Failure must not silently strand family memories or imply that a partially completed deletion succeeded.


## Native 5,125-photo ZIP regression

- [x] Synthetic code-level test: full ZIP photo listing and single-file read across the legacy 5,000-entry boundary, with verified directory-index identity (Windows CI acceptance required).
- [ ] Manual Windows acceptance: connect `large-5125-photos.zip`, search for `synthetic_005100`, open the result in the full-size viewer, and inspect the last page.
- [ ] Realistic media performance: profile memory, CPU, ZIP directory scans, and full-resolution image decode; 1×1 PNGs are not representative.


## v0.15.0 — Encrypted local semantic search acceptance

1. With fictional JSON/HTML archives, unlock two separate family profiles. Build a text index for Alex and verify a search near the **end** of a late Messenger message appears, beyond the previous first-30-record limit.
2. Search the same query in Taylor's profile and confirm no Alex excerpt, source path, status, or vectors appear. Lock Alex and verify indexing/search state is unmounted.
3. Save Alex's encrypted profile, build the index and restart Offline. Unlock with the correct PIN/passphrase, confirm cached search works. A wrong key or other owner ID must fail authentication.
4. Replace Alex's archive with an explicitly confirmed import. Confirm its old index is discarded and a new model/content fingerprint is required. Change the installed model digest and confirm index rebuilding is requested.
5. Interrupt an index build mid-batch. Confirm the progress count is retained only for the current unlocked session and does not appear for other owners. Test unusually large archives, storage quota exhaustion, and invalid recovered vector metadata.
6. Attempt AI image search with another family's ZIP. The source mismatch must refuse inference before private image bytes are sent to the local model. Confirm the original ZIP stays read-only.
7. Keep keyword search fully functional without Ollama or models. Confirm no real family data appears in GitHub, CI logs, crashes or shared screenshots.

**Scope:** these are release-blocking **manual Windows tests**. Passing synthetic unit tests or a native compile is not proof of real inference quality, complete privacy, or production-scale indexing.
