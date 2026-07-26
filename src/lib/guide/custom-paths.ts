/**
 * Premium custom paths — learner-composed journeys cached on device.
 * Same LearningPath shape as catalog paths; replay does not burn fair-use.
 */
import type { BodyId, LearningPath, LearningPathStep } from "./types";
import {
  compressText,
  decompressText,
  type PayloadEncoding,
} from "./compress";

const DB_NAME = "mpg-custom-paths-v1";
const DB_VERSION = 1;
const STORE = "paths";
const MAX_PATHS = 40;

export type CustomPathRecord = {
  id: string;
  path: LearningPath;
  /** Concepts the learner asked to connect. */
  sourceCardIds: string[];
  question: string;
  createdAt: string;
  lastOpenedAt: string;
  pinned?: boolean;
  encoding?: PayloadEncoding;
  /** Optional compressed path blob (larger paths). */
  payload?: ArrayBuffer;
  storedBytes?: number;
};

/** In-memory mirror so sync resolvers (Tutor/journey) can see custom paths. */
let memoryPaths: LearningPath[] = [];

export function getCachedCustomPaths(): LearningPath[] {
  return memoryPaths;
}

export function findCustomPath(pathId: string): LearningPath | undefined {
  return memoryPaths.find((path) => path.id === pathId);
}

