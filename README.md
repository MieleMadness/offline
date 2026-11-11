# Offline

**Offline** — *Your memories, on your terms.*

A privacy-first Windows desktop application for exploring downloadable social history, starting with Facebook. Offline turns exported posts into a chronological feed, organizes Messenger conversations by participant and date, and shows the account/activity records actually found in the files. No account login or cloud uploads.

> **Development preview v0.4.1.** Adds optional encrypted saved previews. The v0.3.0 baseline passed frontend checks, Rust tests and the [Windows executable build](https://github.com/MieleMadness/offline/actions/runs/43038624307). No public installer.

## The experience

| Area | What you'll see |
| --- | --- |
| My Timeline | Familiar post cards sorted by month and date, with year filters and attachment references |
| Messages | Conversation list by name, sender, dates and chronological message bubbles |
| Your Data | Categorized previews of account, advertising, searches, devices, locations and other exported activity |
| Search library | Profile-scoped keyword search across recognized posts, messages and data, with date/category filters and source details; no AI required |
| Archive Files | Read-only ZIP inventory for original filenames, sizes and metadata |
| Family Profiles (preview) | Create and switch among local family member names; imports belong to one chosen profile |

**Import both Facebook export formats:** ZIP bundles with **JSON** or **HTML** content are recognized and routed to format-specific parsers that populate the same views. This is *initial preview support*, not universal compatibility with every Meta export variation. The import summary explains what was scanned or skipped.

## Important family privacy distinction

Ordinary imports stay in memory until you close Offline. Anyone using the app can select an ordinary profile. To keep a preview, choose **Save encrypted copy**, set a unique passphrase, and retain your original ZIP. Offline immediately locks the saved copy. Unlocking allows browsing or replacing that profile’s saved preview. Use **Lock preview** before handing over the device. Switching profiles and reopening the app also require unlocking again.

Profile names and colors remain visible. The original ZIP has its original Windows file permissions. The passphrase protects the saved snapshot only. Losing the passphrase means reimporting the ZIP into another profile. Clearing WebView app data removes saved previews. Keep independent backups.

Individual archives remain read-only. Offline never requests Facebook credentials or uploads ZIP content.

## Local development on Windows

Prerequisites: Node.js 22+, Rust (MSVC), Visual Studio C++ Build Tools, and the Tauri 2/WebView2 Windows prerequisites.

```powershell
git clone https://github.com/MieleMadness/offline.git
cd offline
git checkout feature/encrypted-library-0.4.1
npm install
npm run tauri dev
```

Local validation (recommended after each cohesive change):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

When a milestone requires a Windows binary:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1 -BuildDesktop
```

GitHub runs lightweight frontend checks on pull requests. The full Windows compilation is opt-in for milestone verification via manual workflow dispatch or a temporary `[windows]` PR title marker. Keep package, Tauri, Cargo, CI and release versions synchronized. Advance a verified green feature by one minor version and use a patch for failed-build corrections.

## Current safety and limitations

- Only local ZIP imports, never unzip/export to disk or execute imported HTML/JavaScript.
- HTML is parsed as inert text/DOM; exports with unrecognized HTML layouts may show empty/missing sections.
- JSON and HTML file reading is bounded to protect memory; current limits are 1,000 candidate files, 4 MiB per text file, and 48 MiB text data per archive, with additional post/message/record caps.
- UTF-8 HTML is supported; HTML using other encodings may be skipped with a warning.
- Media referenced by a post is not yet decoded or displayed.
- Some export timestamps are ambiguous; timezone-less HTML dates are approximate, and unsupported dates remain undated.
- Some encrypted Messenger history may not appear in a standard Facebook export.
- Each profile can keep one encrypted snapshot. Backup/restore, passphrase changes, scheduled locking, multipart reconciliation and indexed search remain open.
- Only synthetic data should be used in tests, issues and CI logs.

## Project guide

- [Brand, fonts, palette and interface style](docs/BRAND_GUIDE.md)
- [Complete phased roadmap](docs/ROADMAP.md)
- [Family architecture and protection requirements](docs/FAMILY_ARCHITECTURE.md)
- [HTML and JSON import strategy](docs/IMPORT_FORMATS.md)
- [Security boundaries](docs/SECURITY.md)
- [Required three design skills](docs/DESIGN_SKILLS.md)
- [Changelog](CHANGELOG.md)

The application's open-source license is still to be selected. Bundled third-party skill files retain their own licenses.

## Workspace PIN and local AI search

v0.5.0 adds a PIN option for encrypted workspaces, instant keyword search across each active profile’s parsed preview, and optional bounded local AI search for text and images through installed Ollama models. See [setup, scope and verification](docs/LOCAL_AI_SEARCH.md). Real inference acceptance remains pending because the installed model failed to load on this computer.
