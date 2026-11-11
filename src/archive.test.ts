import { describe, expect, it } from "vitest";
import { fileName, filterEntries, formatNumber, formatSize, type ArchiveEntry } from "./archive";

const entries: ArchiveEntry[] = [
  { path: "messages/inbox/bob/message_1.json", section: "messages", bytes: 420, kind: "json" },
  { path: "photos/Beach.JPG", section: "photos", bytes: 1200, kind: "jpg" },
  { path: "photos/Birthday.jpg", section: "photos", bytes: 300, kind: "jpg" },
];

describe("archive presentation helpers", () => {
  it("formats size without reporting invalid quantities", () => {
    expect(formatSize(0)).toBe("0 B");
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(-1)).toBe("—");
    expect(formatSize(Number.POSITIVE_INFINITY)).toBe("—");
  });
  it("formats counts for the UI", () => {
    expect(formatNumber(1200)).toBe(new Intl.NumberFormat().format(1200));
  });
  it("filters and sorts locally without mutating the source data", () => {
    const original = entries.slice();
    expect(filterEntries(entries, "photos", "beach", "name").map((x) => x.path)).toEqual(["photos/Beach.JPG"]);
    expect(filterEntries(entries, "all", "", "size").map((x) => x.bytes)).toEqual([1200, 420, 300]);
    expect(entries).toEqual(original);
  });
  it("extracts file names from archive paths", () => {
    expect(fileName("folder/another\u002ffile.json")).toBe("file.json");
    expect(fileName("images\\photo.png")).toBe("photo.png");
  });
});
