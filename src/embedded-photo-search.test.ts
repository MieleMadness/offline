import { describe, expect, it } from "vitest";
import { cosineScore, decodeLocalPhoto, MAX_EMBEDDED_PHOTOS, rankLocalPhotoMatches } from "./embedded-photo-search";
import { embedImageWithBundledModel, type EmbeddedBundle } from "./embedded-ai";

function vector(x: number, y: number): number[] {
  return [x, y, ...Array(766).fill(0)];
}
const tinyPng = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const encoded = btoa(String.fromCharCode(...tinyPng));
const example: EmbeddedBundle = {
  schemaVersion: 1, status: "reviewed-and-pinned",
  modelId: "google/embeddinggemma-2", modelVariant: "text-vision-440m",
  sdkVersion: "1.2.2", upstreamRevision: "a".repeat(40),
  modelSha256: "b".repeat(64), modelBytes: 380_000_000,
  wasmFiles: [{ name: "retrieval_wasm_internal.wasm", bytes: 1234, sha256: "c".repeat(64) }],
};
const entries = [
  { path: "photos/blue.png", kind: "png", zipIndex: 1 },
  { path: "photos/red.png", kind: "png", zipIndex: 2 },
  { path: "photos/animated.gif", kind: "gif", zipIndex: 3 },
];

describe("bounded embedded photo similarity", () => {
  it("sorts supported photos by text-image similarity without sending data off device", async () => {
    const seen: string[] = [];
    const matches = await rankLocalPhotoMatches({
      path: "/synthetic-family.zip", query: "red birthday hat",
      shouldStop: () => false, progress: () => {},
      list: async <T>(_cmd: string, args: Record<string, unknown>) => {
        expect(args.path).toBe("/synthetic-family.zip");
        return { entries, total: 3, offset: 0 } as T;
      },
      read: async <T>(cmd: string, args: Record<string, unknown>) => {
        expect(cmd).toBe("read_archive_ai_image");
        seen.push(String(args.member));
        return { mime: "image/png", data: encoded } as T;
      },
      embedText: async () => vector(1, 0),
      embedImage: async () => seen.at(-1)?.includes("red") ? vector(1, 0) : vector(0, 1),
    });
    expect(seen).toEqual(["photos/blue.png", "photos/red.png"]);
    expect(matches.map(x => x.id)).toEqual(["photos/red.png", "photos/blue.png"]);
    expect(matches[0]?.reason).toContain("1.000");
  });

  it("caps a request to 24 supported photos even when the ZIP contains thousands", async () => {
    const many = Array.from({length:50}, (_, i) =>
      ({ path: "photos/fake-" + i + ".png", kind:"png", zipIndex:i }));
    let count = 0;
    const matches = await rankLocalPhotoMatches({
      path:"/fictional.zip", query:"beach", shouldStop:() => false,
      progress:() => {},
      list: async <T>() => ({entries:many,total:5125,offset:0} as T),
      read: async <T>() => { count++; return {mime:"image/png",data:encoded} as T; },
      embedText: async () => vector(1,0),
      embedImage: async () => vector(1,0),
    });
    expect(count).toBe(MAX_EMBEDDED_PHOTOS);
    expect(matches).toHaveLength(8);
  });

  it("never reads photos after user or family profile cancels", async () => {
    let called = false;
    const result = await rankLocalPhotoMatches({
      path:"/fictional.zip", query:"pic", shouldStop: () => true,
      progress:() => {},
      list: async <T>() => {called=true; return {} as T;},
      read: async <T>() => {called=true; return {} as T;},
      embedText: async () => {called=true; return vector(1,0);},
      embedImage: async () => {called=true; return vector(1,0);},
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });

  it("skips a damaged native image but does not bypass native content-type checks", async () => {
    let readCount=0;
    const common = {
      path:"/fictional.zip",query:"sun",shouldStop:()=>false,progress:()=>{},
      list: async <T>() => ({entries,total:3,offset:0} as T),
      embedText: async () => vector(1,0),
      embedImage: async () => vector(1,0),
    };
    const matches = await rankLocalPhotoMatches({...common,
      read: async <T>() => {
        readCount++;
        if(readCount === 1) throw new Error("above the 4 MiB preview safety limit");
        return {mime:"image/png",data:encoded} as T;
      },
    });
    expect(matches.map(x=>x.id)).toEqual(["photos/red.png"]);
    await expect(rankLocalPhotoMatches({...common,
      read: async <T>() => ({mime:"image/svg+xml",data:encoded} as T),
    })).rejects.toThrow(/unsupported format/);
  });

  it("rejects malformed vectors and over-limit decoded base64", () => {
    expect(cosineScore(vector(1,0),vector(0,1))).toBeCloseTo(0);
    expect(()=>cosineScore(vector(1,0),[1,0])).toThrow(/dimensions/);
    expect(decodeLocalPhoto(encoded)).toEqual(tinyPng);
    expect(()=>decodeLocalPhoto("AAAA")).toThrow(/photo is empty/);
  });

  it("rejects arbitrary non-JPEG/PNG bytes before loading any in-app model", async () => {
    await expect(embedImageWithBundledModel(example, Uint8Array.from(Array(48).fill(0))))
      .rejects.toThrow(/JPEG or PNG/);
  });
});
