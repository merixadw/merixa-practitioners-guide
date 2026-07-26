/**
 * Premium coach inventory — compressed IndexedDB cache of live API turns.
 *
 * Standard (see cache-budgets.ts):
 * - Inventory ≤ 48 MB compressed; 70% heavy / 30% light asks
 * - Replay hits do NOT burn daily fair-use
 * - Continuous LRU + automatic 30-day sweep (no clear-cache prompt)
 * - Saved-linked turns stay pinned
 */

import type { LearningStep } from "./learning";
import type { LibraryCoverage, TutorJourney } from "./journey";
import {
  INVENTORY_MAX_BYTES,
  INVENTORY_MAX_ENTRIES,
  INVENTORY_MAX_HEAVY,
  INVENTORY_MAX_LIGHT,
  INVENTORY_HEAVY_BYTE_SHARE,
  LIBRARY_MAX_BYTES,
  inventoryHeavyByteBudget,
  inventoryLightByteBudget,
} from "./cache-budgets";
import {
  detectProfessorMode,
  detectTutorCostLane,
  isHeavyCoachAsk,
  type ProfessorArtefactMode,
  type TutorCostLane,
} from "./professor-mode";
import {
  compressText,
  decompressText,
  type PayloadEncoding,
} from "./compress";

export {
  INVENTORY_MAX_BYTES,
  INVENTORY_MAX_ENTRIES,
  INVENTORY_MAX_HEAVY,
  INVENTORY_MAX_LIGHT,
  LIBRARY_MAX_BYTES,
  INVENTORY_HEAVY_BYTE_SHARE,
} from "./cache-budgets";

const DB_NAME = "mpg-coach-inventory-v1";
const DB_VERSION = 1;
const STORE_TURNS = "turns";
const STORE_META = "meta";
const META_SWEEP_KEY = "sweep";

/** Automatic maintenance interval — no user prompt required. */
export const INVENTORY_SWEEP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
/** Light asks expire sooner so heavy artefacts keep the larger share. */
const LIGHT_IDLE_MS = 21 * 24 * 60 * 60 * 1000;
/** Heavy coach kept longer (Premium value lives here). */
const HEAVY_IDLE_MS = 60 * 24 * 60 * 60 * 1000;

export type CoachInventoryLane = TutorCostLane | "coach-demo";

export type CoachInventoryPayload = {
  steps: LearningStep[];
  followUps: string[];
  journey?: TutorJourney;
  coverage?: LibraryCoverage;
  suggest?: string;
};

export type CoachInventoryRecord = {
  id: string;
  fingerprint: string;
  question: string;
  questionPreview: string;
  lane: CoachInventoryLane;
  mode: ProfessorArtefactMode;
  heavy: boolean;
  cardIds: string[];
  /** Linked to a Saved Library card — protected from auto-evict. */
  pinned: boolean;
  createdAt: string;
  lastOpenedAt: string;
  encoding: PayloadEncoding;
  /** Compressed (or raw) UTF-8 JSON of CoachInventoryPayload. */
  payload: ArrayBuffer;
  rawBytes: number;
  storedBytes: number;
};

export type CoachInventoryHit = {
  record: CoachInventoryRecord;
  payload: CoachInventoryPayload;
  fromCache: true;
};

export type SweepReport = {
  ran: boolean;
  reason: "interval" | "over_budget" | "skipped";
  removed: number;
  bytesBefore: number;
  bytesAfter: number;
  lastSweepAt: string | null;
};

type SweepMeta = {
  lastSweepAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function previewQuestion(question: string): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  return trimmed.length > 96 ? `${trimmed.slice(0, 94)}…` : trimmed;
}

/** Stable fingerprint for inventory lookup (mode-aware). */
export function inventoryFingerprint(question: string): string {
  const normalized = question.trim().toLowerCase().replace(/\s+/g, " ");
  const mode = detectProfessorMode(normalized);
  return `${mode}::${normalized}`;
}

