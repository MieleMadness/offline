/** Limit mounted image decoders per view; large Facebook archives remain navigable. */
export const GALLERY_PAGE_SIZE = 24;

export function galleryPage<T>(items: readonly T[], requested: number, size = GALLERY_PAGE_SIZE): {
  items: T[]; page: number; totalPages: number; total: number;
} {
  if (!Number.isSafeInteger(size) || size < 1 || size > 100) {
    throw new Error("Invalid gallery page size.");
  }
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Number.isSafeInteger(requested)
    ? Math.max(0, Math.min(requested, totalPages - 1)) : 0;
  return { items: items.slice(page * size, page * size + size), page, totalPages, total };
}

/** Keep the viewer inside this profile's filtered gallery, never beyond its bounds. */
export function photoNeighbor(index: number, delta: -1 | 1, total: number): number {
  if (!Number.isSafeInteger(index) || index < 0 || index >= total) return -1;
  const next = index + delta;
  return next >= 0 && next < total ? next : -1;
}
