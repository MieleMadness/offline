import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImportedArchive } from "../social-model";
import { sameInventory } from "../archive-images";
import OfflineModelPack from "./OfflineModelPack";
import { detectEmbeddedBundle, embeddedModelRevision, embedWithBundledModel, type EmbeddedBundle } from "../embedded-ai";
import { MAX_EMBEDDED_PHOTOS, searchBundledPhotos } from "../embedded-photo-search";
import type { ArchiveReport } from "../archive";
import { fingerprint, packVector, searchIndex, textChunks, validIndex, type TextIndex } from "../text-index";

interface Match { id: string; reason: string }
interface SearchStatus { textReady: boolean; imagesReady: boolean }
interface EmbeddingBatch { modelRevision: string; vectors: number[][] }

export default function LocalSearch({ archive, onSaveIndex }: {
  archive: ImportedArchive; onSaveIndex: (index: TextIndex) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [embedded, setEmbedded] = useState<EmbeddedBundle | null>(null);
  const prepared = useMemo(() => {
    try { return { chunks: textChunks(archive), error: "" }; }
    catch (cause) {
      return { chunks: [], error: cause instanceof Error ? cause.message :
        "This workspace cannot be indexed safely. Use regular keyword search." };
    }
  }, [archive]);
  const chunks = prepared.chunks;
  const [completed, setCompleted] = useState(Array.isArray(archive.textIndex?.vectors) ? archive.textIndex.vectors.length : 0);
  const alive = useRef(true);
  const pending = useRef(false);
  const cancelled = useRef(false);
  const cache = useRef<TextIndex | undefined>(archive.textIndex);

  useEffect(() => {
    alive.current = true;
    void checkModels();
    return () => { alive.current = false; cancelled.current = true; };
  }, []);

  function start(message: string) {
    if (pending.current) return false;
    pending.current = true;
    cancelled.current = false;
    setBusy(message);
    setError("");
    return true;
  }
  function finish() {
    pending.current = false;
    if (alive.current) setBusy("");
  }
  function stopped() { return cancelled.current || !alive.current; }

  async function checkModels() {
    try {
      const available = await detectEmbeddedBundle();
      if (!alive.current) return;
      if (available) {
        setEmbedded(available);
        // The bundled adapter supports both text and bounded JPEG/PNG
        // similarity. Actual Windows model loading is verified on use.
        setStatus({ textReady: true, imagesReady: true });
        setError("");
        return;
      }
      setEmbedded(null);
      const value = await invoke<SearchStatus>("ai_search_status");
      if (alive.current) { setStatus(value); setError(""); }
    } catch {
      if (alive.current) setError(
        "The optional local AI runtime is unavailable. Keyword search still works.");
    }
  }

  async function modelRevision() {
    return embedded ? embeddedModelRevision(embedded) : invoke<string>("ai_text_model_revision");
  }

  async function embedTexts(texts: string[], query: boolean): Promise<EmbeddingBatch> {
    return embedded ? embedWithBundledModel(embedded, texts, query)
      : invoke<EmbeddingBatch>("ai_embed_texts", { texts, query });
  }

  async function install(images: boolean) {
    if (!start(images ? "Downloading image model…" : "Downloading text model…")) return;
    try {
      await invoke("ai_install_search_model", { images });
      if (alive.current) await checkModels();
    } catch (cause) {
      if (alive.current) setError(typeof cause === "string" ? cause : "Download interrupted. Try again.");
    } finally { finish(); }
  }

  async function buildIndex() {
    if (!start("Indexing text…")) return;
    setResults([]);
    try {
      const revision = await modelRevision();
      const hash = await fingerprint(chunks);
      if (stopped()) return;
      if (!validIndex(cache.current, hash, revision, chunks.length, true)) {
        cache.current = { version: 1, modelRevision: revision, fingerprint: hash, dimensions: 0, vectors: [] };
        setCompleted(0);
      }
      const index = cache.current!;
      for (let offset = index.vectors.length; offset < chunks.length; offset += 16) {
        if (stopped()) return;
        const batch = await embedTexts(chunks.slice(offset, offset + 16).map(chunk => chunk.text), false);
        if (stopped()) return;
        if (batch.modelRevision !== revision || (index.dimensions && batch.vectors[0]?.length !== index.dimensions)) {
          throw new Error("The model changed. Build the text index again.");
        }
        const packed = batch.vectors.map(packVector);
        index.dimensions = batch.vectors[0]!.length;
        index.vectors.push(...packed);
        setCompleted(index.vectors.length);
      }
      if (!stopped()) {
        setBusy("Saving text index…");
        await onSaveIndex(index);
      }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message :
        typeof cause === "string" ? cause : "Indexing failed. Build again to resume completed batches.");
    } finally { finish(); }
  }

  async function search(images: boolean) {
    if (!query.trim() || !start("Searching on this computer…")) return;
    setResults([]);
    try {
      let matches: Match[];
      if (images) {
        const path = await open({ multiple: false, filters: [{ name: "Workspace archive", extensions: ["zip"] }] });
        if (typeof path !== "string" || stopped()) return;
        // Image inference must never inspect a different family member's ZIP
        // simply because the operating system picker can navigate to it.
        const selected = await invoke<ArchiveReport>("inspect_archive", { path });
        if (!sameInventory(archive.report, selected)) {
          throw new Error("Choose the original ZIP for this family profile. This file's inventory does not match.");
        }
        if (stopped()) return;
        matches = embedded
          ? await searchBundledPhotos(embedded, path, query, stopped, (done, total) => {
              if (alive.current && !cancelled.current) {
                setBusy("Comparing local photos " + done + " of " + total + "…");
              }
            })
          : await invoke<Match[]>("ai_image_search", { query, path });
      } else {
        const revision = await modelRevision();
        const hash = await fingerprint(chunks);
        if (stopped()) return;
        if (!validIndex(cache.current, hash, revision, chunks.length)) {
          throw new Error("Build this workspace’s text index before searching. The archive or model may have changed.");
        }
        const batch = await embedTexts([query], true);
        if (stopped()) return;
        if (batch.modelRevision !== revision || batch.vectors[0]?.length !== cache.current!.dimensions) {
          throw new Error("The search model changed. Build the index again.");
        }
        matches = await searchIndex(cache.current!, chunks, batch.vectors[0]!, stopped);
      }
      if (!stopped()) {
        setResults(matches);
        if (!matches.length) setError("No readable text or supported images were found.");
      }
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error ? cause.message :
        typeof cause === "string" ? cause : "Local AI search failed.");
    } finally { finish(); }
  }

  const disabled = !!busy;
  return <details className="soc-local-search">
    <summary>Local AI search</summary>
    <p>Index all imported posts, messages and account records in this workspace, then search by meaning.
      Saved workspaces keep their index encrypted with the archive. Session indexes stay in memory.
      Image search first checks that the selected ZIP matches this family profile. The embedded model compares up to {MAX_EMBEDDED_PHOTOS} JPEG/PNG photos per query (4 MiB and 25 megapixels each); the Ollama development fallback checks up to eight.
      Results may include unrelated items. Image similarity results may be inaccurate; this model does not generate captions.</p>
    {embedded ? <p className="soc-ai-provider" role="status">
      Packaged MediaPipe / EmbeddingGemma 2 assets detected. Text and bounded photo
      similarity are configured to use the same local model, without Ollama or cloud
      inference. Windows model loading and hardware behavior are verified only when
      inference is attempted; this preview is not yet air-gap certified.
    </p> : (!status?.textReady || !status?.imagesReady) && <div className="soc-search-setup">
      <p>No approved model is bundled in this development build. Optional semantic
        search currently uses locally installed Ollama. The future Complete installer
        will include a pinned MediaPipe runtime and model, with no first-run download.</p>
      {!status?.textReady && <button type="button" disabled={disabled}
        onClick={() => install(false)}>Download EmbeddingGemma 2 for Ollama</button>}
      <button type="button" disabled={disabled} onClick={checkModels}>Check models</button>
    </div>}
    <div className="soc-search-actions">
      <button type="button" disabled={disabled || !status?.textReady || !chunks.length} onClick={buildIndex}>
        Build or resume text index
      </button>
      {busy === "Indexing text…" && <button type="button" onClick={() => {
        cancelled.current = true; setBusy("Stopping after the current batch…");
      }}>Stop indexing</button>}
    </div>
    {prepared.error && <p className="soc-search-index-warning" role="alert">{prepared.error}</p>}
    <p role="status">{completed} of {chunks.length} text sections indexed.</p>
    <label>Describe what to find
      <input value={query} maxLength={250} disabled={disabled} onChange={e => setQuery(e.target.value)}/>
    </label>
    <div className="soc-search-actions">
      <button type="button" disabled={disabled || !query.trim() || !status?.textReady || !chunks.length || completed !== chunks.length}
        onClick={() => search(false)}>Search text</button>
      <button type="button" disabled={disabled || !query.trim() || !status?.textReady || !status?.imagesReady}
        onClick={() => search(true)}>Search images in ZIP</button>
    </div>
    {busy && <p role="status">{busy}</p>}
    {busy.startsWith("Comparing local photos") && <button
      className="soc-ai-stop" type="button" onClick={() => {
        cancelled.current = true;
        setBusy("Stopping after the current local photo…");
      }}>Stop photo comparison</button>}
    {error && <p role="status">{error}</p>}
    <OfflineModelPack/>
    <ol className="soc-search-results">{results.map((match, i) =>
      <li key={i}><strong>{match.id}</strong><p>{match.reason}</p></li>)}</ol>
  </details>;
}
