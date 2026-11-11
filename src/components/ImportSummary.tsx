import { AlertTriangle, CheckCircle2, FileArchive, FileCode2, FileText, Info } from "lucide-react";
import { formatNumber } from "../archive";
import type { ImportedArchive } from "../social-model";
import { assessImport } from "../import-health";

export default function ImportSummary({ archive, ownerName }: { archive: ImportedArchive; ownerName: string }) {
  const { social } = archive;
  const health = assessImport(archive);
  const recognized = social.jsonFilesRead + social.htmlFilesRead;
  const skipped = social.filesSkipped;
  return (
    <section className="soc-import-summary" aria-label="Import details">
      <div className="soc-import-summary-title">
        <CheckCircle2 size={19} aria-hidden="true"/>
        <div>
          <strong>{ownerName}'s {health.status === "media-only" ? "media/file inventory" : "archive preview"}</strong>
          <span>{social.formatHint} content · Scanned locally from a read-only ZIP</span>
        </div>
      </div>
      <div className="soc-import-stat"><FileCode2 size={17} aria-hidden="true"/>
        <span>{formatNumber(social.jsonFilesRead)} JSON</span></div>
      <div className="soc-import-stat"><FileText size={17} aria-hidden="true"/>
        <span>{formatNumber(social.htmlFilesRead)} HTML</span></div>
      <div className="soc-import-stat"><FileArchive size={17} aria-hidden="true"/>
        <span>{formatNumber(recognized)} text files read</span></div>
      <div className="soc-import-stat">
        <span>{formatNumber(health.posts)} posts · {formatNumber(health.messages)} messages · {formatNumber(health.dataRecords)} data records</span>
      </div>
      <div className="soc-import-stat">
        <span>{formatNumber(health.mediaFiles)} media files indexed</span>
      </div>
      {skipped > 0 && <div className="soc-import-stat soc-import-warning">
        <AlertTriangle size={17} aria-hidden="true"/>
        <span>{formatNumber(skipped)} skipped</span></div>}
      {health.limits.length > 0 && <details className="soc-import-warnings">
        <summary><Info size={15} aria-hidden="true"/> Import scope and limitations ({formatNumber(health.limits.length)})</summary>
        <ul>{health.limits.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </details>}
    </section>
  );
}
