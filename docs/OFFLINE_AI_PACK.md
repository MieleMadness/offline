# Offline AI pack — read-only preflight specification

Offline Complete will eventually bundle a locally verified EmbeddingGemma 2 440M text-and-vision model and its compatible inference runtime. A future Lite edition might import an approved pack from USB.

**This milestone only inspects candidate packs. It does not install, extract, execute, activate or trust them.**

## ZIP structure

A .offlineai file is a ZIP archive with a root manifest.json and these declared assets:

- model/embeddinggemma-2-text-vision-440m.litertlm
- runtime/*.wasm (at least one) and other explicitly declared runtime .js, .json or .data files
- legal/Apache-2.0.txt
- legal/THIRD_PARTY_NOTICES.md

The manifest is schemaVersion 1, modelId google/embeddinggemma-2, modelVariant text-vision-440m, runtimeFamily mediapipe-universal-embedder-web, plus an assets array of objects holding path, bytes (actual positive file length) and sha256 (64 hexadecimal characters). The manifest itself must be no more than 64 KiB. This is a *candidate packaging schema*, not an assertion that the chosen runtime works in Windows WebView2.

## Preflight checks

The Tauri command reads the selected local pack and streams SHA-256 checks in 64-KiB buffers without extraction. It rejects missing, unexpected or duplicated ZIP members, path traversal, absolute paths, symlinks, unsupported extensions, invalid metadata, excessive compression and size/hash mismatches. Bounds: at most 20 ZIP entries, 2 GiB per asset and 3 GiB total. It never reads any Facebook ZIP, profile PIN or decrypted archive.

Passing the preflight means only that file contents match hashes **inside that same pack**. Someone who altered the files could alter the manifest as well. The resulting status is always:

- checksumsMatch: true
- publisherAuthenticated: false
- readyToActivate: false

The app shows this limitation plainly. **No pack is activatable in this milestone.**

## Release gates before offline AI can run

1. Obtain and verify a real 440M model plus compatible WebAssembly runtime using immutable upstream revision IDs.
2. Pin trusted asset SHA-256 digests in the released application, or verify a publisher signature using a preinstalled public key. Self-declared hashes are not sufficient.
3. Implement local LiteRT/Universal Embedder inference in Windows WebView2 with bundled weights, no remote CDN, no Ollama, safe file scope and encrypted per-owner vector storage.
4. Review all runtime, model and tokenizer licenses/NOTICE files and include them with a complete third-party dependency inventory.
5. Test on clean Windows with all network interfaces disabled and no Ollama, Python or development tools installed. Verify CPU fallback, model tamper rejection and cross-family isolation before publishing Offline Complete.

Official references:
- Google model: https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2
- MediaPipe Universal Embedder: https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder
- Candidate LiteRT model: https://huggingface.co/litert-community/embeddinggemma-2-text-vision-440m-litert-lm
