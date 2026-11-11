import { describe, expect, it } from "vitest";
import {
  cleanProfileName, createProfile, deserializeProfiles, profileOwnedValue, renameFamilyProfile, withoutFamilyProfile, setProfileOwnedValue, PROFILE_COLORS,
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

  it("creates independent identities and stable accent assignment", () => {
    const newProfile = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    expect(newProfile.id).not.toBe(first.id);
    expect(newProfile.displayName).toBe("Taylor");
    expect(newProfile.accent).toBe(PROFILE_COLORS[1]);
    expect(first.displayName).toBe("Alex");
  });
});
