import { describe, expect, it } from "vitest";
import { availableSearchYears, searchPreview } from "./preview-search";
import type { SocialArchive } from "./social-model";

const archive: SocialArchive = {
  posts: [
    { id: "p1", timestamp: 1700000100, author: "Riley", text: "Beach picnic with family", sourcePath: "posts/one.json", mediaCount: 2 },
    { id: "p2", timestamp: null, author: "Casey", text: "Winter memories", sourcePath: "posts/two.html", mediaCount: 0 },
  ],
  conversations: [{
    id: "chat1", title: "Beach friends", participants: ["Casey", "Taylor"], lastTimestamp: 1700000200,
    messages: [
      { id: "m1", sender: "Taylor", timestamp: 1700000200, text: "Meet at the beach", attachments: 0 },
      { id: "m2", sender: "Casey", timestamp: null, text: "See you soon", attachments: 0 },
    ],
  }],
  dataCategories: [{
    id: "locations", label: "Places", fileCount: 1,
    records: [{ title: "Beach check-in", detail: "A synthetic location", timestamp: 1600000000, sourcePath: "activity/places.html" }],
  }],
  filesRead: 3, htmlFilesRead: 2, jsonFilesRead: 1,
  filesSkipped: 0, formatHint: "Mixed", warnings: [],
};

describe("profile-scoped quick search", () => {
  it("searches posts, messages and data without requiring an AI model", () => {
    const results = searchPreview(archive, "BEACH");
    expect(results.total).toBe(3);
    expect(results.hits.map(hit => hit.kind)).toEqual(["message", "post", "data"]);
    expect(results.hits[0]?.source).toBe("Conversation: Beach friends");
    expect(results.hits[1]?.source).toBe("posts/one.json");
  });

  it("filters by section and date, including undated records", () => {
    expect(searchPreview(archive, "beach", "post", "2023").total).toBe(1);
    expect(searchPreview(archive, "beach", "post", "2020").total).toBe(0);
    expect(searchPreview(archive, "winter", "all", "unknown").hits[0]?.title).toBe("Casey");
    expect(availableSearchYears(archive)).toEqual(["2023", "2020", "unknown"]);
  });

  it("returns bounded matches with a true total and stable source data", () => {
    expect(searchPreview(archive, "beach", "all", "all", 1)).toMatchObject({ total: 3, hits: [{ kind: "message" }] });
    expect(searchPreview(archive, "  ")).toEqual({ hits: [], total: 0 });
    expect(searchPreview(archive, "posts/two.html", "post").hits[0]?.title).toBe("Casey");
    expect(archive.posts[0]?.text).toBe("Beach picnic with family");
  });

  it("never includes records from another profile's archive", () => {
    const other: SocialArchive = { ...archive, posts: [], conversations: [], dataCategories: [] };
    expect(searchPreview(other, "beach")).toEqual({ hits: [], total: 0 });
    expect(searchPreview(archive, "beach").total).toBe(3);
  });

  it("shortens previews of long records without leaking other record text", () => {
    const long: SocialArchive = {
      ...archive, conversations: [], dataCategories: [],
      posts: [{ ...archive.posts[0]!, text: "before ".repeat(80) + "needlestone" + " after".repeat(80) }],
    };
    const result = searchPreview(long, "needlestone");
    expect(result.hits[0]?.excerpt).toContain("needlestone");
    expect(result.hits[0]?.excerpt.length).toBeLessThanOrEqual(232);
  });
});
