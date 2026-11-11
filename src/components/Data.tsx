import { useState } from "react";
import { Check, ChevronRight, FileText, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { fileName, formatNumber } from "../archive";
import { dateLabel, type ImportedArchive } from "../social-model";
import { EmptyState, timeISOString } from "./Shared";

export default function Data({ archive, query }: { archive: ImportedArchive; query: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const needle = query.trim().toLocaleLowerCase();
  const categories = archive.social.dataCategories.filter((cat) =>
    !needle || cat.label.toLocaleLowerCase().includes(needle) ||
    cat.records.some((r) => (r.title + " " + r.detail).toLocaleLowerCase().includes(needle)));
  const current = categories.find((cat) => cat.id === selected) ?? categories[0];
  const records = current?.records.filter((r) => !needle ||
    current.label.toLocaleLowerCase().includes(needle) ||
    (r.title + " " + r.detail).toLocaleLowerCase().includes(needle)) ?? [];

  return <div className="soc-content soc-data-page">
    <div className="soc-page-heading"><h1>Your data, decoded<span>.</span></h1>
      <p>Explore activity and account information included in your Facebook download.</p></div>
    <div className="soc-data-intro"><div className="soc-data-intro-icon"><ShieldCheck size={25} aria-hidden="true"/></div>
      <div><strong>Understand what's in your archive</strong><p>These categories come from your actual downloaded files—not assumptions about everything Facebook stores. Some records may be missing.</p></div>
      <span><Check size={15} aria-hidden="true"/> Local</span>
    </div>
    {categories.length === 0 ? <EmptyState icon={SlidersHorizontal} title="No matching categories">
      The archive doesn't contain recognized HTML or JSON data in this area, or your search has no results.
    </EmptyState> : <div className="soc-data-grid">
      <aside className="soc-data-categories" aria-label="Data categories">
        <div className="soc-category-heading">Available categories</div>
        {categories.map((category) => <button type="button" key={category.id}
          className={"soc-data-category " + (current?.id === category.id ? "active" : "")}
          onClick={() => setSelected(category.id)} aria-current={current?.id === category.id ? "true" : undefined}>
          <span><strong>{category.label}</strong><small>{formatNumber(category.fileCount)} source files</small></span>
          <ChevronRight size={16} aria-hidden="true"/>
        </button>)}
      </aside>
      <section className="soc-data-details" aria-label={current ? current.label : "Data preview"}>
        {current && <>
          <header className="soc-data-detail-head"><h2>{current.label}</h2><span>{formatNumber(records.length)} preview records</span></header>
          {records.map((record, index) => <article className="soc-record" key={record.sourcePath + "-" + index}>
            <div><strong>{record.title}</strong>
              {record.timestamp !== null && <time dateTime={timeISOString(record.timestamp)}>{dateLabel(record.timestamp)}</time>}</div>
            <p>{record.detail}</p>
            <span className="soc-record-source"><FileText size={13} aria-hidden="true"/> {fileName(record.sourcePath)}</span>
          </article>)}
          {records.length === 0 && <div className="soc-record-empty">No matching entries in this category.</div>}
        </>}
      </section>
    </div>}
    {archive.social.filesSkipped > 0 && <p className="soc-soft-caption">
      {archive.social.filesSkipped} HTML/JSON files were skipped because they were invalid or exceeded the safety limits.</p>}
  </div>;
}
