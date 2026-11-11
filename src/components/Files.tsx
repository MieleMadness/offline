import { useMemo, useState } from "react";
import { File, Info } from "lucide-react";
import { fileName, filterEntries, formatNumber, formatSize, type ArchiveReport } from "../archive";
import { EmptyState } from "./Shared";

export default function Files({ report, query }: { report: ArchiveReport; query: string }) {
  const [sort, setSort] = useState<"name" | "size">("name");
  const entries = useMemo(() => filterEntries(report.entries, "all", query, sort), [report, query, sort]);
  return <div className="soc-content soc-files-page">
    <div className="soc-page-heading"><h1>Original files<span>.</span></h1><p>A read-only ZIP inventory. Original files are never extracted or modified.</p></div>
    <div className="soc-files-toolbar"><span>{formatNumber(entries.length)} shown · {formatNumber(report.totalFiles)} total</span>
      <label>Sort <select value={sort} onChange={(e) => setSort(e.target.value as "name" | "size")}>
        <option value="name">Name A–Z</option><option value="size">Largest first</option></select></label></div>
    <div className="soc-file-table"><div className="soc-file-head"><span>FILE NAME</span><span>SIZE</span></div>
      {entries.map((entry, index) => <div className="soc-file-row" key={entry.path + index}>
        <div><File size={18} aria-hidden="true"/><span><strong>{fileName(entry.path)}</strong><small title={entry.path}>{entry.path}</small></span></div>
        <span>{formatSize(entry.bytes)}</span></div>)}
      {entries.length === 0 && <EmptyState icon={File} title="No files found">Try another filename.</EmptyState>}
    </div>
    {report.displayedFiles < report.totalFiles && <p className="soc-soft-caption">
      <Info size={15} aria-hidden="true"/> Showing the first {formatNumber(report.displayedFiles)} paths. File counts cover the entire ZIP directory.</p>}
  </div>;
}
