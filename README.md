# Offline

**Offline** — *Your memories, on your terms.*

A privacy-first Windows desktop application for exploring downloadable social history, starting with Facebook. Offline turns exported posts into a chronological feed, organizes Messenger conversations by participant and date, and shows the account/activity records actually found in the files. No account login or cloud uploads.

> **Development status:** v0.3.0 family/format preview on `feature/family-formats-0.3.0`. No verified public installer yet. v0.2.0 is the last native-verified baseline.

## The experience

| Area | What you'll see |
| --- | --- |
| My Timeline | Familiar post cards sorted by month and date, with year filters and attachment references |
| Messages | Conversation list by name, sender, dates and chronological message bubbles |
| Your Data | Categorized previews of account, advertising, searches, devices, locations and other exported activity |
| Archive Files | Read-only ZIP inventory for original filenames, sizes and metadata |
| Family Profiles (preview) | Create and switch among local family member names; imports belong to one chosen profile |

**Import both Facebook export formats:** ZIP bundles with **JSON** or **HTML** content are recognized and routed to format-specific parsers that populate the same views. This is *initial preview support*, not universal compatibility with every Meta export variation. The import summary explains what was scanned or skipped.

## Important family privacy distinction

Family profiles currently organize content in app memory. Names/colors can be saved as local app preferences, but imported post/message contents are **not** persisted between app restarts. Profile switching is **not authentication or encryption**; everyone using the same Windows login could potentially switch to another person's preview. For private family use before encrypted profile vaults ship, use separate Windows user accounts and do not import sensitive archives when someone else has access to your OS session.

Individual archives remain read-only. Offline never requests Facebook credentials or uploads ZIP content.

## Local development on Windows

Prerequisites: Node.js 22+, Rust (MSVC), Visual Studio C++ Build Tools, and the Tauri 2/WebView2 Windows prerequisites.

```powershell
git clone https://github.com/MieleMadness/offline.git
cd offline
git checkout feature/family-formats-0.3.0
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

GitHub runs lightweight frontend checks on pull requests. The full Windows compilation is opt-in for milestone verification via manual workflow dispatch or a temporary `[windows]` PR title marker. Keep package, Tauri, Cargo, CI and release versions synchronized. Green baseline: 0.2.0 → next feature minor 0.3.0; if 0.3.0 is red, use 0.3.1 for the targeted fix.

## Current safety and limitations

- Only local ZIP imports, never unzip/export to disk or execute imported HTML/JavaScript.
- HTML is parsed as inert text/DOM; exports with unrecognized HTML layouts may show empty/missing sections.
- JSON and HTML file reading is bounded to protect memory; current limits are 1,000 candidate files, 4 MiB per text file, and 48 MiB text data per archive, with additional post/message/record caps.
- UTF-8 HTML is supported; HTML using other encodings may be skipped with a warning.
- Media referenced by a post is not yet decoded or displayed.
- Some export timestamps are ambiguous; timezone-less HTML dates are approximate, and unsupported dates remain undated.
- Some encrypted Messenger history may not appear in a standard Facebook export.
- Family archive imports are currently session-only; multi-file reconciliation and persistent storage are future milestones.
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
