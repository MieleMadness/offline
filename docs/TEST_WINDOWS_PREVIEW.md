# Testing the unsigned Windows development executable

Offline is still a **development preview**, not a public release or supported installer. The on-demand Windows build can produce a portable `offline.exe` solely for controlled testing with **fictional ZIP files**. Do not import personal Facebook exports or private backups into a public test machine.

## Build and get the artifact

1. Open the [Offline GitHub Actions page](https://github.com/MieleMadness/offline/actions) and select a successful **Offline 0.16.0 · Verify** run whose Windows native checks completed.
2. Under the run's **Artifacts** section, choose **Offline-v0.16.0-Windows-unsigned-preview**. This only exists for a successful full Windows build; fast checks and targeted `[rust]` jobs do not generate one.
3. Extract the artifact to a temporary test directory. It contains `offline.exe`, `SHA256SUMS.txt`, `third_party/licenses/Apache-2.0.txt`, `THIRD_PARTY_NOTICES.md`, and `models/embeddinggemma-2.manifest.json`. The artifact is retained for seven days and is not a stable release URL.
4. Verify the file fingerprint in PowerShell:

```powershell
Get-FileHash .\offline.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

The SHA-256 hex printed by PowerShell must match the checksum file. A checksum detects a mismatch against the build artifact, but it does **not** substitute for code signing or an independent trust review.

## AI and license boundaries

The executable includes an **Open-source model licenses** dialog with offline-readable Apache 2.0 terms and EmbeddingGemma 2 attribution. Open this from the sidebar and verify the contents match the artifact's notice/license files. The bundled app **does not yet include model weights or an inference runtime**; semantic search still requires a separately installed local Ollama and `embeddinggemma-2:440m`. The manifest accurately records the unbundled state.

The SHA-256 checksum is for the executable only. Verify the license/notices are present but do not treat this preview as a complete license/SBOM audit or a self-contained AI installer.

## Offline AI pack preflight — v0.16.0

The optional local AI panel now has **Inspect local .offlineai pack**. If supplied a candidate ZIP on disk/USB, this read-only tool checks its manifest and streamed SHA-256 digests. It **never extracts, installs, executes or activates** the model, and it always reports that the publisher is **not authenticated**. A ZIP and its checksums can be forged together. This does not remove the current separate Ollama dependency for optional semantic search.

For the release-blocking acceptance procedure and future independent source verification, see [the offline AI pack format](OFFLINE_AI_PACK.md). Use only fictional model ZIPs and fictional social archives in this unsigned preview.

## Safer test environment

- Prefer a disposable Windows user account or virtual machine. This is an **unsigned executable** and Windows security controls may block it; do not disable corporate security policy to run it.
- Do not treat the absence of an installer as proof of portability: Tauri/WebView2 can create application settings and local storage under the Windows user profile. The executable alone is not necessarily the only data to clean up.
- For reproducible test data, generate the [fictional Facebook-style ZIP archives](SYNTHETIC_FIXTURES.md) with Python. Those ZIP files are not bundled into the executable.
- First import `family-json.zip` into one fictional family profile. Verify the feed, Messenger threads, dates and photos. Import `family-html.zip` into a second profile and test isolation.
- Test the photo viewer, page boundaries, ZIP reconnection, erroneous/empty imports, typed replacement and backup recovery with **synthetic content and disposable secrets** only.
- Check accessibility, focus order, error handling and performance against the [Windows acceptance checklist](ACCEPTANCE.md).

## Reporting findings

Provide the exact development version and GitHub Actions run, the fictional fixture filename, steps to reproduce, expected versus observed outcome and the error category. Screenshots must contain only fictional fixture content. Never upload real Messenger messages, account data, locations, PINs, original Facebook ZIPs or encrypted backup files to GitHub issues.

## Release limits

This workflow does **not** create an installer, apply a publisher signature, auto-update the app, certify a secure desktop build or authorize v1.0 distribution. Security review, redacted real-export compatibility, large-library performance and manual Windows tests remain release blockers.
