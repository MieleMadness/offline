# Offline portable encrypted backup — development preview

## What it protects

An encrypted .offlinevault file contains a saved profile's encrypted preview and public profile metadata (name, ID, accent, creation timestamp). It preserves readable posts, messages, data summaries and file inventory previously saved to IndexedDB. It does **not** include the original Facebook ZIP or any media binaries.

## Create a backup

1. Open the family profile and unlock its saved preview.
2. Choose **Backup**, select a new filename and keep the file on storage you control. Nothing is intentionally uploaded.
3. Keep the original PIN or passphrase somewhere separate and safe. Offline cannot reset it.
4. Make a second independent copy for disaster recovery. Existing backup files are never overwritten.

## Recover after a device reset or data loss

1. Open Offline, even with an empty family library.
2. Choose **Restore encrypted backup**, select the file, and enter the secret that originally protected the preview.
3. Offline decrypts and validates the preview in memory before any restore write.
4. If the matching owner profile has no saved preview, the profile is recovered in a locked state. The same owner ID is used so authenticated ciphertext can be opened.
5. If a matching profile already has saved data, the restore refuses to replace it.

## Privacy and current limits

- The profile name and snapshot size are visible inside the backup file. Posts, conversations and sensitive account data remain AES-256-GCM ciphertext.
- A short PIN is weaker against offline guessing. Prefer a long passphrase for portable backups.
- A backup cannot be decrypted without its original secret.
- The original ZIP and any media binaries are not included; if this is your only copy, it will not recover photos or videos.
- Only .offlinevault files are supported, capped at 128 MiB with ciphertext at 90 MiB. Saves require a filesystem supporting hard links for no-overwrite finalization.
- Recovered data is only the parsed preview supported by that app version. This is not full-fidelity Facebook data backup.
- Native Windows restore, storage failure and stress testing, and an independent encryption/security review remain required before general release.
