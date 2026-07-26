import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Aggressive but sustainable Library + Paths perfection cycle.
 *
 * Applies all eight expansion routes in priority order:
 *   1. Encyclopedia breadth (tax P0, ACCA resources, domain spines, body packs)
 *   2. Path publishes (IFRS/FRM/FA + priority domain paths)
 *   3. Cross-body path generation (OpenAI, agenda-driven)
 *   4. Official body sustain + terminology from ACCA/IIA/FRM/CFA/CRMA pages
 *   5. Path-first OpenAI enrichment (multi-round)
 *   6. Quality loop (repair, spine-awareness, learning circle)
 *   7. Progress report + coverage audit
 *
 * Usage:
 *   npm run library:perfect-cycle
 *   npm run library:perfect-cycle -- --aggressive
 *   npm run library:perfect-cycle -- --enrich-rounds=5 --generate=3
 */
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { backupCorpus } from "../lib/corpus-backup.mjs";
import {
  assertLibraryImproved,
  readLibraryHealth,
  writeGuardrailReport,
} from "../lib/improvement-guardrails.mjs";
import { auditPathCoverage } from "../lib/path-sources.mjs";
import {
  budgetSnapshot,
  formatBudgetLine,
} from "../lib/token-budget.mjs";
import { generateCrossBodyPaths } from "./generate-cross-body-paths.mjs";
import { runBatch } from "./enrich-library.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const LOG_PATH = join(PIPELINE_DIR, "expansion-perfection-cycle-run.log");
const REPORT_PATH = join(PIPELINE_DIR, "expansion-perfection-cycle-report.json");
const STATE_PATH = join(PIPELINE_DIR, "expansion-perfection-cycle-state.json");
const PLAN_PATH = join(PIPELINE_DIR, "expansion-cycle-plan.json");

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback) {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function log(line) {
  const stamp = new Date().toISOString();
  const text = `[${stamp}] ${line}\n`;
  process.stdout.write(text);
  appendFileSync(LOG_PATH, text, "utf8");
}

function runNode(script, extraArgs = [], { required = true } = {}) {
  log(`→ ${script} ${extraArgs.join(" ")}`.trim());
  const result = spawnSync(
    process.execPath,
    [join(ROOT, script), ...extraArgs],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  const ok = result.status === 0;
  if (!ok && required) {
    throw new Error(`${script} exited ${result.status ?? "unknown"}`);
  }
  return { ok, status: result.status ?? 1 };
}

async function main() {
  const argv = process.argv.slice(2);
  const aggressive = flag(argv, "--aggressive");
  const generateCount = flagValue(argv, "--generate", aggressive ? 3 : 2);
  const enrichRounds = flagValue(argv, "--enrich-rounds", aggressive ? 8 : 4);
  const enrichLimit = flagValue(argv, "--enrich-limit", aggressive ? 100 : 60);
  const sustainLimit = flagValue(argv, "--sustain-limit", aggressive ? 24 : 16);
  const termsLimit = flagValue(argv, "--terms-limit", aggressive ? 20 : 12);
  const circleCycles = flagValue(argv, "--circle-cycles", 1);

  mkdirSync(PIPELINE_DIR, { recursive: true });

  const healthBefore = readLibraryHealth(CONTENT_DIR);
  const cycleBackup = backupCorpus(CONTENT_DIR, "perfect-cycle-start");
  log(
    `guardrail baseline: cards=${healthBefore.cardCount} enriched=${healthBefore.enrichedCount} deep=${healthBefore.deepCount}`,
  );
  if (cycleBackup.ok) {
    log(`guardrail backup → ${cycleBackup.dir}`);
  }

  const report = {
    startedAt: new Date().toISOString(),
    aggressive,
    improvementOnly: true,
    healthBefore,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
    plan: existsSync(PLAN_PATH)
      ? JSON.parse(readFileSync(PLAN_PATH, "utf8"))
      : null,
    coverageBefore: auditPathCoverage(),
    phases: [],
  };

  log("=== expansion-perfection-cycle ===");
  log(formatBudgetLine(budgetSnapshot(PIPELINE_DIR)));
  log(`coverage before: ${JSON.stringify(report.coverageBefore)}`);
  report.tokenBudgetBefore = budgetSnapshot(PIPELINE_DIR);

  const phase0 = { id: "0-shelf-500", steps: [] };
  if (process.env.OPENAI_API_KEY?.trim()) {
    log(
      `\n→ encyclopedia shelf expand toward 500 (MA/CGMA, Tax/ACCA, FA/CFA, IFRS)`,
    );
    try {
      const { expandEncyclopediaShelves } = await import(
        "./expand-encyclopedia-shelves.mjs"
      );
      const shelfReport = await expandEncyclopediaShelves({
        argv: [
          "--until-target",
          `--rounds=${aggressive ? 12 : 4}`,
          `--batch=${aggressive ? 18 : 12}`,
        ],
      });
      phase0.steps.push({ step: "expand-encyclopedia-shelves", ...shelfReport });
    } catch (error) {
      phase0.steps.push({
        step: "expand-encyclopedia-shelves",
        ok: false,
        error: String(error?.message || error).slice(0, 400),
      });
      log(`shelf expand error: ${error?.message || error}`);
    }
  } else {
    log("⚠ skipping shelf expand (no OPENAI_API_KEY)");
  }
  report.phases.push(phase0);

  const breadthScripts = [
  "scripts/pipeline/publish-tax-encyclopedia.mjs",
  "scripts/pipeline/publish-domain-encyclopedia.mjs",
  "scripts/pipeline/publish-management-accounting.mjs",
  "scripts/pipeline/publish-frm-encyclopedia.mjs",
  "scripts/pipeline/publish-fa-encyclopedia.mjs",
  "scripts/pipeline/publish-crma-encyclopedia.mjs",
  "scripts/pipeline/publish-coso-encyclopedia.mjs",
];

  const phase1 = { id: "1-breadth", steps: [] };
  for (const script of breadthScripts) {
    const step = runNode(script, [], { required: false });
    phase1.steps.push({ script, ...step });
  }
  report.phases.push(phase1);
  report.coverageAfterBreadth = auditPathCoverage();
  log(`coverage after breadth: ${JSON.stringify(report.coverageAfterBreadth)}`);

  const pathScripts = [
    "scripts/pipeline/publish-ifrs-paths.mjs",
    "scripts/pipeline/publish-frm-paths.mjs",
    "scripts/pipeline/publish-fa-paths.mjs",
    "scripts/pipeline/publish-priority-domain-paths.mjs",
  ];
  const phase2 = { id: "2-paths", steps: [] };
  for (const script of pathScripts) {
    const step = runNode(script, [], { required: false });
    phase2.steps.push({ script, ...step });
  }
  report.phases.push(phase2);
  report.coverageAfterPaths = auditPathCoverage();
  log(`coverage after paths: ${JSON.stringify(report.coverageAfterPaths)}`);

  const phase3 = { id: "3-cross-body-generate", steps: [] };
  if (generateCount > 0 && process.env.OPENAI_API_KEY?.trim()) {
    log(`→ generate-cross-body-paths limit=${generateCount}`);
    const gen = await generateCrossBodyPaths({ limit: generateCount, dryRun: false });
    phase3.steps.push({ step: "generate-cross-body-paths", ...gen });
  } else {
    log("⚠ skipping cross-body generation (no OPENAI_API_KEY or --generate=0)");
  }
  report.phases.push(phase3);
  report.coverageAfterGenerate = auditPathCoverage();

  const phase4 = { id: "4-sustain-terms", steps: [] };
  phase4.steps.push(
    runNode("scripts/pipeline/sustain-bodies.mjs", [
      `--limit=${sustainLimit}`,
    ], { required: false }),
  );
  if (!aggressive) {
    phase4.steps.push(
      runNode("scripts/pipeline/terminology.mjs", [
        `--limit=${termsLimit}`,
        "--terms=6",
      ], { required: false }),
    );
  } else {
    log("⚠ skipping terminology in aggressive mode (memory-heavy)");
  }
  report.phases.push(phase4);

  const phase5 = { id: "5-enrich", steps: [], totalUpdated: 0 };
  if (process.env.OPENAI_API_KEY?.trim()) {
    for (let round = 0; round < enrichRounds; round += 1) {
      log(`enrich round ${round + 1}/${enrichRounds}`);
      const batch = await runBatch({
        limit: enrichLimit,
        argv: ["--path-first"],
      });
      phase5.steps.push({ round: round + 1, ...batch });
      phase5.totalUpdated += batch.updated;
      if (batch.updated === 0 || batch.remaining === 0) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  } else {
    log("⚠ skipping enrichment (no OPENAI_API_KEY)");
  }
  report.phases.push(phase5);

  // Learning circle republishes via teacher. Default OFF in aggressive cycles —
  // a circle after shelf expand previously wiped enriched OpenAI bodies.
  const phase6 = { id: "6-quality", steps: [] };
  const allowCircle =
    flag(argv, "--allow-circle") || process.env.ALLOW_LIBRARY_CIRCLE === "1";
  phase6.steps.push(
    runNode("scripts/pipeline/fill-spine-awareness.mjs", ["--limit=150"], {
      required: false,
    }),
  );
  phase6.steps.push(
    runNode("scripts/pipeline/repair-classifications.mjs", [], {
      required: false,
    }),
  );
  if (allowCircle) {
    phase6.steps.push(
      runNode("scripts/pipeline/circle.mjs", [`--cycles=${circleCycles}`], {
        required: false,
      }),
    );
  } else {
    log(
      "⚠ skipping library:circle (refuses silent corpus risk). Pass --allow-circle to enable.",
    );
    phase6.steps.push({ step: "circle", skipped: "needs --allow-circle" });
  }
  report.phases.push(phase6);

  const phase7 = { id: "7-report", steps: [] };
  phase7.steps.push(
    runNode("scripts/pipeline/progress-report.mjs", [], { required: false }),
  );
  report.phases.push(phase7);

  report.coverageAfter = auditPathCoverage();
  report.healthAfter = readLibraryHealth(CONTENT_DIR);
  report.finishedAt = new Date().toISOString();

  let gate;
  try {
    gate = assertLibraryImproved({
      before: healthBefore,
      after: report.healthAfter,
      context: "expansion-perfection-cycle",
      // Additions/enrichment count as success; flat is allowed if work was skip-only.
      allowRegression: false,
    });
    // Flat (no change) is acceptable when enrich/quota skipped; treat as ok if no drop.
    report.guardrail = gate;
  } catch (error) {
    report.guardrail = error.guardrail || {
      ok: false,
      regressions: [String(error.message || error)],
    };
    writeGuardrailReport(PIPELINE_DIR, {
      cycle: "expansion-perfection-cycle",
      ...report.guardrail,
      backup: cycleBackup,
    });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    log(`GUARDRAIL FAIL: ${error.message || error}`);
    if (cycleBackup?.ok && existsSync(join(cycleBackup.dir, "index.json"))) {
      atomicWriteFile(
        INDEX_PATH,
        readFileSync(join(cycleBackup.dir, "index.json"), "utf8"),
      );
      log(`restored index.json from ${cycleBackup.dir}`);
    }
    process.exitCode = 2;
    throw error;
  }

  writeGuardrailReport(PIPELINE_DIR, {
    cycle: "expansion-perfection-cycle",
    ...gate,
    backup: cycleBackup,
  });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    STATE_PATH,
    `${JSON.stringify(
      {
        lastRunAt: report.finishedAt,
        aggressive,
        coverageAfter: report.coverageAfter,
        enrichTotalUpdated: phase5.totalUpdated,
        healthBefore,
        healthAfter: report.healthAfter,
        guardrail: gate,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  log("=== done (improvement-only) ===");
  log(
    `health: cards ${healthBefore.cardCount}→${report.healthAfter.cardCount} enriched ${healthBefore.enrichedCount}→${report.healthAfter.enrichedCount} deep ${healthBefore.deepCount}→${report.healthAfter.deepCount}`,
  );
  log(`coverage after: ${JSON.stringify(report.coverageAfter)}`);
  log(`report: ${REPORT_PATH}`);
}

main().catch((error) => {
  log(`FATAL: ${error?.message || error}`);
  process.exitCode = 1;
});
