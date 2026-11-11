/** Local family profiles: organizational separation, NOT authentication or encryption. */
export const PROFILE_STORAGE_KEY = "offline.familyProfiles.v1";
export const ACTIVE_PROFILE_KEY = "offline.activeFamilyProfile.v1";

export const PROFILE_COLORS = ["#3B748B", "#856AA7", "#B66755", "#96712D", "#31735A"] as const;
export type ProfileColor = (typeof PROFILE_COLORS)[number];

export interface FamilyProfile {
  id: string;
  displayName: string;
  accent: ProfileColor;
  createdAt: number;
}

export function cleanProfileName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 50);
}

export function deserializeProfiles(raw: string | null): FamilyProfile[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    const result: FamilyProfile[] = [];
    const seenIds = new Set<string>();
    for (const item of value.slice(0, 30)) {
      if (!item || typeof item !== "object") continue;
      const v = item as Record<string, unknown>;
      if (
        typeof v.id !== "string" ||
        typeof v.displayName !== "string" ||
        !/^[A-Za-z0-9-]{8,100}$/.test(v.id) ||
        typeof v.createdAt !== "number" || !Number.isFinite(v.createdAt) ||
        !PROFILE_COLORS.some((color) => color === v.accent) ||
        seenIds.has(v.id)
      ) continue;
      const name = cleanProfileName(v.displayName);
      if (!name) continue;
      seenIds.add(v.id);
      result.push({ id: v.id, displayName: name, accent: v.accent as ProfileColor, createdAt: v.createdAt });
    }
    return result;
  } catch {
    return [];
  }
}

export function createProfile(
  existing: readonly FamilyProfile[],
  input: string,
  generateId: () => string,
  now: number,
): FamilyProfile {
  const name = cleanProfileName(input);
  if (!name) throw new Error("Enter a name for this family profile.");
  if (existing.length >= 20) throw new Error("This preview supports up to 20 family profiles.");
  if (existing.some((p) => p.displayName.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error("A profile with that name already exists. Choose a unique name.");
  }
  const id = generateId();
  if (!id || existing.some((p) => p.id === id)) throw new Error("Could not create a unique profile ID.");
  return {
    id, displayName: name, createdAt: now,
    accent: PROFILE_COLORS[existing.length % PROFILE_COLORS.length]!,
  };
}

export function safeLoadProfiles(): FamilyProfile[] {
  try { return deserializeProfiles(window.localStorage.getItem(PROFILE_STORAGE_KEY)); }
  catch { return []; }
}

export function safeActiveId(profiles: readonly FamilyProfile[]): string {
  try {
    const preferred = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
    return profiles.some((p) => p.id === preferred) ? preferred! : (profiles[0]?.id ?? "");
  } catch {
    return profiles[0]?.id ?? "";
  }
}

export function saveProfiles(profiles: readonly FamilyProfile[], selectedId: string): void {
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, selectedId);
  } catch {
    // WebView localStorage can be blocked. Family profiles still work for this session;
    // callers should communicate that persistence may be unavailable.
  }
}

/** Read only the value explicitly owned by a profile; never fall back to inherited object keys. */
export function profileOwnedValue<T>(data: Readonly<Record<string, T>>, id: string): T | null {
  return Object.prototype.hasOwnProperty.call(data, id) ? (data[id] ?? null) : null;
}

/** Persist a new in-session value under exactly one owner, leaving other owners unchanged. */
export function setProfileOwnedValue<T>(
  data: Readonly<Record<string, T>>,
  id: string,
  value: T,
): Record<string, T> {
  if (!id || !/^[A-Za-z0-9-]{8,100}$/.test(id)) throw new Error("Invalid family profile ID.");
  return { ...data, [id]: value };
}
