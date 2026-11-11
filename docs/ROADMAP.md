# Offline roadmap

## Phase 0 — Foundation
- [x] Public repository, README and development rules
- [x] Three design skill entrypoints, references, source attribution, reproducible installer
- [ ] Decide Offline's application license before public binary release
- [x] Tauri/React/Rust scaffold, quick checks and opt-in Windows build workflow
- [x] First social-first design system and screen acceptance criteria

## Phase 1 — Safe archive ingestion (v0.1.x)
- [x] Local ZIP picker, archive overview and ZIP format detection
- [x] Read-only file access, bounded JSON reads and path traversal checks
- [x] Parse common Facebook JSON post, Messenger and activity shapes with synthetic tests (initial coverage)
- [x] Clear unsupported-format and missing-content states

## Phase 2 — Explore and search
- [ ] Local SQLite index with migrations
- [ ] Photos/videos gallery and viewer (media references only in 0.2.0)
- [x] Initial posts timeline sorted/grouped by date
- [x] Initial conversation reader sorted by date and names
- [ ] Cross-view full-text search (view-local search exists in 0.2.0)

## Phase 3 — Organize and export
- [ ] Multiple archive imports and deduplication
- [ ] Bookmarks, collections, tags
- [ ] Safe selective exports; readable conversations/posts
- [ ] Large-archive performance, keyboard, accessibility and installer QA

## Phase 4 — Expansion
- [ ] Instagram and other personal archive formats
- [ ] Optional fully local AI content discovery

No original imports should be modified. Never commit real archive data or private test fixtures.
