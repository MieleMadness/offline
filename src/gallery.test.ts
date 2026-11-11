import { describe, expect, it } from "vitest";
import { galleryPage, GALLERY_PAGE_SIZE, photoNeighbor } from "./gallery";

describe("bounded photo navigation", () => {
  const photos = Array.from({length: 1250}, (_, index) => "photo-" + index);

  it("mounts only one page, not an ever-growing set of decoded images", () => {
    const first = galleryPage(photos, 0);
    const mid = galleryPage(photos, 4);
    const end = galleryPage(photos, 9999);
    expect(first.items).toHaveLength(GALLERY_PAGE_SIZE);
    expect(first.items[0]).toBe("photo-0");
    expect(mid.items[0]).toBe("photo-96");
    expect(end.page).toBe(52);
    expect(end.items).toHaveLength(2);
    expect(first.total).toBe(1250);
    expect(mid.totalPages).toBe(53);
  });

  it("handles empty collections, invalid pages and filtered views", () => {
    expect(galleryPage([], 500)).toMatchObject({items:[],page:0,totalPages:1,total:0});
    expect(galleryPage(photos, -1).page).toBe(0);
    expect(galleryPage(photos, Number.NaN).page).toBe(0);
    expect(galleryPage(photos.filter(x => x === "photo-10"), 200)).toMatchObject({
      items:["photo-10"],page:0,totalPages:1,total:1,
    });
    expect(() => galleryPage(photos, 0, 0)).toThrow();
    expect(() => galleryPage(photos, 0, 1000)).toThrow();
  });

  it("does not wrap viewer navigation or navigate outside filtered results", () => {
    expect(photoNeighbor(0, -1, 4)).toBe(-1);
    expect(photoNeighbor(0, 1, 4)).toBe(1);
    expect(photoNeighbor(3, 1, 4)).toBe(-1);
    expect(photoNeighbor(3, -1, 4)).toBe(2);
    expect(photoNeighbor(-1, 1, 4)).toBe(-1);
    expect(photoNeighbor(0, 1, 0)).toBe(-1);
  });
});
