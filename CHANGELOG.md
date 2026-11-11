# Changelog

## v0.3.0 — In development (family and HTML/JSON import)

- Introduced family profile names, selectable accent avatars and a visible profile switcher.
- Assigned each in-memory ZIP preview to an explicit family profile; separated content on switching.
- Added a read-only, non-executing HTML adapter for commonly exported post, Messenger and data page structures.
- Routed bounded HTML and JSON file reads to the same social archive UI model.
- Added a format-aware import summary displaying HTML/JSON scans, skipped files and limitations.
- Added synthetic Rust HTML-only, mixed JSON/HTML and HTML message/post tests, plus TypeScript profile validation tests.
- Added a brand guide, family access/privacy specification, format compatibility plan and phased roadmap through 1.0.
- Synced package, Tauri, Rust and CI labels at 0.3.0. Full Windows verification is on demand.

**Known limits:** Profiles are organizational, not password locks; content is in memory and resets on exit. HTML parser only recognizes selected layouts; imported HTML is never executed. No actual media previews, persistent family vault, broad format compatibility, or release installer. Full verification pending.

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
