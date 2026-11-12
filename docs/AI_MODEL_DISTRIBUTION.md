# EmbeddingGemma 2 — Offline Complete packaging plan

**Decision:** Use **EmbeddingGemma 2** (Google DeepMind, **Apache-2.0**) for text and photo embeddings. The previous development combination of EmbeddingGemma 1 + Moondream is retired from the active AI development branch. This document describes the path from today's Ollama bridge to a genuinely self-contained, internet-free Windows product.

## Current implementation (v0.15.1 patch)

- Rust `src-tauri/src/search.rs` uses **`embeddinggemma-2:440m`** for both text and image vector embeddings through an Ollama service on `127.0.0.1:11434`. The model produces *similarity vectors*, not photo captions or chat answers.
- Ordinary keyword search, archive browsing, Messenger, and photographs do not require Ollama. In this development build, **local AI still requires Ollama and the model installed beforehand**; installing it on another computer does **not** currently install the runtime or weights.
- The model downloader in the development UI only requests public model **assets** through the user's Ollama instance, following an explicit button click. The app does not transmit private Facebook archives to a cloud API.
- A model or digest change invalidates old vector indexes, so prior EmbeddingGemma 1 indexes must be rebuilt. Existing encrypted archive data is not deleted.
- Current test-only Windows artifacts are not bundled AI installers and do not prove offline installation.

## Selected Complete product configuration

- **Complete:** 440M text-and-vision variant, one shared embedding space, text posts / Messenger / Your Data / photo similarity. Ship approved, checksum-pinned weights **inside** the Windows installer with a separately licensed, locally executable inference runtime. No first-use model download, Facebook login or Internet access. CPU fallback required; GPU acceleration after driver/hardware acceptance.
- **Lite:** App with standard non-AI keyword search, photos, Messenger and private family profiles. No bundled model. A future verified offline model pack can be imported from a trusted local file/USB without network access.
- **Later:** Evaluate optional video/audio support using larger EmbeddingGemma 2 variants. Do not add those assets until storage and performance measurements justify them.

## Implementation gates

1. **Runtime:** Evaluate native Windows-compatible LiteRT / Universal Embedder or another locally embedded implementation that genuinely supports the official EmbeddingGemma 2 architecture, including its vision encoder. Confirm redistribution terms and test on clean Windows 11 with no Python, Ollama, developer tooling or network.
2. **Immutable model:** Pin the exact vetted `google/embeddinggemma-2` checkpoint or verified derivative variant. Record SHA-256 for every model/runtime file and the upstream commit or immutable artifact ID in `models/embeddinggemma-2.manifest.json`. Never download arbitrary weights at app startup.
3. **Packaging:** Include runtime dependencies, tokenizer, verified weights, `third_party/licenses/Apache-2.0.txt`, `THIRD_PARTY_NOTICES.md`, and any upstream NOTICE plus dependency licenses in the installer. Make attribution readable **without Internet**. Document modifications to any model assets.
4. **Air-gap acceptance:** Install on a clean Windows VM with network disabled and no Ollama. Search fictional long posts, Messenger messages and photos by text. Confirm CPU/GPU fallback, disk space, index encryption, model integrity checks, and no attempt to access external addresses.
5. **Privacy:** Maintain family-owner isolation, bounded ZIP image decoding, encrypted saved indexes, explicit import confirmation, read-only original ZIP, and no raw account data in build logs.
6. **Distribution:** Do not publish a model-equipped installer until code-signing/installer review, license/SBOM audit, Windows benchmark, and model quality evaluation are complete.

## Official sources

- Model and license: https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2
- Model weights: https://huggingface.co/google/embeddinggemma-2
- Google developer guide: https://developers.googleblog.com/en/embeddinggemma-2-the-developer-guide/
- Ollama development package: https://ollama.com/library/embeddinggemma-2
- LiteRT Universal Embedder (candidate runtime, **not yet approved for Windows release**): https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder
- Apache License: https://www.apache.org/licenses/LICENSE-2.0.txt


## Air-gapped model-pack preflight

The next version adds **read-only** .offlineai integrity inspection, not embedded inference. It refuses to activate any pack because the pack's own SHA-256 manifest cannot authenticate its publisher. Review [the pack schema and activation gates](OFFLINE_AI_PACK.md) before completing the bundled runtime or model package.
