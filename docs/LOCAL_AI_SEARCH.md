# Offline — Optional local AI search (v0.15.1 development)

## Start with keyword search

Open **Search library** and use the top search box. This is instant and does not require Ollama, any AI model download, Internet access or an index. It searches recognized posts, Messenger messages and account records for the currently unlocked family profile.

## Build a semantic text index

Open the optional **Local AI search** panel. Ollama must be running locally at `127.0.0.1:11434`. Use **Check models** to check whether the Apache-licensed `embeddinggemma-2:440m` model is installed for both text and image similarity. The button to download model files is optional and require network access to fetch model weights. No Facebook credentials are required.

Choose **Build or resume text index**. The app uses the actual records decoded from this profile's archive, splits Unicode text into overlapping sections, and embeds up to 16 at a time. Progress is displayed in text sections. **Stop indexing** stops after the currently running batch; completed partial work is retained only while this profile remains unlocked. Large archives beyond 20,000 sections are refused instead of silently sampling a subset.

For a saved encrypted workspace, the completed vectors are stored with the existing AES-256-GCM encrypted snapshot, bound to the same owner identity and optimistic revision. A session-only profile never writes unencrypted vectors as a durable index. Older encrypted backups without indexes remain supported. Each index is invalidated when source content or the locally installed model digest changes. Encoded vector payloads are capped at 48 MiB.

Enter a search phrase and select **Search text**. The query is embedded locally and compared with cached vectors. Results rank recognized source records and include short matching excerpts. Results are approximate and can be wrong; verify important details against the original archive. Indexing can include sensitive message and account content from your **unlocked** profile. Lock the profile or use separate Windows accounts for stronger isolation.

## Image search (experimental)

Select **Search images in ZIP**, then pick the **original ZIP belonging to the active profile**. The app checks that ZIP's inventory against the imported owner inventory before looking at its images. This is a metadata check, **not** a cryptographic authenticity guarantee. Only the first eight supported JPEG/PNG images of up to 4 MiB and 25 megapixels each are considered. The local EmbeddingGemma 2 model creates image vectors and ranks them against your text query in one shared embedding space. It does not generate photo captions. Unsupported HEIC, video, GIF, WebP and other formats are not indexed by this feature.

## Offline boundaries

The native client uses an explicit loopback Ollama address, disables proxies and redirects and bounds native response sizes; model acquisition is opt-in. No archive data is intentionally uploaded to remote services. Ollama is a separate local process: its logs, memory, model download settings and other processes are outside Offline's protection. Local AI is not required to browse a family export.

## Testing and known limits

Synthetic frontend tests cover long Unicode records, late messages, compressed-vector ranking, invalid index metadata, owner-bound encryption and wrong-owner rejection. Synthetic Rust tests cover local image bounds and invalid native inputs. Full real-model inference, 10k+ actual social records, disk quota, performance and Windows family isolation must be tested before general release.


## Apache 2.0 notices and the future offline installer

The selected **EmbeddingGemma 2** model is Apache-2.0 licensed; the complete license is preserved in `third_party/licenses/Apache-2.0.txt` and its provenance in `THIRD_PARTY_NOTICES.md`. See `docs/AI_MODEL_DISTRIBUTION.md` for an embedded, no-Ollama Complete installer roadmap. **The v0.15.1 development build still uses a separately installed Ollama runtime and model; no fully standalone AI installer has been produced.**


## v0.17.0 staged in-app AI adapter

A future approved Complete build can run text embedding inside the app via MediaPipe Universal Embedder with local WASM and model files. When a verified staged bundle is present, the text-indexing UI selects it over Ollama and identifies the provider. Normal development builds intentionally lack the model and continue using separately installed Ollama. Bundled image search, real Windows model execution and air-gapped installer testing remain pending. See [embedded runtime plan](EMBEDDED_AI.md).
