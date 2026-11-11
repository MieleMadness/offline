import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronLeft, ChevronRight, FolderOpen, Images, Info, LockKeyhole, RefreshCw } from "lucide-react";
import { fileName, formatNumber, type ArchiveReport, type ArchiveEntry } from "../archive";
import { photoEntries } from "../archive-images";
import { galleryPage, GALLERY_PAGE_SIZE, photoNeighbor } from "../gallery";
import { validateNativePhotoPage, type NativePhotoPage } from "../native-photo-page";
import { ArchivePhoto } from "./ArchivePhoto";
import PhotoViewer from "./PhotoViewer";
import { EmptyState } from "./Shared";

interface LoadedPage {
  requestKey: string;
  galleryKey: string;
  page: NativePhotoPage;
}

export default function Photos({ report, query, zipPath, onConnect, busy }: {
  report: ArchiveReport;
  query: string;
  zipPath: string | null;
  onConnect: () => void;
  busy: boolean;
}) {
  const [position, setPosition] = useState({ key: "", page: 0 });
  const [viewer, setViewer] = useState<{ key: string; index: number } | null>(null);
  const [loaded, setLoaded] = useState<LoadedPage | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const foundInSavedInventory = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return photoEntries(report).filter(entry =>
      !needle || entry.path.toLocaleLowerCase().includes(needle));
  }, [report, query]);

  // A ZIP path is session-only. The gallery key also protects against a
  // response from another profile, ZIP selection or search arriving too late.
  const galleryKey = JSON.stringify([
    zipPath, report.archiveName, report.totalFiles,
    report.totalUncompressedBytes, query.trim().toLocaleLowerCase(),
  ]);
  const viewerIndex = viewer?.key === galleryKey ? viewer.index : null;
  const requestedPage = viewerIndex !== null ? Math.floor(viewerIndex / GALLERY_PAGE_SIZE) :
    position.key === galleryKey ? position.page : 0;
  const requestKey = JSON.stringify([galleryKey, requestedPage]);

  // Without the original ZIP, only the bounded saved directory is available.
  const savedPage = galleryPage(foundInSavedInventory, requestedPage);

  useEffect(() => {
    if (!zipPath) return;
    let cancelled = false;
    const offset = requestedPage * GALLERY_PAGE_SIZE;
    setFailed(null);

    void invoke<NativePhotoPage>("list_archive_photos", {
      path: zipPath, offset, limit: GALLERY_PAGE_SIZE, query: query.trim(),
    }).then(value => {
      if (cancelled) return;
      const page = validateNativePhotoPage(value, offset, GALLERY_PAGE_SIZE);
      setLoaded({ requestKey, galleryKey, page });
    }).catch(cause => {
      if (cancelled) return;
      setFailed({
        key: requestKey,
        message: typeof cause === "string" ? cause :
          cause instanceof Error ? cause.message : "This ZIP's photograph directory could not be read.",
      });
    });

    return () => { cancelled = true; };
  }, [zipPath, galleryKey, requestedPage, requestKey, query, retry]);

  useEffect(() => {
    // Changing source or query must close the old photo even if its filename
    // happens to exist in a different family member's download.
    setViewer(null);
  }, [zipPath, report, query]);

  const current = loaded?.requestKey === requestKey ? loaded.page : null;
  const knownTotal = loaded?.galleryKey === galleryKey ? loaded.page.total : undefined;
  const error = failed?.key === requestKey ? failed.message : null;
  const loading = !!zipPath && !current && !error;

  const total = zipPath ? (current?.total ?? knownTotal ?? 0) : savedPage.total;
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));
  const rows: readonly ArchiveEntry[] = zipPath ? (current?.entries ?? []) : savedPage.items;
  const selected = viewerIndex === null || !current ? null :
    current.entries[viewerIndex % GALLERY_PAGE_SIZE] ?? null;

  function changePage(next: number) {
    if (loading || error) return;
    const bounded = Math.max(0, Math.min(next, totalPages - 1));
    setPosition({ key: galleryKey, page: bounded });
    galleryRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function openPhoto(index: number) {
    if (!zipPath || !current) return;
    setViewer({ key: galleryKey, index: requestedPage * GALLERY_PAGE_SIZE + index });
  }

  function navigatePhoto(delta: -1 | 1) {
    if (viewerIndex === null || loading) return;
    const next = photoNeighbor(viewerIndex, delta, total);
    if (next !== -1) setViewer({ key: galleryKey, index: next });
  }

  function closeViewer() {
    if (viewerIndex !== null) {
      setPosition({ key: galleryKey, page: Math.floor(viewerIndex / GALLERY_PAGE_SIZE) });
    }
    setViewer(null);
  }

  return <div className="soc-content soc-photos-page">
    <div className="soc-page-heading">
      <h1>Your photographs<span>.</span></h1>
      <p>Browse photos from your original Facebook download without extracting them.</p>
    </div>
    <div className="soc-photo-toolbar">
      <div>
        <strong>{loading && knownTotal === undefined ? "Reading ZIP photo directory…" :
          formatNumber(total) + " previewable image" + (total === 1 ? "" : "s")}</strong>
        <span>{zipPath ? "Indexed across the connected ZIP" :
          "Only the saved first " + formatNumber(report.displayedFiles) + " file paths are shown"}
        </span>
      </div>
      {!zipPath && <button type="button" className="soc-primary" onClick={onConnect} disabled={busy}>
        <FolderOpen size={17} aria-hidden="true"/> Connect original ZIP
      </button>}
    </div>
    {!zipPath && <div className="soc-photo-help" role="status">
      <LockKeyhole size={18} aria-hidden="true"/>
      <p>Connect this profile's original ZIP to discover photos throughout the archive, including
        beyond the saved 5,000-file inventory. The selected path stays in memory and disconnects
        when you lock or switch family profiles.</p>
    </div>}
    {error && <div className="soc-photo-index-error" role="alert">
      <Info size={19} aria-hidden="true"/>
      <p><strong>Photograph directory unavailable.</strong> {error}
        Your original ZIP has not been changed.</p>
      <button type="button" onClick={() => setRetry(value => value + 1)}>
        <RefreshCw size={16} aria-hidden="true"/> Try again
      </button>
    </div>}
    {loading && <div className="soc-photo-index-loading" role="status" aria-live="polite">
      Reading this page's image filenames from the local ZIP…
    </div>}
    {!loading && !error && total === 0
      ? <EmptyState icon={Images} title={report.totalFiles ? "No previewable photos found" : "Your photos will appear here"}>
          {zipPath ? "This ZIP has no supported images under the 4 MiB preview limit." :
            "Only the saved file inventory is visible until you connect the original ZIP."}
        </EmptyState>
      : null}
    {!error && total > 0 && <>
      <div ref={galleryRef} className="soc-photo-grid" aria-busy={loading}>
        {rows.map((entry, index) => <article className="soc-photo-card"
          key={entry.zipIndex ?? entry.path}>
          <button type="button" className="soc-photo-open"
            disabled={!zipPath || !current}
            aria-label={"View archived photo " + fileName(entry.path) + " full size"}
            onClick={() => openPhoto(index)}>
            <ArchivePhoto zipPath={zipPath} member={entry.path} zipIndex={entry.zipIndex}
              caption={fileName(entry.path)}/>
          </button>
        </article>)}
      </div>
      <div className="soc-photo-pager" role="group" aria-label="Photograph gallery navigation">
        <button type="button" disabled={loading || requestedPage === 0}
          onClick={() => changePage(requestedPage - 1)}>
          <ChevronLeft size={18} aria-hidden="true"/> Previous
        </button>
        <span role="status">
          Page {formatNumber(requestedPage + 1)} of {formatNumber(totalPages)}
          <small>Photos {formatNumber(Math.min(total, requestedPage * GALLERY_PAGE_SIZE + 1))}–{
            formatNumber(Math.min(total, (requestedPage + 1) * GALLERY_PAGE_SIZE))
          } of {formatNumber(total)}</small>
        </span>
        <button type="button" disabled={loading || requestedPage + 1 >= totalPages}
          onClick={() => changePage(requestedPage + 1)}>
          Next <ChevronRight size={18} aria-hidden="true"/>
        </button>
      </div>
    </>}
    {zipPath && viewerIndex !== null && <PhotoViewer
      entry={selected} index={viewerIndex} total={total} loading={loading}
      zipPath={zipPath} onClose={closeViewer} onNavigate={navigatePhoto}/>}
    <p className="soc-soft-caption"><Info size={15} aria-hidden="true"/>
      ZIP filenames are scanned on demand. Each page returns up to {GALLERY_PAGE_SIZE} photo
      records, and image bytes are loaded separately. JPEG, PNG, GIF and WebP files up to 4 MiB
      can be previewed. Listing an archive does not cryptographically verify its identity.
    </p>
  </div>;
}
