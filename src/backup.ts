import { PROFILE_COLORS, cleanProfileName, type FamilyProfile, type ProfileColor } from "./profiles";
import type { ImportedArchive } from "./social-model";
import { validateStoredTextIndex } from "./text-index";
import type { Snapshot } from "./vault";

// The profile metadata is visible. The imported social records remain inside AES-GCM ciphertext.
const FORMAT = "offline.encrypted-backup";
const MAX_BACKUP_CHARS = 128 * 1024 * 1024;
const MAX_CIPHER_BYTES = 90 * 1024 * 1024;
const CHUNK = 24_576; // divisible by 3 and 4, so chunked base64 is seamless

export interface PortableBackup {
  profile: FamilyProfile;
  snapshot: Snapshot;
}

function encode64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    const part = bytes.subarray(offset, offset + CHUNK);
    let binary = "";
    for (const value of part) binary += String.fromCharCode(value);
    chunks.push(btoa(binary));
  }
  return chunks.join("");
}

function decode64(raw: unknown, maxBytes: number): Uint8Array {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > Math.ceil(maxBytes / 3) * 4 + 4
    || raw.length % 4 !== 0 || !/^[a-zA-Z0-9+/]*={0,2}$/.test(raw)) {
    throw new Error("This backup contains invalid encrypted data.");
  }
  const padding = raw.endsWith("==") ? 2 : raw.endsWith("=") ? 1 : 0;
  const length = raw.length / 4 * 3 - padding;
  if (length < 0 || length > maxBytes) throw new Error("The backup exceeds the supported size.");
  const output = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < raw.length; i += CHUNK) {
    const decoded = atob(raw.slice(i, i + CHUNK));
    for (let j = 0; j < decoded.length; j++) output[offset++] = decoded.charCodeAt(j);
  }
  if (offset !== length) throw new Error("The backup encoding is invalid.");
  return output;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("The backup structure is invalid.");
  return value as Record<string, unknown>;
}

export function serializeBackup(profile: FamilyProfile, snapshot: Snapshot): string {
  if (snapshot.ciphertext.byteLength > MAX_CIPHER_BYTES) throw new Error("The saved preview is too large for portable backup.");
  const content = JSON.stringify({
    format: FORMAT, version: 1, createdAt: new Date().toISOString(),
    profile,
    snapshot: {
      revision: snapshot.revision, credential: snapshot.credential ?? "passphrase",
      salt: encode64(snapshot.salt), iv: encode64(snapshot.iv),
      ciphertext: encode64(new Uint8Array(snapshot.ciphertext)),
    },
  });
  if (content.length > MAX_BACKUP_CHARS) throw new Error("The encrypted backup exceeds 128 MiB.");
  return content;
}

export function parseBackup(contents: string): PortableBackup {
  if (contents.length > MAX_BACKUP_CHARS) throw new Error("The backup exceeds 128 MiB.");
  let root: Record<string, unknown>;
  try { root = record(JSON.parse(contents)); }
  catch { throw new Error("This is not a valid Offline encrypted backup."); }
  if (root.format !== FORMAT || root.version !== 1) {
    throw new Error("This backup version or file type is unsupported.");
  }
  const owner = record(root.profile);
  if (typeof owner.id !== "string" || !/^[a-zA-Z0-9-]{8,100}$/.test(owner.id)
      || typeof owner.displayName !== "string" || owner.displayName.length > 100
      || !cleanProfileName(owner.displayName)
      || typeof owner.accent !== "string" || !PROFILE_COLORS.includes(owner.accent as ProfileColor)
      || typeof owner.createdAt !== "number" || !Number.isFinite(owner.createdAt) || owner.createdAt < 0) {
    throw new Error("This backup has invalid profile information.");
  }
  const meta = record(root.snapshot);
  if (typeof meta.revision !== "string" || !/^[a-zA-Z0-9-]{8,100}$/.test(meta.revision)
      || (meta.credential !== "pin" && meta.credential !== "passphrase")) {
    throw new Error("This backup has unsupported encryption metadata.");
  }
  const salt = decode64(meta.salt, 16);
  const iv = decode64(meta.iv, 12);
  if (salt.byteLength !== 16 || iv.byteLength !== 12) throw new Error("This backup has invalid encryption parameters.");
  const cipher = decode64(meta.ciphertext, MAX_CIPHER_BYTES);
  if (cipher.byteLength < 16) throw new Error("This backup has no authenticated encrypted content.");
  return {
    profile: {
      id: owner.id, displayName: cleanProfileName(owner.displayName),
      accent: owner.accent as ProfileColor, createdAt: owner.createdAt,
    },
    snapshot: {
      revision: meta.revision, credential: meta.credential,
      salt, iv, ciphertext: cipher.buffer,
    },
  };
}

