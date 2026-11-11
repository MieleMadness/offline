export const SECTION_IDS = [
  "photos", "videos", "messages", "posts", "comments", "reactions", "friends", "profile", "other",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];
export type ActiveSection = SectionId | "all";

export interface SectionSummary {
  id: SectionId;
  label: string;
  count: number;
  bytes: number;
}

export interface ArchiveEntry {
  path: string;
  section: SectionId;
  bytes: number;
  kind: string;
}

export interface ArchiveReport {
  archiveName: string;
  formatHint: string;
  totalFiles: number;
  totalUncompressedBytes: number;
  displayedFiles: number;
  entries: ArchiveEntry[];
  sections: SectionSummary[];
}

export const SECTION_LABELS: Record<SectionId, string> = {
  photos: "Photos",
  videos: "Videos",
  messages: "Messages",
  posts: "Posts",
  comments: "Comments",
  reactions: "Reactions",
  friends: "Friends",
  profile: "Profile",
  other: "Other files",
};

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

export function filterEntries(
  entries: readonly ArchiveEntry[],
  section: ActiveSection,
  query: string,
  sort: "name" | "size",
): ArchiveEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries
    .filter((entry) =>
      (section === "all" || entry.section === section) &&
      (needle === "" || entry.path.toLocaleLowerCase().includes(needle)),
    )
    .sort(sort === "size"
      ? (left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path)
      : (left, right) => left.path.localeCompare(right.path));
}

export function fileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || path;
}
