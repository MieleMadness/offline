import { describe, expect, it } from "vitest";
import { validateApproval } from "../scripts/stage-embedded-ai.mjs";

const fake = {
  schemaVersion: 1, modelId: "google/embeddinggemma-2", sdkVersion: "1.2.2",
  status: "reviewed-and-pinned", upstreamRevision: "a".repeat(40), sha256: "b".repeat(64),
};

describe("self-contained model release gate", () => {
  it("rejects unapproved or missing model pins", () => {
    for (const candidate of [
      {...fake, status:"pending-verification"}, {...fake, sha256: null},
      {...fake, upstreamRevision: "main"}, {...fake, modelId:"other"},
      {...fake, sdkVersion:"latest"},
    ]) expect(() => validateApproval(candidate)).toThrow();
  });

  it("requires a specific reviewed revision and model digest", () => {
    expect(validateApproval(fake)).toEqual(fake);
  });
});
