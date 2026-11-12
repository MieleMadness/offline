/**
 * Bounded image similarity using Offline's approved locally packaged model.
 * No thumbnails, photo vectors, or archive bytes are stored outside this call.
 * The UI must inspect the owner's ZIP inventory before invoking this module.
 */
import type { EmbeddedBundle } from "./embedded-ai";
import { embedImageWithBundledModel, embedWithBundledModel } from "./embedded-ai";
import { invoke } from "@tauri-apps/api/core";

export const MAX_EMBEDDED_PHOTOS = 24;
export const MAX_PHOTO_DIRECTORY_SCAN = 250;
export const EMBEDDED_PHOTO_DIMENSIONS = 768;

interface PhotoMember { path: string; kind: string; zipIndex: number }
interface PhotoPage { entries: PhotoMember[]; total: number; offset: number }
interface ArchiveImage { mime: string; data: string }
export interface PhotoMatch { id: string; reason: string }

type NativeInvoke = <T>(cmd: string, args: Record<string, unknown>) => Promise<T>;

function validVector(v: number[]): boolean {
  return v.length === EMBEDDED_PHOTO_DIMENSIONS &&
    v.every(n => Number.isFinite(n));
}

export function cosineScore(left: number[], right: number[]): number {
  if (!validVector(left) || !validVector(right)) {
    throw new Error("Image and text embeddings have incompatible dimensions.");
  }
  let dot = 0, leftNorm = 0, rightNorm = 0;
  for (let i = 0; i < EMBEDDED_PHOTO_DIMENSIONS; i++) {
    const a = left[i]!, b = right[i]!;
    dot += a * b; leftNorm += a * a; rightNorm += b * b;
  }
  if (!leftNorm || !rightNorm) return 0;
  return Math.max(-1, Math.min(1, dot / Math.sqrt(leftNorm * rightNorm)));
}

export function decodeLocalPhoto(data: string): Uint8Array {
  if (data.length > Math.ceil((4 * 1024 * 1024) / 3) * 4 + 8) {
    throw new Error("The photo exceeded the local image input safety limit.");
  }
  const binary = atob(data);
  if (binary.length < 16 || binary.length > 4 * 1024 * 1024) {
    throw new Error("The photo is empty or exceeds the local safety limit.");
  }
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

interface SearchOptions {
  path: string;
  query: string;
  shouldStop: () => boolean;
  progress: (done: number, total: number) => void;
  list: NativeInvoke;
  read: NativeInvoke;
  embedText: (query: string) => Promise<number[]>;
  embedImage: (bytes: Uint8Array) => Promise<number[]>;
}

export async function rankLocalPhotoMatches(options: SearchOptions): Promise<PhotoMatch[]> {
  const { path, query, shouldStop, progress, list, read, embedText, embedImage } = options;
  if (!path || !query.trim() || query.length > 250) {
    throw new Error("Enter a short photo search phrase and select the current workspace's ZIP.");
  }
  // Enumerate metadata only, never extract ZIP contents. Exclude GIF/WebP and
  // stop after 24 supported photos or 250 directory candidates per query.
  const selected: PhotoMember[] = [];
  for (let offset = 0; offset < MAX_PHOTO_DIRECTORY_SCAN &&
       selected.length < MAX_EMBEDDED_PHOTOS;) {
    if (shouldStop()) return [];
    const page = await list<PhotoPage>("list_archive_photos", {
      path, offset, limit: 50, query: "",
    });
    if (shouldStop()) return [];
    if (!Number.isSafeInteger(page.total) || page.total < 0 ||
        page.entries.length > 50 || page.offset !== offset) {
      throw new Error("The selected ZIP's photo listing is inconsistent.");
    }
    if (!page.entries.length) break;
    for (const photo of page.entries) {
      if (selected.length >= MAX_EMBEDDED_PHOTOS) break;
      if (/\.(?:jpe?g|png)$/i.test(photo.path) &&
          Number.isSafeInteger(photo.zipIndex) && photo.zipIndex >= 0) {
        selected.push(photo);
      }
    }
    offset += page.entries.length;
    if (offset >= page.total) break;
  }
  if (!selected.length) return [];
  if (shouldStop()) return [];
  const queryVector = await embedText(query);
  if (!validVector(queryVector)) {
    throw new Error("The local model returned an invalid text embedding.");
  }

  const scores: { id: string; score: number }[] = [];
  for (const [index, item] of selected.entries()) {
    if (shouldStop()) return [];
    progress(index, selected.length);
    let photo: ArchiveImage;
    try {
      photo = await read<ArchiveImage>("read_archive_ai_image", {
        path, member: item.path, index: item.zipIndex,
      });
    } catch (error) {
      // A damaged or too-large photo should not abort unrelated family photos.
      // If the ZIP itself changed, subsequent calls will still fail closed.
      if (shouldStop()) return [];
      const message = String(error);
      if (/25-megapixel|image header|above the 4 MiB|not supported|JPEG and PNG/.test(message)) {
        progress(index + 1, selected.length);
        continue;
      }
      throw error;
    }
    if (shouldStop()) return [];
    if (photo.mime !== "image/jpeg" && photo.mime !== "image/png") {
      throw new Error("Native photo validation returned an unsupported format.");
    }
    const bytes = decodeLocalPhoto(photo.data);
    const vector = await embedImage(bytes);
    if (shouldStop()) return [];
    scores.push({ id: item.path, score: cosineScore(queryVector, vector) });
    progress(index + 1, selected.length);
  }
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 8).map(result => ({
    id: result.id,
    reason: "Local image similarity " + result.score.toFixed(3) + " · EmbeddingGemma 2",
  }));
}

/** Production adapter: only local Tauri IPC and the packaged in-app model. */
export async function searchBundledPhotos(
  bundle: EmbeddedBundle, path: string, query: string,
  shouldStop: () => boolean, progress: (done: number, total: number) => void,
): Promise<PhotoMatch[]> {
  return rankLocalPhotoMatches({
    path, query, shouldStop, progress,
    list: <T>(cmd: string, args: Record<string, unknown>) => invoke<T>(cmd, args),
    read: <T>(cmd: string, args: Record<string, unknown>) => invoke<T>(cmd, args),
    embedText: async text => {
      const response = await embedWithBundledModel(bundle, [text], true);
      return response.vectors[0] ?? [];
    },
    embedImage: async bytes => (await embedImageWithBundledModel(bundle, bytes)).vector,
  });
}
