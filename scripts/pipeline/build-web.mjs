#!/usr/bin/env node
/**
 * Final-product web/Cap export:
 *   1) ensure public/corpus (seamless unless already present / SKIP_SEAMLESS=1)
 *   2) next build (static export) with raised heap
 *   3) stamp /guide/_shell → every catalog id
 *   4) smoke out/
 *
 * Usage: node scripts/pipeline/build-web.mjs
 * Env:
 *   FORCE_SEAMLESS=1  — always re-publish public/corpus
 *   SKIP_SEAMLESS=1   — never re-publish (fail if corpus missing)
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CORPUS = join(ROOT, "public", "corpus");

function run(command, args, extraEnv = {}) {
  console.log(`\n» ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS,
        "--max-old-space-size=8192",
      ]
        .filter(Boolean)
        .join(" "),
      ...extraEnv,
    },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function corpusReady() {
  const catalog = join(CORPUS, "catalog.json");
  const retrieve = join(CORPUS, "retrieve-index.json");
  const details = join(CORPUS, "details");
  if (!existsSync(catalog) || !existsSync(retrieve) || !existsSync(details)) {
    return false;
  }
  try {
    return (
      statSync(catalog).size > 1024 * 1024 &&
      statSync(retrieve).size > 10 * 1024 * 1024
    );
  } catch {
    return false;
  }
}

const forceSeamless = process.env.FORCE_SEAMLESS === "1";
const skipSeamless = process.env.SKIP_SEAMLESS === "1";

if (forceSeamless) {
  run("npm", ["run", "library:seamless"]);
} else if (corpusReady()) {
  console.log("» public/corpus present — skipping library:seamless");
} else if (skipSeamless) {
  console.error("build-web: SKIP_SEAMLESS=1 but public/corpus is incomplete");
  process.exit(1);
} else {
  run("npm", ["run", "library:seamless"]);
}

run("npx", ["--yes", "next", "build"]);
run("node", ["scripts/pipeline/stamp-guide-shell.mjs"]);
run("node", ["scripts/pipeline/smoke-out-web.mjs"]);

console.log("\nbuild-web: ok");
