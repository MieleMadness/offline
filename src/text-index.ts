import type { ImportedArchive } from "./social-model";

export interface TextIndex {
  version: 1;
  modelRevision: string;
  fingerprint: string;
  dimensions: number;
  vectors: string[];
}
export const MAX_INDEX_SECTIONS = 20_000;
export const MAX_INDEX_STORAGE_BYTES = 48 * 1024 * 1024;

/** Protect recovery and import paths from oversized or malformed stored vectors. */
export function validateStoredTextIndex(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("The encrypted backup contains an invalid search index.");
  }
  const index = value as Partial<TextIndex>;
  if (index.version !== 1 ||
      typeof index.modelRevision !== "string" || index.modelRevision.length > 200 ||
      !index.modelRevision || typeof index.fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(index.fingerprint) ||
      !Number.isInteger(index.dimensions) || (index.dimensions ?? 0) < 1 ||
      (index.dimensions ?? 0) > 4096 ||
      !Array.isArray(index.vectors) || index.vectors.length > MAX_INDEX_SECTIONS ||
      index.vectors.length < 1) {
    throw new Error("The encrypted backup contains invalid search index metadata.");
  }
  const encodedLength = Math.ceil(index.dimensions! / 3) * 4;
  if (encodedLength * index.vectors.length > MAX_INDEX_STORAGE_BYTES ||
      !index.vectors.every(encoded => typeof encoded === "string" &&
        encoded.length === encodedLength &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(encoded) &&
        atob(encoded).length === index.dimensions)) {
    throw new Error("The encrypted backup contains an oversized or damaged search index.");
  }
}

export interface TextChunk {
  id: string;
  source: string;
  text: string;
}

export function textChunks(archive: ImportedArchive): TextChunk[] {
  const records = [
    ...archive.social.posts.map((post, i) => ({
      id: "post-" + i, source: post.sourcePath, text: post.text,
    })),
    ...archive.social.conversations.flatMap((conversation, c) => conversation.messages.map((message, m) => ({
      id: "message-" + c + "-" + m, source: conversation.title + " · " + message.sender,
      text: message.sender + "\n" + message.text,
    }))),
    ...archive.social.dataCategories.flatMap((category, c) => category.records.map((record, r) => ({
      id: "data-" + c + "-" + r, source: record.sourcePath, text: record.title + "\n" + record.detail,
    }))),
  ];
  const max = MAX_INDEX_SECTIONS;
  const all: TextChunk[] = [];
  for (const record of records) {
    const characters = Array.from(record.text);
    const chunks: TextChunk[] = [];
    for (let start = 0; start < characters.length; start += 400) {
      const text = characters.slice(start, start + 450).join("");
      if (text.trim()) chunks.push({ ...record, text });
      if (start + 450 >= characters.length) break;
    }
    all.push(...chunks);
    if (all.length > max) {
      throw new Error("This archive has too many text sections for the current local index. Try keyword search instead.");
    }
  }
  return all;
}

export async function fingerprint(chunks: TextChunk[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(chunks));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export function packVector(vector: number[]): string {
  const maximum = Math.max(...vector.map(Math.abs));
  if (!maximum || !Number.isFinite(maximum) || vector.some(value => !Number.isFinite(value))) {
    throw new Error("The model returned an invalid search vector.");
  }
  return btoa(String.fromCharCode(...vector.map(value => Math.round(value / maximum * 127) & 255)));
}

export function validIndex(
  index: TextIndex | undefined, hash: string, revision: string, count: number, partial = false,
): index is TextIndex {
  if (!index || index.version !== 1 || index.fingerprint !== hash ||
      index.modelRevision !== revision || !Array.isArray(index.vectors)) return false;
  const minimumDimensions = partial && index.vectors.length === 0 ? 0 : 1;
  if (!Number.isInteger(index.dimensions) || index.dimensions < minimumDimensions || index.dimensions > 4096) return false;
  if (count > MAX_INDEX_SECTIONS ||
      index.vectors.length > MAX_INDEX_SECTIONS ||
      Math.ceil(index.dimensions / 3) * 4 * index.vectors.length > MAX_INDEX_STORAGE_BYTES ||
      (partial ? index.vectors.length > count : index.vectors.length !== count)) return false;
  return index.vectors.every(vector => {
    if (typeof vector !== "string" || vector.length !== Math.ceil(index.dimensions / 3) * 4) return false;
    try {
      const bytes = atob(vector);
      return bytes.length === index.dimensions && btoa(bytes) === vector;
    } catch { return false; }
  });
}

function similarity(query: number[], packed: string): number {
  const bytes = atob(packed);
  if (bytes.length !== query.length) throw new Error("Rebuild this workspace’s search index.");
  let dot = 0;
  let norm = 0;
  let queryNorm = 0;
  for (let i = 0; i < query.length; i++) {
    const byte = bytes.charCodeAt(i);
    const value = byte > 127 ? byte - 256 : byte;
    dot += query[i]! * value;
    queryNorm += query[i]! * query[i]!;
    norm += value * value;
  }
  return norm && queryNorm ? dot / Math.sqrt(norm * queryNorm) : 0;
}

export async function searchIndex(index: TextIndex, chunks: TextChunk[], query: number[], cancelled: () => boolean) {
  const best = new Map<string, { chunk: TextChunk; score: number }>();
  for (let i = 0; i < chunks.length; i++) {
    if (i % 500 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (cancelled()) return [];
    }
    const chunk = chunks[i]!;
    const score = similarity(query, index.vectors[i]!);
    if (score > (best.get(chunk.id)?.score ?? -Infinity)) best.set(chunk.id, { chunk, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 10).map(({ chunk, score }) => ({
    id: chunk.source, reason: "Similarity " + score.toFixed(3) + " · " + chunk.text,
  }));
}