export function isCustomPathId(pathId: string): boolean {
  return pathId.startsWith("custom-");
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("idb open failed"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("lastOpenedAt", "lastOpenedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("idb request failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("idb tx aborted"));
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function makeCustomPathId(title: string, cardIds: string[]): string {
  const seed = `${title}::${[...cardIds].sort().join("|")}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `custom-${slugify(title) || "path"}-${hash.toString(16).slice(0, 8)}`;
}

export function normalizeCustomPath(
  draft: Partial<LearningPath>,
  cardIds: string[],
  question: string,
): LearningPath {
  const title =
    String(draft.title || "").trim() ||
    `Custom path: ${question.slice(0, 60).trim() || "concepts"}`;
  const summary =
    String(draft.summary || "").trim() ||
    `A Premium journey connecting ${cardIds.length} Guide concepts.`;
  const bodies = (Array.isArray(draft.bodies) ? draft.bodies : [])
    .map(String)
    .filter(Boolean) as BodyId[];
  const allowed = new Set(cardIds);
  const steps: LearningPathStep[] = [];
  const seen = new Set<string>();
  for (const [index, step] of (draft.steps || []).entries()) {
    const cardId = String(step?.cardId || "");
    if (!cardId || !allowed.has(cardId) || seen.has(cardId)) continue;
    seen.add(cardId);
    steps.push({
      id: String(step?.id || `s${index + 1}`).slice(0, 48),
      title: String(step?.title || cardId).slice(0, 120),
      summary: String(step?.summary || "").slice(0, 280),
      cardId,
      taskLabel: step?.taskLabel ? String(step.taskLabel).slice(0, 80) : undefined,
    });
  }
  // Ensure every requested concept appears if model omitted some.
  for (const cardId of cardIds) {
    if (seen.has(cardId)) continue;
    steps.push({
      id: `s${steps.length + 1}`,
      title: cardId,
      summary: "Include this Guide concept in the journey.",
      cardId,
    });
  }
  return {
    id:
      draft.id && isCustomPathId(String(draft.id))
        ? String(draft.id)
        : makeCustomPathId(title, cardIds),
    title: title.slice(0, 120),
    summary: summary.slice(0, 320),
    bodies: bodies.length > 0 ? bodies.slice(0, 4) : ["Merixa"],
    steps: steps.slice(0, 8),
  };
}

/** Offline fallback when live compose is unavailable. */
export function localComposePathFromCards(
  cards: { id: string; title: string; teachingSummary?: string; body?: string; bodies?: BodyId[] }[],
  question: string,
): LearningPath {
  const cardIds = cards.map((card) => card.id);
  const bodies = [
    ...new Set(cards.flatMap((card) => card.bodies || []).map(String)),
  ].slice(0, 4) as BodyId[];
  const titles = cards.map((card) => card.title);
  const title =
    titles.length >= 2
      ? `From “${titles[0]}” to “${titles[titles.length - 1]}”`
      : `Custom path · ${titles[0] || "concepts"}`;
  return normalizeCustomPath(
    {
      title,
      summary: `Practitioner sequence linking: ${titles.join(" → ")}. Built from your ask: ${question.slice(0, 140)}`,
      bodies: bodies.length ? bodies : ["Merixa"],
      steps: cards.map((card, index) => ({
        id: `s${index + 1}`,
        title: card.title,
        summary: String(card.teachingSummary || card.body || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 220),
        cardId: card.id,
      })),
    },
    cardIds,
    question,
  );
}

export async function loadCustomPaths(): Promise<LearningPath[]> {
  if (typeof window === "undefined") return memoryPaths;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return memoryPaths;
  }
  try {
    const tx = db.transaction(STORE, "readonly");
    const rows = (await idbReq(
      tx.objectStore(STORE).getAll(),
    )) as CustomPathRecord[];
    await txDone(tx);
    const paths: LearningPath[] = [];
    for (const row of rows.sort((a, b) =>
      b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    )) {
      if (row.path?.id) {
        paths.push(row.path);
        continue;
      }
      if (row.payload && row.encoding) {
        try {
          const text = await decompressText(
            new Uint8Array(row.payload),
            row.encoding,
          );
          const parsed = JSON.parse(text) as LearningPath;
          if (parsed?.id) paths.push(parsed);
        } catch {
          // skip corrupt
        }
      }
    }
    memoryPaths = paths;
    return paths;
  } catch {
    return memoryPaths;
  } finally {
    db.close();
  }
}

export async function saveCustomPath(input: {
  path: LearningPath;
  sourceCardIds: string[];
  question: string;
  pinned?: boolean;
}): Promise<CustomPathRecord> {
  const opened = nowIso();
  const record: CustomPathRecord = {
    id: input.path.id,
    path: input.path,
    sourceCardIds: input.sourceCardIds,
    question: input.question,
    createdAt: opened,
    lastOpenedAt: opened,
    pinned: Boolean(input.pinned),
  };

  // Keep memory hot immediately.
  memoryPaths = [
    input.path,
    ...memoryPaths.filter((path) => path.id !== input.path.id),
  ].slice(0, MAX_PATHS);

  if (typeof window === "undefined") return record;

  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return record;
  }
  try {
    const json = JSON.stringify(input.path);
    const compressed = await compressText(json);
    const stored: CustomPathRecord = {
      ...record,
      encoding: compressed.encoding,
      payload: compressed.bytes.buffer.slice(
        compressed.bytes.byteOffset,
        compressed.bytes.byteOffset + compressed.bytes.byteLength,
      ) as ArrayBuffer,
      storedBytes: compressed.bytes.byteLength,
      // Keep path inline for simple reads; payload is backup for large objects.
      path: input.path,
    };
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.put(stored);
    const all = (await idbReq(store.getAll())) as CustomPathRecord[];
    if (all.length > MAX_PATHS) {
      const overflow = all
        .filter((row) => !row.pinned)
        .sort((a, b) => a.lastOpenedAt.localeCompare(b.lastOpenedAt))
        .slice(0, all.length - MAX_PATHS);
      for (const row of overflow) store.delete(row.id);
    }
    await txDone(tx);
    return stored;
  } finally {
    db.close();
  }
}

export async function touchCustomPath(pathId: string): Promise<void> {
  if (typeof window === "undefined") return;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return;
  }
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const row = (await idbReq(store.get(pathId))) as CustomPathRecord | undefined;
    if (row) {
      store.put({ ...row, lastOpenedAt: nowIso() });
    }
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteCustomPath(pathId: string): Promise<void> {
  memoryPaths = memoryPaths.filter((path) => path.id !== pathId);
  if (typeof window === "undefined") return;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return;
  }
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(pathId);
    await txDone(tx);
  } finally {
    db.close();
  }
}

/** Fingerprint for coach-inventory companion turn of a compose ask. */
export function composePathFingerprint(question: string, cardIds: string[]): string {
  const normalized = question.toLowerCase().replace(/\s+/g, " ").trim();
  const ids = [...cardIds].sort().join(",");
  return `compose_path::${ids}::${normalized}`;
}
