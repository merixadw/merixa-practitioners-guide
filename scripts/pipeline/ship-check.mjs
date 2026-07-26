/**
 * Pre-release / CI ship check.
 * Structural competitivenessScore is intentionally ignored.
 * Always recomputes enrichment-diagnostic (never trusts a stale on-disk report).
 *
 * Usage:
 *   npm run library:ship-check
 *   npm run library:ship-check -- --gate=soft
 *   npm run library:ship-check -- --gate=public
 *   npm run library:ship-check -- --report-only
 *   npm run library:ship-check -- --assert-fresh   # fail closed if existing report stale vs index
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATES_PATH = join(ROOT, "content", "pipeline", "ship-gates.json");
const INDEX_PATH = join(ROOT, "content", "index.json");
const DIAG_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "enrichment-diagnostic-report.json",
);
const FACET_CULL_MARKER = join(
  ROOT,
  "content",
  "pipeline",
  "facet-cull-complete.json",
);
const CUSTOM_PATHS_MARKER = join(
  ROOT,
  "content",
  "pipeline",
  "custom-paths-ready.json",
);
const OUT_PATH = join(ROOT, "content", "pipeline", "ship-check-report.json");
const MAX_AGE_HOURS_DEFAULT = 6;
const INDEX_SEAMLESS_GAP_WARN = 50;

function argValue(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3);
}

function runDiagnostic() {
  const result = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "pipeline", "enrichment-diagnostic.mjs")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `enrichment-diagnostic failed: ${result.stderr || result.stdout}`,
    );
  }
}

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail };
}

/**
 * Fail closed if an existing ship-check-report is older than index mtime
 * or exceeds maxReportAgeHours. Exit 2 with STALE_SHIP_REPORT.
 */
function assertExistingReportFresh(maxAgeHours) {
  if (!existsSync(OUT_PATH)) {
    console.error("STALE_SHIP_REPORT: missing ship-check-report.json");
    process.exit(2);
  }
  if (!existsSync(INDEX_PATH)) {
    console.error("STALE_SHIP_REPORT: missing content/index.json");
    process.exit(2);
  }
  const report = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  const indexMtime = statSync(INDEX_PATH).mtime;
  const generatedAt = report.generatedAt ? Date.parse(report.generatedAt) : NaN;
  if (!Number.isFinite(generatedAt)) {
    console.error("STALE_SHIP_REPORT: ship-check-report missing generatedAt");
    process.exit(2);
  }
  if (generatedAt < indexMtime.getTime()) {
    console.error(
      `STALE_SHIP_REPORT: report generatedAt (${report.generatedAt}) < index mtime (${indexMtime.toISOString()})`,
    );
    process.exit(2);
  }
  const ageHours = (Date.now() - generatedAt) / 3_600_000;
  if (ageHours > maxAgeHours) {
    console.error(
      `STALE_SHIP_REPORT: report age ${ageHours.toFixed(1)}h > maxReportAgeHours=${maxAgeHours}`,
    );
    process.exit(2);
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        assertFresh: true,
        generatedAt: report.generatedAt,
        indexMtime: indexMtime.toISOString(),
        ageHours: Math.round(ageHours * 10) / 10,
        maxAgeHours,
      },
      null,
      2,
    ),
  );
}

