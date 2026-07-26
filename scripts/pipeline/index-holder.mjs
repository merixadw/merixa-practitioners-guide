/**
 * Single-writer lock for content/index.json pipelines.
 *
 * Usage (CLI):
 *   node scripts/pipeline/index-holder.mjs acquire --holder=enrich-library
 *   node scripts/pipeline/index-holder.mjs release --holder=enrich-library
 *   node scripts/pipeline/index-holder.mjs status
 *
 * Usage (import):
 *   import { withIndexHolder, assertNoIndexHolder } from "./index-holder.mjs";
 *   await withIndexHolder("codex-local-enrich", async () => { ... });
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const LOCK_PATH = join(PIPELINE_DIR, "index.lock");

/** Stale lock TTL — crashed writers should not block forever. */
const STALE_MS = 2 * 60 * 60 * 1000;

function flagValue(argv, name, fallback = "") {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.split("=").slice(1).join("=") || fallback;
}

export function readIndexHolder() {
  if (!existsSync(LOCK_PATH)) return null;
  try {
    return JSON.parse(readFileSync(LOCK_PATH, "utf8"));
  } catch {
    return { holder: "unreadable", acquiredAt: null, pid: null };
  }
}

function isStale(lock) {
  if (!lock?.acquiredAt) return true;
  const age = Date.now() - new Date(lock.acquiredAt).getTime();
  return !Number.isFinite(age) || age > STALE_MS;
}

/**
 * Refuse start when another holder owns the lock.
 * @param {string} [ignoreHolder] allow re-entry for the same holder name
 */
export function assertNoIndexHolder(ignoreHolder = "") {
  const lock = readIndexHolder();
  if (!lock) return;
  if (ignoreHolder && lock.holder === ignoreHolder) return;
  if (isStale(lock)) {
    try {
      unlinkSync(LOCK_PATH);
    } catch {
      /* ignore */
    }
    console.warn(
      `index-holder: cleared stale lock from ${lock.holder} (acquiredAt=${lock.acquiredAt})`,
    );
    return;
  }
  const err = new Error(
    `INDEX_HOLDER_BUSY: ${lock.holder} holds content/index.json since ${lock.acquiredAt} (pid=${lock.pid}). One pipeline at a time.`,
  );
  err.code = "INDEX_HOLDER_BUSY";
  err.lock = lock;
  throw err;
}

export function acquireIndexHolder(holder, { force = false } = {}) {
  const name = String(holder || "").trim();
  if (!name) throw new Error("index-holder: holder name required");
  mkdirSync(PIPELINE_DIR, { recursive: true });
  if (!force) assertNoIndexHolder(name);
  const lock = {
    holder: name,
    acquiredAt: new Date().toISOString(),
    pid: process.pid,
    hostname: process.env.COMPUTERNAME || process.env.HOSTNAME || null,
  };
  writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  return lock;
}

export function releaseIndexHolder(holder) {
  const lock = readIndexHolder();
  if (!lock) return { released: false, reason: "no-lock" };
  if (holder && lock.holder !== holder && lock.pid !== process.pid) {
    return {
      released: false,
      reason: "holder-mismatch",
      lock,
    };
  }
  try {
    unlinkSync(LOCK_PATH);
  } catch {
    return { released: false, reason: "unlink-failed", lock };
  }
  return { released: true, lock };
}

export async function withIndexHolder(holder, fn, { force = false } = {}) {
  acquireIndexHolder(holder, { force });
  try {
    return await fn();
  } finally {
    releaseIndexHolder(holder);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] || "status";
  const holder = flagValue(argv, "--holder", "cli");
  const force = argv.includes("--force");

  if (cmd === "status") {
    const lock = readIndexHolder();
    console.log(
      JSON.stringify(
        {
          lockPath: LOCK_PATH,
          lock,
          stale: lock ? isStale(lock) : false,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (cmd === "acquire") {
    const lock = acquireIndexHolder(holder, { force });
    console.log(JSON.stringify({ ok: true, lock }, null, 2));
    return;
  }
  if (cmd === "release") {
    const result = releaseIndexHolder(holder);
    console.log(JSON.stringify(result, null, 2));
    if (!result.released) process.exitCode = 1;
    return;
  }
  console.error("Usage: index-holder.mjs <status|acquire|release> [--holder=name]");
  process.exitCode = 1;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exitCode = err.code === "INDEX_HOLDER_BUSY" ? 3 : 1;
  });
}
