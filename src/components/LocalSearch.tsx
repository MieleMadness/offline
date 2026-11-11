import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImportedArchive } from "../social-model";

interface Match { id: string; reason: string }
export default function LocalSearch({ archive }: { archive: ImportedArchive }) {
  const [model, setModel] = useState("gemma4:latest");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const pending = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const records = [
    ...archive.social.posts.map(p => ({ id: p.id, text: p.text })),
    ...archive.social.conversations.flatMap(c => c.messages.map(m => ({ id: m.id, text: m.sender + " " + m.text }))),
    ...archive.social.dataCategories.flatMap(c => c.records.map((r, i) => ({ id: r.sourcePath + "#" + i, text: r.title + " " + r.detail }))),
  ].slice(0, 30).map((record, i) => ({ ...record, id: String(i), source: record.id, text: record.text.slice(0, 450) }));
  async function search(images: boolean) {
    if (pending.current || !query.trim()) return;
    pending.current = true; setBusy(true); setResults([]); setError("");
    try {
      let matches: Match[];
      if (images) {
        const path = await open({ multiple: false, filters: [{ name: "Workspace archive", extensions: ["zip"] }] });
        if (typeof path !== "string" || !alive.current) return;
        matches = await invoke("ai_image_search", { query, model, path });
      } else {
        matches = await invoke<Match[]>("ai_text_search", { query, model,
          candidates: records.map(({ id, text }) => ({ id, text })) });
        matches = matches.map(m => ({ ...m, id: records.find(r => r.id === m.id)?.source ?? m.id }));
      }
      if (alive.current) { setResults(matches); if (!matches.length) setError("No matches in the preview search sample."); }
    } catch (cause) {
      if (alive.current) setError(typeof cause === "string" ? cause : "Local AI search failed.");
    } finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  return <details className="soc-vault-form"><summary>Local AI search</summary>
    <p>Search by meaning with an installed local Ollama model. Image search requires a vision model. The local model reads the query and selected records or images.
      Preview searches the first 30 text records or first 8 JPEG/PNG images (up to 4 MiB each) from a ZIP you select for this workspace.</p>
    <label>Installed model name<input value={model} maxLength={100} disabled={busy} onChange={e => setModel(e.target.value)}/></label>
    <label>Describe what to find<input value={query} maxLength={1000} disabled={busy} onChange={e => setQuery(e.target.value)}/></label>
    <div><button disabled={busy || !query.trim()} onClick={() => search(false)}>Search text</button>
      <button disabled={busy || !query.trim()} onClick={() => search(true)}>Search images in ZIP</button></div>
    {busy && <p role="status">Searching on this computer…</p>}
    {error && <p role="status">{error}</p>}
    <ul>{results.map((m, i) => <li key={i}><strong>{m.id}</strong><p>{m.reason}</p></li>)}</ul>
  </details>;
}
