/**
 * Optional packaged-only MediaPipe Universal Embedder adapter.
 * Both WASM and model must already be vetted and packaged. No remote URLs.
 */
import type { UniversalEmbedder } from "@mediapipe/tasks-retrieval";

export interface EmbeddedBundle {
  schemaVersion: 1;
  status: "reviewed-and-pinned";
  modelId: "google/embeddinggemma-2";
  modelVariant: "text-vision-440m";
  sdkVersion: "1.2.2";
  upstreamRevision: string;
  modelSha256: string;
  modelBytes: number;
  wasmFiles: { name: string; bytes: number; sha256: string }[];
}

const HASH = /^[a-f0-9]{64}$/;
const REVISION = /^[a-f0-9]{40}$/;
const MODEL_FILE = "embeddinggemma-2-text-vision-440m.litertlm";
const OUTPUT_DIMENSIONS = 768;

export function validEmbeddedBundle(value: unknown): value is EmbeddedBundle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const x = value as Partial<EmbeddedBundle>;
  return x.schemaVersion === 1 && x.status === "reviewed-and-pinned" &&
    x.modelId === "google/embeddinggemma-2" && x.modelVariant === "text-vision-440m" &&
    x.sdkVersion === "1.2.2" && REVISION.test(x.upstreamRevision ?? "") &&
    HASH.test(x.modelSha256 ?? "") &&
    typeof x.modelBytes === "number" &&
    Number.isSafeInteger(x.modelBytes) &&
    x.modelBytes >= 100 * 1024 * 1024 && x.modelBytes <= 1024 * 1024 * 1024 &&
    Array.isArray(x.wasmFiles) && x.wasmFiles.length > 0 && x.wasmFiles.length <= 25 &&
    x.wasmFiles.some(f => f.name.endsWith(".wasm")) &&
    x.wasmFiles.every(f =>
      /^[a-zA-Z0-9._-]+$/.test(f.name) && HASH.test(f.sha256) &&
      Number.isSafeInteger(f.bytes) && f.bytes > 0 && f.bytes <= 160 * 1024 * 1024);
}

function assetUrl(path: string): string {
  // Resolve against this bundled app's own origin. Never let a model manifest
  // insert a remote URL or an arbitrary local path.
  return new URL(import.meta.env.BASE_URL + "ai/" + path, document.baseURI).href;
}

export async function detectEmbeddedBundle(): Promise<EmbeddedBundle | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch(assetUrl("embedded-bundle.json"), { cache: "no-store" });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) return null;
    const content = await response.text();
    if (content.length > 8192) return null;
    const value: unknown = JSON.parse(content);
    return validEmbeddedBundle(value) ? value : null;
  } catch {
    // Missing, untrusted or corrupt local assets: normal keyword search and
    // the user's separately installed Ollama remain unaffected.
    return null;
  }
}

export function embeddedModelRevision(bundle: EmbeddedBundle): string {
  return "mediapipe:" + bundle.sdkVersion + ":" + bundle.modelSha256;
}

let enginePromise: Promise<UniversalEmbedder> | null = null;

async function loadEngine(): Promise<UniversalEmbedder> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const { FilesetResolver, UniversalEmbedder } = await import("@mediapipe/tasks-retrieval");
      const retrieval = await FilesetResolver.forRetrievalTasks(assetUrl("wasm"));
      // Version 1.2.2's published type lacks a delegate field here despite
      // differing prose examples. Runtime backend availability and CPU/GPU
      // behavior are explicitly unverified until real WebView2 acceptance.
      return UniversalEmbedder.createFromOptions(retrieval, {
        baseOptions: { modelAssetPath: assetUrl("model/" + MODEL_FILE) },
      });
    })().catch(cause => {
      enginePromise = null;
      throw cause;
    });
  }
  return enginePromise;
}

export async function embedWithBundledModel(
  bundle: EmbeddedBundle,
  texts: string[],
  query: boolean,
): Promise<{ modelRevision: string; vectors: number[][] }> {
  if (!validEmbeddedBundle(bundle) || texts.length < 1 || texts.length > 16 ||
      (query && texts.length !== 1) ||
      texts.some(text => !text.trim() || text.length > (query ? 1000 : 2000))) {
    throw new Error("The bundled AI request exceeds the approved text limits.");
  }
  const engine = await loadEngine();
  const vectors: number[][] = [];
  for (const text of texts) {
    const prompt = query
      ? "task: search result | query: " + text
      : "title: Archive | text: " + text;
    const result = await engine.embedText(prompt);
    const embedding = result.embeddings[0]?.floatEmbedding;
    const vector = embedding ? Array.from(embedding) : [];
    if (vector.length !== OUTPUT_DIMENSIONS || vector.some(x => !Number.isFinite(x))) {
      throw new Error("The bundled model returned an incompatible text embedding.");
    }
    vectors.push(vector);
  }
  return { modelRevision: embeddedModelRevision(bundle), vectors };
}


/** Use the same approved, locally packaged model for photos and text queries.
 *  The native caller must enforce JPEG/PNG, 4 MiB and 25 MP before this call.
 */
export async function embedImageWithBundledModel(
  bundle: EmbeddedBundle, bytes: Uint8Array,
): Promise<{ modelRevision: string; vector: number[] }> {
  const png = bytes.length >= 8 &&
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 &&
    bytes[4] === 13 && bytes[5] === 10 && bytes[6] === 26 && bytes[7] === 10;
  const jpeg = bytes.length >= 3 &&
    bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!validEmbeddedBundle(bundle) || bytes.byteLength < 16 ||
      bytes.byteLength > 4 * 1024 * 1024 || (!png && !jpeg)) {
    throw new Error("Embedded photo search requires a bounded JPEG or PNG from the current profile.");
  }
  const engine = await loadEngine();
  const result = await engine.embedImage(bytes);
  const source = result.embeddings[0]?.floatEmbedding;
  const vector = source ? Array.from(source) : [];
  if (vector.length !== OUTPUT_DIMENSIONS || vector.some(x => !Number.isFinite(x))) {
    throw new Error("The bundled model returned incompatible photo embeddings.");
  }
  return { modelRevision: embeddedModelRevision(bundle), vector };
}
