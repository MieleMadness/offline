# Offline

**Offline** is a privacy-first Windows desktop application for browsing personal data archives, starting with Facebook downloads. It's designed to run locally without requiring a Facebook password, account connection, or cloud upload.

> **Status:** v0.1.0 in active development. The first desktop build is an archive **inventory preview** only. There is no verified public installer yet.

## What you can do in v0.1.0

- Select a local `.zip` file with the native Windows file picker.
- Inspect ZIP directory metadata locally without extracting or changing the source archive.
- See total file counts, uncompressed size, and approximate categories (photos, videos, messages, posts, comments, reactions, friends, profile data and other files).
- Search and sort the first 5,000 ZIP entries by file path and size.
- Navigate a responsive, keyboard-accessible desktop interface with system light/dark mode support.

**Not available yet:** Viewing actual messages, extracting or previewing photos/videos, reading post content, scanning every filename beyond 5,000 entries in the UI, preserving an indexed archive across restarts, and HTML export parsing. Classifications are based on *filenames only* and are approximate. Large ZIPs containing more than 250,000 directory entries are rejected in this initial version.

## Start developing on Windows

Prerequisites: Node.js 22+, Rust stable with the MSVC toolchain, Microsoft C++ Build Tools, and the Tauri 2 Windows prerequisites (WebView2). See [Tauri's Windows prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
git clone https://github.com/MieleMadness/offline.git
cd offline
npm install
npm run tauri dev
```

If you're using the feature branch before it merges into main:

```powershell
git checkout feature/desktop-archive-foundation-0.1.0
```

### Check code

```powershell
npm run check
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npx tauri build --no-bundle
```

The v0.1.0 build is currently configured as **no-bundle** on purpose; we won't ship a Windows installer until Windows checks and manual acceptance are complete. Initial CI uses `npm install`; a committed npm lockfile will be required before a production release for reproducibility.

## Privacy and security

- Source archives are opened **read-only**.
- Archive member data is not decompressed, executed, displayed as HTML, or uploaded.
- Unsafe archive paths, oversized member names and unsupported ZIPs produce actionable errors.
- No real user archives, messages, photos or database files should ever enter Git history or CI.
- See [security model](docs/SECURITY.md) for current controls and planned hardening.

## Development practices and skills

The three design skills from Open-Photo are stored in [`.agents/skills`](.agents/skills): **UI/UX Pro Max**, **Impeccable**, and **Emil Design Engineering**. Coding agents must read and apply them before changing UI, as required by [AGENTS.md](AGENTS.md). Full supporting script/data packages can be installed at pinned versions with [the Windows setup script](scripts/install-design-skills.ps1).

- [Design system](DESIGN.md)
- [Roadmap](docs/ROADMAP.md)
- [Skill setup](docs/DESIGN_SKILLS.md)
- [Changelog](CHANGELOG.md)

## Licensing

Offline's own application license has not been selected yet. The bundled third-party design skills retain their respective MIT/Apache-2.0 licenses and original attribution.
