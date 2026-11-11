import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Image as ImageIcon, ImageOff } from "lucide-react";
import { imageDataUrl, type ArchiveImageResponse } from "../archive-images";
import { fileName } from "../archive";

/** The active Library owns the ZIP path. Source paths and decoded images never persist. */
export function ArchivePhoto({ zipPath, member, caption, compact = false, fullSize = false }: {
  zipPath: string | null; member: string; caption?: string; compact?: boolean; fullSize?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"waiting" | "loading" | "ready" | "failed">("waiting");

  useEffect(() => {
    setUrl("");
    setStatus("waiting");
    if (!zipPath) return;
    let active = true;
    const target = node.current;
    if (!target) return;
    const fetchImage = async () => {
      if (!active) return;
      setStatus("loading");
      try {
        const response = await invoke<ArchiveImageResponse>("read_archive_image", { path: zipPath, member });
        if (active) { setUrl(imageDataUrl(response)); setStatus("ready"); }
      } catch {
        if (active) setStatus("failed");
      }
    };
    if (typeof IntersectionObserver === "undefined") {
      void fetchImage();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver(records => {
      if (!records.some(record => record.isIntersecting)) return;
      observer.disconnect();
      void fetchImage();
    }, { rootMargin: "160px" });
    observer.observe(target);
    return () => { active = false; observer.disconnect(); };
  }, [zipPath, member]);

  return <div ref={node} className={"soc-photo-frame " + (compact ? "soc-photo-compact " : "") + (fullSize ? "soc-photo-full" : "")}>
    {status === "ready" && url
      ? <img src={url} alt={caption ?? "Archived photo: " + fileName(member)}
          loading="lazy" decoding="async" onError={() => { setUrl(""); setStatus("failed"); }}/>
      : <div className="soc-photo-empty" role="status">
          {status === "failed" ? <ImageOff size={24} aria-hidden="true"/> : <ImageIcon size={24} aria-hidden="true"/>}
          <span>{!zipPath ? "Connect original ZIP to view" : status === "failed" ? "Preview unavailable" :
            status === "loading" ? "Opening photo…" : "Photo from archive"}</span>
        </div>}
    {!compact && <span className="soc-photo-caption" title={member}>{fileName(member)}</span>}
  </div>;
}

export function MediaStrip({ zipPath, paths, count, compact = false }: {
  zipPath: string | null; paths: readonly string[] | undefined; count: number; compact?: boolean;
}) {
  if (!paths?.length) return null;
  const items = paths.slice(0, compact ? 2 : 4);
  return <div className={"soc-inline-photos " + (compact ? "soc-inline-photos-compact" : "")}
    aria-label={items.length + " archived image references"}>
    {items.map(path => <ArchivePhoto key={path} zipPath={zipPath} member={path} compact={compact}/>)}
    {count > items.length && <p className="soc-photo-unavailable">
      {count - items.length} additional media reference{count - items.length === 1 ? "" : "s"} not previewed
    </p>}
  </div>;
}
