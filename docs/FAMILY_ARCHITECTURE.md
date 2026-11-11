# Offline Family Library — Profiles, Permissions & Storage

## Product contract
Offline supports **multiple local family members** without forcing a Facebook/Meta login. A profile is an app identity chosen by the user, not a claim of verified Facebook identity.

### First-run experience
1. Select **Create family library** or **Just for me** (both use the same internal profile model).
2. Create the first profile with display name and optional avatar color. Avoid collecting date of birth unless essential to a feature.
3. Switch profiles via a permanent profile selector in the sidebar/topbar.
4. Each import is assigned to **exactly one profile** by deliberate selection. If the archive metadata suggests a different owner, show a warning and require confirmation; never silently merge families' archives.
5. For children, a parent can label profiles but should not automatically receive access to their private messages.

### Access behavior
- Private by default: posts, conversations, searches, security events and data records belong to one owner.
- A family group is only a local organizational container. Being in the same group does **not** grant access.
- Future **Family Memories** view may contain selected posts/photos when the owner opts to share them individually or by a clearly scoped collection.
- Sharing is revocable. Shared views must reflect revocation immediately. Never automatically share messages, searches, device/login history, location traces or ad-interest records.
- Never silently join people based on the same name, email, group chat or photo. Provide explicit deduplication and conflict review.

### Security boundary — communicate honestly
Local profile selection and a PIN *without encryption* are not reliable protection against someone using the same Windows account. Ordinary session previews are organizational. In v0.4.1 a user may save one encrypted snapshot per profile and unlock it with a separate passphrase. Original ZIPs still require OS-level protection. See [the implemented boundary](SECURITY.md).
- Before shipping a family library with sensitive persistent data, implement encryption-at-rest of each profile's content/index, backed by vetted platform key storage or a user passphrase, with authenticated encryption. No custom cryptography.
- Define recovery/export behavior early. Losing a local encryption key must not silently destroy original ZIP archives; those remain separately owned.
- Windows DPAPI ties keys to Windows users; it alone does not isolate profiles sharing one Windows login. Design an additional per-profile secret if strong within-account isolation is required.
- No cloud sync or family-network server by default; any future multi-device sharing must require explicit consent.

### Storage model (target)
- `family_library`: settings, profile IDs and ordering, not personal exports.
- `profiles`: random UUID, display name, avatar color, created/updated timestamps.
- `imports`: UUID, profile_id, source fingerprint, source format (HTML/JSON), original file locator, scope, imported-at and warnings.
- `post`, `conversation`, `message`, `media`, `data_record`: each row must have a non-null `profile_id` or follow a foreign-key chain to one.
- `family_share`: owner_id, viewer/group, object IDs, explicit scope/approval and revocation timestamp.
- No global unscoped full-text index containing content from multiple profiles.
- One app-data directory per Windows OS account; one isolated database/vault directory per family profile; maintain backup and migration support.
- Never store raw Facebook login credentials or reuse access tokens.

### Definition of done for multi-user support
- Create, rename, switch and remove profiles safely; destructive delete requires confirmation and export/backup warning.
- Import a ZIP into one profile without affecting other profiles.
- Search, timeline, messages, media and data explorer scoped to current profile at both the UI and database/query layer.
- Switch while an import is running cannot display results in a different profile; cancellation and completion are owner-bound.
- Two people with identically named conversations/files remain isolated.
- Family Memories sharing is opt-in and revocable, with regression tests for scope leaks.
- Document exact security guarantee of the current build. **Profile switcher alone is not authentication.**

## Local profile management (development preview)

Renaming a local profile changes only its display name, preserving the immutable owner ID so the encrypted snapshot remains decryptable. Deletion requires explicit typed-name confirmation and an acknowledgement that it deletes the stored encrypted preview, in-memory imported preview and local profile metadata. IndexedDB deletion compares the saved revision before removing the entry. The original Facebook ZIP and any portable encrypted backup remain outside the app's deletion scope. This is a data management confirmation, **not** authorization against another person with access to the same Windows account.
