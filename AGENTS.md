# Offline — Agent and Development Instructions

These instructions apply to all code and design work in this repository.

## Product and privacy
Offline is a **local-first desktop explorer** for user-owned social-media data exports, starting with Facebook archives. Do not require a Facebook login or upload personal data to remote services. Treat imported ZIP, JSON, HTML and media as untrusted input. Never modify the original archive.

## Required design skills (Open-Photo workflow)
Read the actual in-repo skill instructions before changing UI:
- `.agents/skills/ui-ux-pro-max/SKILL.md`: use for architecture of screens, navigation, accessibility, typography, responsive layout, color and UI patterns.
- `.agents/skills/impeccable/SKILL.md`: use for designing, auditing and polishing UI; choose **Operate** mode for the desktop archive browser. Run its full setup only when installed scripts exist.
- `.agents/skills/emil-design-eng/SKILL.md`: use for interaction details, motion, timing, focus and visual continuity.

These three are complementary: UI/UX Pro Max for structure, Impeccable for the design quality floor, Emil for interaction craft. Follow the user's constraints, avoid gratuitous animation, support reduced motion and keyboard navigation, and never choose aesthetics over clarity when displaying a dense archive.

Some skills depend on large upstream datasets/scripts not included in the initial entrypoint import. Run `powershell -ExecutionPolicy Bypass -File scripts/install-design-skills.ps1` from the repository root before using advanced skill CLIs or referencing missing files. See `docs/DESIGN_SKILLS.md`.

## Development discipline
1. Review relevant code and documentation before editing. Implement durable fixes, not band-aids.
2. Write focused tests, use synthetic data fixtures only, and verify all relevant build/lint/tests before pushing. A green fast check is not proof of a green Windows installer.
3. Keep original import archives read-only; store local indexes/bookmarks/settings separately. Defend against ZIP-slip, decompression bombs, HTML script injection, path traversal and accidental network access.
4. Maintain a changelog, README and roadmap as capabilities change; distinguish implemented features from planned features.
5. Follow the Open-Photo release discipline: advance the planned minor/feature version after a verified green baseline, use patch increments for failed-build fixes, synchronize manifest/workflow/release names and verify new CI results before claiming green.
6. Use focused PRs and parallel nonconflicting features. CI red blocks merging the affected PR, not beginning independent work. Never say ongoing background monitoring will occur after the chat ends.
7. Summarize changes with commit links, what passed, what wasn't run, and remaining known limitations.

## First development priorities
1. Tauri/React/Rust application foundation and synthetic fixtures.
2. Safe, read-only Facebook archive import with clear failure diagnostics.
3. Offline indexing, navigation, gallery, posts and message views.
4. Full-text search, bookmarks, duplicate reconciliation and selective export.
