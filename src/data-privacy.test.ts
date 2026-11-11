import { describe, expect, it } from "vitest";
import { isPrivateDataCategory } from "./data-privacy";

describe("private archive data category classification", () => {
  it("conceals searches, logins, locations, off-site activity and account data", () => {
    for (const type of ["searches", "locations", "security", "external", "personal"]) {
      expect(isPrivateDataCategory(type)).toBe(true);
    }
    expect(isPrivateDataCategory("engagement")).toBe(false);
    expect(isPrivateDataCategory(undefined)).toBe(false);
  });
});
