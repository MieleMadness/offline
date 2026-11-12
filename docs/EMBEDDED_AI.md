# Embedded MediaPipe / EmbeddingGemma 2 staging — v0.17.1

## What is implemented

Offline's optional semantic text search can select a **packaged MediaPipe Universal Embedder** before the existing Ollama bridge. A separately reviewed, immutable Google DeepMind EmbeddingGemma 2 (440M, text-and-vision) model and fixed MediaPipe WASM runtime are required. This bridge implements **text embeddings only**; the source-ZIP photo search still uses the bounded local Ollama path until the embedded image path receives equivalent safety acceptance.

The app does **not** fetch AI files from the public Internet. The bundled adapter only loads the same-origin `ai/embedded-bundle.json`, `ai/model/embeddinggemma-2-text-vision-440m.litertlm`, and `ai/wasm/` files. It initializes the task through the Google MediaPipe `@mediapipe/tasks-retrieval` SDK version `1.2.2`. The browser request URL is resolved against Offline's packaged application origin; no CDN URL or arbitrary user-selected path is accepted by this adapter. The pinned 1.2.2 JavaScript package does not expose the documented delegate option in its published type. **CPU/GPU fallback is unverified** until real Windows WebView2 tests; the implementation does not bypass SDK type safety.

## Development build — default

`npm install` and `npm run build` produce the ordinary development app. The `prebuild` step **deletes any previously staged model files**, then does not copy any weights or WASM. Thus an ordinary unsigned test build remains small, contains **no bundled AI model**, and uses Ollama if installed. Keyword search, the encrypted per-family workspace, imports and photos work without AI.

## Approved Complete build — blocked until release pin review

The release-only `OFFLINE_COMPLETE_AI=1` mode refuses to build unless maintainers have independently verified the exact upstream checkpoint and committed the expected SHA-256 + Git revision to `models/approved-embeddinggemma2.json` (current status is `pending-verification`). Do not populate this file with a hash supplied by a user-selected `.offlineai` ZIP: the pack itself cannot authenticate its publisher.

Once approved and review-committed, stage a model file called `embeddinggemma-2-text-vision-440m.litertlm` from a vetted local path using `OFFLINE_MODEL_FILE`. The build script checks path safety, expected file size and SHA-256 using streaming reads, copies the model and JS/WASM runtime from the pinned local npm package, rechecks the staged model and creates `public/ai/embedded-bundle.json`. The runtime files are hashed and listed. No network download occurs during staging.

Example **for future maintainers after approval only**:

```powershell
$env:OFFLINE_COMPLETE_AI = "1"
$env:OFFLINE_MODEL_FILE = "C:\verified-models\embeddinggemma-2-text-vision-440m.litertlm"
npm run build
```

**Currently this fails by design** until an upstream revision and digest are independently verified and approved; no model weights are in Git or a Windows installer. Do not distribute a fake "Complete" installer.

## Current verification and remaining work

- [x] Shared-space 768-dimensional text-embedding adapter, release-pinned model revision in encrypted index fingerprints, no CDN URLs, in-memory model instance and status reporting.
- [x] Build-time pin gate, SHA-256 streaming verification and automatic stale model cleanup for development builds.
- [x] Tests for malformed manifest values and unapproved model pins.
- [ ] Confirm exact SDK/WASM package behavior in a real Windows WebView2 session with an approved local model; text and image inference quality are not yet measured.
- [ ] Pin a model checkpoint with trusted upstream SHA-256 and runtime licenses, verify package-file integrity and independently audit redistribution/NOTICE dependencies.
- [ ] Embed model assets in an installer, sign the executable and installer, and test on Windows with Ollama absent and **all network interfaces disconnected**.
- [ ] Support image embeddings through the same backend with media-size/pixel validation and full family isolation, then CPU/GPU/NPU fallback choices.

Links: [MediaPipe Universal Embedder](https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder), [model provenance](https://huggingface.co/litert-community/embeddinggemma-2-text-vision-440m-litert-lm), [licensing and distribution](AI_MODEL_DISTRIBUTION.md).


## v0.18.0 — Image retrieval integration

A **packaged and approved** 440M MediaPipe Universal Embedder can now call `embedImage(Uint8Array)` and compare the resulting 768-dimensional photo vector to a text query. The app checks that the selected original ZIP's inventory matches the active family profile, then sends only JPEG/PNG entries through the native `read_archive_ai_image` gate: read-only source ZIP, 4 MiB uncompressed limit, 25-megapixel header limit, exact member/index match. The initial bounded search examines up to 250 candidate photo paths and compares up to 24 valid photos, returns the best eight results, and supports user cancellation. Individual corrupt or unsupported images are skipped; changed/damaged ZIP metadata fails closed. **No photo vectors are stored or shared with other profiles.**

This improves the integrated code path, not production readiness: the default installer still lacks the independently approved weights/WASM, this feature has not run on a true Windows WebView2 model, and scaling to 5,000+ images calls for a separate encrypted, incremental photo-index milestone. The Ollama development path remains available for eight-image searches without a bundled model.
