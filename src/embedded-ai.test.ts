import { describe, expect, it } from "vitest";
import { embeddedModelRevision, validEmbeddedBundle, type EmbeddedBundle } from "./embedded-ai";

const synthetic: EmbeddedBundle = {
  schemaVersion: 1, status: "reviewed-and-pinned",
  modelId: "google/embeddinggemma-2", modelVariant: "text-vision-440m",
  sdkVersion: "1.2.2", upstreamRevision: "c".repeat(40), modelSha256: "e".repeat(64),
  modelBytes: 380_000_000, wasmFiles: [{name:"retrieval_wasm_internal.wasm",bytes:1234,sha256:"f".repeat(64)}],
};

describe("packaged-only embedded AI source integrity", () => {
  it("accepts only expected pinned local manifest shape", () => {
    expect(validEmbeddedBundle(synthetic)).toBe(true);
    expect(embeddedModelRevision(synthetic)).toBe("mediapipe:1.2.2:"+"e".repeat(64));
    for(const modified of [
      {...synthetic,status:"pending-verification"}, {...synthetic,modelSha256:"bad"},
      {...synthetic,upstreamRevision:"main"}, {...synthetic,sdkVersion:"latest"},
      {...synthetic,wasmFiles:[{name:"../evil.wasm",bytes:1234,sha256:"f".repeat(64)}]},
      {...synthetic,wasmFiles:[]}, {...synthetic,modelBytes:0},
    ]) expect(validEmbeddedBundle(modified)).toBe(false);
  });
});
