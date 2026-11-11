import { describe, expect, it } from "vitest";
import { fingerprint, packVector, searchIndex, textChunks, validIndex, type TextIndex } from "./text-index";
import type { ImportedArchive } from "./social-model";

function archiveWithPosts(texts: string[]): ImportedArchive {
  return {
    report: { archiveName: "synthetic.zip", formatHint: "JSON", totalFiles: 1, totalUncompressedBytes: 0,
      displayedFiles: 0, entries: [], sections: [] },
    social: { posts: texts.map((text, i) => ({
      id: "post" + i, text, timestamp: null, author: null, mediaCount: 0, sourcePath: "posts.json",
    })), conversations: [], dataCategories: [], filesRead: 1, jsonFilesRead: 1,
    htmlFilesRead: 0, formatHint: "JSON", filesSkipped: 0, warnings: [] },
  };
}

describe("workspace text indexing", () => {
  it("includes late records and the end of long Unicode records without splitting surrogate pairs", () => {
    const long = "🌻".repeat(500) + "Umbrella near the end";
    const chunks = textChunks(archiveWithPosts([...Array(35).fill("Pasta"), long]));
    expect(chunks.some(chunk => chunk.id === "post-35" && chunk.text.includes("Umbrella"))).toBe(true);
    expect(chunks.flatMap(chunk => Array.from(chunk.text)).every(character =>
      !/^[\uD800-\uDFFF]$/.test(character))).toBe(true);
    expect(chunks.filter(chunk => chunk.id === "post-35")).toHaveLength(2);
  });

  it("binds the cache to content, sources and model revision", async () => {
    const chunks = textChunks(archiveWithPosts(["Rain"]));
    const hash = await fingerprint(chunks);
    const index: TextIndex = { version: 1, modelRevision: "revision-one", fingerprint: hash,
      dimensions: 2, vectors: [packVector([1, 0])] };
    expect(validIndex(index, hash, "revision-one", 1)).toBe(true);
    expect(validIndex(index, hash, "revision-two", 1)).toBe(false);
    expect(validIndex(index, await fingerprint(textChunks(archiveWithPosts(["Sun"]))), "revision-one", 1)).toBe(false);
    expect(validIndex({ ...index, vectors: ["invalid"] }, hash, "revision-one", 1)).toBe(false);
    expect(validIndex({ ...index, vectors: [] }, hash, "revision-one", 1)).toBe(false);
    expect(validIndex({ ...index, vectors: [] }, hash, "revision-one", 1, true)).toBe(true);
  });

  it("ranks compressed vectors, keeps the best section per record and stops a cancelled search", async () => {
    const chunks = [
      { id: "one", source: "umbrella", text: "early section" },
      { id: "two", source: "pasta", text: "dinner" },
      { id: "one", source: "umbrella", text: "later rainy section" },
    ];
    const index: TextIndex = { version: 1, modelRevision: "synthetic", fingerprint: "synthetic",
      dimensions: 2, vectors: [[0, 1], [-1, 0], [1, 0]].map(packVector) };
    const results = await searchIndex(index, chunks, [1, 0], () => false);
    expect(results).toHaveLength(2);
    expect(results[0]!.reason).toContain("later rainy");
    expect(await searchIndex(index, chunks, [1, 0], () => true)).toEqual([]);
    expect(() => packVector([0, 0])).toThrow();
    expect(() => packVector([NaN, 1])).toThrow();
  });
});
