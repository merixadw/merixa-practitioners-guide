/**
 * One-screen gate truth — kills metric theater.
 *
 * Usage:
 *   npm run library:truth-board
 *   node scripts/pipeline/truth-board.mjs --write-ops   # merge truthBoard into ops-status.json
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathCardIds } from "../lib/path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const OPS_PATH = join(ROOT, "content", "pipeline", "ops-status.json");
const SHIP_PATH = join(ROOT, "content", "pipeline", "ship-check-report.json");
const GATES_PATH = join(ROOT, "content", "pipeline", "ship-gates.json");
const SEAMLESS_CATALOG = join(ROOT, "public", "corpus", "catalog.json");
const MAX_AGE_HOURS_DEFAULT = 6;
/** E3 visibility: gap above this fails truth-board closed unless fully classified. */
const INDEX_SEAMLESS_GAP_MAX = 50;
const GAP_REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "index-seamless-gap-report.json",
);

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 1000;
}

function pctDisplay(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function loadSeamlessIds() {
  if (!existsSync(SEAMLESS_CATALOG)) return new Set();
  const catalog = JSON.parse(readFileSync(SEAMLESS_CATALOG, "utf8"));
  return new Set((catalog.cards || []).map((c) => c.id));
}

function buildTruthBoard() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const seamlessIds = loadSeamlessIds();
  const pathIds = pathCardIds();

  let withEnrichedAt = 0;
  let seamlessWithEnrichedAt = 0;
  let pathWithEnrichedAt = 0;
  let pathCards = 0;

  for (const card of cards) {
    const live = Boolean(card.enrichedAt);
    if (live) withEnrichedAt += 1;
    if (seamlessIds.has(card.id)) {
      if (live) seamlessWithEnrichedAt += 1;
    }
    if (pathIds.has(card.id)) {
      pathCards += 1;
      if (live) pathWithEnrichedAt += 1;
    }
  }

  const indexCards = cards.length;
  const seamlessCards = seamlessIds.size;
  const indexSeamlessGap = Math.max(0, indexCards - seamlessCards);
  const liveShareIndex = pct(withEnrichedAt, indexCards);
  const liveShareSeamless = pct(seamlessWithEnrichedAt, seamlessCards || 1);
  const liveSharePath = pct(pathWithEnrichedAt, pathCards || 1);
  const liveSharePct = pctDisplay(withEnrichedAt, indexCards);

  const indexMtime = statSync(INDEX_PATH).mtime.toISOString();
  const gates = existsSync(GATES_PATH)
    ? JSON.parse(readFileSync(GATES_PATH, "utf8"))
    : {};
  const maxAgeHours = gates.maxReportAgeHours ?? MAX_AGE_HOURS_DEFAULT;

  let shipCheckReportAt = null;
  let shipCheckReportPassed = null;
  let shipCheckReportLiveShareCatalog = null;
  let shipCheckReportAgeHours = null;
  let shipCheckFresh = false;
  let shipCheckStaleReason = null;

  if (existsSync(SHIP_PATH)) {
    const ship = JSON.parse(readFileSync(SHIP_PATH, "utf8"));
    shipCheckReportAt = ship.generatedAt || null;
    shipCheckReportPassed = ship.passed ?? null;
    shipCheckReportLiveShareCatalog =
      ship.shipMetrics?.liveShareCatalog?.current ??
      ship.shipMetrics?.liveShareSeamless?.current ??
      null;
    if (shipCheckReportAt) {
      shipCheckReportAgeHours =
        Math.round(
          ((Date.now() - Date.parse(shipCheckReportAt)) / 3_600_000) * 10,
        ) / 10;
      const olderThanIndex =
        Date.parse(shipCheckReportAt) < Date.parse(indexMtime);
      const tooOld =
        shipCheckReportAgeHours != null &&
        shipCheckReportAgeHours > maxAgeHours;
      shipCheckFresh = !olderThanIndex && !tooOld;
      if (olderThanIndex) shipCheckStaleReason = "STALE_SHIP_REPORT:report_older_than_index";
      else if (tooOld) {
        shipCheckStaleReason = `STALE_SHIP_REPORT:age_hours>${maxAgeHours}`;
      }
    } else {
      shipCheckStaleReason = "STALE_SHIP_REPORT:missing_generatedAt";
    }
  } else {
    shipCheckStaleReason = "STALE_SHIP_REPORT:missing_report";
  }

  let enrichPaused = false;
  let enrichPauseReason = null;
  let competitivenessScoreInformational = null;
  if (existsSync(OPS_PATH)) {
    const ops = JSON.parse(readFileSync(OPS_PATH, "utf8"));
    enrichPaused = Boolean(
      ops.enrich?.status === "paused" || ops.enrichPaused?.paused,
    );
    enrichPauseReason =
      ops.enrich?.reason || ops.enrichPaused?.reason || null;
  }
  const diagPath = join(
    ROOT,
    "content",
    "pipeline",
    "enrichment-diagnostic-report.json",
  );
  if (existsSync(diagPath)) {
    const diag = JSON.parse(readFileSync(diagPath, "utf8"));
    competitivenessScoreInformational = diag.competitivenessScore ?? null;
  }

  let gapFullyClassified = false;
  let gapReportAt = null;
  if (existsSync(GAP_REPORT_PATH)) {
    const gapReport = JSON.parse(readFileSync(GAP_REPORT_PATH, "utf8"));
    gapFullyClassified = Boolean(gapReport.fullyClassified);
    gapReportAt = gapReport.generatedAt || null;
  }
  const indexSeamlessGapOk =
    indexSeamlessGap <= INDEX_SEAMLESS_GAP_MAX || gapFullyClassified;

  return {
    generatedAt: new Date().toISOString(),
    liveSharePct,
    liveShareIndex,
    liveShareSeamless,
    liveSharePath,
    indexCards,
    seamlessCards,
    pathCards,
    withEnrichedAt,
    seamlessWithEnrichedAt,
    indexSeamlessGap,
    indexSeamlessGapMax: INDEX_SEAMLESS_GAP_MAX,
    indexSeamlessGapOk,
    gapFullyClassified,
    gapReportAt,
    shipCheckFresh,
    shipCheckReportAt,
    shipCheckReportAgeHours,
    shipCheckReportPassed,
    shipCheckReportLiveShareCatalog,
    shipCheckStaleReason,
    indexMtime,
    maxReportAgeHours: maxAgeHours,
    enrichPaused,
    enrichPauseReason,
    competitivenessScoreInformational,
    banShipOnStructural: true,
    note: "competitivenessScore / shelf pct / agent wave counts are NOT release gates. Public gate uses liveShareSeamless.",
  };
}

