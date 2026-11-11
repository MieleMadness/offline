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
- [ ] First-run personal vs family library chooser; create, rename and switch local profiles.
- [x] Per-profile archive ownership: explicit import target, no automatic cross-profile merging.
- [ ] Persist profile metadata and index scope locally; prevent stale async import from switching owner.
- [ ] No private data in shared global search, logs, temp files or test fixtures.
- [x] UI distinguishes organizational profiles from actual encrypted/password-protected vaults.
- [ ] Profile deletion requires confirmation, scope warning and backup guidance.

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
- [ ] Backup/restore, passphrase change, deletion, independent security review and tests for large archives and storage loss.
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

## Phase 5 — v0.6.x: Conversations and connections
- [ ] Messenger conversation history complete with sender, dates, media attachments and thread parts.
- [ ] Search across people/conversations; filter by date, attachments and participant.
- [ ] Friend/follower/group/event relationship views from exported data.
- [ ] Conversation output (readable HTML/PDF/text) for the archive owner; no accidental sharing.
- [ ] Explicit missing encrypted-chat warnings and documented import limitations.

**Exit gate:** Large conversations remain responsive; a thread never crosses profile boundaries.

## Phase 6 — v0.7.x: Understand Your Data
- [ ] Clear categorized views for searches, ads/interests, third-party/off-platform events, account settings, logins/devices, locations/check-ins and reactions where included.
- [ ] Timeline/filter/source detail for each supported data type, with privacy-sensitive defaults.
- [ ] Explain in plain language what each exported field represents, citing export source, avoiding unsupported inferences.
- [ ] Data export/retention controls, privacy report and profile-specific delete/reindex.
- [ ] User-controlled summary metrics (only where computed from actual records).

**Exit gate:** The app clearly distinguishes what was supplied in the ZIP from what may exist on Meta's systems.

## Phase 7 — v0.8.x: Family Memories & strong private vaults
- [ ] Per-profile encryption at rest and vetted key management; strong isolation even under a shared Windows account if a profile password is used.
- [ ] Family Memories view built from **explicitly selected** posts/media. Consent and revocation are mandatory.
- [ ] No automatic sharing of messages, searches, precise locations, logins or advertising activity.
- [ ] Family member roles, profile switch authentication/lock, recovery/backup guidance.
- [ ] Tests against cross-profile search results, cache leakage and sharing after revocation.

**Exit gate:** External threat review and data-isolation tests. Do not label a profile as secured until real encryption/authentication exists.

## Phase 8 — v0.9.x: Compatibility, scale and polish
- [ ] More Facebook export vintages, HTML layouts and JSON schemas; multiple selected data categories; multipart ZIP.
- [ ] Documented compatibility matrix with synthetic fixtures, safe fallbacks and accuracy checks.
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
Next, exercise backup/recovery and storage failures before extending durable storage to indexes or thumbnails. Expand the synthetic compatibility matrix by export layout. Branch per cohesive milestone, batch dependent changes locally, keep Windows CI opt-in until release check. Issue trackers: #5 media, #6 Facebook compatibility, #7 visual acceptance.
