import { describe, expect, it } from "vitest";
import {
  cleanProfileName, createProfile, deserializeProfiles, PROFILE_COLORS,
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
  });
  it("prevents accidental duplicate names and IDs", () => {
    expect(() => createProfile([first], "ALEX", () => "second-profile", 2)).toThrow(/already exists/);
    expect(() => createProfile([first], "Taylor", () => first.id, 2)).toThrow(/unique profile/);
  });
  it("creates independent identities and stable accent assignment", () => {
    const newProfile = createProfile([first], "Taylor", () => "second-profile-uuid", 2);
    expect(newProfile.id).not.toBe(first.id);
    expect(newProfile.displayName).toBe("Taylor");
    expect(newProfile.accent).toBe(PROFILE_COLORS[1]);
    expect(first.displayName).toBe("Alex");
  });
});
