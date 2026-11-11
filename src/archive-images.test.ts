import { describe, expect, it } from "vitest";
import { imageDataUrl, isPreviewImage, photoEntries, sameInventory } from "./archive-images";
import type { ArchiveReport } from "./archive";

const report: ArchiveReport = {
 archiveName: "example.zip", formatHint: "Facebook", totalFiles: 3, totalUncompressedBytes: 1200,
 displayedFiles: 3, entries: [
  {path:"photos/one.jpg",section:"photos",bytes:100,kind:"jpg"},
  {path:"photos/two.png",section:"photos",bytes:200,kind:"png"},
  {path:"photos/code.svg",section:"photos",bytes:900,kind:"svg"},
 ], sections: [],
};
describe("archive photo preview safety and reconnection", () => {
 it("only accepts allowlisted image extensions and never previews SVG", () => {
  expect(isPreviewImage("photos/one.jpg")).toBe(true);
  expect(isPreviewImage("photos/code.svg")).toBe(false);
  expect(isPreviewImage("photos/VIDEO.mp4")).toBe(false);
  expect(photoEntries(report).map(x=>x.path)).toEqual(["photos/one.jpg","photos/two.png"]);
 });
 it("matches exact normalized inventory rather than just source filename", () => {
  expect(sameInventory(report,{...report,archiveName:"renamed.zip"})).toBe(true);
  expect(sameInventory(report,{...report,totalUncompressedBytes:1201})).toBe(false);
  expect(sameInventory(report,{...report,entries:[...report.entries].reverse()})).toBe(false);
 });
 it("constructs data URLs only from allowed MIME and base64", () => {
  expect(imageDataUrl({mime:"image/png",data:"iVBORw0K"})).toBe("data:image/png;base64,iVBORw0K");
  expect(()=>imageDataUrl({mime:"image/svg+xml",data:"YWJj"})).toThrow();
  expect(()=>imageDataUrl({mime:"image/png",data:"javascript:alert(1)"})).toThrow();
 });
});
