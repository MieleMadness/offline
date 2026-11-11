import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, LockKeyhole, X } from "lucide-react";
import { fileName, formatNumber, formatSize, type ArchiveEntry } from "../archive";
import { photoNeighbor } from "../gallery";
import { ArchivePhoto } from "./ArchivePhoto";

export default function PhotoViewer({ entries, index, zipPath, onClose, onNavigate }: {
  entries: readonly ArchiveEntry[];
  index: number;
  zipPath: string;
  onClose: () => void;
  onNavigate: (delta: -1 | 1) => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  // Keep keyboard handlers stable across navigation without refocusing the close button.
  const actions = useRef({onClose, onNavigate});
  actions.current = {onClose, onNavigate};

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        actions.current.onClose();
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        actions.current.onNavigate(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>(
        "button:not([disabled])"
      ) ?? []);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      else document.querySelector<HTMLButtonElement>(".soc-photo-open:not(:disabled)")?.focus();
    };
  }, []);

  const entry = entries[index];
  if (!entry) return null;
  const hasPrevious = photoNeighbor(index, -1, entries.length) >= 0;
  const hasNext = photoNeighbor(index, 1, entries.length) >= 0;
  return <div className="soc-viewer-backdrop" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div ref={dialog} className="soc-viewer" role="dialog" aria-modal="true"
      aria-labelledby="soc-viewer-title" aria-describedby="soc-viewer-hint">
      <header className="soc-viewer-header">
        <div className="soc-viewer-title">
          <strong id="soc-viewer-title" title={entry.path}>{fileName(entry.path)}</strong>
          <span>{formatNumber(index + 1)} of {formatNumber(entries.length)} photos</span>
        </div>
        <button ref={closeButton} type="button" className="soc-viewer-close"
          aria-label="Close photo viewer" onClick={onClose}>
          <X size={21} aria-hidden="true"/>
        </button>
      </header>
      <div className="soc-viewer-content">
        <button type="button" className="soc-viewer-arrow"
          onClick={() => onNavigate(-1)} disabled={!hasPrevious} aria-label="Previous photo">
          <ChevronLeft size={25} aria-hidden="true"/>
        </button>
        <div className="soc-viewer-image" aria-label="Selected archived photo">
          <ArchivePhoto key={entry.path} member={entry.path} zipPath={zipPath}
            caption={"Archived photo: " + fileName(entry.path)} compact fullSize/>
        </div>
        <button type="button" className="soc-viewer-arrow"
          onClick={() => onNavigate(1)} disabled={!hasNext} aria-label="Next photo">
          <ChevronRight size={25} aria-hidden="true"/>
        </button>
      </div>
      <footer className="soc-viewer-footer">
        <div><LockKeyhole size={14} aria-hidden="true"/><span title={entry.path}>{entry.path}</span></div>
        <span>{formatSize(entry.bytes)} · Local ZIP · Read only</span>
      </footer>
      <p id="soc-viewer-hint" className="soc-viewer-hint">Use left and right arrow keys to browse. Press Escape to close.</p>
    </div>
  </div>;
}
