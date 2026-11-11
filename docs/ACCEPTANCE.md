# Offline v0.8.0 — Family archive acceptance checklist

Use synthetic archives for development and public CI. Never commit real Facebook exports, photos, private chats, passwords, PINs or .offlinevault backups.

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
