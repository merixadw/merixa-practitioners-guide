/**
 * Weekly ML learning command.
 *
 * Creates (or continues) this week's learning target, runs learning-circle
 * cycles toward it, and fully verifies the live corpus against every goal.
 *
 * Usage:
 *   npm run library:week              # plan + pursue + verify (up to 5 cycles)
 *   npm run library:week -- --plan    # create/refresh target only
 *   npm run library:week -- --verify  # verify only (exit 1 if not met)
 *   npm run library:week -- --cycles=3
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import {
  ensureWeeklyTarget,
  focusAgendaOnWeeklyTarget,
  verifyWeeklyTarget,
} from "./weekly-target.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const TARGET_PATH = join(PIPELINE_DIR, "weekly-target.json");
const VERIFY_PATH = join(PIPELINE_DIR, "weekly-verification.json");
const AGENDA_PATH = join(PIPELINE_DIR, "agenda.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  return {
    planOnly: argv.includes("--plan"),
    verifyOnly: argv.includes("--verify"),
    cycles: (() => {
      const flag = argv.find((arg) => arg.startsWith("--cycles="));
      if (!flag) return 5;
      const value = Number(flag.split("=")[1]);
      return Number.isFinite(value) && value > 0
        ? Math.min(Math.floor(value), 12)
        : 5;
    })(),
  };
}

function loadArtifacts() {
  return {
    index: readJson(join(CONTENT_DIR, "index.json")),
    synthesis: readJson(join(PIPELINE_DIR, "synthesis.json")),
    sustainReport: readJson(join(PIPELINE_DIR, "sustain-report.json")),
    agenda: readJson(AGENDA_PATH),
    existingTarget: readJson(TARGET_PATH),
  };
}

function printTarget(target) {
  console.log(`Weekly target ${target.weekId} (${target.status})`);
  console.log(`  window: ${target.startsAt.slice(0, 10)} → ${target.endsAt.slice(0, 10)}`);
  for (const goal of target.goals) {
    console.log(
      `  • [${goal.kind}] ${goal.reason} (baseline ${goal.baseline} → target ${goal.target})`,
    );
  }
}

function printVerification(verification) {
  console.log(
    `Verification ${verification.weekId}: ${verification.passed ? "PASSED" : "NOT MET"} (score ${(verification.score * 100).toFixed(0)}%)`,
  );
  for (const check of verification.checks) {
    console.log(
      `  ${check.pass ? "✓" : "✗"} ${check.kind}: ${check.detail}`,
    );
  }
}

function runCircleOnce() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, "scripts", "pipeline", "circle.mjs"), "--cycles=1"],
      {
        cwd: ROOT,
        stdio: "inherit",
        env: process.env,
      },
    );
    child.on("exit", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`learning circle exited with code ${code}`));
    });
  });
}

function savePlanAndFocus(target, agenda, verification) {
  writeJson(TARGET_PATH, target);
  if (agenda) {
    const focused = focusAgendaOnWeeklyTarget(agenda, target, verification);
    writeJson(AGENDA_PATH, focused);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(PIPELINE_DIR, { recursive: true });

  let artifacts = loadArtifacts();
  if (!artifacts.index?.cards) {
    throw new Error("Missing content/index.json. Run npm run library:rebuild first.");
  }

  let target = ensureWeeklyTarget({
    existing: artifacts.existingTarget,
    index: artifacts.index,
    synthesis: artifacts.synthesis,
    sustainReport: artifacts.sustainReport,
  });
  printTarget(target);
  savePlanAndFocus(target, artifacts.agenda, null);

  if (args.planOnly) {
    console.log(`Wrote ${TARGET_PATH}`);
    return;
  }

  let verification = verifyWeeklyTarget({
    weeklyTarget: target,
    index: artifacts.index,
    synthesis: artifacts.synthesis,
    sustainReport: artifacts.sustainReport,
  });
  writeJson(VERIFY_PATH, verification);
  printVerification(verification);

  if (args.verifyOnly) {
    if (!verification.passed) process.exitCode = 1;
    return;
  }

  if (verification.passed) {
    target = { ...target, status: "verified", verifiedAt: verification.verifiedAt };
    writeJson(TARGET_PATH, target);
    console.log("Weekly target already fully verified.");
    return;
  }

  for (let cycle = 1; cycle <= args.cycles; cycle += 1) {
    console.log(`\nWeekly pursue cycle ${cycle}/${args.cycles}`);
    savePlanAndFocus(target, readJson(AGENDA_PATH), verification);
    await runCircleOnce();

    artifacts = loadArtifacts();
    // Keep the same week's goals; only refresh status via verification.
    target = {
      ...target,
      status: "active",
    };
    verification = verifyWeeklyTarget({
      weeklyTarget: target,
      index: artifacts.index,
      synthesis: artifacts.synthesis,
      sustainReport: artifacts.sustainReport,
    });
    writeJson(VERIFY_PATH, verification);
    printVerification(verification);

    if (verification.passed) {
      target = {
        ...target,
        status: "verified",
        verifiedAt: verification.verifiedAt,
      };
      writeJson(TARGET_PATH, target);
      console.log(`Weekly target ${target.weekId} fully verified after ${cycle} cycle(s).`);
      return;
    }
  }

  target = { ...target, status: "active", lastVerifiedAt: verification.verifiedAt };
  writeJson(TARGET_PATH, target);
  console.log(
    `Weekly target ${target.weekId} not fully verified after ${args.cycles} cycle(s). Failed: ${verification.failed.join(", ") || "none"}`,
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