function uid(): string {
  return `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
      if (!db.objectStoreNames.contains(STORE_TURNS)) {
        const turns = db.createObjectStore(STORE_TURNS, { keyPath: "id" });
        turns.createIndex("fingerprint", "fingerprint", { unique: false });
        turns.createIndex("lastOpenedAt", "lastOpenedAt", { unique: false });
        turns.createIndex("heavy", "heavy", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
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

async function listTurns(db: IDBDatabase): Promise<CoachInventoryRecord[]> {
  const tx = db.transaction(STORE_TURNS, "readonly");
  const store = tx.objectStore(STORE_TURNS);
  const rows = await idbReq(store.getAll());
  await txDone(tx);
  return (rows as CoachInventoryRecord[]) ?? [];
}

async function readSweepMeta(db: IDBDatabase): Promise<SweepMeta | null> {
  const tx = db.transaction(STORE_META, "readonly");
  const row = (await idbReq(
    tx.objectStore(STORE_META).get(META_SWEEP_KEY),
  )) as { key: string; lastSweepAt?: string } | undefined;
  await txDone(tx);
  if (!row?.lastSweepAt) return null;
  return { lastSweepAt: row.lastSweepAt };
}

async function writeSweepMeta(db: IDBDatabase, meta: SweepMeta): Promise<void> {
  const tx = db.transaction(STORE_META, "readwrite");
  tx.objectStore(STORE_META).put({ key: META_SWEEP_KEY, ...meta });
  await txDone(tx);
}

function totalStoredBytes(rows: CoachInventoryRecord[]): number {
  return rows.reduce((sum, row) => sum + (row.storedBytes || 0), 0);
}

function parsePayload(raw: string): CoachInventoryPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const rec = parsed as Record<string, unknown>;
    if (!Array.isArray(rec.steps) || rec.steps.length === 0) return null;
    return {
      steps: rec.steps as LearningStep[],
      followUps: Array.isArray(rec.followUps)
        ? rec.followUps.filter((item): item is string => typeof item === "string")
        : [],
      journey:
        typeof rec.journey === "object" && rec.journey !== null
          ? (rec.journey as TutorJourney)
          : undefined,
      coverage:
        rec.coverage === "rich" ||
        rec.coverage === "mixed" ||
        rec.coverage === "thin"
          ? rec.coverage
          : undefined,
      suggest: typeof rec.suggest === "string" ? rec.suggest : undefined,
    };
  } catch {
    return null;
  }
}

function resolveLane(question: string): CoachInventoryLane {
  const lane = detectTutorCostLane(question);
  if (lane === "light") return "light";
  const mode = detectProfessorMode(question);
  return mode === "demo" ? "coach-demo" : "coach";
}

/**
 * Look up a cached Premium turn. Touches lastOpenedAt on hit.
 * Caller must skip fair-use when serving from cache.
 */
export async function getCoachInventory(
  question: string,
): Promise<CoachInventoryHit | null> {
  if (typeof window === "undefined") return null;
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }

  try {
    const fingerprint = inventoryFingerprint(question);
    const tx = db.transaction(STORE_TURNS, "readonly");
    const index = tx.objectStore(STORE_TURNS).index("fingerprint");
    const matches = (await idbReq(
      index.getAll(fingerprint),
    )) as CoachInventoryRecord[];
    await txDone(tx);
    const record = matches.sort((a, b) =>
      b.lastOpenedAt.localeCompare(a.lastOpenedAt),
    )[0];
    if (!record) return null;

    const bytes = new Uint8Array(record.payload);
    const text = await decompressText(bytes, record.encoding);
    const payload = parsePayload(text);
    if (!payload) return null;

    const openedAt = nowIso();
    const write = db.transaction(STORE_TURNS, "readwrite");
    write.objectStore(STORE_TURNS).put({ ...record, lastOpenedAt: openedAt });
    await txDone(write);

    return {
      record: { ...record, lastOpenedAt: openedAt },
      payload,
      fromCache: true,
    };
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export type PutCoachInventoryInput = {
  question: string;
  payload: CoachInventoryPayload;
  cardIds?: string[];
  /** Saved Library card ids — turns touching these become pinned. */
  savedCardIds?: string[];
  workbookId?: string;
};

/**
 * Persist a successful live API turn (compressed). Runs LRU if over budget.
 */
export async function putCoachInventory(
  input: PutCoachInventoryInput,
): Promise<CoachInventoryRecord | null> {
  if (typeof window === "undefined") return null;
  const question = input.question.trim();
  if (!question || input.payload.steps.length === 0) return null;

  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return null;
  }

  try {
    const fingerprint = inventoryFingerprint(question);
    const mode = detectProfessorMode(question);
    const heavy = isHeavyCoachAsk(question);
    const lane = resolveLane(question);
    const cardIds = [
      ...new Set(
        (input.cardIds ?? []).filter((id) => typeof id === "string" && id),
      ),
    ].slice(0, 12);
    const saved = new Set(input.savedCardIds ?? []);
    const pinned = cardIds.some((id) => saved.has(id));

    const json = JSON.stringify(input.payload);
    const compressed = await compressText(json);
    const stamp = nowIso();

    // Replace same fingerprint to avoid duplicates.
    const existing = await listTurns(db);
    const staleIds = existing
      .filter((row) => row.fingerprint === fingerprint && !row.pinned)
      .map((row) => row.id);

    const record: CoachInventoryRecord = {
      id: uid(),
      fingerprint,
      question,
      questionPreview: previewQuestion(question),
      lane,
      mode,
      heavy,
      cardIds,
      pinned,
      createdAt: stamp,
      lastOpenedAt: stamp,
      encoding: compressed.encoding,
      payload: compressed.bytes.buffer.slice(
        compressed.bytes.byteOffset,
        compressed.bytes.byteOffset + compressed.bytes.byteLength,
      ) as ArrayBuffer,
      rawBytes: compressed.rawBytes,
      storedBytes: compressed.bytes.byteLength,
    };

    const tx = db.transaction(STORE_TURNS, "readwrite");
    const store = tx.objectStore(STORE_TURNS);
    for (const id of staleIds) store.delete(id);
    store.put(record);
    await txDone(tx);

    await enforceBudgets(db, saved);
    return record;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function enforceBudgets(
  db: IDBDatabase,
  savedCardIds: Set<string>,
): Promise<number> {
  let rows = await listTurns(db);
  // Refresh pin flags from current Saved set.
  rows = rows.map((row) => ({
    ...row,
    pinned: row.pinned || row.cardIds.some((id) => savedCardIds.has(id)),
  }));

  /** Light first, then heavy — Premium artefacts outrank plain asks. */
  const removableLightFirst = () =>
    rows
      .filter((row) => !row.pinned)
      .sort((a, b) => {
        if (a.heavy !== b.heavy) return a.heavy ? 1 : -1;
        return a.lastOpenedAt.localeCompare(b.lastOpenedAt);
      });

  const removableHeavyOnly = () =>
    rows
      .filter((row) => !row.pinned && row.heavy)
      .sort((a, b) => a.lastOpenedAt.localeCompare(b.lastOpenedAt));

  let removed = 0;
  const deleteIds = new Set<string>();

  const alive = () => rows.filter((row) => !deleteIds.has(row.id));
  const lightAlive = () => alive().filter((row) => !row.heavy);
  const heavyAlive = () => alive().filter((row) => row.heavy);
  const bytesOf = (list: CoachInventoryRecord[]) => totalStoredBytes(list);

  // Cap heavy count (still allow up to INVENTORY_MAX_HEAVY).
  while (heavyAlive().length > INVENTORY_MAX_HEAVY) {
    const victim = removableHeavyOnly().find((row) => !deleteIds.has(row.id));
    if (!victim) break;
    deleteIds.add(victim.id);
    removed += 1;
  }

  // Cap light count — tighter than heavy so asks don't crowd artefacts.
  while (lightAlive().length > INVENTORY_MAX_LIGHT) {
    const victim = removableLightFirst().find(
      (row) => !row.heavy && !deleteIds.has(row.id),
    );
    if (!victim) break;
    deleteIds.add(victim.id);
    removed += 1;
  }

  while (alive().length > INVENTORY_MAX_ENTRIES) {
    const victim = removableLightFirst().find((row) => !deleteIds.has(row.id));
    if (!victim) break;
    deleteIds.add(victim.id);
    removed += 1;
  }

  const lightBudget = inventoryLightByteBudget();
  const heavyBudget = inventoryHeavyByteBudget();

  // Keep light asks inside their 30% share so heavy always has reserved room.
  while (bytesOf(lightAlive()) > lightBudget) {
    const victim = removableLightFirst().find(
      (row) => !row.heavy && !deleteIds.has(row.id),
    );
    if (!victim) break;
    deleteIds.add(victim.id);
    removed += 1;
  }

  // Heavy (+ pinned counted in heavyAlive only if heavy) within 70% share.
  // Pinned non-heavy still protected via removable filters.
  while (bytesOf(heavyAlive()) > heavyBudget) {
    const victim = removableHeavyOnly().find((row) => !deleteIds.has(row.id));
    if (!victim) break;
    deleteIds.add(victim.id);
    removed += 1;
  }

  // Overall ceiling — still prefer dropping light before heavy.
  let bytes = bytesOf(alive());
  while (bytes > INVENTORY_MAX_BYTES) {
    const victim = removableLightFirst().find((row) => !deleteIds.has(row.id));
    if (!victim) break;
    deleteIds.add(victim.id);
    bytes -= victim.storedBytes;
    removed += 1;
  }

  if (deleteIds.size > 0) {
    const tx = db.transaction(STORE_TURNS, "readwrite");
    const store = tx.objectStore(STORE_TURNS);
    for (const id of deleteIds) store.delete(id);
    for (const row of rows) {
      if (deleteIds.has(row.id)) continue;
      store.put(row);
    }
    await txDone(tx);
  }

  return removed;
}

/**
 * Automatic maintenance. Safe to call on app launch / Tutor focus.
 * Does not ask the user — never a forced “clear cache” prompt.
 */
export async function maybeSweepCoachInventory(options?: {
  force?: boolean;
  savedCardIds?: string[];
  now?: number;
}): Promise<SweepReport> {
  const empty: SweepReport = {
    ran: false,
    reason: "skipped",
    removed: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    lastSweepAt: null,
  };
  if (typeof window === "undefined") return empty;

  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return empty;
  }

  try {
    const saved = new Set(options?.savedCardIds ?? []);
    const meta = await readSweepMeta(db);
    const now = options?.now ?? Date.now();
    const last = meta?.lastSweepAt ? Date.parse(meta.lastSweepAt) : 0;
    const due =
      options?.force ||
      !meta ||
      !Number.isFinite(last) ||
      now - last >= INVENTORY_SWEEP_INTERVAL_MS;

    const rows = await listTurns(db);
    const bytesBefore = totalStoredBytes(rows);
    const overBudget =
      bytesBefore > INVENTORY_MAX_BYTES ||
      rows.length > INVENTORY_MAX_ENTRIES;

    if (!due && !overBudget) {
      return {
        ...empty,
        reason: "skipped",
        bytesBefore,
        bytesAfter: bytesBefore,
        lastSweepAt: meta?.lastSweepAt ?? null,
      };
    }

    const cutLight = now - LIGHT_IDLE_MS;
    const cutHeavy = now - HEAVY_IDLE_MS;
    const doomed = new Set<string>();

    for (const row of rows) {
      const pinned =
        row.pinned || row.cardIds.some((id) => saved.has(id));
      if (pinned) continue;
      const opened = Date.parse(row.lastOpenedAt);
      if (!Number.isFinite(opened)) {
        doomed.add(row.id);
        continue;
      }
      if (row.heavy && opened < cutHeavy) doomed.add(row.id);
      else if (!row.heavy && opened < cutLight) doomed.add(row.id);
    }

    if (doomed.size > 0) {
      const tx = db.transaction(STORE_TURNS, "readwrite");
      const store = tx.objectStore(STORE_TURNS);
      for (const id of doomed) store.delete(id);
      await txDone(tx);
    }

    const lruRemoved = await enforceBudgets(db, saved);
    const after = await listTurns(db);
    const stamp = new Date(now).toISOString();
    await writeSweepMeta(db, { lastSweepAt: stamp });

    return {
      ran: true,
      reason: due ? "interval" : "over_budget",
      removed: doomed.size + lruRemoved,
      bytesBefore,
      bytesAfter: totalStoredBytes(after),
      lastSweepAt: stamp,
    };
  } catch {
    return empty;
  } finally {
    db.close();
  }
}

/** List recent inventory previews for Tutor “Continue from inventory”. */
export async function listCoachInventory(limit = 12): Promise<
  Pick<
    CoachInventoryRecord,
    | "id"
    | "questionPreview"
    | "question"
    | "mode"
    | "heavy"
    | "lane"
    | "lastOpenedAt"
    | "cardIds"
    | "pinned"
  >[]
> {
  if (typeof window === "undefined") return [];
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return [];
  }
  try {
    const rows = await listTurns(db);
    return rows
      .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        questionPreview: row.questionPreview,
        question: row.question,
        mode: row.mode,
        heavy: row.heavy,
        lane: row.lane,
        lastOpenedAt: row.lastOpenedAt,
        cardIds: row.cardIds,
        pinned: row.pinned,
      }));
  } finally {
    db.close();
  }
}
