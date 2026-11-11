# Changelog

The project uses early-development semantic versions. A green release must be verified by GitHub CI and a Windows desktop check.

## 0.1.0 — In development

- Added a Tauri 2 / React 19 / TypeScript Windows application shell.
- Added an accessible archive overview with local-only messaging, category browsing, filename search, and sorting.
- Added a Rust ZIP metadata scanner with a native file picker and no archive extraction.
- Added basic classification for photos, videos, messages, posts, comments, reactions, friends and profile-related files.
- Added synthetic Rust scanner tests, TypeScript utility tests, a Windows build workflow and contributor guidance.
- Integrated the three Open-Photo design skill instructions (UI/UX Pro Max, Impeccable, Emil).

**Known limits:** This version inventories ZIP member metadata only. It does not read posts/messages, render extracted photos/videos, index all files in large exports, or persist imported archives. Maximum 250,000 ZIP entries and at most 5,000 filenames returned to the UI. No installer/release is published until Windows CI and manual verification pass.
