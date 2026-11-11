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
| Mixed ZIP | Both JSON and HTML members | Detect primary/duplicate categories; never double-count silently |
| Extracted folder | `index.html`/JSON structure; recursively scanned under approved root | Future support with symlink/path safeguards |
| Multipart ZIP | same profile, multiple ZIPs/parts | Future batch import with hashing, dedupe and provenance |

The format dropdown should be **Auto detect** by default, with an override only for advanced troubleshooting. Do not insist users choose JSON when they already have HTML.

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
