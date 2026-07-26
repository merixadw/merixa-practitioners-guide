/**
 * Verified ML agent progress snapshot.
 * Always re-measures the live corpus before printing — never report stale claims.
 *
 * Usage: node scripts/pipeline/progress-report.mjs
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureWeeklyTarget,
  verifyWeeklyTarget,
} from "./weekly-target.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const OUT_PATH = join(PIPELINE_DIR, "progress-report.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  mkdirSync(PIPELINE_DIR, { recursive: true });

  const index = readJson(join(CONTENT_DIR, "index.json"));
  const synthesis = readJson(join(PIPELINE_DIR, "synthesis.json"));
  const sustainReport = readJson(join(PIPELINE_DIR, "sustain-report.json"));
  const circleState = readJson(join(PIPELINE_DIR, "circle-state.json"));
  const existingTarget = readJson(join(PIPELINE_DIR, "weekly-target.json"));

  if (!index?.cards) {
    throw new Error("Missing content/index.json — cannot verify ML progress.");
  }

  const weeklyTarget = ensureWeeklyTarget({
    existing: existingTarget,
    index,
    synthesis,
    sustainReport,
  });
  const verification = verifyWeeklyTarget({
    weeklyTarget,
    index,
    synthesis,
    sustainReport,
  });

  // Persist fresh verification so the report matches disk.
  writeFileSync(
    join(PIPELINE_DIR, "weekly-target.json"),
    `${JSON.stringify(
      {
        ...weeklyTarget,
        status: verification.passed ? "verified" : "active",
        lastVerifiedAt: verification.verifiedAt,
        verifiedAt: verification.passed
          ? verification.verifiedAt
          : weeklyTarget.verifiedAt,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(PIPELINE_DIR, "weekly-verification.json"),
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );

  const checks = verification.checks ?? [];
  const passed = checks.filter((check) => check.pass);
  const failed = checks.filter((check) => !check.pass);

  const report = {
    generatedAt: new Date().toISOString(),
    verified: true,
    verificationMethod: "verifyWeeklyTarget against live content/index.json",
    weekId: weeklyTarget.weekId,
    weeklyPassed: verification.passed,
    weeklyScore: verification.score,
    corpus: {
      cards: index.cards.length,
      chunks: Array.isArray(index.chunks) ? index.chunks.length : null,
      concepts: synthesis?.stats?.concepts ?? null,
      gaps: synthesis?.stats?.gaps ?? verification.current?.gapCount ?? null,
      conflicts: verification.current?.conflicts ?? null,
      corroborated: verification.current?.corroborated ?? null,
      officialCoverage: verification.current?.officialCoverage ?? null,
      bodiesPresent: verification.current?.bodiesPresent ?? [],
    },
    circle: circleState
      ? {
          cycle: circleState.cycle ?? null,
          weekId: circleState.weekId ?? null,
          weekly: circleState.weekly ?? null,
          generatedAt: circleState.generatedAt ?? null,
        }
      : null,
    passedGoals: passed.map((check) => ({
      kind: check.kind,
      detail: check.detail,
    })),
    openGoals: failed.map((check) => ({
      kind: check.kind,
      detail: check.detail,
      reason: check.reason,
    })),
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`ML progress report (verified ${report.generatedAt})`);
  console.log(
    `Week ${report.weekId}: ${report.weeklyPassed ? "PASSED" : "IN PROGRESS"} · score ${(report.weeklyScore * 100).toFixed(0)}%`,
  );
  console.log(
    `Corpus: cards=${report.corpus.cards} concepts=${report.corpus.concepts ?? "n/a"} gaps=${report.corpus.gaps ?? "n/a"} conflicts=${report.corpus.conflicts ?? "n/a"} corroborated=${report.corpus.corroborated ?? "n/a"} official=${report.corpus.officialCoverage != null ? `${(report.corpus.officialCoverage * 100).toFixed(0)}%` : "n/a"}`,
  );
  console.log(
    `Bodies: ${(report.corpus.bodiesPresent || []).join(", ") || "none"}`,
  );
  if (report.circle) {
    console.log(
      `Circle: cycle=${report.circle.cycle ?? "n/a"} last=${report.circle.generatedAt ?? "n/a"}`,
    );
  }
  console.log(`Passed (${passed.length}):`);
  for (const check of passed) console.log(`  ✓ ${check.kind}: ${check.detail}`);
  console.log(`Open (${failed.length}):`);
  for (const check of failed) console.log(`  ✗ ${check.kind}: ${check.detail}`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
