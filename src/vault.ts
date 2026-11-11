import type { ImportedArchive } from "./social-model";

// The database name versions the envelope, KDF parameters and payload format together.
const DATABASE = "offline.profile-vaults.v1";
const STORE = "snapshots";
const encoder = new TextEncoder();

export interface Snapshot {
  credential?: "passphrase" | "pin";
  revision: string;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function parameters(owner: string, iv: Uint8Array) {
  return { name: "AES-GCM", iv, additionalData: encoder.encode(DATABASE + "/" + owner) };
}

export async function seal(owner: string, archive: ImportedArchive, key: CryptoKey, salt: Uint8Array): Promise<Snapshot> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = encoder.encode(JSON.stringify(archive));
  try {
    const ciphertext = await crypto.subtle.encrypt(parameters(owner, iv), key, bytes);
    return { revision: crypto.randomUUID(), salt, iv, ciphertext };
  } finally { bytes.fill(0); }
}

export async function unseal(owner: string, snapshot: Snapshot, key: CryptoKey): Promise<ImportedArchive> {
  const bytes = new Uint8Array(await crypto.subtle.decrypt(parameters(owner, snapshot.iv), key, snapshot.ciphertext));
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  finally { bytes.fill(0); }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function loadSnapshot(owner: string): Promise<Snapshot | null> {
  const db = await openDatabase();
  try {
    return await new Promise<Snapshot | null>((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(owner);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

export async function saveSnapshot(owner: string, next: Snapshot, previousRevision: string | null): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const existing = store.get(owner);
      existing.onsuccess = () => {
        if ((existing.result?.revision ?? null) !== previousRevision) { tx.abort(); return; }
        store.put(next, owner);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error ?? new Error("The saved preview changed. Reopen this profile and try again."));
    });
  } finally { db.close(); }
}
