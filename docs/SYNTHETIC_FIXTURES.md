# Reproducible Facebook-style test archives

These archives are **fictional** and exist only to test Offline's local HTML/JSON import and media-preview workflows. They are not official Meta sample exports. Never commit, upload, screenshot, or send real Facebook archives, private messages, photos, PINs, or encrypted `.offlinevault` backups to GitHub.

## Generate synthetic archives

Use Python 3.10 or later (standard library only) from the repository root:

```powershell
py -3 scripts/generate_facebook_fixtures.py --output fixtures/generated
py -3 -m unittest discover -s scripts -p "test_fixture_generator.py"
```

On macOS/Linux or when `py` isn't available, replace `py -3` with `python3`.

The command generates ZIP archives and a `manifest.json` containing a file count, deterministic SHA-256 hash and the expected scenario. ZIP entry timestamps are fixed so repeated runs produce the same hashes. `fixtures/generated/` and ZIP file extensions are Git-ignored.

| Fictional archive | Expected behavior |
| --- | --- |
| `family-json.zip` | JSON posts (dated and undated), a Messenger conversation split between two files, search and ad data, PNG images |
| `family-html.zip` | Non-executing HTML posts, two Messenger pages, selected data records, local relative PNG image |
| `media-only.zip` | File/media inventory only. Posts and messages must be described as absent, not fabricated |
| `navigation-only.zip` | No useful decoded content. Import must reject it without overwriting the existing preview |
| `invalid-json.zip` | Malformed post JSON, no useful records. Import must reject it with a skipped-file warning |
| `timestamp-variants.zip` | Seconds, millisecond values, numeric strings and an unknown date |
 
For an optional performance trial with **10,125** fictional 1×1 images, including images beyond the first 5,000 ZIP members:

```powershell
py -3 scripts/generate_facebook_fixtures.py --output fixtures/generated --large-count 10125
```

This tests ZIP directory handling and gallery paging; it does **not** prove full-resolution 10,000-photo performance or real-world HEIC/JPEG/video safety.

## Manual smoke test

1. Open Offline and create family profile **Alex**. Import `family-json.zip`. Expect three timeline posts, one conversation with three messages, recognized account data, two tiny photos and unknown-date handling.
2. Create **Taylor** and import `family-html.zip`. Expect HTML posts and messages grouped into one conversation, a locally resolved photo and no content copied into Alex's profile.
3. Reopen Alex, unlock a saved encrypted preview and select `navigation-only.zip`. Import should refuse the ZIP **without changing the existing snapshot**.
4. Select `media-only.zip`. It should be staged for comparison, with clear disclosure that no posts/messages were decoded. Cancel, then confirm Alex's existing archive is unchanged.
5. Verify that the two ZIPs are never extracted or modified. Try photo pages and viewer keyboard actions.
6. Validate recovery and profile deletion separately using *only* artificial data and backup secrets.

## Interpreting failures

- Real Facebook export schemas, HTML selectors, Messenger encoding and media formats evolve. Success on these fixtures demonstrates only the code paths represented here.
- A synthetic PNG is deliberately one pixel and compresses extremely well. Resource use will differ greatly for real family photos and video.
- If the app cannot decode a fixture, report the **fictional** fixture filename, app version, expected result, error category and CI run. Do not upload an actual Facebook ZIP for debugging.
