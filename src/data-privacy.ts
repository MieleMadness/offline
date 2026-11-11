/** These parsed categories can contain highly revealing personal information. */
export const PRIVATE_DATA_CATEGORIES = ["searches", "locations", "security", "external", "personal"] as const;

const PRIVATE_IDS: ReadonlySet<string> = new Set(PRIVATE_DATA_CATEGORIES);
export function isPrivateDataCategory(id: string | undefined): boolean {
  return !!id && PRIVATE_IDS.has(id);
}
