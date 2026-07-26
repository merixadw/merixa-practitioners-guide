#!/usr/bin/env node
/**
 * After `next build` (static export), copy the single /guide/_shell/ HTML tree
 * to every catalog card id (+ aliases) so Capacitor deep links resolve without
 * running 14k React SSG renders.
 *
 * Usage: node scripts/pipeline/stamp-guide-shell.mjs
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
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

if (!existsSync(SHELL_DIR)) {
  fail(`missing ${SHELL_DIR} — run next build first`);
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

let stamped = 0;
for (const id of ids) {
  const dest = join(OUT_GUIDE, id);
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dest, { recursive: true });
  cpSync(SHELL_DIR, dest, { recursive: true });
  stamped += 1;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      shell: "_shell",
      stamped,
      catalogCards: (catalog.cards ?? []).length,
    },
    null,
    2,
  ),
);
