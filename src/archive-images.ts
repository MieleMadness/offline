import type { ArchiveReport, ArchiveEntry } from "./archive";

export const PREVIEW_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
export interface ArchiveImageResponse { mime: string; data: string }

export function isPreviewImage(path: string): boolean {
  const extension = path.split(".").pop()?.toLocaleLowerCase() ?? "";
  return PREVIEW_EXTENSIONS.has(extension);
}

export function photoEntries(report: ArchiveReport): ArchiveEntry[] {
  return report.entries.filter(entry => isPreviewImage(entry.path) && entry.bytes <= 4 * 1024 * 1024);
}

/** Archive metadata cross-check. It cannot authenticate a maliciously substituted ZIP. */
export function sameInventory(left: ArchiveReport, right: ArchiveReport): boolean {
  if (left.totalFiles !== right.totalFiles ||
      left.totalUncompressedBytes !== right.totalUncompressedBytes ||
      left.entries.length !== right.entries.length || left.displayedFiles !== right.displayedFiles) return false;
  return left.entries.every((item, i) => {
    const other = right.entries[i];
    return item.path === other?.path && item.bytes === other.bytes && item.section === other.section;
  });
}

export function imageDataUrl(value: ArchiveImageResponse): string {
  if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(value.mime) ||
      !/^[a-zA-Z0-9+/]+={0,2}$/.test(value.data) || value.data.length > 6 * 1024 * 1024) {
    throw new Error("Unsupported or oversized image response.");
  }
  return "data:" + value.mime + ";base64," + value.data;
}
