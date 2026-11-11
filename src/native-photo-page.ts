import type { ArchiveEntry } from "./archive";

/** Native ZIP metadata only; image bytes are requested separately. */
export interface NativePhotoEntry extends ArchiveEntry {
  section: "photos";
  zipIndex: number;
}

export interface NativePhotoPage {
  total: number;
  offset: number;
  entries: NativePhotoEntry[];
}

/** Guard the view against stale or malformed asynchronous directory replies. */
export function validateNativePhotoPage(
  value: NativePhotoPage, offset: number, limit: number,
): NativePhotoPage {
  const validNumber = (number: number) => Number.isSafeInteger(number) && number >= 0;
  if (!validNumber(offset) || !validNumber(limit) || limit < 1 || limit > 100 ||
      !value || !validNumber(value.total) || !validNumber(value.offset) ||
      value.offset !== offset || !Array.isArray(value.entries) ||
      value.entries.length > limit ||
      value.entries.some(item => !item || item.section !== "photos" ||
        !validNumber(item.bytes) || item.bytes > 4 * 1024 * 1024 ||
        !validNumber(item.zipIndex) ||
        typeof item.path !== "string" || item.path.length === 0 ||
        typeof item.kind !== "string")) {
    throw new Error("The ZIP returned an invalid photograph directory page.");
  }
  if (offset < value.total && value.entries.length === 0) {
    throw new Error("The photo directory is missing requested items.");
  }
  return value;
}
