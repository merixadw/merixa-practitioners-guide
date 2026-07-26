/**
 * P7 retention-loop smoke tests.
 * Usage: npm run library:p7:smoke
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  finishThisWeekSuggestion,
  pathProgress,
  pathProgressLabel,
} from "../../src/lib/guide/path-progress.ts";
import {
  trialDaysRemaining,
  trialNudgeCopy,
  trialNudgePhase,
} from "../../src/lib/entitlements/trial-nudge.ts";
import {
  lockedSnapshot,
  withGuideUnlocked,
} from "../../src/lib/entitlements/store.ts";
import { isUnlockTrialPremium } from "../../src/lib/entitlements/types.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = join(ROOT, "content", "pipeline", "p7-retention-complete.json");

function main() {
  const checks = [];

  const path = {
    id: "demo-path",
    title: "Demo",
    summary: "s",
    bodies: ["Merixa"],
    steps: [
      { id: "s1", title: "One", summary: "", cardId: "a" },
      { id: "s2", title: "Two", summary: "", cardId: "b" },
      { id: "s3", title: "Three", summary: "", cardId: "c" },
    ],
  };

  const mid = pathProgress(path, ["a"], []);
  assert.equal(mid.opened, 1);
  assert.equal(mid.percent, 33);
  assert.equal(mid.complete, false);
  assert.equal(mid.nextStep?.cardId, "b");
  assert.match(pathProgressLabel(mid), /33%/);
  checks.push({ id: "path-percent", ok: true });

  const week = finishThisWeekSuggestion(mid, "fast");
  assert.ok(week && /finish this week/i.test(week));
  const quiet = finishThisWeekSuggestion(
    pathProgress(path, [], []),
    "steady",
  );
  assert.equal(quiet, null);
  checks.push({ id: "finish-this-week", ok: true });

  const unlocked = withGuideUnlocked(lockedSnapshot(), "preview");
  assert.equal(isUnlockTrialPremium(unlocked), true);
  assert.ok(unlocked.ai.kind === "premium" && unlocked.ai.expiresAt);
  const tenDays = new Date(Date.now() + 10 * 86400000).toISOString();
  const threeDays = new Date(Date.now() + 3 * 86400000).toISOString();
  const trialAt = (expiresAt) => ({
    ...unlocked,
    ai: { ...unlocked.ai, kind: "premium", expiresAt, fromUnlockTrial: true },
  });
  assert.equal(trialNudgePhase(trialAt(tenDays)), "day20");
  assert.equal(trialNudgePhase(trialAt(threeDays)), "day27");
  assert.equal(trialDaysRemaining(tenDays) >= 9, true);
  const copy = trialNudgeCopy("day27", 3);
  assert.match(copy.title, /Keep live coaching/i);
  assert.match(copy.stayLabel, /Offline/i);
  checks.push({ id: "trial-nudge-phases", ok: true });

  mkdirSync(dirname(REPORT), { recursive: true });
  const completedAt = new Date().toISOString();
  writeFileSync(
    REPORT,
    `${JSON.stringify(
      {
        phase: "P7",
        status: "done",
        completedAt,
        checks,
        deliverables: [
          "path-progress.ts: % complete, finish-this-week from habits pace",
          "ContinuePathHome + PathList: progress % + resume + week hint",
          "QuickCheckPrompt + check-streak: proof-of-learning streak",
          "TrialNudgeSheet day 20/27: Keep live vs Stay Offline equal weight",
          "WeeklyPathDigest: 3 cards + optional Web Notification opt-in",
          "Fair-use copy: pace resting (not out of product)",
        ],
      },
      null,
      2,
    )}\n`,
  );
  console.log(`P7 smoke OK — ${checks.length} checks`);
  console.log(`Wrote ${REPORT}`);
}

main();
