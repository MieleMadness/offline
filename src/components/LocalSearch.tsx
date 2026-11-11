import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImportedArchive } from "../social-model";
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
  const chunks = useMemo(() => textChunks(archive), [archive]);
  const [completed, setCompleted] = useState(Array.isArray(archive.textIndex?.vectors) ? archive.textIndex.vectors.length : 0);
  const alive = useRef(true);
  const pending = useRef(false);
  const cancelled = useRef(false);
  const cache = useRef<TextIndex | undefined>(archive.textIndex);

  useEffect(() => {
    alive.current = true;
    invoke<SearchStatus>("ai_search_status").then(value => {
      if (alive.current) setStatus(value);
    }).catch(() => {
      if (alive.current) setError("Start Ollama, then check the search models.");
    });
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
      const value = await invoke<SearchStatus>("ai_search_status");
      if (alive.current) { setStatus(value); setError(""); }
    } catch {
      if (alive.current) setError("Start Ollama, then check the search models.");
    }
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
      const revision = await invoke<string>("ai_text_model_revision");
      const hash = await fingerprint(chunks);
      if (stopped()) return;
      if (!validIndex(cache.current, hash, revision, chunks.length, true)) {
        cache.current = { version: 1, modelRevision: revision, fingerprint: hash, dimensions: 0, vectors: [] };
        setCompleted(0);
      }
      const index = cache.current!;
      for (let offset = index.vectors.length; offset < chunks.length; offset += 16) {
        if (stopped()) return;
        const batch = await invoke<EmbeddingBatch>("ai_embed_texts", {
          texts: chunks.slice(offset, offset + 16).map(chunk => chunk.text), query: false,
        });
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
        matches = await invoke("ai_image_search", { query, path });
      } else {
        const revision = await invoke<string>("ai_text_model_revision");
        const hash = await fingerprint(chunks);
        if (stopped()) return;
        if (!validIndex(cache.current, hash, revision, chunks.length)) {
          throw new Error("Build this workspace’s text index before searching. The archive or model may have changed.");
        }
        const batch = await invoke<EmbeddingBatch>("ai_embed_texts", { texts: [query], query: true });
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
      Image search currently examines up to eight JPEG/PNG images (4 MiB and 25 megapixels each) from a ZIP you select.
      Results may include unrelated items. AI-generated image descriptions can be inaccurate.</p>
    {(!status?.textReady || !status?.imagesReady) && <div className="soc-search-setup">
      <p>Install Ollama first. Download each search model once. Archive contents stay on this computer.</p>
      {!status?.textReady && <button type="button" disabled={disabled} onClick={() => install(false)}>Download text model · 622 MB</button>}
      {!status?.imagesReady && <button type="button" disabled={disabled} onClick={() => install(true)}>Download image model · 1.7 GB</button>}
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
    {error && <p role="status">{error}</p>}
    <ol className="soc-search-results">{results.map((match, i) =>
      <li key={i}><strong>{match.id}</strong><p>{match.reason}</p></li>)}</ol>
  </details>;
}
