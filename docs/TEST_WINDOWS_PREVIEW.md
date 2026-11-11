# Testing the unsigned Windows development executable

Offline is still a **development preview**, not a public release or supported installer. The on-demand Windows build can produce a portable `offline.exe` solely for controlled testing with **fictional ZIP files**. Do not import personal Facebook exports or private backups into a public test machine.

## Build and get the artifact

1. Open the [Offline GitHub Actions page](https://github.com/MieleMadness/offline/actions) and select a successful **Offline 0.13.0 · Verify** run whose Windows native checks completed.
2. Under the run's **Artifacts** section, choose **Offline-v0.13.0-Windows-unsigned-preview**. This only exists for a successful full Windows build; fast checks and targeted `[rust]` jobs do not generate one.
3. Extract the artifact to a temporary test directory. It contains `offline.exe` and `SHA256SUMS.txt`. The artifact is retained for seven days and is not a stable release URL.
4. Verify the file fingerprint in PowerShell:

```powershell
Get-FileHash .\offline.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

The SHA-256 hex printed by PowerShell must match the checksum file. A checksum detects a mismatch against the build artifact, but it does **not** substitute for code signing or an independent trust review.

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
