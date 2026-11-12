# Third-party model notices — Offline

This file documents the planned and development-stage AI model dependency. It is **not** a license for Offline's own application source code.

## Google DeepMind — EmbeddingGemma 2

- **Component:** EmbeddingGemma 2, text and vision embedding model
- **Model publisher / authors:** Google DeepMind (Google)
- **Canonical model card:** https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2
- **Upstream model weights:** https://huggingface.co/google/embeddinggemma-2
- **Development Ollama model:** https://ollama.com/library/embeddinggemma-2:440m
- **License:** Apache License, Version 2.0 — see `third_party/licenses/Apache-2.0.txt`
- **Current status:** Model selected and integrated into a local Ollama development bridge; **no AI model weights or inference runtime are included in this repository or the unsigned Windows preview artifact yet**.

EmbeddingGemma 2 is developed and released by Google DeepMind. We retain upstream attribution here for transparency. Offline is not affiliated with, sponsored by, or endorsed by Google, Google DeepMind, Apache, or Ollama. Model names and trademarks remain with their respective owners.

The Apache 2.0 license permits commercial use and redistribution subject to its conditions. If a redistributed upstream model package includes additional copyright, license, or NOTICE files, **retain those files and required attribution notices** in the exact release artifact. Any modified model files must carry prominent notices identifying changes. Keep the license text accessible offline to the end user.

## Packaging and dependency review

**Do not mark license compliance complete by adding this file alone.** Before shipping a Complete installer:

1. Pick and record immutable model checkpoint and runtime build IDs and verify SHA-256 checksums of actual packaged files.
2. Copy the full Apache 2.0 license into the distribution, alongside all model-specific notices and copyright information delivered with the selected artifact. Review any bundled tokenizer, quantization, and runtime licensing separately.
3. Include a complete third-party component inventory / SBOM for the exact executable and bundled assets (Tauri, Rust, npm, model runtime, model weights, and redistributed skills if any).
4. Document all actual changes to model files. Do not describe unmodified weights as modified or suggest Google endorsed Offline.
5. Verify license files survive an **air-gapped installation**, are accessible to users, and remain available after updates and uninstall instructions.
6. Keep the source ZIPs, user data, keys, and any local embeddings out of public GitHub artifacts and model download logs.

The Apache 2.0 model license **does not automatically license Offline source code**. Offline's project-wide license remains a separate release decision; no root application `LICENSE` is added by this model attribution alone.

Reference: https://www.apache.org/licenses/LICENSE-2.0.txt


## Google MediaPipe — Universal Embedder web runtime

- Component: `@mediapipe/tasks-retrieval` JavaScript SDK, pinned to 1.2.2 for the proposed embedded model path.
- Publisher: Google LLC / Google AI Edge MediaPipe project.
- Source: https://github.com/google-ai-edge/mediapipe
- License: Apache License 2.0; full text is included in `third_party/licenses/Apache-2.0.txt`.
- Status: The JavaScript library is a pinned dependency of v0.17.0. WASM files are **not staged** into ordinary preview bundles; only a future separately approved Complete build would package them along with a model. Preserve any additional copyright/NOTICE or dependency licenses accompanying the exact npm package.
