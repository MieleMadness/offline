import { useMemo, useState } from "react";
import { CalendarDays, FileText, MessageCircle, Search, ShieldCheck } from "lucide-react";
import { formatNumber } from "../archive";
import { dateLabel, type ImportedArchive } from "../social-model";
import { availableSearchYears, searchPreview, type PreviewSearchKind } from "../preview-search";
import LocalSearch from "./LocalSearch";
import { timeISOString } from "./Shared";

const filters: { value: PreviewSearchKind; name: string }[] = [
  { value: "all", name: "Everything" },
  { value: "post", name: "Posts" },
  { value: "message", name: "Messages" },
  { value: "data", name: "Your data" },
];

const labels = { post: "Post", message: "Message", data: "Data record" } as const;
const icons = { post: CalendarDays, message: MessageCircle, data: ShieldCheck } as const;

export default function QuickSearch({ archive, query }: { archive: ImportedArchive; query: string }) {
  const [filter, setFilter] = useState<PreviewSearchKind>("all");
  const [year, setYear] = useState("all");
  const [shown, setShown] = useState(50);
  const years = useMemo(() => availableSearchYears(archive.social), [archive.social]);
  const results = useMemo(
    () => searchPreview(archive.social, query, filter, year, shown),
    [archive.social, query, filter, year, shown],
  );
  const hasQuery = !!query.trim();

  return <div className="soc-content soc-search-page">
    <header className="soc-page-heading">
      <h1>Find a memory<span>.</span></h1>
      <p>Search posts, conversations and data across the currently open family profile. Use the search field above or press Ctrl K. Results never leave your computer.</p>
    </header>
    <section className="soc-search-panel" aria-label="Search filters">
      <div className="soc-search-tabs" role="group" aria-label="Search in">
        {filters.map(item => <button type="button" key={item.value}
          className={filter === item.value ? "selected" : ""}
          aria-pressed={filter === item.value}
          onClick={() => { setFilter(item.value); setShown(50); }}>{item.name}</button>)}
      </div>
      <label className="soc-search-year">
        Year
        <select value={year} onChange={event => { setYear(event.target.value); setShown(50); }}>
          <option value="all">All years</option>
          {years.map(item => <option value={item} key={item}>{item === "unknown" ? "Undated" : item}</option>)}
        </select>
      </label>
    </section>
    {!hasQuery ? <div className="soc-search-intro">
      <Search size={28} aria-hidden="true"/>
      <h2>What would you like to revisit?</h2>
      <p>Search for a person, phrase, place or topic. This searches the readable records already imported for this profile, including data file names.</p>
    </div> : <>
      <div className="soc-search-summary" role="status">
        <strong>{formatNumber(results.total)} {results.total === 1 ? "match" : "matches"}</strong>
        <span>for “{query.trim().slice(0, 100)}” · Showing {formatNumber(results.hits.length)} in this preview</span>
      </div>
      {results.total === 0 ? <div className="soc-search-intro">
        <Search size={25} aria-hidden="true"/>
        <h2>No matching records</h2>
        <p>Try a shorter phrase, another category, or All years. Some Facebook export records may not be recognized by this preview.</p>
      </div> : <div className="soc-search-results">
        {results.hits.map(hit => {
          const Icon = icons[hit.kind];
          return <article className="soc-search-hit" key={hit.id}>
            <div className="soc-search-hit-top">
              <span className="soc-search-type"><Icon size={15} aria-hidden="true"/>{labels[hit.kind]}</span>
              {hit.timestamp !== null ? <time dateTime={timeISOString(hit.timestamp)}>{dateLabel(hit.timestamp)}</time> : <span>Undated</span>}
            </div>
            <h2>{hit.title}</h2>
            <p>{hit.excerpt}</p>
            <div className="soc-search-source"><FileText size={14} aria-hidden="true"/><span title={hit.source}>{hit.source}</span></div>
          </article>;
        })}
        {results.total > results.hits.length && shown < 250 && <button className="soc-show-more" type="button"
          onClick={() => setShown(current => Math.min(current + 50, 250))}>
          Show more matches ({formatNumber(results.total - results.hits.length)} remaining)
        </button>}
        {results.total > 250 && shown >= 250 && <p className="soc-soft-caption">Showing the 250 most recent matching records. Narrow your search to find other entries.</p>}
      </div>}
    </>}
    <section className="soc-search-ai" aria-label="Optional AI search">
      <h2>Explore with local AI</h2>
      <p>AI search can help find related ideas or images, but requires a compatible Ollama model installed on this device. The regular search above works without one.</p>
      <LocalSearch archive={archive}/>
    </section>
    <p className="soc-soft-caption">Search covers this profile’s currently parsed preview, not every file in Facebook’s export. Imported originals remain unchanged.</p>
  </div>;
}
