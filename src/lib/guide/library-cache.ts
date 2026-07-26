/**
 * On-device compressed Library cache.
 * Keeps classified cards under LIBRARY_MAX_BYTES via deflate — never skims.
 */

import {
  LIBRARY_MAX_BYTES,
  LIBRARY_WARN_BYTES,
} from "./cache-budgets";
import {
  compressText,
  decompressText,
  type PayloadEncoding,
} from "./compress";
import type { GuideIndex } from "./types";

const DB_NAME = "mpg-library-cache-v1";
const DB_VERSION = 1;
const STORE = "library";
const RECORD_KEY = "published";

export type LibraryCacheMeta = {
  generatedAt: string;
  cardCount: number;
  rawBytes: number;
  storedBytes: number;
  encoding: PayloadEncoding;
  nearLimit: boolean;
  overLimit: boolean;
};

type LibraryCacheRecord = {
  key: string;
  generatedAt: string;
  cardCount: number;
  encoding: PayloadEncoding;
  rawBytes: number;
  storedBytes: number;
  payload: ArrayBuffer;
  savedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("idb open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("idb request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

function isGuideIndex(value: unknown): value is GuideIndex {
  if (typeof value !== "object" || value === null) return false;
  return (
    "version" in value &&
    value.version === 1 &&
    "generatedAt" in value &&
    typeof value.generatedAt === "string" &&
    "cards" in value &&
    Array.isArray(value.cards) &&
    "chunks" in value &&
    Array.isArray(value.chunks)
  );
}

export function libraryCacheMetaFromSizes(
  generatedAt: string,
  cardCount: number,
  rawBytes: number,
  storedBytes: number,
  encoding: PayloadEncoding,
): LibraryCacheMeta {
  return {
    generatedAt,
    cardCount,
    rawBytes,
    storedBytes,
    encoding,
    nearLimit: storedBytes >= LIBRARY_WARN_BYTES,
    overLimit: storedBytes > LIBRARY_MAX_BYTES,
  };
}

/** Read the last compressed Library snapshot from device storage. */
export async function readLibraryCache(): Promise<{
  index: GuideIndex;
  meta: LibraryCacheMeta;
} | null> {
  if (typeof window === "undefined") return null;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = (await idbReq(
      tx.objectStore(STORE).get(RECORD_KEY),
    )) as LibraryCacheRecord | undefined;
    await txDone(tx);
    if (!row?.payload) return null;
    const text = await decompressText(
      new Uint8Array(row.payload),
      row.encoding,
    );
    const parsed: unknown = JSON.parse(text);
    if (!isGuideIndex(parsed)) return null;
    return {
      index: parsed,
      meta: libraryCacheMetaFromSizes(
        row.generatedAt,
        row.cardCount,
        row.rawBytes,
        row.storedBytes,
        row.encoding,
      ),
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export type WriteLibraryCacheResult = {
  persisted: boolean;
  meta: LibraryCacheMeta;
  reason?: "ok" | "over_limit_memory_only" | "failed";
};

/**
 * Compress and persist a Library index when it fits the 50 MB standard.
 * Over-limit indexes are not skimmed — caller may still use them in memory.
 */
export async function writeLibraryCache(
  index: GuideIndex,
): Promise<WriteLibraryCacheResult> {
  const json = JSON.stringify(index);
  const compressed = await compressText(json);
  const meta = libraryCacheMetaFromSizes(
    index.generatedAt,
    index.cards.length,
    compressed.rawBytes,
    compressed.bytes.byteLength,
    compressed.encoding,
  );

  if (meta.overLimit) {
    return {
      persisted: false,
      meta,
      reason: "over_limit_memory_only",
    };
  }

  if (typeof window === "undefined") {
    return { persisted: false, meta, reason: "failed" };
  }

  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return { persisted: false, meta, reason: "failed" };
  }

  try {
    const record: LibraryCacheRecord = {
      key: RECORD_KEY,
      generatedAt: index.generatedAt,
      cardCount: index.cards.length,
      encoding: compressed.encoding,
      rawBytes: compressed.rawBytes,
      storedBytes: compressed.bytes.byteLength,
      payload: compressed.bytes.buffer.slice(
        compressed.bytes.byteOffset,
        compressed.bytes.byteOffset + compressed.bytes.byteLength,
      ) as ArrayBuffer,
      savedAt: new Date().toISOString(),
    };
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await txDone(tx);
    return { persisted: true, meta, reason: "ok" };
  } catch {
    return { persisted: false, meta, reason: "failed" };
  } finally {
    db.close();
  }
}
