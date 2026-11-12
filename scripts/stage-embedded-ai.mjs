/**
 * Build-time-only, fail-closed Offline Complete model staging.
 * No network calls or runtime downloads. Ordinary preview builds do NOT contain AI weights.
 * Supply an independently vetted, review-committed model SHA from the trust manifest.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, lstat, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = join(root, "public", "ai");
const approvalPath = join(root, "models", "approved-embeddinggemma2.json");
const sdkVersion = "1.2.2";
const modelName = "embeddinggemma-2-text-vision-440m.litertlm";
const modelId = "google/embeddinggemma-2";

export function validateApproval(raw) {
  if (!raw || raw.schemaVersion !== 1 ||
      raw.modelId !== modelId || raw.sdkVersion !== sdkVersion ||
      raw.status !== "reviewed-and-pinned" ||
      typeof raw.upstreamRevision !== "string" || !/^[a-f0-9]{40}$/.test(raw.upstreamRevision) ||
      typeof raw.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(raw.sha256)) {
    throw new Error("Offline Complete requires a reviewed upstream model revision and SHA-256 pin committed in models/approved-embeddinggemma2.json.");
  }
  return raw;
}

export async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function stageRuntime(source, destination) {
  const info = await lstat(source);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("The MediaPipe WASM package must be an ordinary directory.");
  }
  const items = await readdir(source, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    if (!item.isFile() || item.isSymbolicLink() ||
        ![".js", ".mjs", ".wasm", ".data", ".json"].includes(extname(item.name).toLowerCase())) continue;
    const src = join(source, item.name);
    const meta = await lstat(src);
    if (!meta.isFile() || meta.isSymbolicLink() || meta.size === 0 || meta.size > 160 * 1024 * 1024) {
      throw new Error("MediaPipe runtime files must be regular, bounded, nonempty files.");
    }
    const dst = join(destination, item.name);
    await copyFile(src, dst);
    files.push({ name: item.name, bytes: meta.size, sha256: await sha256(dst) });
  }
  if (!files.some(x => x.name.endsWith(".wasm")) ||
      !files.some(x => x.name.endsWith(".js") || x.name.endsWith(".mjs"))) {
    throw new Error("The pinned MediaPipe package does not include expected JS and WASM runtime files.");
  }
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function stage() {
  // Do not allow leftover model weights or previously generated manifests
  // to slip into a Lite preview or CI artifact.
  await rm(output, { force: true, recursive: true });
  if (process.env.OFFLINE_COMPLETE_AI !== "1") {
    console.log("[Offline AI] Lite/development build: no embedded AI model or WASM staged.");
    return { complete: false };
  }

  const approval = validateApproval(JSON.parse(await readFile(approvalPath, "utf8")));
  const source = process.env.OFFLINE_MODEL_FILE;
  if (!source) throw new Error("OFFLINE_MODEL_FILE is required for the approved Complete build.");
  const modelPath = resolve(source);
  if (modelPath === join(output, "model", modelName) ||
      modelPath.includes(sep + "public" + sep + "ai" + sep)) {
    throw new Error("The approved model source must be outside the build output directory.");
  }
  if (modelPath.split(sep).at(-1) !== modelName) {
    throw new Error("The model file must have the pinned EmbeddingGemma 2 LiteRT filename.");
  }
  const fileInfo = await lstat(modelPath);
  if (!fileInfo.isFile() || fileInfo.isSymbolicLink() ||
      fileInfo.size < 100 * 1024 * 1024 || fileInfo.size > 1024 * 1024 * 1024) {
    throw new Error("The approved model must be a regular, bounded LiteRT asset.");
  }
  const actual = await sha256(modelPath);
  if (actual !== approval.sha256) {
    throw new Error("Model SHA-256 does not match the independently reviewed source pin. No Complete build produced.");
  }

  const wasmSrc = join(root, "node_modules", "@mediapipe", "tasks-retrieval", "wasm");
  const wasmDst = join(output, "wasm");
  const modelDst = join(output, "model", modelName);
  try {
    await mkdir(wasmDst, { recursive: true });
    await mkdir(join(output, "model"), { recursive: true });
    const wasmFiles = await stageRuntime(wasmSrc, wasmDst);
    await copyFile(modelPath, modelDst);
    if (await sha256(modelDst) !== approval.sha256) throw new Error("Model was corrupted during staging.");
    const result = {
      schemaVersion: 1,
      status: "reviewed-and-pinned",
      modelId,
      modelVariant: "text-vision-440m",
      sdkVersion,
      upstreamRevision: approval.upstreamRevision,
      modelSha256: approval.sha256,
      modelBytes: fileInfo.size,
      wasmFiles,
    };
    await writeFile(join(output, "embedded-bundle.json"), JSON.stringify(result, null, 2) + "\n");
    console.log("[Offline AI] Verified and staged local model and WASM runtime (no network requests).");
    return { complete: true, manifest: result };
  } catch (error) {
    await rm(output, { force: true, recursive: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  stage().catch(error => { console.error(error.message); process.exitCode = 1; });
}
