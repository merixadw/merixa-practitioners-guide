#!/usr/bin/env node
/**
 * Static smoke for Cap/web ship artifacts under out/.
 * Usage: node scripts/pipeline/smoke-out-web.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const CORPUS = join(OUT, "corpus");
const GUIDE = join(OUT, "guide");

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

function mb(path) {
  return Number((statSync(path).size / 1024 / 1024).toFixed(2));
}

if (!existsSync(OUT)) fail("missing out/ — run npm run build:web");
if (!existsSync(join(OUT, "index.html"))) fail("missing out/index.html");
if (!existsSync(join(OUT, "library", "index.html"))) {
  fail("missing out/library/index.html");
}
if (!existsSync(join(OUT, "paths", "index.html"))) {
  fail("missing out/paths/index.html");
}

const catalogPath = join(CORPUS, "catalog.json");
const retrievePath = join(CORPUS, "retrieve-index.json");
const metaPath = join(CORPUS, "meta.json");
const detailsDir = join(CORPUS, "details");
const shellDir = join(GUIDE, "_shell");

if (!existsSync(catalogPath)) fail("missing out/corpus/catalog.json");
if (!existsSync(retrievePath)) fail("missing out/corpus/retrieve-index.json");
if (!existsSync(metaPath)) fail("missing out/corpus/meta.json");
if (!existsSync(detailsDir)) fail("missing out/corpus/details/");
if (!existsSync(shellDir)) fail("missing out/guide/_shell/");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const cards = Array.isArray(catalog.cards) ? catalog.cards : [];
if (cards.length < 1000) fail(`catalog too small: ${cards.length} cards`);

const shardCount = readdirSync(detailsDir).filter((name) =>
  name.endsWith(".json"),
).length;
if (shardCount < 1) fail("no detail shards in out/corpus/details");

const sample = cards[0];
if (!sample?.id) fail("catalog card missing id");
const sampleGuide = join(GUIDE, sample.id, "index.html");
if (!existsSync(sampleGuide)) {
  fail(`missing stamped guide shell for sample id ${sample.id}`);
}

const mid = cards[Math.floor(cards.length / 2)];
const midGuide = join(GUIDE, mid.id, "index.html");
if (!existsSync(midGuide)) {
  fail(`missing stamped guide shell for mid id ${mid.id}`);
}

const guideDirs = readdirSync(GUIDE, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
);
// _shell + stamped ids (aliases may add more than catalog length)
if (guideDirs.length < cards.length) {
  fail(
    `stamped guide dirs ${guideDirs.length} < catalog cards ${cards.length}`,
  );
}

const report = {
  ok: true,
  catalogCards: cards.length,
  guideDirs: guideDirs.length,
  detailShards: shardCount,
  catalogMB: mb(catalogPath),
  retrieveMB: mb(retrievePath),
  sampleGuide: `guide/${sample.id}/index.html`,
  midGuide: `guide/${mid.id}/index.html`,
};

console.log(JSON.stringify(report, null, 2));
