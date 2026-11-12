import { describe, expect, it } from "vitest";
import { validateApproval } from "./stage-embedded-ai.mjs";

const synthetic = {
  schemaVersion: 1, modelId: "google/embeddinggemma-2",
  sdkVersion: "1.2.2", status: "reviewed-and-pinned",
  upstreamRevision: "a".repeat(40), sha256: "b".repeat(64),
};

describe("build-time self-contained model verification gate", () => {
  it("rejects missing or unapproved upstream model pins", () => {
    for (const invalid of [
      {...synthetic,status:"pending-verification"}, {...synthetic,sha256:null},
      {...synthetic,upstreamRevision:"main"}, {...synthetic,modelId:"other"},
      {...synthetic,sdkVersion:"latest"},
    ]) expect(() => validateApproval(invalid)).toThrow();
  });
  it("accepts only a concrete reviewed revision and matching hash shape", () => {
    expect(validateApproval(synthetic)).toEqual(synthetic);
  });
});
