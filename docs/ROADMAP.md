# Offline roadmap

## Phase 0 — Foundation
- [x] Public repository, README and development rules
- [x] Three design skill entrypoints, references, source attribution, reproducible installer
- [ ] Decide Offline's application license before public binary release
- [ ] Tauri/React/Rust scaffold, fast tests and Windows build workflow
- [ ] Design language, mockups and acceptance criteria

## Phase 1 — Safe archive ingestion (v0.1.x)
- [ ] Local ZIP picker, archive overview and export format detection
- [ ] Read-only file access, size/decompression limits, path traversal checks
- [ ] Parse a minimal, version-tolerant Facebook JSON export with synthetic tests
- [ ] Clear unsupported-format and missing-content messages

## Phase 2 — Explore and search
- [ ] Local SQLite index with migrations
- [ ] Photos/videos gallery and viewer
- [ ] Posts/activity timeline
- [ ] Messenger conversation reader
- [ ] Fast global search with filters

## Phase 3 — Organize and export
- [ ] Multiple archive imports and deduplication
- [ ] Bookmarks, collections, tags
- [ ] Safe selective exports; readable conversations/posts
- [ ] Large-archive performance, keyboard, accessibility and installer QA

## Phase 4 — Expansion
- [ ] Instagram and other personal archive formats
- [ ] Optional fully local AI content discovery

No original imports should be modified. Never commit real archive data or private test fixtures.
