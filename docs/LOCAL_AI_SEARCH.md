# Local AI search and workspace unlocking

Each family profile is a workspace. Ordinary imports stay accessible to everyone using the library. Save an encrypted copy to set an unlock secret. Choose PIN (8–20 digits) or a passphrase. When an encrypted workspace is unlocked, Change PIN or passphrase replaces its encryption key and salt atomically. Keep the original ZIP. Lost secrets cannot be reset.

## Setup

Install and start Ollama on the same computer. Open Local AI search within an archive and choose Download text model, then Download image model. These are one-time downloads of EmbeddingGemma (about 622 MB) and Moondream (about 1.7 GB). Setup downloads model files. Subsequent queries use installed models through the local service.

For manual setup, run these commands once.

    ollama pull embeddinggemma:latest
    ollama pull moondream:latest

The app checks model availability when opening the workspace. Use Check models if Ollama was started afterward. Model assets are shared across workspaces. Archive records and search results remain scoped to the active workspace.

## Search preview

Describe what to find, then choose Search text or Search images in ZIP. Choose Build or resume text index to process all imported text in batches, then search its cached vectors. Long records are split into overlapping sections. See [index persistence and limits](TEXT_INDEXES.md). Image search asks you to select a ZIP for the workspace. It examines up to eight JPEG/PNG images, each at most 4 MiB and 25 megapixels, generates local descriptions and ranks them by semantic similarity.

Results retain source paths. Similarity values rank the sample and do not measure probability. Even unrelated records can appear in the ranked results. Generated image descriptions can contain mistakes. Text search covers the records supplied by the importer. Image results remain limited to the eight-image sample.

Direct image embeddings, image-library indexing, OCR, result previews and cancellation of in-flight model calls remain follow-ups.

## Privacy and limits

The native client uses a fixed loopback address, disables proxies and redirects, and uses two named locally installed models. Download buttons call Ollama's model download endpoint without any archive content or search query. Search uses the local embed/generate endpoints. Ollama's configuration, process memory and diagnostic settings are part of the trusted local environment.

Search results stay in the active workspace component. Locking, switching or replacing the archive removes them from the interface. An already submitted inference request may finish in the local model process. Completed text embeddings are kept in the workspace index and encrypted with saved archives. Session-only embeddings and image buffers remain in memory. ZIP members are read without extracting files.

A PIN has less entropy than a long passphrase. Someone who copies a snapshot can attempt offline guesses. Original ZIPs retain their Windows file permissions. No password recovery is provided.

## Verification

v0.6.1 passes 17 frontend tests and 17 Rust tests and compiles locally for Windows. Native text-index checks cover stop/resume, long records after the former 30-record sample, encrypted index commits and cached search after restart. The v0.5.1 image-search checks remain the verified image baseline. Synthetic native acceptance covers three workspace owners, PIN enrollment, wrong-PIN rejection, manual and switch locking, changing the PIN, rejection of the previous PIN, and restart.

Real native AI acceptance used two synthetic posts and two generated images. “Rainy weather” ranked the umbrella post above pasta. “A red square” ranked the red-square image above a blue circle. The smaller models ran locally after the installed Gemma 4 model failed to load. No personal archive was used. These checks establish the tested examples and do not certify search quality across Facebook exports.

Repeat the real inference checks after downloading models with this opt-in command. Normal CI skips these tests and downloads no models.

    cargo test --manifest-path src-tauri/Cargo.toml search::tests::local_ -- --ignored --test-threads=1

Models and local APIs are described in the [EmbeddingGemma model page](https://ollama.com/library/embeddinggemma), [Moondream model page](https://ollama.com/library/moondream) and [Ollama API documentation](https://docs.ollama.com/api).