function main() {
  const gate = argValue("gate", "soft");
  const reportOnly = process.argv.includes("--report-only");
  const assertFresh = process.argv.includes("--assert-fresh");
  // Prefer always recompute. --use-existing-report is rejected (fail closed).
  if (process.argv.includes("--use-existing-report")) {
    console.error(
      "STALE_SHIP_REPORT: --use-existing-report is banned; ship-check always recomputes",
    );
    process.exit(2);
  }

  if (!existsSync(GATES_PATH)) {
    throw new Error("Missing content/pipeline/ship-gates.json");
  }
  const gates = JSON.parse(readFileSync(GATES_PATH, "utf8"));
  const maxAgeHours = gates.maxReportAgeHours ?? MAX_AGE_HOURS_DEFAULT;

  if (assertFresh) {
    assertExistingReportFresh(maxAgeHours);
    return;
  }

  // Always recompute diagnostics before gating.
  runDiagnostic();
  if (!existsSync(DIAG_PATH)) {
    throw new Error("Missing enrichment-diagnostic-report.json after diagnostic");
  }

  const diag = JSON.parse(readFileSync(DIAG_PATH, "utf8"));
  const ship = diag.shipMetrics || {};
  const facetCullDone = existsSync(FACET_CULL_MARKER);
  const customPathsWorking = existsSync(CUSTOM_PATHS_MARKER);
  const indexMtime = existsSync(INDEX_PATH)
    ? statSync(INDEX_PATH).mtime.toISOString()
    : null;

  /** @type {{ id: string, ok: boolean, detail: string }[]} */
  let checks = [];

  if (gate === "soft") {
    const g = gates.softLaunch;
    checks = [
      check(
        "liveSharePath",
        (ship.liveSharePath?.current ?? 0) >= g.liveSharePathMin,
        `liveSharePath=${ship.liveSharePath?.current ?? 0} min=${g.liveSharePathMin} (path denominator)`,
      ),
      check(
        "qaFailRate",
        (ship.qaFailRate?.current ?? 1) <= g.qaFailRateMax,
        `qaFailRate=${ship.qaFailRate?.current ?? 1} max=${g.qaFailRateMax}`,
      ),
      check(
        "topicMismatch",
        (ship.topicMismatchShare?.current ?? 1) <= g.topicMismatchMax,
        `topicMismatch=${ship.topicMismatchShare?.current ?? 1} max=${g.topicMismatchMax}`,
      ),
      check(
        "templateShare",
        (ship.templateShare?.current ?? 1) <= g.templateShareMax,
        `templateShare=${ship.templateShare?.current ?? 1} max=${g.templateShareMax}`,
      ),
      check(
        "facetCullDone",
        facetCullDone === g.facetCullDone,
        `facetCullDone=${facetCullDone} required=${g.facetCullDone}`,
      ),
    ];
  } else if (gate === "public") {
    const g = gates.publicLaunch;
    // Public liveShare uses seamless runtime denominator (liveShareSeamless / Catalog).
    const liveShare =
      ship.liveShareSeamless?.current ?? ship.liveShareCatalog?.current ?? 0;
    checks = [
      check(
        "liveShareCatalog",
        liveShare >= g.liveShareCatalogMin,
        `liveShareCatalog=${liveShare} min=${g.liveShareCatalogMin} (seamless denominator; liveShareIndex=${ship.liveShareIndex?.current ?? "?"})`,
      ),
      check(
        "qaFailRate",
        (ship.qaFailRate?.current ?? 1) <= g.qaFailRateMax,
        `qaFailRate=${ship.qaFailRate?.current ?? 1} max=${g.qaFailRateMax}`,
      ),
      check(
        "topicMismatch",
        (ship.topicMismatchShare?.current ?? 1) <= g.topicMismatchMax,
        `topicMismatch=${ship.topicMismatchShare?.current ?? 1} max=${g.topicMismatchMax}`,
      ),
      check(
        "customPathsWorking",
        customPathsWorking === g.customPathsWorking,
        `customPathsWorking=${customPathsWorking} required=${g.customPathsWorking}`,
      ),
    ];
  } else if (gate === "parity") {
    const g = gates.parity;
    const liveShare =
      ship.liveShareSeamless?.current ?? ship.liveShareCatalog?.current ?? 0;
    checks = [
      check(
        "liveShareCatalog",
        liveShare >= g.liveShareCatalogMin,
        `liveShareCatalog=${liveShare} min=${g.liveShareCatalogMin} (seamless denominator)`,
      ),
    ];
  } else {
    throw new Error(`Unknown --gate=${gate} (use soft|public|parity)`);
  }

  const failed = checks.filter((c) => !c.ok);
  const passed = failed.length === 0;
  const generatedAt = new Date().toISOString();
  const indexSeamlessGap =
    ship.denominatorCounts?.indexSeamlessGap ??
    diag.denominatorCounts?.indexSeamlessGap ??
    null;
  const gapWarning =
    typeof indexSeamlessGap === "number" &&
    indexSeamlessGap > INDEX_SEAMLESS_GAP_WARN
      ? {
          id: "indexSeamlessGap",
          level: "warn",
          detail: `indexSeamlessGap=${indexSeamlessGap} > ${INDEX_SEAMLESS_GAP_WARN} — classify via classify-index-seamless-gap.mjs or close publisher drops`,
        }
      : null;

  const report = {
    generatedAt,
    gate,
    reportOnly,
    passed,
    ban: gates.ban,
    bannedFromShipDecisions: gates.bannedFromShipDecisions || [],
    note: "competitivenessScore is informational only — not used here. Public liveShareCatalog uses seamless denominator.",
    competitivenessScoreInformational: diag.competitivenessScore,
    shipMetrics: ship,
    denominatorCounts: ship.denominatorCounts || diag.denominatorCounts || null,
    warnings: gapWarning ? [gapWarning] : [],
    reportFreshness: {
      indexMtime,
      generatedAt,
      maxAgeHours,
      stale: false,
      alwaysRecomputed: true,
    },
    checks,
    failed: failed.map((c) => c.id),
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (gapWarning) {
    console.error(`WARN: ${gapWarning.detail}`);
  }

  if (!passed && !reportOnly) {
    process.exitCode = 1;
  }
}

main();
