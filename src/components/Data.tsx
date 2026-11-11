import { useMemo, useState } from "react";
import { CalendarDays, Check, ChevronRight, Eye, EyeOff, FileText, Info, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fileName, formatNumber } from "../archive";
import { availableRecordYears, dateLabel, filterDataRecords, type ImportedArchive } from "../social-model";
import { EmptyState, timeISOString } from "./Shared";

/** Explanations are cautious: they describe export categories, not unobserved Meta behavior. */
const guidance: Record<string, string> = {
  advertising: "Advertising interests and ad interactions, if included in the downloaded files. This is not a complete list of everything Meta may use.",
  searches: "Search terms and related activity found in this export, within the downloaded date range.",
  locations: "Location and check-in data included in your export. It does not prove your complete location history.",
  security: "Account logins, devices or security events included in the downloaded records.",
  external: "Information about connected apps or off-platform activity where these files contain it.",
  connections: "People, follower or connection records present in your downloaded data.",
  engagement: "Likes, reactions and comments found in the files.",
  personal: "Profile and account details that were included in your export.",
  other: "Additional files recognized by category, but not decoded into a more specific type.",
};
const privateCategories = new Set(["searches", "locations", "security", "external", "personal"]);

export default function Data({ archive, query }: { archive: ImportedArchive; query: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [year, setYear] = useState("all");
  const [visibleCount, setVisibleCount] = useState(50);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const needle = query.trim().toLocaleLowerCase();
  const categories = useMemo(() => archive.social.dataCategories.filter(category =>
    !needle || category.label.toLocaleLowerCase().includes(needle) ||
      category.records.some(record => (record.title + " " + record.detail + " " + record.sourcePath)
        .toLocaleLowerCase().includes(needle))
  ), [archive, needle]);
  const current = categories.find(category => category.id === selected) ?? categories[0];
  const years = useMemo(() => availableRecordYears(current?.records ?? []), [current]);
  const records = useMemo(() => filterDataRecords(
    current?.records ?? [], query, year, !!current?.label.toLocaleLowerCase().includes(needle) && !!needle,
  ), [current, query, year, needle]);
  const privateCategory = !!current && privateCategories.has(current.id);
  const concealed = privateCategory && revealedId !== current?.id;

  function chooseCategory(id: string) {
    setSelected(id);
    setYear("all");
    setVisibleCount(50);
    setRevealedId(null);
  }

  return <div className="soc-content soc-data-page">
    <div className="soc-page-heading"><h1>Your data, decoded<span>.</span></h1>
      <p>Explore activity and account information included in your Facebook download.</p></div>
    <div className="soc-data-intro"><div className="soc-data-intro-icon"><ShieldCheck size={25} aria-hidden="true"/></div>
      <div><strong>What was included in your archive</strong>
        <p>These records come from downloaded files—not a live connection to Meta. An empty category or an absent field does not prove Meta never held that information.</p></div>
      <span><Check size={15} aria-hidden="true"/> Local</span>
    </div>
    {categories.length === 0 ? <EmptyState icon={SlidersHorizontal} title="No matching categories">
      The archive doesn't contain recognized HTML or JSON data in this area, or your search has no results.
    </EmptyState> : <div className="soc-data-grid">
      <aside className="soc-data-categories" aria-label="Data categories">
        <div className="soc-category-heading">Available categories</div>
        {categories.map(category => <button type="button" key={category.id}
          className={"soc-data-category " + (current?.id === category.id ? "active" : "")}
          onClick={() => chooseCategory(category.id)}
          aria-current={current?.id === category.id ? "true" : undefined}>
          <span><strong>{category.label}</strong>
            <small>{formatNumber(category.fileCount)} source files · {formatNumber(category.records.length)} records</small>
          </span><ChevronRight size={16} aria-hidden="true"/>
        </button>)}
      </aside>
      <section className="soc-data-details" aria-label={current ? current.label : "Data preview"}>
        {current && <>
          <header className="soc-data-detail-head">
            <div><h2>{current.label}</h2><p className="soc-data-guidance">{guidance[current.id] ??
              "Records grouped from the files you downloaded. They may be partial or differently formatted in other exports."}</p></div>
            <span>{formatNumber(records.length)} preview records</span>
          </header>
          <div className="soc-data-tools">
            <label><CalendarDays size={15} aria-hidden="true"/>
              <span className="sr-only">Filter data records by year</span>
              <select value={year} onChange={event => { setYear(event.target.value); setVisibleCount(50); }}>
                <option value="all">All years</option>
                {years.map(value => <option value={value} key={value}>
                  {value === "unknown" ? "Date unavailable" : value}
                </option>)}
              </select>
            </label>
            {privateCategory && <button type="button" className="soc-data-reveal"
              onClick={() => setRevealedId(value => value === current.id ? null : current.id)}
              aria-pressed={!concealed}>
              {concealed ? <Eye size={16} aria-hidden="true"/> : <EyeOff size={16} aria-hidden="true"/>}
              {concealed ? "Show private values" : "Hide private values"}
            </button>}
          </div>
          {privateCategory && <p className="soc-data-privacy" role="status">
            <Info size={15} aria-hidden="true"/>
            {concealed ? "This category may contain sensitive searches, locations, device details or account data. Record values are hidden until you choose to reveal them."
              : "Private values are visible in this workspace. Hide them before sharing your screen."}
          </p>}
          {records.slice(0, visibleCount).map((record, index) => <article className="soc-record"
            key={record.sourcePath + "-" + index}>
            <div><strong>{concealed ? "Private record" : record.title}</strong>
              {record.timestamp !== null && <time dateTime={timeISOString(record.timestamp)}>
                {dateLabel(record.timestamp)}</time>}</div>
            <p>{concealed ? "Content hidden for privacy." : record.detail}</p>
            {concealed
              ? <span className="soc-record-source"><FileText size={13} aria-hidden="true"/> Source hidden until values are revealed</span>
              : <details className="soc-record-provenance">
                <summary><FileText size={13} aria-hidden="true"/> Source: {fileName(record.sourcePath)}</summary>
                <code>{record.sourcePath}</code>
                <span>Source path from the downloaded export; no external link is opened.</span>
              </details>}
          </article>)}
          {records.length === 0 && <div className="soc-record-empty">No records match the selected year and search.</div>}
          {visibleCount < records.length && <button type="button" className="soc-show-more"
            onClick={() => setVisibleCount(value => value + 50)}>
            Show more records ({formatNumber(records.length - visibleCount)} remaining)
          </button>}
        </>}
      </section>
    </div>}
    {archive.social.filesSkipped > 0 && <p className="soc-soft-caption">
      {archive.social.filesSkipped} HTML/JSON files were skipped because they were invalid or exceeded safety limits.</p>}
  </div>;
}
