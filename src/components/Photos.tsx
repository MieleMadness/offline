import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Images, Info, LockKeyhole } from "lucide-react";
import { fileName, formatNumber, type ArchiveReport } from "../archive";
import { photoEntries } from "../archive-images";
import { galleryPage, GALLERY_PAGE_SIZE, photoNeighbor } from "../gallery";
import { ArchivePhoto } from "./ArchivePhoto";
import PhotoViewer from "./PhotoViewer";
import { EmptyState } from "./Shared";

export default function Photos({ report, query, zipPath, onConnect, busy }: {
  report: ArchiveReport; query: string; zipPath: string | null;
  onConnect: () => void; busy: boolean;
}) {
  const [position, setPosition] = useState({ key: "", page: 0 });
  const [activePath, setActivePath] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const found = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return photoEntries(report).filter(entry =>
      !needle || entry.path.toLocaleLowerCase().includes(needle));
  }, [report, query]);
  const pageKey = JSON.stringify([query.toLocaleLowerCase(), report.archiveName,
    report.totalFiles, report.displayedFiles]);
  const window = galleryPage(found, position.key === pageKey ? position.page : 0);
  const viewerIndex = activePath === null ? -1 :
    found.findIndex(entry => entry.path === activePath);

  useEffect(() => {
    // A new query or imported archive must not silently reopen another photo.
    setActivePath(null);
  }, [query, report]);

  function changePage(next: number) {
    const safe = galleryPage(found, next);
    setPosition({key: pageKey, page: safe.page});
    galleryRef.current?.scrollIntoView({block:"start",behavior:"auto"});
  }

  function navigatePhoto(delta: -1 | 1) {
    const next = photoNeighbor(viewerIndex, delta, found.length);
    if (next !== -1) setActivePath(found[next]?.path ?? null);
  }

  function closeViewer() {
    if (viewerIndex >= 0) {
      setPosition({key: pageKey, page: Math.floor(viewerIndex / GALLERY_PAGE_SIZE)});
    }
    setActivePath(null);
  }

  return <div className="soc-content soc-photos-page">
    <div className="soc-page-heading">
      <h1>Your photographs<span>.</span></h1>
      <p>Browse the photos in your original Facebook download, without extracting them.</p>
    </div>
    <div className="soc-photo-toolbar">
      <div><strong>{formatNumber(window.total)} previewable image{window.total === 1 ? "" : "s"}</strong>
        <span>JPEG · PNG · GIF · WebP · up to 4 MiB each</span></div>
      {!zipPath && <button type="button" className="soc-primary" onClick={onConnect} disabled={busy}>
        <FolderOpen size={17} aria-hidden="true"/> Connect original ZIP
      </button>}
    </div>
    {!zipPath && <div className="soc-photo-help" role="status"><LockKeyhole size={18} aria-hidden="true"/>
      <p>Photos are read on demand. Select the original ZIP for this profile to display them.
        The file path stays in memory and disconnects when you lock or switch profiles.</p></div>}
    {window.total === 0
      ? <EmptyState icon={Images} title={report.totalFiles ? "No previewable photos found" : "Your photos will appear here"}>
          Only supported image files in the first {formatNumber(report.displayedFiles)} ZIP inventory paths
          are included. Larger images and other formats remain untouched in the original ZIP.
        </EmptyState>
      : <>
        <div ref={galleryRef} className="soc-photo-grid">
          {window.items.map(entry => <article className="soc-photo-card" key={entry.path}>
            <button type="button" className="soc-photo-open"
              disabled={!zipPath}
              aria-label={"View archived photo " + fileName(entry.path) + " full size"}
              onClick={() => setActivePath(entry.path)}>
              <ArchivePhoto zipPath={zipPath} member={entry.path} caption={fileName(entry.path)}/>
            </button>
          </article>)}
        </div>
        <div className="soc-photo-pager" role="group" aria-label="Photograph gallery navigation">
          <button type="button" disabled={window.page === 0}
            onClick={() => changePage(window.page - 1)}>
            <ChevronLeft size={18} aria-hidden="true"/> Previous
          </button>
          <span role="status">Page {formatNumber(window.page + 1)} of {formatNumber(window.totalPages)}
            <small>Photos {formatNumber(window.page * GALLERY_PAGE_SIZE + 1)}–{formatNumber(
              Math.min(window.total, (window.page + 1) * GALLERY_PAGE_SIZE)
            )} of {formatNumber(window.total)}</small>
          </span>
          <button type="button" disabled={window.page + 1 >= window.totalPages}
            onClick={() => changePage(window.page + 1)}>
            Next <ChevronRight size={18} aria-hidden="true"/>
          </button>
        </div>
      </>}
    {zipPath && viewerIndex >= 0 && <PhotoViewer entries={found} index={viewerIndex}
      zipPath={zipPath} onClose={closeViewer} onNavigate={navigatePhoto}/>}
    <p className="soc-soft-caption"><Info size={15} aria-hidden="true"/>
      Each gallery page mounts at most {GALLERY_PAGE_SIZE} images to limit memory use.
      The viewer opens one local image at a time and supports arrow keys and Escape.
      A ZIP inventory match does not cryptographically authenticate the source.
    </p>
  </div>;
}
