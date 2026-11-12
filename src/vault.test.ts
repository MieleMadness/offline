import { describe, expect, it } from "vitest";
import { deriveKey, seal, unseal } from "./vault";
import type { ImportedArchive } from "./social-model";

const archive: ImportedArchive = {
  report: { archiveName: "synthetic-only.zip", formatHint: "HTML", totalFiles: 1, totalUncompressedBytes: 50,
    displayedFiles: 0, entries: [], sections: [] },
  social: { posts: [], conversations: [], dataCategories: [], filesRead: 1, jsonFilesRead: 0,
    htmlFilesRead: 1, formatHint: "HTML", filesSkipped: 0, warnings: ["Synthetic example"] },
};

describe("encrypted family snapshots", () => {
  it("encrypts local text embeddings in the owner's saved workspace", async () => {
    const indexed: ImportedArchive = {...archive, textIndex: {
      version: 1, modelRevision: "synthetic-model",
      fingerprint: "a".repeat(64), dimensions: 2, vectors: ["fwA="],
    }};
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("synthetic owner secret", salt);
    const sealed = await seal("example-owner", indexed, key, salt);
    expect(JSON.stringify(Array.from(new Uint8Array(sealed.ciphertext))))
      .not.toContain("synthetic-model");
    expect(await unseal("example-owner", sealed, key)).toEqual(indexed);
    await expect(unseal("different-owner", sealed, key)).rejects.toThrow();
  });

  it("opens only with the owner's passphrase and bound profile ID", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("synthetic family passphrase", salt);
    const snapshot = await seal("owner-one", archive, key, salt);
    const restoredKey = await deriveKey("synthetic family passphrase", snapshot.salt);
    expect(await unseal("owner-one", snapshot, restoredKey)).toEqual(archive);
    expect(key.extractable).toBe(false);
    await expect(unseal("owner-two", snapshot, restoredKey)).rejects.toThrow();
    const wrongKey = await deriveKey("another synthetic passphrase", snapshot.salt);
    await expect(unseal("owner-one", snapshot, wrongKey)).rejects.toThrow();
    const edited = new Uint8Array(snapshot.ciphertext.slice(0));
    edited[0] = edited[0]! ^ 1;
    await expect(unseal("owner-one", { ...snapshot, ciphertext: edited.buffer }, key)).rejects.toThrow();
    const next = await seal("owner-one", archive, key, salt);
    expect(next.iv).not.toEqual(snapshot.iv);
    expect(new Uint8Array(next.ciphertext)).not.toEqual(new Uint8Array(snapshot.ciphertext));
  });
});
