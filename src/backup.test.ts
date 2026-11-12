import { describe, expect, it } from "vitest";
import { parseBackup, recoveredProfileName, serializeBackup, validateRecoveredArchive } from "./backup";
import { deriveKey, seal, unseal } from "./vault";
import { PROFILE_COLORS, type FamilyProfile } from "./profiles";
import type { ImportedArchive } from "./social-model";

const profile: FamilyProfile = { id: "family-owner-01234", displayName: "Sam", accent: PROFILE_COLORS[0], createdAt: 123 };
const archive: ImportedArchive = {
  report: { archiveName: "synthetic.zip", formatHint: "Mixed", totalFiles: 1, totalUncompressedBytes: 38,
    displayedFiles: 0, entries: [], sections: [] },
  social: {
    posts: [{ id: "p1", timestamp: null, author: "Sam", text: "A private synthetic memory", mediaCount: 0, sourcePath: "posts/one.json" }],
    conversations: [], dataCategories: [], filesRead: 1, jsonFilesRead: 1, htmlFilesRead: 0,
    formatHint: "JSON", filesSkipped: 0, warnings: [],
  },
};

describe("portable encrypted backup recovery", () => {
  it("round-trips the protected snapshot without including plaintext social content", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("synthetic secret", salt);
    const snapshot = { ...(await seal(profile.id, archive, key, salt)), credential: "passphrase" as const };
    const contents = serializeBackup(profile, snapshot);
    expect(contents).not.toContain("A private synthetic memory");
    expect(contents).toContain("Sam"); // intentionally visible metadata
    const restored = parseBackup(contents);
    expect(restored.profile).toEqual(profile);
    const restoredKey = await deriveKey("synthetic secret", restored.snapshot.salt);
    const decoded = await unseal(profile.id, restored.snapshot, restoredKey);
    validateRecoveredArchive(decoded);
    expect(decoded).toEqual(archive);
    await expect(unseal("other-profile-123", restored.snapshot, restoredKey)).rejects.toThrow();
  });

  it("rejects corrupt fields, malformed encoding and unsupported versions", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("synthetic secret", salt);
    const safe = JSON.parse(serializeBackup(profile, await seal(profile.id, archive, key, salt)));
    expect(() => parseBackup(JSON.stringify({ ...safe, version: 6 }))).toThrow(/unsupported/);
    expect(() => parseBackup(JSON.stringify({ ...safe, profile: { ...profile, id: "__proto__" } }))).toThrow(/invalid profile/);
    expect(() => parseBackup(JSON.stringify({ ...safe, snapshot: { ...safe.snapshot, iv: "$$$$" } }))).toThrow(/invalid encrypted/);
    expect(() => parseBackup(JSON.stringify({ ...safe, snapshot: { ...safe.snapshot, salt: "AAAA" } }))).toThrow();
    expect(() => parseBackup("{bad")).toThrow(/not a valid/);
  });

  it("detects ciphertext tampering and wrong credentials", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("1234567890", salt);
    const safe = JSON.parse(serializeBackup(profile, await seal(profile.id, archive, key, salt)));
    const encoded = safe.snapshot.ciphertext as string;
    safe.snapshot.ciphertext = (encoded[0] === "A" ? "B" : "A") + encoded.slice(1);
    const restored = parseBackup(JSON.stringify(safe));
    await expect(unseal(profile.id, restored.snapshot, key)).rejects.toThrow();
    const wrong = await deriveKey("00000000", restored.snapshot.salt);
    await expect(unseal(profile.id, restored.snapshot, wrong)).rejects.toThrow();
  });

  it("rejects tampered or oversized optional text indexes and accepts older snapshots", () => {
    const sample: ImportedArchive = JSON.parse(JSON.stringify(archive));
    const valid = {
      version: 1 as const, modelRevision: "local-digest",
      fingerprint: "a".repeat(64), dimensions: 2, vectors: ["fwA="],
    };
    expect(() => validateRecoveredArchive(sample)).not.toThrow();
    expect(() => validateRecoveredArchive({...sample, textIndex: valid})).not.toThrow();
    expect(() => validateRecoveredArchive({...sample, textIndex: {...valid, vectors: ["!invalid!"]}}))
      .toThrow(/search index/);
    expect(() => validateRecoveredArchive({...sample, textIndex: {...valid, dimensions: 500000}}))
      .toThrow(/search index/);
    expect(() => validateRecoveredArchive({...sample, textIndex: {...valid, vectors: Array(20001).fill("fwA=")}}))
      .toThrow(/search index/);
  });

  it("keeps restored identity stable and handles duplicate profile names", () => {
    const existing = [{ ...profile, id: "other-family-0987" }];
    expect(recoveredProfileName(profile, existing)).toBe("Sam (restored 2)");
    expect(recoveredProfileName(profile, [])).toBe("Sam");
    expect(() => validateRecoveredArchive({ social: {}, report: {} })).toThrow();
  });
});
