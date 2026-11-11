import { AlertTriangle, CheckCircle2, FileArchive, FileCode2, FileText, Info } from "lucide-react";
import { formatNumber } from "../archive";
import type { ImportedArchive } from "../social-model";

export default function ImportSummary({ archive, ownerName }: { archive: ImportedArchive; ownerName: string }) {
  const { social } = archive;
  const recognized = social.jsonFilesRead + social.htmlFilesRead;
  const skipped = social.filesSkipped;
  return (
    <section className="soc-import-summary" aria-label="Import details">
      <div className="soc-import-summary-title">
        <CheckCircle2 size={19} aria-hidden="true"/>
        <div>
          <strong>{ownerName}'s archive preview</strong>
          <span>{social.formatHint} content · Scanned locally from a read-only ZIP</span>
        </div>
      </div>
      <div className="soc-import-stat"><FileCode2 size={17} aria-hidden="true"/>
        <span>{formatNumber(social.jsonFilesRead)} JSON</span></div>
      <div className="soc-import-stat"><FileText size={17} aria-hidden="true"/>
        <span>{formatNumber(social.htmlFilesRead)} HTML</span></div>
      <div className="soc-import-stat"><FileArchive size={17} aria-hidden="true"/>
        <span>{formatNumber(recognized)} files scanned</span></div>
      {skipped > 0 && <div className="soc-import-stat soc-import-warning">
        <AlertTriangle size={17} aria-hidden="true"/>
        <span>{formatNumber(skipped)} skipped</span></div>}
      {social.warnings.length > 0 && <details className="soc-import-warnings">
        <summary><Info size={15} aria-hidden="true"/> Import limitations ({formatNumber(social.warnings.length)})</summary>
        <ul>{social.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
      </details>}
    </section>
  );
}
