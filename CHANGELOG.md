# Changelog

## 0.2.0 — In development (social archive reader)

- Replaced the file-first landing experience with a chronological social-media-style feed.
- Added dated feed cards, year search/filter, media-reference indicators and source provenance.
- Added Messenger-style conversations organized by participants and dated messages.
- Added a "Your data" explorer for JSON export categories and readable example entries.
- Added a bounded native Rust JSON reader for Facebook posts and conversation parts without extracting or modifying the source ZIP.
- Added synthetic parser fixtures and TypeScript tests for filtering, year/date grouping, and people search.
- Introduced local PowerShell verification; fast GitHub PR checks; full Windows compilation only on manual dispatch or an explicit [windows] PR.
- Synced package, Tauri and Rust app versions to 0.2.0.

**Known limits:** JSON export formats vary. Only selected post and Messenger shapes are parsed; no media previews, complete indexes, HTML export parsing, or persistent database yet. Original archives remain read-only. No public installer should be distributed before Windows validation.

## 0.1.0 — Verified project baseline

- Tauri 2 and React/TypeScript desktop shell.
- Read-only ZIP inventory, category counts, filename browsing and native file picker.
- Frontend unit tests and Windows Rust/desktop compile checks passed at commit 5835071 before merge.
- Bundled three Open-Photo design skill instructions and initial reference files.
