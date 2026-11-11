# Offline — Product Roadmap

**Product:** Offline — *Your memories, on your terms.*  
**Primary platform:** Windows desktop, local-only.  
**Release discipline:** Follow Open-Photo's existing rule. After a **verified green milestone**, the next feature phase increments the 0.x minor by **+0.1** (0.2.0 → 0.3.0). If a phase's build goes red, fix it with a **+0.0.1 patch** (0.3.0 → 0.3.1), not another minor jump. Keep `package.json`, Cargo, Tauri, workflow labels, docs and release tags in sync. Do not call a partial frontend check a green Windows build.

## Design principles
- **Social feed first:** Users browse posts, memories, people and dates; raw ZIP names are a secondary troubleshooting area.
- **Family ready:** Every archive belongs to one profile; private by default. Optional shared memories are opt-in.
- **Both official export formats:** HTML and JSON use distinct secure parsing adapters that populate one canonical record model.
- **Local by design:** No Meta credentials, remote services or automatic uploads; originals remain unchanged.
- **Truth over appearance:** No invented activity, friends, media, statistics or misleading support claims.
- **Accessibility:** Keyboard and assistive technology, responsive layout, light/dark, reduced motion and local font availability.
- **Fast iteration:** Local test/build first; lightweight PR checks; Windows full compile only for milestones and on-demand release gates.

## Phase 0 — v0.1.0: Desktop foundation (MERGED / VERIFIED)
- [x] Tauri/React/Rust desktop app, read-only ZIP inventory, file categories, source counts.
- [x] Native ZIP picker, synthetic tests and Windows compile.
- [x] Three design skills in `.agents/skills/`, contributor instructions and repo structure.

**Exit gate:** Full Windows tests and desktop compile green. Completed.

## Phase 1 — v0.2.0: Social-first preview (MERGED / VERIFIED)
- [x] Timeline with date grouping, post body and media-reference indicators.
- [x] Messenger-style people list and messages with sender/date.
- [x] Your Data explorer from recognized JSON records.
- [x] Read-only bounded JSON importer and light/dark responsive interface.
- [x] CI changes: fast frontend on PR; native Windows compile on demand.
- [ ] Hands-on Windows visual acceptance and representative export compatibility beyond synthetic fixtures (tracked separately; **no public installer** until passed).

**Exit gate:** GitHub Windows and frontend success; completed as technical development baseline, not a production release.

## Phase 2 — v0.3.x: Family identities and both import formats (native-verified preview)
### 2A — Product/brand contracts
- [x] Define brand, semantic palette, typography, layout, tone and family identity cues in `docs/BRAND_GUIDE.md`.
- [x] Define permissions/data ownership, sharing defaults, and actual security boundary in `docs/FAMILY_ARCHITECTURE.md`.
- [x] HTML/JSON common model and support levels in `docs/IMPORT_FORMATS.md`.

### 2B — Family profile foundations
- [x] Create, rename and switch local profiles in the family library.
- [ ] First-run personal vs family library chooser.
- [x] Per-profile archive ownership: explicit import target, no automatic cross-profile merging.
- [ ] Persist profile metadata and index scope locally; prevent stale async import from switching owner.
- [ ] No private data in shared global search, logs, temp files or test fixtures.
- [x] UI distinguishes organizational profiles from actual encrypted/password-protected vaults.
- [x] Profile removal uses typed confirmation, scope warning, encrypted snapshot deletion and backup guidance (pending manual Windows acceptance).

### 2C — HTML + JSON adapters
- [ ] Auto-detect HTML vs JSON inside ZIP; provide a preview of detected/unsupported sections.
- [x] Safe HTML parser (DOM/text, **never** render imported HTML in live WebView).
- [ ] Extract representative HTML posts, Messenger threads and account/activity entries with timestamps and provenance.
- [ ] Keep JSON adapter working; normalized output identical by category across formats.
- [ ] Synthetic fixture matrix for both export formats, missing/ambiguous timestamps, archived threads and multiple parts.
- [ ] Import health screen: what was found, imported, skipped, incompatible and why.

**Exit gate:** A family of 3+ profiles can import *different* HTML and JSON synthetic exports without data mixing; core screens populated from both. Rust/frontend tests and an on-demand Windows milestone compile green. Verified on v0.3.0 commit 9b3ea66 with three synthetic ZIPs (HTML, JSON, mixed) through the native Windows picker. Each profile showed its own post, message, account record and inventory after switching. Remaining checklist items are follow-ups.

