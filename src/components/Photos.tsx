import { useMemo, useState } from "react";
import { FolderOpen, Images, Info, LockKeyhole } from "lucide-react";
import { fileName, formatNumber, type ArchiveReport } from "../archive";
import { photoEntries } from "../archive-images";
import { ArchivePhoto } from "./ArchivePhoto";
import { EmptyState } from "./Shared";

export default function Photos({ report, query, zipPath, onConnect, busy }: {
  report: ArchiveReport; query: string; zipPath: string | null;
  onConnect: () => void; busy: boolean;
}) {
  const [shown, setShown] = useState(36);
  const found = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return photoEntries(report).filter(entry => !needle || entry.path.toLocaleLowerCase().includes(needle));
  }, [report, query]);
  return <div className="soc-content soc-photos-page">
    <div className="soc-page-heading">
      <h1>Your photographs<span>.</span></h1>
      <p>See photos saved in the original Facebook download. Files stay inside their ZIP.</p>
    </div>
    <div className="soc-photo-toolbar">
      <div><strong>{formatNumber(found.length)} previewable image{found.length === 1 ? "" : "s"}</strong>
        <span>JPEG · PNG · GIF · WebP · up to 4 MiB each</span></div>
      {!zipPath && <button type="button" className="soc-primary" onClick={onConnect} disabled={busy}>
        <FolderOpen size={17} aria-hidden="true"/> Connect original ZIP
      </button>}
    </div>
    {!zipPath && <div className="soc-photo-help" role="status"><LockKeyhole size={18} aria-hidden="true"/>
      <p>Photos are intentionally read on demand. Select the original ZIP for this profile to display them. The path is kept in memory and disconnected when you lock or switch profiles.</p></div>}
    {found.length === 0 ? <EmptyState icon={Images} title={report.totalFiles ? "No previewable photos found" : "Your photos will appear here"}>
      This preview only displays supported image files in the first {formatNumber(report.displayedFiles)} indexed paths. Other photo formats and larger files are kept untouched in the original ZIP.
    </EmptyState> : <>
      <div className="soc-photo-grid">{found.slice(0, shown).map((entry) =>
        <article className="soc-photo-card" key={entry.path}>
          <ArchivePhoto zipPath={zipPath} member={entry.path} caption={fileName(entry.path)}/>
        </article>)}</div>
      {shown < found.length && <button className="soc-show-more" type="button"
        onClick={() => setShown(current => current + 36)}>
          Show more photographs ({formatNumber(found.length - shown)} remaining)
        </button>}
    </>}
    <p className="soc-soft-caption"><Info size={15} aria-hidden="true"/>
      Only images in the ZIP's indexed inventory are listed here. Unsupported formats, larger images and video playback will be addressed separately. A connected ZIP is checked against the profile's inventory, but that check is not a cryptographic signature.
    </p>
  </div>;
}
