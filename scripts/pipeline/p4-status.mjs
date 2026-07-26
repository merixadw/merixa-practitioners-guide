/**
 * P4 soft-launch status — liveSharePath + spot QA on path cards.
 * Usage: npm run library:p4:status
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { needsTopicRelevanceRewrite } from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { pathCardIds } from "../lib/path-sources.mjs";
import { budgetSnapshot, formatBudgetLine } from "../lib/token-budget.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const INDEX_PATH = join(ROOT, "content", "index.json");
const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const OUT_PATH = join(PIPELINE_DIR, "p4-status.json");
const ENRICH_REPORT = join(PIPELINE_DIR, "enrich-library-report.json");

const SOFT_LAUNCH_LIVE_SHARE = 0.7;
const SPOT_QA_SAMPLE = 50;
const SPOT_QA_FAIL_MAX = 0.05;

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(arr, n, seed = 20260723) {
  const rand = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byId = new Map(cards.map((c) => [c.id, c]));
  const pathIds = [...pathCardIds()].filter((id) => byId.has(id));
  const pathCards = pathIds.map((id) => byId.get(id));

  const pathEnriched = pathCards.filter((c) => c.enrichedAt).length;
  const liveSharePath =
    pathCards.length > 0
      ? Math.round((pathEnriched / pathCards.length) * 1000) / 1000
      : 0;

  const spot = sample(pathCards, SPOT_QA_SAMPLE);
  const spotFails = spot.filter((c) => needsTopicRelevanceRewrite(c));
  const spotFailRate =
    spot.length > 0
      ? Math.round((spotFails.length / spot.length) * 1000) / 1000
      : 0;

  const lastEnrich = existsSync(ENRICH_REPORT)
    ? JSON.parse(readFileSync(ENRICH_REPORT, "utf8"))
    : null;
  const quotaBlocked =
    Boolean(lastEnrich?.errors?.insufficient_quota) ||
    (lastEnrich?.updated === 0 &&
      lastEnrich?.errors &&
      Object.keys(lastEnrich.errors).includes("insufficient_quota"));

  const softLaunchReady =
    liveSharePath >= SOFT_LAUNCH_LIVE_SHARE &&
    spotFailRate <= SPOT_QA_FAIL_MAX;

  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const budget = budgetSnapshot(PIPELINE_DIR);

  const status = softLaunchReady
    ? "done"
    : quotaBlocked || !hasKey
      ? "blocked_quota"
      : "in_progress";

  const report = {
    phase: "P4",
    status,
    generatedAt: new Date().toISOString(),
    softLaunchGate: {
      liveSharePathMin: SOFT_LAUNCH_LIVE_SHARE,
      liveSharePath,
      pathCards: pathCards.length,
      pathEnriched,
      pathStillNeedEnrich: pathCards.length - pathEnriched,
      spotQaSample: spot.length,
      spotFailRate,
      spotFailMax: SPOT_QA_FAIL_MAX,
      softLaunchReady,
    },
    openai: {
      hasKey,
      quotaBlocked,
      budgetLine: formatBudgetLine(budget),
    },
    lastEnrichBatch: lastEnrich
      ? {
          generatedAt: lastEnrich.generatedAt,
          updated: lastEnrich.updated,
          skipped: lastEnrich.skipped,
          pathLinkedInBatch: lastEnrich.pathLinkedInBatch,
          errors: lastEnrich.errors,
        }
      : null,
    resumeWhenBillingRestored: [
      "npm run library:enrich:path-first -- --limit=71",
      "or: npm run library:daily-spend -- --enrich-only",
      "Repeat nightly until liveSharePath ≥ 0.70",
      "Then: npm run library:p4:status (spot QA must stay ≤5% fail)",
    ],
    note: "Do not expand encyclopedia shelves until softLaunchReady is true.",
  };

  mkdirSync(PIPELINE_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  if (!softLaunchReady) process.exitCode = 0;
}

main();