## Phase 3 — v0.4.x: Durable local library and search (in progress)
- [x] Opt-in encrypted per-profile preview with passphrase unlock, manual lock, owner-bound writes and lock on profile switch. One snapshot per person.
- [x] Portable encrypted preview backup/restore first pass (v0.5.1, Rust compile corrected in v0.5.2): separate-file export, no-overwrite recovery, preserved owner IDs and synthetic tests (pending native Windows acceptance).
- [ ] Native recovery acceptance, large-archive/storage-loss tests, profile deletion and independent security review.
- [ ] Profile-scoped SQLite schema, migrations, backups and import/source provenance.
- [ ] Multiple ZIPs/parts per person and cross-format duplicate detection with review.
- [ ] Fast full-text search by person, content, date, source and category.
- [ ] Incremental/background import with progress, cancellation, retry and resource budgets.
- [ ] Preserve archive originals; notify if a moved/missing file affects previews.
- [ ] Strong per-profile storage/access boundaries. Formal security design before storing sensitive records persistently.

**Exit gate:** Reboot/reopen retains distinct profiles and indexes; large synthetic datasets are indexed without hangs/leaks.

## Phase 4 — v0.5.x: Rich social feed and memories
- [ ] Real images/videos from local archive with verified archive paths, MIME validation and thumbnail caching.
- [ ] Date/person/year filters, post expansion, albums, reels/stories/check-ins where present.
- [ ] Comments/reactions when exported and supported; clear provenance and missing-data messages.
- [ ] Media viewer with keyboard navigation, accessible alt/labels where available, lightweight slideshow.
- [ ] Optional favorites/bookmarks and private collections; no fake social interactions.

**Exit gate:** Real synthetic ZIP media appears inside the right dated posts; rendering is safe and performant on large exports.

## Phase 5 — v0.6.x: Family completion and conversations

- [x] v0.6.0: Profile rename and removal with encryption-aware identity retention, compare-before-delete and backup guidance (pending native UI acceptance).

### Conversation work (remaining)

- [ ] Messenger conversation history complete with sender, dates, media attachments and thread parts.
- [x] Initial in-thread keyword/year and attachment filters; incremental older-message browsing (pending native UI acceptance).
- [x] In-thread participant selector and inclusive local date-range inputs with bounds checking (v0.8.0).
- [ ] Full indexed archive search and large-thread scrolling performance acceptance.
- [ ] Friend/follower/group/event relationship views from exported data.
- [ ] Conversation output (readable HTML/PDF/text) for the archive owner; no accidental sharing.
- [ ] Explicit missing encrypted-chat warnings and documented import limitations.

**Exit gate:** Large conversations remain responsive; a thread never crosses profile boundaries.

## Phase 6 — v0.7.x: Photo previews and Understand Your Data

- [x] Initial Photographs gallery from indexed ZIP paths, bounded image loading without extraction (v0.7.0, duplicate ZIP fixture constraints documented in v0.7.2; Windows and real-export acceptance pending).
- [x] Recognized local image references under supported HTML/JSON posts and Messenger messages, with safe fallbacks.
- [ ] HEIC and video previews, full album relationship support, image codec security and 10k+ file stress tests.

### Understand Your Data follow-ups
- [x] Recognized exported categories shown with cautious explanations, record counts and source-file provenance (v0.9.0; not all Meta schemas are supported).
- [ ] Expand parsing coverage for ads, searches, off-platform events, account settings, devices, locations and reactions across export vintages.
- [x] Year filters, explicit source-path detail, bounded record batches and default masking of sensitive record values (v0.9.0; manual UI acceptance pending).
- [ ] Full date-range filtering and more structured decoding for individual data categories.
- [x] Initial plain-language category guidance without inventing absent Meta fields, plus source-file provenance (v0.9.0).
- [ ] Field-level explanations and richer schema-aware source interpretation.
- [ ] Data export/retention controls, privacy report and profile-specific delete/reindex.
- [ ] User-controlled summary metrics (only where computed from actual records).

**Exit gate:** The app clearly distinguishes what was supplied in the ZIP from what may exist on Meta's systems.

## Phase 7 — v0.8.x: Messenger browsing and Family Memories

