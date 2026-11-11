# Offline

**Offline** is a privacy-first Windows desktop app for exploring downloadable social-media history, starting with Facebook JSON archives. Everything is processed on your own computer without account login or cloud uploads.

> **Status:** v0.2.0 is in development. The social timeline, conversations and data explorer are preview features; there is no verified public installer yet.

## Your archive, the way it should look

**Timeline.** Posts appear in a familiar social feed, sorted by original date and grouped by month. Search their text, filter by year and identify posts with media references.

**Messages.** Conversations are grouped by people, and messages are presented in date order with sender names, timestamps and text. Multipart `message_1.json` / `message_2.json` threads are combined by conversation folder.

**Your data.** Explore the JSON export categories that were actually found, such as advertising-related information, searches, location/check-ins, devices/login history, connections and off-platform activity. Data coverage depends on the export; Offline doesn't claim to show everything Meta has stored.

**Files.** Search the original ZIP inventory by filename or size.

The three core views use a desktop-first UI with clear typographic hierarchy, light/dark mode, keyboard focus and reduced-motion support.

## Development and local verification

Prerequisites: Node.js 22+, Rust stable (MSVC on Windows), Visual Studio C++ Build Tools and Tauri 2 Windows WebView2 prerequisites.

```powershell
git clone https://github.com/MieleMadness/offline.git
cd offline
git checkout feature/social-archive-0.2.0
npm install
npm run tauri dev
```

For normal development, **test locally**, not in a full GitHub Windows workflow every time:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1
```

For an on-demand Windows executable build:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-local.ps1 -BuildDesktop
```

GitHub runs short frontend checks on pull requests. Full Windows compilation runs only on manual workflow dispatch or a PR explicitly titled with `[windows]`. Don't release without verifying the exact commit and testing a Windows installation.

## Privacy and current limits

- Import a local Facebook ZIP archive. ZIP bytes and all processing stay on your device.
- Source ZIP is read-only; JSON entries are read into **bounded, in-memory** structures, not extracted to folders or persisted to disk.
- Limits: 250,000 archive entries; 1,000 JSON files; 4 MiB per JSON file; 48 MiB JSON data total; 3,000 posts; 500 conversations; 12,000 messages; 900 data-preview records. Additional records may be omitted.
- Posts, participants and activity vary significantly among Meta export versions; content may be incomplete.
- Media thumbnails and original media are **not rendered yet**. Only attachment counts are shown.
- Facebook HTML exports and separate encrypted Messenger downloads are **not yet supported**.
- Some Messenger exports may contain garbled Unicode or incomplete encrypted history; future compatibility passes will address these.
- React displays imported text safely as text (never as executable HTML); archive scripts are never run.

Never commit a real user's archive or messages to GitHub. Synthetic fixtures only.

## Design and engineering

- [AGENTS.md](AGENTS.md) — development discipline, version policy, and required three design skills
- [DESIGN.md](DESIGN.md) — the social archive design system
- [docs/DESIGN_SKILLS.md](docs/DESIGN_SKILLS.md) — UI/UX Pro Max, Impeccable, and Emil design engineering
- [docs/ROADMAP.md](docs/ROADMAP.md) — phases and acceptance criteria
- [docs/SECURITY.md](docs/SECURITY.md) — boundaries and limits
- [CHANGELOG.md](CHANGELOG.md) — release history

Offline's own license remains undecided. Bundled third-party design skills retain their respective licenses.
