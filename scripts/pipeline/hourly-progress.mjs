/**
 * Hourly pipeline progress snapshot for soft-launch / encyclopedia runs.
 * Re-measures live content/index.json + pipeline state; compares to prior
 * snapshot for rates/ETA. Writes content/pipeline/hourly-progress.json.
 *
 * Usage:
 *   node scripts/pipeline/hourly-progress.mjs
 *   node scripts/pipeline/hourly-progress.mjs --loop --interval-min=60
 *   npm run library:hourly-progress
 *   npm run library:hourly-progress:loop
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENCYCLOPEDIA_SHELVES,
  shelfExistingCount,
  shelfTarget,
} from "../lib/encyclopedia-shelf-targets.mjs";
import { pathCardIds } from "../lib/path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const OUT_PATH = join(PIPELINE_DIR, "hourly-progress.json");
const HISTORY_PATH = join(PIPELINE_DIR, "hourly-progress-history.jsonl");

const PRIORITY_SHELF_IDS = [
  "ma",
  "tax",
  "fa",
  "ifrs",
  "crma",
  "iia",
  "coso",
  "frm",
];

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseArgs(argv) {
  let loop = false;
  let intervalMin = 60;
  for (const arg of argv) {
    if (arg === "--loop") loop = true;
    else if (arg.startsWith("--interval-min=")) {
      const n = Number(arg.slice("--interval-min=".length));
      if (Number.isFinite(n) && n > 0) intervalMin = n;
    }
  }
  return { loop, intervalMin };
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 10;
}

function ratePerHour(delta, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0 || delta == null) return null;
  return Math.round((delta / (elapsedMs / 3_600_000)) * 10) / 10;
}

function etaHours(remaining, ratePerH) {
  if (ratePerH == null || ratePerH <= 0 || remaining == null || remaining <= 0) {
    return null;
  }
  return Math.round((remaining / ratePerH) * 10) / 10;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function snapshot() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const enriched = cards.filter((c) => c.enrichedAt).length;
  const liveShare =
    cards.length > 0 ? Math.round((enriched / cards.length) * 1000) / 1000 : 0;

  const pathIdSet = new Set([...pathCardIds()]);
  const pathCards = cards.filter((c) => pathIdSet.has(c.id));
  const pathEnriched = pathCards.filter((c) => c.enrichedAt).length;
  const liveSharePath =
    pathCards.length > 0
      ? Math.round((pathEnriched / pathCards.length) * 1000) / 1000
      : 0;

  const shelves = {};
  let shelfCurrent = 0;
  let shelfTargetTotal = 0;
  for (const shelf of ENCYCLOPEDIA_SHELVES) {
    if (!PRIORITY_SHELF_IDS.includes(shelf.id)) continue;
    const current = shelfExistingCount(cards, shelf);
    const target = shelfTarget(shelf);
    const gap = Math.max(0, target - current);
    shelves[shelf.id] = {
      current,
      target,
      gap,
      pct: pct(current, target),
    };
    shelfCurrent += current;
    shelfTargetTotal += target;
  }

  const enrichReport = readJson(join(PIPELINE_DIR, "enrich-library-report.json"));
  const enrichState = readJson(join(PIPELINE_DIR, "enrich-library-state.json"));
  const qaReport = readJson(join(PIPELINE_DIR, "openai-corpus-qa-report.json"));
  const qaState = readJson(join(PIPELINE_DIR, "openai-corpus-qa-state.json"));
  const p4 = readJson(join(PIPELINE_DIR, "p4-status.json"));
  const prev = readJson(OUT_PATH);

  const failCounts = enrichState?.failCounts || {};
  const parkedFails = Object.values(failCounts).filter((n) => n >= 3).length;
  const openFailTracks = Object.values(failCounts).filter(
    (n) => n > 0 && n < 3,
  ).length;

  const qaOpenFails = Array.isArray(qaState?.failIds)
    ? qaState.failIds.length
    : Array.isArray(qaReport?.fails)
      ? qaReport.fails.length
      : 0;

  const generatedAt = new Date().toISOString();
  const elapsedMs = prev?.generatedAt
    ? Date.parse(generatedAt) - Date.parse(prev.generatedAt)
    : null;

  const delta = prev
    ? {
        cards: cards.length - (prev.corpus?.cards ?? cards.length),
        enriched: enriched - (prev.corpus?.enriched ?? enriched),
        liveShare:
          Math.round(
            (liveShare - (prev.corpus?.liveShare ?? liveShare)) * 1000,
          ) / 1000,
        shelfCurrent:
          shelfCurrent - (prev.shelvesSummary?.current ?? shelfCurrent),
        pathEnriched:
          pathEnriched - (prev.corpus?.pathEnriched ?? pathEnriched),
      }
    : null;

  const rates =
    delta && elapsedMs
      ? {
          cardsPublishedPerHour: ratePerHour(delta.cards, elapsedMs),
          enrichUpdatesPerHour: ratePerHour(delta.enriched, elapsedMs),
          shelfCardsPerHour: ratePerHour(delta.shelfCurrent, elapsedMs),
          liveShareDeltaPerHour: ratePerHour(delta.liveShare, elapsedMs),
          elapsedHours: Math.round((elapsedMs / 3_600_000) * 100) / 100,
        }
      : null;

  const shelfGap = Math.max(0, shelfTargetTotal - shelfCurrent);
  const enrichRemaining =
    enrichReport?.remaining ?? Math.max(0, cards.length - enriched);

  const report = {
    generatedAt,
    corpus: {
      cards: cards.length,
      enriched,
      liveShare,
      pathCards: pathCards.length,
      pathEnriched,
      liveSharePath,
      pathStillNeedEnrich: Math.max(0, pathCards.length - pathEnriched),
    },
    shelves,
    shelvesSummary: {
      current: shelfCurrent,
      target: shelfTargetTotal,
      gap: shelfGap,
      pct: pct(shelfCurrent, shelfTargetTotal),
    },
    enrich: {
      remaining: enrichReport?.remaining ?? null,
      pathRemaining: enrichReport?.pathRemaining ?? null,
      parkedFails,
      openFailTracks,
      reportAt: enrichReport?.generatedAt ?? null,
      updatedLastBatch: enrichReport?.updated ?? null,
    },
    qa: {
      openFails: qaOpenFails,
      localFails: qaReport?.localFails ?? null,
      openaiFailed: qaReport?.openai?.failed ?? null,
      lastRunAt: qaState?.lastRunAt ?? qaReport?.generatedAt ?? null,
    },
    p4: p4
      ? {
          status: p4.status,
          liveSharePath: p4.softLaunchGate?.liveSharePath ?? null,
          softLaunchReady: p4.softLaunchGate?.softLaunchReady ?? null,
        }
      : null,
    delta,
    rates,
    eta: {
      shelfGapHours: etaHours(
        shelfGap,
        rates?.shelfCardsPerHour ?? rates?.cardsPublishedPerHour,
      ),
      enrichRemainingHours: etaHours(
        enrichRemaining,
        rates?.enrichUpdatesPerHour,
      ),
    },
  };

  mkdirSync(PIPELINE_DIR, { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  appendFileSync(
    HISTORY_PATH,
    `${JSON.stringify({
      generatedAt,
      corpus: report.corpus,
      shelvesSummary: report.shelvesSummary,
      enrich: report.enrich,
      qa: report.qa,
      rates: report.rates,
      eta: report.eta,
    })}\n`,
    "utf8",
  );

  const shelfBits = PRIORITY_SHELF_IDS.map(
    (id) => `${id}=${shelves[id].current}/${shelves[id].target}`,
  ).join(" ");
  const rateLine = rates
    ? ` rates: shelf≈${rates.shelfCardsPerHour ?? "n/a"}/h enrich≈${rates.enrichUpdatesPerHour ?? "n/a"}/h (+${rates.elapsedHours}h)`
    : " rates: (baseline — next hour will compute deltas)";
  const etaLine = ` ETA: shelves≈${report.eta.shelfGapHours ?? "n/a"}h enrich≈${report.eta.enrichRemainingHours ?? "n/a"}h`;

  const summary = [
    `[hourly-progress ${generatedAt}] cards=${cards.length} liveShare=${(liveShare * 100).toFixed(1)}% pathLive=${(liveSharePath * 100).toFixed(1)}%`,
    `  shelves ${report.shelvesSummary.pct}% (${shelfCurrent}/${shelfTargetTotal} gap=${shelfGap}) ${shelfBits}`,
    `  enrich remaining=${enrichReport?.remaining ?? "n/a"} parkedFails=${parkedFails} openFailTracks=${openFailTracks} qaOpenFails=${qaOpenFails}`,
    ` ${rateLine}${etaLine}`,
    `  wrote ${OUT_PATH}`,
  ].join("\n");

  console.log(summary);
  return report;
}

async function main() {
  const { loop, intervalMin } = parseArgs(process.argv.slice(2));
  snapshot();
  if (!loop) return;
  const intervalMs = Math.max(1, intervalMin) * 60_000;
  console.log(
    `hourly-progress: looping every ${intervalMin} min (pid=${process.pid})`,
  );
  for (;;) {
    await sleep(intervalMs);
    try {
      snapshot();
    } catch (err) {
      console.error(
        `hourly-progress: snapshot failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