- [x] v0.8.0: Search within conversations and filter by year, participant, attachments and local date range; progressive older-message display (native/UI acceptance pending).
- [ ] Thread export, larger-message virtualization, cross-export deduplication and full attachment compatibility.

### Family Memories and private vaults
- [ ] Per-profile encryption at rest and vetted key management; strong isolation even under a shared Windows account if a profile password is used.
- [ ] Family Memories view built from **explicitly selected** posts/media. Consent and revocation are mandatory.
- [ ] No automatic sharing of messages, searches, precise locations, logins or advertising activity.
- [ ] Family member roles, profile switch authentication/lock, recovery/backup guidance.
- [ ] Tests against cross-profile search results, cache leakage and sharing after revocation.

**Exit gate:** External threat review and data-isolation tests. Do not label a profile as secured until real encryption/authentication exists.

## Phase 8 — v0.9.x: Data transparency, compatibility, scale and polish

- [x] v0.9.0: Private-by-default previews for sensitive Your Data categories and global search results; source provenance and year filters (pending UI acceptance).
- [ ] More Facebook export vintages, HTML layouts and JSON schemas; multiple selected data categories; multipart ZIP.
- [x] v0.10.0 import health and safety: no accidental saved-preview replacement for unrecognized ZIPs, media-only disclosure, explicit confirmation for replacement (native acceptance pending).
- [x] v0.10.0 timestamp normalization for common Meta JSON seconds/milliseconds and common English HTML date patterns with synthetic regression tests.
- [ ] Full compatibility matrix for real-world redacted HTML/JSON export variations, import validation and source mapping.
- [ ] 10k/100k+ content performance benchmarks, thumbnail budgets, search scale and stress tests.
- [ ] Browser-like accessibility audit, dark/light focus and contrast, 900/1280/1440 resolutions.
- [ ] Backup/restore testing, corrupted archive and crash recovery, disk-space management.
- [ ] Developer-facing instructions and end-user help for every feature.

**Exit gate:** User acceptance against representative redacted exports and offline-first security checklist.

## Phase 9 — v1.0.0: Public desktop release
- [ ] Windows installer, icon, publisher details, code signing (when available), reproducible release workflow and checksum.
- [ ] App license decided; third-party skill licenses and bundled runtime attribution retained.
- [ ] Manual multi-profile acceptance, HTML+JSON acceptance, security/privacy audit, accessibility and uninstall/backup tests.
- [ ] User guide, supported-format matrix, changelog and issue templates.
- [ ] Release only when GitHub and local Windows gates are green; label known limitations transparently.

## Beyond 1.0 (optional, not a prerequisite)
- Instagram export, additional social platforms, portable encrypted family backups.
- Offline-only semantic AI discovery, duplicates and contextual memory search with opt-in local models.
- Cross-device family sync only if opt-in encryption and trustworthy sharing can be built.

## Next coding order
Next, verify v0.7.0 native photo/gallery integration and image codec safety; exercise backup/recovery storage failures before extending durable storage to indexes or thumbnails. Expand the synthetic compatibility matrix by export layout. Branch per cohesive milestone, batch dependent changes locally, keep Windows CI opt-in until release check. Issue trackers: #5 media, #6 Facebook compatibility, #7 visual acceptance.

## Prioritized v0.5.0 work

- [x] Profile-scoped, in-memory keyword search across the recognized preview with category/year filters and bounded result display. No persistent index or unparsed ZIP search yet. The first v0.5.0 fast test exposed overmatching of thread titles; v0.5.1 corrects this and updates regression coverage.

- Implemented PIN enrollment and changing the unlock secret on an unlocked encrypted workspace.
- Implemented bounded text and image relevance search using local Ollama models.
- Pending successful real inference acceptance with a model that fits available memory.
- Next extend media indexing, model setup and full-library semantic retrieval, then encrypt persisted embeddings under the workspace key.


## Pre-v1 development milestone — v0.10.0 (import reliability)

- [x] Reject archives with no recognized records or media before modifying the current preview.
- [x] Require side-by-side review and explicit confirmation before replacing existing session or encrypted saved previews.
- [x] Show import coverage and skipped-file limitations; recognize common JSON timestamp variants and English HTML date layouts.
- [ ] Complete native Windows import/replacement smoke tests, multi-export deduplication, storage-loss recovery, 10k+ media stress tests and independent security review before v1.0.