function main() {
  const writeOps = process.argv.includes("--write-ops");
  const board = buildTruthBoard();
  console.log(JSON.stringify(board, null, 2));

  if (writeOps) {
    const ops = existsSync(OPS_PATH)
      ? JSON.parse(readFileSync(OPS_PATH, "utf8"))
      : {};
    ops.truthBoard = board;
    ops.generatedAt = board.generatedAt;
    ops.inventory = {
      ...(ops.inventory || {}),
      indexSeamlessGap: board.indexSeamlessGap,
      seamlessCards: board.seamlessCards,
    };
    writeFileSync(OPS_PATH, `${JSON.stringify(ops, null, 2)}\n`, "utf8");
    console.error(`Wrote truthBoard → ${OPS_PATH}`);
  }

  if (!board.shipCheckFresh && board.shipCheckReportPassed === true) {
    console.error(
      `\n${board.shipCheckStaleReason || "STALE_SHIP_REPORT"} — do not ship on this report.`,
    );
    process.exitCode = 2;
  }

  if (!board.indexSeamlessGapOk) {
    console.error(
      `\nINDEX_SEAMLESS_GAP: gap=${board.indexSeamlessGap} max=${board.indexSeamlessGapMax} (classify via node scripts/pipeline/classify-index-seamless-gap.mjs or close gap).`,
    );
    process.exitCode = 2;
  }
}

main();
