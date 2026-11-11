# Offline

**Offline** — *Your memories, on your terms.*

A privacy-first Windows desktop application for exploring downloadable social history, starting with Facebook. Offline turns exported posts into a chronological feed, organizes Messenger conversations by participant and date, and shows the account/activity records actually found in the files. No account login or cloud uploads.

> **Development preview v0.7.0.** Adds optional encrypted saved previews, workspace PINs and local keyword/AI discovery. The v0.3.0 baseline passed frontend checks, Rust tests and the [Windows executable build](https://github.com/MieleMadness/offline/actions/runs/43038624307). No public installer.

## The experience

| Area | What you'll see |
| --- | --- |
| My Timeline | Familiar post cards sorted by month and date, with year filters and attachment references |
| Messages | Conversations organized by sender and date, plus recognized local image attachments |
| Photographs | Lazy photo gallery from the selected ZIP (JPEG, PNG, GIF and WebP up to 4 MiB) |
| Your Data | Categorized previews of account, advertising, searches, devices, locations and other exported activity |
| Search library | Profile-scoped keyword search across recognized posts, messages and data, with date/category filters and source details; no AI required |
| Archive Files | Read-only ZIP inventory for original filenames, sizes and metadata |
| Encrypted backup and recovery (preview) | Back up an unlocked saved preview to a local encrypted file and restore it using the original secret; existing saved copies cannot be overwritten |
| Family Profiles (preview) | Create, rename and switch between local family members; remove a profile with typed confirmation and backup guidance |

**Import both Facebook export formats:** ZIP bundles with **JSON** or **HTML** content are recognized and routed to format-specific parsers that populate the same views. This is *initial preview support*, not universal compatibility with every Meta export variation. The import summary explains what was scanned or skipped.

## On-demand photo previews (development preview)

Open **Photographs** after importing a Facebook HTML or JSON ZIP to see supported local images. Recognized post photos and Messenger images can also appear inline. Supported previews include JPEG, PNG, GIF and WebP up to 4 MiB each. No photos are extracted to disk or uploaded. Videos, HEIC and some export variations are not supported yet.

When reopening a saved encrypted preview, choose **Connect photos** and reselect the original ZIP. Offline compares the indexed inventory, but this comparison is not a cryptographic signature. The source path stays only in the current profile's memory and is disconnected on lock or profile switch. Encrypted backup files do not include original ZIPs or image binaries.

## Family profile management (development preview)

Use **Manage family profiles** in the family switcher to rename a profile without changing its owner identity or encryption. Removing a profile first deletes its saved encrypted preview from this installation, then removes its local profile record and in-memory session preview. The original Facebook ZIP and any exported backup files remain untouched. Deletion requires typing the profile name and acknowledging that saved data will be lost. Recover from an independent encrypted backup if needed. A shared Windows account does not protect anyone's local profile metadata or saved encrypted blobs from deletion by another OS user.

## Portable backup and recovery (development preview)

Unlock a saved profile and select **Backup** to write a .offlinevault file to a location you choose. The original ZIP and media binaries are not part of the encrypted preview backup. The file contains the already encrypted snapshot plus visible profile name and accent metadata. Store its file and PIN/passphrase separately: losing the secret means it cannot be decrypted.

Select **Restore encrypted backup** from the sidebar, including when you have no profiles on a fresh installation. Choose the backup, enter the original PIN or passphrase, and confirm. Offline validates the decrypted preview before saving and never silently overwrites an existing encrypted snapshot. Recovery recreates the profile ID so the owner-bound ciphertext stays readable.

Backups use a no-overwrite file operation; some filesystems without hard-link support cannot complete it. Keep the original ZIP separately; this is not a complete backup of Facebook media. Native restore acceptance and independent security assessment remain pending.

## Important family privacy distinction

Ordinary imports stay in memory until you close Offline. Anyone using the app can select an ordinary profile. To keep a preview, choose **Save encrypted copy**, set a unique passphrase, and retain your original ZIP. Offline immediately locks the saved copy. Unlocking allows browsing or replacing that profile’s saved preview. Use **Lock preview** before handing over the device. Switching profiles and reopening the app also require unlocking again.

Profile names and colors remain visible. The original ZIP has its original Windows file permissions. The passphrase protects the saved snapshot only. Losing the passphrase means reimporting the ZIP into another profile. Clearing WebView app data removes saved previews. Keep independent backups.

Individual archives remain read-only. Offline never requests Facebook credentials or uploads ZIP content.

## Local development on Windows

Prerequisites: Node.js 22+, Rust (MSVC), Visual Studio C++ Build Tools, and the Tauri 2/WebView2 Windows prerequisites.

```powershell
git clone https://github.com/MieleMadness/offline.git
cd offline
git checkout feature/family-profile-management-next
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

v0.5.1 includes a PIN option for encrypted workspaces, instant keyword search across each active profile’s parsed preview, and optional bounded local AI search for text and images through installed Ollama models. See [setup, scope and verification](docs/LOCAL_AI_SEARCH.md). Real inference acceptance remains pending because the installed model failed to load on this computer.
