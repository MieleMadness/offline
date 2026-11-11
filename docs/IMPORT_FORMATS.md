# Importing Facebook HTML and JSON exports

Meta's Export/Download Your Information options include **HTML** and **JSON**. Their contents vary with account, selected categories, date range, media quality, export date and ongoing platform changes. The same app views must work for supported data from either format.

## Sources and evidence
- Meta's data portability documentation describes HTML ZIP files with an `index.html` and folders/media, versus machine-readable JSON: https://about.fb.com/wp-content/uploads/2020/08/Facebook-Comments-to-FTC-on-Data-Portability.pdf
- Meta describes centralized Accounts Center and profile-specific exports: https://about.fb.com/news/2023/10/manage-your-information-across-apps/

## Ingestion pipeline
`ZIP(s) / extracted folder → read-only source validation → format detection → format-specific adapter → canonical records with provenance → per-profile index → UI`

Every record carries `profile_id`, `import_id`, `source_path`, source format, optional timestamp, and parsing confidence/limitation. The UI may show a partial preview with explicit omitted counts.

### Supported format signatures
| Container | Detection | Adapter |
| --- | --- | --- |
| Facebook JSON ZIP | `.json` files and recognized directory/metadata patterns | Rust JSON parser with strict read/decompression budgets |
| Facebook HTML ZIP | `index.html` plus HTML category/message/post files | Rust *non-executing* DOM parser and per-export-version selectors |
| Mixed ZIP | Both JSON and HTML members | Scan both formats; matching content can appear twice until reconciliation ships |
| Extracted folder | `index.html`/JSON structure; recursively scanned under approved root | Future support with symlink/path safeguards |
| Multipart ZIP | same profile, multiple ZIPs/parts | Future batch import with hashing, dedupe and provenance |

The format dropdown should be **Auto detect** by default, with an override only for advanced troubleshooting. Do not insist users choose JSON when they already have HTML.

v0.4.1 accepts a leading UTF-8 BOM in JSON and reads machine-readable HTML time attributes before localized text on the same element. A synthetic archived-thread fixture combines one JSON and one HTML part with the same sender and timestamp.

### Canonical data types
1. `Post`: author, timestamp, caption/body, media references, reactions/comments when present, original source path.
2. `Media`: type, URI inside export, album association, timestamps and descriptive metadata.
3. `Conversation`: title, participant names, export thread identifier, message source parts.
4. `Message`: sender, timestamp, body, attachment refs and supported reactions.
5. `AccountDataRecord`: category, title, value/description, timestamp, source provenance and sensitivity tier.
6. `ImportReport`: parsed/skipped/error count, missing categories, selected format, export date-range scope when known.

### HTML parsing safety
- **Never** render exported HTML as live HTML in the Tauri WebView, never run scripts or open external URLs automatically.
- Parse as text/DOM on the native side; use allowlisted nodes/fields and show escaped text through React.
- Parse dates conservatively with locale/format provenance. Ambiguous dates stay unknown rather than assigning a fabricated timestamp.
- Ignore HTML event handlers, scripts, remote images and embedded code.
- Resolve image/video references only within validated archive paths and size/mime limits.

### JSON parsing safety
- Defensive schema adapters per category/version, no assumption that one key exists in all exports.
- Cap data decompression and parsing; use streaming/SQLite for large datasets in later phases.
- Handle UTF-8, JSON strings and legacy Facebook encoding quirks with regression fixtures.
- Synthetic test bundles for Facebook posts, Messenger multi-part files, friends, searches, advertising, login and off-platform activity.

### Honest support levels
- **Detected:** format and sections recognized, no content promised.
- **Preview:** selected posts/messages/data records parsed; limitations displayed.
- **Supported:** representative fixtures and real-world schema variants tested for that category, accessible UI and provenance.
- **Not supported:** categorized/skipped with clear explanation and link to file inventory.

**Initial 0.2.0 status:** JSON preview only. **0.3.0 target:** first HTML post/message/data adapter, common import report, and profile-specific ownership; no claim of universal HTML/JSON compatibility until test matrix passes.


## v0.7.0 — Image preview scope

Recognized JSON photo and attachment-media URI fields and HTML image src fields are resolved only to local ZIP member paths. Remote URLs, data URLs, scripts, SVG and paths escaping the ZIP root are never loaded. The dedicated Photographs gallery uses the existing bounded inventory of up to 5,000 ZIP paths and does not require a post association. Supported images are JPEG/PNG/GIF/WebP up to 4 MiB uncompressed. Video/HEIC files, images with unsupported references and members outside the indexed inventory remain unpreviewable. Media is read only when needed in the current profile session, never stored inside an encrypted saved preview or portable backup.


## v0.10.0 — Import confidence and replacement safety

- Read-only scanning distinguishes useful decoded records from a ZIP containing only navigational HTML, empty JSON or unrecognized files. No-content ZIPs are rejected without replacing an existing preview.
- Media-only ZIPs are permitted as an inventory preview, with a clear limitation: posts, messages and account records were not decoded. This is not an assertion that all media binaries can be displayed.
- Import coverage includes post/message/record counts, media inventory, text-file counts and skipped parsing warnings. Unsupported records and partial archives must never be presented as complete Facebook history.
- When a profile already has an archive, newly parsed data is staged in memory. The user must explicitly choose to replace the existing preview, and an encrypted saved copy requires typing REPLACE. This does not merge multiple ZIP exports.
- Timestamp adapters accept valid Unix seconds, explicitly named millisecond timestamps, unambiguous 13-digit numeric millisecond values and numeric strings. Common explicit English HTML timestamps are supported. Invalid or ambiguous dates remain unknown. Any local date without a timezone is currently interpreted as UTC for approximate sorting, documented as a limitation.


## Reproducible synthetic acceptance archives

Offline tracks a privacy-safe Python standard-library generator and tests for fictional Facebook-style JSON, HTML, multipart Messenger, media-only, navigation-only, malformed JSON and mixed timestamp cases. See [Synthetic test archives](SYNTHETIC_FIXTURES.md). These fixtures exercise known parser paths but cannot establish universal compatibility with real Meta export formats.


## v0.12.0 — Full ZIP photograph directory (read-only)

The saved import report still contains at most 5,000 file records, while its section totals reflect the inspected ZIP. With the original ZIP connected, the Photographs page uses a separate on-demand native command to scan **all** eligible ZIP member names, up to the existing 250,000-entry ZIP limit. A bounded response returns at most 24 JPEG/PNG/GIF/WebP candidate image filenames per UI page, including those beyond the saved 5,000-record inventory. Search filters ZIP-contained image paths; it never fetches remote media or writes thumbnails.

The page's ZIP-directory index is checked against the selected member name when bytes are opened. Images above 4 MiB and unsupported formats are excluded, while inline post/message images without a directory index use conservative member-name lookup. The scan is metadata-only and repeated for each page request; it is **not** a persisted full-file index or a guarantee of fast performance on very large archives. When no original ZIP is connected, only saved inventory images are shown.
