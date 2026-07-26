/**
 * Spend today's OpenAI token budget safely across the three Guide jobs:
 *   1. Library enrich (path-first + thin shelf cards) — majority of tokens
 *   2. Tutor consistency sample checks
 *   3. Continuous improvement (light shelf top-up / generate if budget remains)
 *
 * Default budget: 200_000 tokens/day with 10_000 reserve.
 *
 * Usage:
 *   npm run library:daily-spend
 *   npm run library:daily-spend -- --status
 *   npm run library:daily-spend -- --enrich-only
 *   npm run library:token-budget
 */
import {
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/load-env.mjs";
import {
  DEFAULT_ALLOCATION,
  JOBS,
  budgetSnapshot,
  formatBudgetLine,
  jobRemaining,
  loadBudgetState,
  maxCallsAllowed,
  remainingSpendable,
} from "../lib/token-budget.mjs";
import { runBatch } from "./enrich-library.mjs";
import { runTutorConsistencyCheck } from "./tutor-consistency-check.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const REPORT_PATH = join(PIPELINE_DIR, "daily-token-spend-report.json");

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback) {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function printStatus() {
  const snap = budgetSnapshot(PIPELINE_DIR);
  console.log("\n=== OpenAI daily token budget ===");
  console.log(formatBudgetLine(snap));
  console.log(`reserve held back: ${snap.reserve}`);
  for (const [job, info] of Object.entries(snap.jobs)) {
    console.log(
      `  ${job}: used ${info.used}/${info.allocated} (~${info.maxCallsLeft} calls left @~${info.estimatePerCall})`,
    );
  }
  return snap;
}

/**
 * If shelves are at target, flex unused shelf allocation into enrich.
 */
function flexEnrichCap(state, baseCap) {
  const shelfLeft = jobRemaining(state, JOBS.shelves);
  const enrichLeft = jobRemaining(state, JOBS.enrich);
  const flex = Math.floor(shelfLeft * 0.85);
  const globalLeft = remainingSpendable(state);
  const tokensForEnrich = Math.min(globalLeft, enrichLeft + flex);
  const estimate = 2_800;
  const byTokens = Math.floor(tokensForEnrich / estimate);
  return Math.max(0, Math.min(baseCap, byTokens));
}

async function main() {
  const argv = process.argv.slice(2);
  mkdirSync(PIPELINE_DIR, { recursive: true });

  if (flag(argv, "--status")) {
    printStatus();
    return;
  }

  const enrichOnly = flag(argv, "--enrich-only");
  const skipTutor = flag(argv, "--skip-tutor") || enrichOnly;
  const maxEnrichRounds = flagValue(argv, "--enrich-rounds", 6);
  const enrichBatch = flagValue(argv, "--enrich-limit", 40);
  const tutorSamples = flagValue(argv, "--tutor-samples", 8);

  const report = {
    startedAt: new Date().toISOString(),
    before: printStatus(),
    phases: [],
  };

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY required for daily spend");
    process.exitCode = 1;
    report.error = "no-openai-key";
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return;
  }

  // Phase A — Library enrich (highest ROI: deepen offline shelf cards)
  const enrichPhase = { id: "enrich", rounds: [], totalUpdated: 0 };
  for (let round = 0; round < maxEnrichRounds; round += 1) {
    const { state, disabled } = loadBudgetState(PIPELINE_DIR);
    const cap = disabled
      ? enrichBatch
      : flexEnrichCap(state, enrichBatch);
    if (cap <= 0) {
      enrichPhase.stopped = "budget";
      console.log("daily-spend: enrich stopped — budget remaining too low");
      break;
    }
    console.log(`\n→ enrich round ${round + 1}/${maxEnrichRounds} cap=${cap}`);
    const batch = await runBatch({
      limit: cap,
      argv: ["--path-first", "--path-only"],
    });
    enrichPhase.rounds.push(batch);
    enrichPhase.totalUpdated += batch.updated || 0;
    if (batch.budgetStopped || batch.updated === 0) break;
    if (batch.remaining === 0) break;
  }
  report.phases.push(enrichPhase);

  // Phase B — Tutor consistency (bounded sample)
  if (!skipTutor) {
    const { state, disabled } = loadBudgetState(PIPELINE_DIR);
    const tutorCalls = disabled
      ? tutorSamples
      : Math.min(
          tutorSamples,
          maxCallsAllowed(state, JOBS.tutor, { disabled }),
        );
    if (tutorCalls > 0) {
      console.log(`\n→ tutor consistency samples=${tutorCalls}`);
      try {
        const tutorReport = await runTutorConsistencyCheck({
          samples: tutorCalls,
        });
        report.phases.push({ id: "tutor", ...tutorReport });
      } catch (error) {
        report.phases.push({
          id: "tutor",
          ok: false,
          error: String(error?.message || error).slice(0, 400),
        });
      }
    } else {
      report.phases.push({ id: "tutor", skipped: "budget" });
    }
  }

  // Phase C — Light continuous: shelf top-up only if gap remains and budget left
  if (!enrichOnly) {
    const { state, disabled } = loadBudgetState(PIPELINE_DIR);
    const shelfCalls = disabled
      ? 1
      : maxCallsAllowed(state, JOBS.shelves, { disabled });
    if (shelfCalls > 0) {
      console.log("\n→ shelf expand (budget-capped, 1 round)");
      try {
        const { expandEncyclopediaShelves } = await import(
          "./expand-encyclopedia-shelves.mjs"
        );
        const shelfReport = await expandEncyclopediaShelves({
          argv: ["--rounds=1", "--batch=10"],
        });
        report.phases.push({ id: "shelves", ...shelfReport });
      } catch (error) {
        report.phases.push({
          id: "shelves",
          ok: false,
          error: String(error?.message || error).slice(0, 400),
        });
      }
    } else {
      report.phases.push({ id: "shelves", skipped: "budget-or-at-target" });
    }
  }

  report.after = printStatus();
  report.finishedAt = new Date().toISOString();
  report.allocationPolicy = DEFAULT_ALLOCATION;
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\ndaily-spend report → ${REPORT_PATH}`);
}

const isMain = process.argv[1]?.includes("daily-token-spend");
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
