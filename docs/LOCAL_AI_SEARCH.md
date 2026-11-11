# Local AI search and workspace unlocking

Each family profile is a workspace. Ordinary imports stay accessible to everyone using the library. Save an encrypted copy to set an unlock secret. Choose PIN (8–20 digits) or a passphrase. When an encrypted workspace is unlocked, Change PIN or passphrase replaces its encryption key and salt atomically. Keep the original ZIP. Lost secrets cannot be reset.

## Local AI search preview

Open Local AI search within an unlocked archive. Enter an installed Ollama model name and describe what to find. Search text sends up to the first 30 posts, messages and account records to Ollama running on 127.0.0.1:11434. Search images asks you to select a ZIP for this workspace and examines up to its first eight JPEG/PNG images, each at most 4 MiB. A vision model is required for images. Results explain the match and retain its source path.

This is a bounded preview. Whole-library indexing, CLIP-style similarity, OCR, progress/cancellation and a dedicated model installer are follow-ups. Relevant records beyond the sample can be missed. AI relevance judgments can be wrong.

The native client uses a fixed loopback address, disables proxies and redirects, checks that the requested model exists locally, and rejects cloud model names. Models are managed through Ollama. No automatic model download occurs. Ollama's own configuration, process memory and diagnostic settings are part of the trusted local environment.

Search results stay in the active workspace component. Locking or switching removes them from the interface. An already submitted inference request may finish in the local model process. Search indexes and image copies are currently held only during the request. ZIP members are read into bounded buffers without extracting files.

## Verification

Synthetic frontend and Rust tests cover the existing archive and encryption paths. Native smoke testing covers three workspace owners and PIN enrollment, wrong-secret rejection, manual lock, switch lock and restart.

Real model inference remains unverified on this computer. The installed gemma4:latest model failed to load when tested with two synthetic sentences. A smaller installed model, or sufficient memory to run the installed model, is needed for semantic quality acceptance. No private archive was used.

API reference — https://docs.ollama.com/api/embed and https://docs.ollama.com/api/generate
