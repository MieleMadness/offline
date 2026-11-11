import {describe, expect, it} from "vitest";
import {validateNativePhotoPage, type NativePhotoPage} from "./native-photo-page";

const result: NativePhotoPage = {
  total: 10125, offset: 10000,
  entries: Array.from({length:24}, (_, i) => ({
    path:"photos/synthetic_" + (10000 + i) + ".png",
    section:"photos" as const, bytes:1600, kind:"png", zipIndex:10000+i,
  })),
};

describe("native ZIP photo pages", () => {
  it("keeps 10k+ photo pages bounded and index-bearing", () => {
    expect(validateNativePhotoPage(result,10000,24)).toBe(result);
    expect(result.entries[0]?.zipIndex).toBe(10000);
  });
  it("rejects stale ZIP page replies, invalid indices and oversized entries", () => {
    expect(() => validateNativePhotoPage(result, 24, 24)).toThrow();
    expect(() => validateNativePhotoPage({...result,entries:[...result.entries,{...result.entries[0]!, zipIndex:-1}]},10000,24)).toThrow();
    expect(() => validateNativePhotoPage({...result,entries:[{...result.entries[0]!, bytes:5*1024*1024}]},10000,24)).toThrow();
    expect(() => validateNativePhotoPage({...result,entries:[{...result.entries[0]!, section:"messages" as "photos"}]},10000,24)).toThrow();
  });
  it("allows last empty page after a changed filtered inventory", () => {
    expect(validateNativePhotoPage({total:12,offset:24,entries:[]},24,24).total).toBe(12);
    expect(() => validateNativePhotoPage({total:12,offset:0,entries:[]},0,24)).toThrow();
  });
});
