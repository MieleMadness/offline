import { describe, expect, it } from "vitest";
import {
  cleanProfileName, commitCatalogBackedChange, createProfile, deserializeProfiles, persistProfileCatalog, profileOwnedValue, renameFamilyProfile, withoutFamilyProfile, setProfileOwnedValue, PROFILE_COLORS,
  type FamilyProfile,
} from "./profiles";

const first: FamilyProfile = {
  id: "first-profile-uuid", displayName: "Alex", accent: PROFILE_COLORS[0], createdAt: 1,
};

describe("family profile isolation helpers", () => {
  it("normalizes labels without modifying the source", () => {
    expect(cleanProfileName("  Alex   Rivera  ")).toBe("Alex Rivera");
    expect(cleanProfileName("  ")).toBe("");
  });
  it("accepts validated profile catalogs and ignores malformed entries", () => {
    const data = JSON.stringify([first, { id: "invalid", displayName: 7, accent: "red", createdAt: 1 }]);
    expect(deserializeProfiles(data)).toEqual([first]);
    expect(deserializeProfiles("not json")).toEqual([]);
    expect(deserializeProfiles("{}")).toEqual([]);
    expect(deserializeProfiles(JSON.stringify([{ ...first, id: "__proto__" }]))).toEqual([]);
  });
  it("prevents accidental duplicate names and IDs", () => {
    expect(() => createProfile([first], "ALEX", () => "second-profile", 2)).toThrow(/already exists/);
    expect(() => createProfile([first], "Taylor", () => first.id, 2)).toThrow(/unique profile/);
  });
  it("does not expose another profile's imported content", () => {
    const firstContent = { owner: first.id, messages: ["Private Alex message"] };
    const second = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    const secondContent = { owner: second.id, messages: ["Private Taylor message"] };
    const firstOnly = setProfileOwnedValue({}, first.id, firstContent);
    const both = setProfileOwnedValue(firstOnly, second.id, secondContent);
    expect(profileOwnedValue(firstOnly, second.id)).toBeNull();
    expect(profileOwnedValue(both, first.id)).toEqual(firstContent);
    expect(profileOwnedValue(both, second.id)).toEqual(secondContent);
    expect(profileOwnedValue(both, "other-profile-uuid")).toBeNull();
    expect(profileOwnedValue({}, "constructor")).toBeNull();
    expect(firstOnly[first.id]).toBe(firstContent);
  });


  it("renames a profile without changing its encrypted owner identity", () => {
    const second = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    const output = renameFamilyProfile([first, second], first.id, "  Alex  Rivera ");
    expect(output[0]).toMatchObject({ id: first.id, displayName: "Alex Rivera", accent: first.accent, createdAt: 1 });
    expect(output[1]).toEqual(second);
    expect(first.displayName).toBe("Alex");
    expect(() => renameFamilyProfile([first, second], first.id, "TAYLOR")).toThrow(/already uses/);
    expect(() => renameFamilyProfile([first], first.id, "   ")).toThrow(/Enter a name/);
    expect(() => renameFamilyProfile([first], "missing-profile", "Sam")).toThrow(/no longer exists/);
  });

  it("removes just the selected profile and chooses a safe remaining owner", () => {
    const second = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    expect(withoutFamilyProfile([first, second], first.id, first.id)).toEqual({
      profiles: [second], selectedId: second.id,
    });
    expect(withoutFamilyProfile([first, second], second.id, first.id)).toEqual({
      profiles: [first], selectedId: first.id,
    });
    expect(withoutFamilyProfile([first], first.id, first.id)).toEqual({ profiles: [], selectedId: "" });
    expect(() => withoutFamilyProfile([first], "unknown", first.id)).toThrow(/no longer exists/);
  });

  function store(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial));
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    };
  }

  it("verifies durable catalog writes and selected owner before changing encrypted data", () => {
    const storage = store();
    persistProfileCatalog([first], first.id, storage);
    expect(deserializeProfiles(storage.getItem("offline.familyProfiles.v1"))).toEqual([first]);
    expect(storage.getItem("offline.activeFamilyProfile.v1")).toBe(first.id);
    expect(() => persistProfileCatalog([first], "other-profile", storage)).toThrow(/not present/);
    expect(storage.values.size).toBe(2);
  });

  it("rolls back an interrupted second write rather than orphaning a snapshot owner", () => {
    const storage = store();
    persistProfileCatalog([first], first.id, storage);
    const oldCatalog = storage.getItem("offline.familyProfiles.v1");
    const second = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    let refuse = true;
    const failing = {
      ...storage,
      setItem(key: string, value: string) {
        if (key === "offline.activeFamilyProfile.v1" && refuse) {
          refuse = false;
          throw new Error("Simulated storage quota or security error");
        }
        storage.setItem(key, value);
      },
    };
    expect(() => persistProfileCatalog([first, second], second.id, failing)).toThrow(/Previous settings were restored/);
    expect(storage.getItem("offline.familyProfiles.v1")).toBe(oldCatalog);
    expect(storage.getItem("offline.activeFamilyProfile.v1")).toBe(first.id);
  });

  it("detects silent storage failures and protects corrupt existing owner metadata", () => {
    const initial = store();
    const ignoredWrites = {
      ...initial,
      setItem(_key: string, _value: string) { /* Storage lies: no write persisted. */ },
    };
    expect(() => persistProfileCatalog([first], first.id, ignoredWrites)).toThrow(/could not be saved/);
    const corrupt = store({"offline.familyProfiles.v1": "{ broken json"});
    expect(() => persistProfileCatalog([first], first.id, corrupt)).toThrow(/catalog is damaged/);
    expect(corrupt.getItem("offline.familyProfiles.v1")).toBe("{ broken json");
  });

  it("does not touch ciphertext if the family catalog cannot be saved", async () => {
    const storage = store();
    const blocked = {...storage, setItem() { throw new Error("synthetic quota failure"); }};
    let touched = false;
    await expect(commitCatalogBackedChange([], "", [first], first.id,
      async () => { touched = true; }, blocked)).rejects.toThrow(/catalog could not be saved/);
    expect(touched).toBe(false);
  });

  it("stages owner metadata before the encrypted operation and rolls back on failure", async () => {
    const storage = store();
    persistProfileCatalog([first], first.id, storage);
    const second = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    const steps: string[] = [];
    await expect(commitCatalogBackedChange([first], first.id, [first, second], second.id,
      async () => {
        const current = deserializeProfiles(storage.getItem("offline.familyProfiles.v1"));
        expect(current.some(profile => profile.id === second.id)).toBe(true);
        expect(storage.getItem("offline.activeFamilyProfile.v1")).toBe(second.id);
        steps.push("owner mapping exists");
        throw new Error("synthetic IndexedDB transaction rejected");
      }, storage)).rejects.toThrow(/transaction rejected/);
    expect(steps).toEqual(["owner mapping exists"]);
    expect(deserializeProfiles(storage.getItem("offline.familyProfiles.v1"))).toEqual([first]);
    expect(storage.getItem("offline.activeFamilyProfile.v1")).toBe(first.id);
  });

  it("creates independent identities and stable accent assignment", () => {
    const newProfile = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    expect(newProfile.id).not.toBe(first.id);
    expect(newProfile.displayName).toBe("Taylor");
    expect(newProfile.accent).toBe(PROFILE_COLORS[1]);
    expect(first.displayName).toBe("Alex");
  });
});
