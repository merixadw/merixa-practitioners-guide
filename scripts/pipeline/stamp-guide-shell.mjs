#!/usr/bin/env node
/**
 * After `next build` (static export), copy the single /guide/_shell/ HTML tree
 * to every catalog card id (+ aliases) so Capacitor deep links resolve without
 * running 14k React SSG renders.
 *
 * Prefer hardlinks for leaf files (fast + smaller disk); fall back to copy.
 *
 * Usage: node scripts/pipeline/stamp-guide-shell.mjs
 */
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT_GUIDE = join(ROOT, "out", "guide");
const SHELL_DIR = join(OUT_GUIDE, "_shell");
const CATALOG_PATH = join(ROOT, "public", "corpus", "catalog.json");
const ALIAS_PATH = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "canonical-registry.generated.json",
);

function fail(message) {
  console.error(`stamp-guide-shell: ${message}`);
  process.exit(1);
}

function listFilesRecursive(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs, rel));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function stampOne(shellFiles, destRoot) {
  if (existsSync(destRoot)) {
    rmSync(destRoot, { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });
  for (const rel of shellFiles) {
    const src = join(SHELL_DIR, ...rel.split("/"));
    const dest = join(destRoot, ...rel.split("/"));
    mkdirSync(join(dest, ".."), { recursive: true });
    try {
      linkSync(src, dest);
    } catch {
      copyFileSync(src, dest);
    }
  }
}

if (!existsSync(SHELL_DIR)) {
  fail(`missing ${SHELL_DIR} — run next build first`);
}
if (!existsSync(join(SHELL_DIR, "index.html"))) {
  fail(`missing ${join(SHELL_DIR, "index.html")}`);
}
if (!existsSync(CATALOG_PATH)) {
  fail(`missing ${CATALOG_PATH} — run npm run library:seamless first`);
}

const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
const ids = new Set();
for (const card of catalog.cards ?? []) {
  if (card?.id) ids.add(card.id);
}

if (existsSync(ALIAS_PATH)) {
  try {
    const registry = JSON.parse(readFileSync(ALIAS_PATH, "utf8"));
    const aliases = registry?.idToCanonical;
    if (aliases && typeof aliases === "object") {
      for (const [fromId, toId] of Object.entries(aliases)) {
        if (typeof fromId === "string" && ids.has(toId)) ids.add(fromId);
      }
    }
  } catch {
    /* aliases optional */
  }
}

ids.delete("_shell");

const shellFiles = listFilesRecursive(SHELL_DIR);
if (shellFiles.length === 0) fail("shell directory is empty");

const t0 = Date.now();
let stamped = 0;
for (const id of ids) {
  stampOne(shellFiles, join(OUT_GUIDE, id));
  stamped += 1;
  if (stamped % 2000 === 0) {
    console.error(`stamp-guide-shell: ${stamped}/${ids.size}…`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      shell: "_shell",
      shellFiles: shellFiles.length,
      stamped,
      catalogCards: (catalog.cards ?? []).length,
      ms: Date.now() - t0,
      shellBytes: shellFiles.reduce(
        (sum, rel) => sum + statSync(join(SHELL_DIR, ...rel.split("/"))).size,
        0,
      ),
    },
    null,
    2,
  ),
);
