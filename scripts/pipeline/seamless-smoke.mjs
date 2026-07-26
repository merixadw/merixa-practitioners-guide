/**
 * Smoke: seamless corpus artifacts exist and catalog is much smaller than retrieve.
 * Usage: node scripts/pipeline/seamless-smoke.mjs
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const corpus = join(root, "public", "corpus");
const catalogPath = join(corpus, "catalog.json");
const retrievePath = join(corpus, "retrieve-index.json");
const metaPath = join(corpus, "meta.json");
const detailsDir = join(corpus, "details");

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

if (!existsSync(catalogPath)) fail("missing public/corpus/catalog.json — run npm run library:seamless");
if (!existsSync(retrievePath)) fail("missing retrieve-index.json");
if (!existsSync(metaPath)) fail("missing meta.json");
if (!existsSync(detailsDir)) fail("missing details/");

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const catalogBytes = statSync(catalogPath).size;
const retrieveBytes = statSync(retrievePath).size;

if (!catalog.cards?.length) fail("catalog has no cards");
if (catalogBytes >= retrieveBytes) fail("catalog should be smaller than retrieve-index");
// Soft cap raised after E3 publisher fixes (COSO/GARP/CRMA cards enter runtime).
// Still catches accidental full-retrieve-as-catalog swaps (~90MB+).
if (catalogBytes > 20 * 1024 * 1024) fail("catalog exceeds 20 MB soft cap");

console.log(
  JSON.stringify(
    {
      ok: true,
      catalogCards: catalog.cards.length,
      catalogMB: (catalogBytes / 1024 / 1024).toFixed(2),
      retrieveMB: (retrieveBytes / 1024 / 1024).toFixed(2),
      meta,
    },
    null,
    2,
  ),
);