/** Reject malformed decrypted JSON before it reaches timeline/message renderers. */
export function validateRecoveredArchive(value: unknown): asserts value is ImportedArchive {
  const root = record(value);
  const report = record(root.report);
  const social = record(root.social);
  if (typeof report.archiveName !== "string" || report.archiveName.length > 1_000
      || typeof report.totalFiles !== "number" || !Number.isFinite(report.totalFiles)
      || !Array.isArray(report.entries) || report.entries.length > 5_000
      || !Array.isArray(report.sections) || report.sections.length > 100) {
    throw new Error("The decrypted backup inventory is malformed.");
  }
  if (!Array.isArray(social.posts) || social.posts.length > 20_000
      || !Array.isArray(social.conversations) || social.conversations.length > 20_000
      || !Array.isArray(social.dataCategories) || social.dataCategories.length > 500
      || typeof social.filesRead !== "number" || !Array.isArray(social.warnings)) {
    throw new Error("The decrypted backup contains unsupported social data.");
  }
  // Existing backups without an AI index remain compatible. If one is present,
  // reject malformed/oversized vectors before any encrypted snapshot is saved.
  if (root.textIndex !== undefined) validateStoredTextIndex(root.textIndex);
  for (const post of social.posts) {
    const item = record(post);
    if (typeof item.id !== "string" || typeof item.text !== "string"
        || typeof item.sourcePath !== "string" || typeof item.mediaCount !== "number") {
      throw new Error("The decrypted backup contains a malformed post.");
    }
  }
  let messageCount = 0;
  for (const conversation of social.conversations) {
    const chat = record(conversation);
    if (typeof chat.id !== "string" || typeof chat.title !== "string"
        || !Array.isArray(chat.messages) || !Array.isArray(chat.participants)) {
      throw new Error("The decrypted backup contains a malformed conversation.");
    }
    messageCount += chat.messages.length;
    if (messageCount > 100_000) throw new Error("The restored message preview is too large.");
    for (const message of chat.messages) {
      const item = record(message);
      if (typeof item.id !== "string" || typeof item.sender !== "string"
          || typeof item.text !== "string" || typeof item.attachments !== "number") {
        throw new Error("The decrypted backup contains a malformed message.");
      }
    }
  }
  for (const category of social.dataCategories) {
    const entry = record(category);
    if (typeof entry.id !== "string" || typeof entry.label !== "string" || !Array.isArray(entry.records)) {
      throw new Error("The decrypted backup contains a malformed data category.");
    }
    for (const candidate of entry.records) {
      const item = record(candidate);
      if (typeof item.title !== "string" || typeof item.detail !== "string"
          || typeof item.sourcePath !== "string") {
        throw new Error("The decrypted backup contains a malformed data record.");
      }
    }
  }
}

export function recoveredProfileName(owner: FamilyProfile, existing: readonly FamilyProfile[]): string {
  const used = new Set(existing.map(p => p.displayName.toLocaleLowerCase()));
  if (!used.has(owner.displayName.toLocaleLowerCase())) return owner.displayName;
  for (let i = 2; i <= 99; i++) {
    const suffix = " (restored " + i + ")";
    const candidate = owner.displayName.slice(0, 50 - suffix.length) + suffix;
    if (!used.has(candidate.toLocaleLowerCase())) return candidate;
  }
  throw new Error("Too many profiles share this name.");
}
