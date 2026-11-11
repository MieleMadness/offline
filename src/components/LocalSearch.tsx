import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImportedArchive } from "../social-model";

interface Match { id: string; reason: string }
interface SearchStatus { textReady: boolean; imagesReady: boolean }

export default function LocalSearch({ archive }: { archive: ImportedArchive }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);
  const alive = useRef(true);
  const pending = useRef(false);
  const setupPending = useRef(false);

  useEffect(() => {
    alive.current = true;
    invoke<SearchStatus>("ai_search_status").then(value => {
      if (alive.current) setStatus(value);
    }).catch(() => {
      if (alive.current) setError("Start Ollama, then check the search models.");
    });
    return () => { alive.current = false; };
  }, []);

  const records = [
    ...archive.social.posts.map(p => ({ id: p.id, text: p.text })),
    ...archive.social.conversations.flatMap(c => c.messages.map(m => ({ id: m.id, text: m.sender + " " + m.text }))),
    ...archive.social.dataCategories.flatMap(c => c.records.map((r, i) => ({ id: r.sourcePath + "#" + i, text: r.title + " " + r.detail }))),
  ].filter(r => r.text.trim()).slice(0, 30).map((record, i) => ({
    id: String(i), source: record.id, text: Array.from(record.text).slice(0, 450).join(""),
  }));

  async function checkModels() {
    try {
      const value = await invoke<SearchStatus>("ai_search_status");
      if (alive.current) { setStatus(value); setError(""); }
    } catch {
      if (alive.current) setError("Start Ollama, then check the search models.");
    }
  }

  async function install(images: boolean) {
    if (setupPending.current || pending.current) return;
    setupPending.current = true;
    setInstalling(images ? "Downloading image model…" : "Downloading text model…");
    setError("");
    try {
      await invoke("ai_install_search_model", { images });
      if (alive.current) await checkModels();
    } catch (cause) {
      if (alive.current) setError(typeof cause === "string" ? cause : "Download interrupted. Try again.");
    } finally {
      setupPending.current = false;
      if (alive.current) setInstalling(null);
    }
  }

  async function search(images: boolean) {
    if (pending.current || setupPending.current || !query.trim()) return;
    pending.current = true;
    setBusy(true);
    setResults([]);
    setError("");
    try {
      let matches: Match[];
      if (images) {
        const path = await open({ multiple: false, filters: [{ name: "Workspace archive", extensions: ["zip"] }] });
        if (typeof path !== "string" || !alive.current) return;
        matches = await invoke("ai_image_search", { query, path });
      } else {
        matches = await invoke<Match[]>("ai_text_search", {
          query, candidates: records.map(({ id, text }) => ({ id, text })),
        });
        matches = matches.map(m => ({ ...m, id: records.find(r => r.id === m.id)?.source ?? m.id }));
      }
      if (alive.current) {
        setResults(matches);
        if (!matches.length) setError("No readable records or supported images in this search sample.");
      }
    } catch (cause) {
      if (alive.current) setError(typeof cause === "string" ? cause : "Local AI search failed.");
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const disabled = busy || installing !== null;
  return <details className="soc-local-search">
    <summary>Local AI search</summary>
    <p>Find related text or images using models on this computer. This preview ranks the first {records.length} text records,
      or up to eight JPEG/PNG images from a ZIP you select for this workspace. Images must be at most 4 MiB and 25 megapixels.
      The closest results may include unrelated items. Image descriptions are AI-generated and can be inaccurate.</p>
    {(!status?.textReady || !status?.imagesReady) && <div className="soc-search-setup">
      <p>Install Ollama first. Download each search model once. Archive contents stay on this computer.</p>
      {!status?.textReady && <button type="button" disabled={disabled} onClick={() => install(false)}>Download text model · 622 MB</button>}
      {!status?.imagesReady && <button type="button" disabled={disabled} onClick={() => install(true)}>Download image model · 1.7 GB</button>}
      <button type="button" disabled={disabled} onClick={checkModels}>Check models</button>
    </div>}
    <label>Describe what to find
      <input value={query} maxLength={250} disabled={disabled} onChange={e => setQuery(e.target.value)}/>
    </label>
    <div className="soc-search-actions">
      <button type="button" disabled={disabled || !query.trim() || !status?.textReady || !records.length}
        onClick={() => search(false)}>Search text</button>
      <button type="button" disabled={disabled || !query.trim() || !status?.textReady || !status?.imagesReady}
        onClick={() => search(true)}>Search images in ZIP</button>
    </div>
    {busy && <p role="status">Searching on this computer… Larger images can take several minutes.</p>}
    {installing && <p role="status">{installing}</p>}
    {error && <p role="status">{error}</p>}
    <ol className="soc-search-results">{results.map((match, i) =>
      <li key={i}><strong>{match.id}</strong><p>{match.reason}</p></li>)}</ol>
  </details>;
}
