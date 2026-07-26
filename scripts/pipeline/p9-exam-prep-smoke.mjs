/**
 * P9 Exam drill smoke tests.
 * Usage: npm run library:p9:smoke
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCoachPrompt,
  coachActionsForMode,
  isHeavyCoachAction,
  tutorSessionActions,
} from "../../src/lib/guide/coach-actions.ts";
import { detectTutorCostLane } from "../../src/lib/guide/professor-mode.ts";
import { CATALOG, PREMIUM_UPSELL_LABELS } from "../../src/lib/entitlements/products.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = join(ROOT, "content", "pipeline", "p9-exam-prep-complete.json");

function main() {
  const checks = [];

  const premiumActions = coachActionsForMode("premium");
  assert.ok(premiumActions.some((a) => a.id === "exam_drill"));
  checks.push({ id: "exam-drill-in-strip", ok: true });

  assert.equal(isHeavyCoachAction("exam_drill"), false);
  const prompt = buildCoachPrompt("exam_drill", {
    title: "Working capital",
    cardId: "wc-1",
    mode: "premium",
  });
  assert.match(prompt, /Exam drill/i);
  assert.match(prompt, /LOS-style/i);
  assert.doesNotMatch(prompt, /board-pack mini-artefact/i);
  assert.equal(detectTutorCostLane(prompt), "light");
  checks.push({ id: "exam-drill-light-lane", ok: true });

  const legacy = buildCoachPrompt("quiz", {
    title: "Working capital",
    cardId: "wc-1",
    mode: "premium",
  });
  assert.match(legacy, /Exam drill|LOS-style/i);
  checks.push({ id: "quiz-aliases-exam-drill", ok: true });

  const examFirst = tutorSessionActions("premium", "exam");
  assert.equal(examFirst[0]?.id, "exam_drill");
  const workplaceFirst = tutorSessionActions("premium", "workplace");
  assert.ok(workplaceFirst.some((a) => a.id === "exam_drill"));
  assert.notEqual(workplaceFirst[0]?.id, "exam_drill");
  checks.push({ id: "focus-reorders-exam", ok: true });

  assert.ok(PREMIUM_UPSELL_LABELS.includes("Exam drill"));
  assert.ok(
    CATALOG.aiPremium.features.some((f) => /Exam drill/i.test(f)),
  );
  checks.push({ id: "catalog-mentions-exam-drill", ok: true });

  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(
    REPORT,
    `${JSON.stringify(
      {
        phase: "P9",
        status: "done",
        completedAt: new Date().toISOString(),
        checks,
        deliverables: [
          "CoachActionId exam_drill — LOS-style Premium light lane",
          "Tutor Workplace | Exam drill focus (mpg-tutor-focus-v1)",
          "Saved → Exam drill; quiz deep-links alias to exam_drill",
          "workers/ask.js prompt v4 + Exam drill light routing",
          "Catalog / upsell labels mention Exam drill without renaming workplace brand",
        ],
        note: "Redeploy ask worker for prompt v4. Workplace At-work quality remains the primary brand.",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`P9 smoke OK — ${checks.length} checks`);
  console.log(`Wrote ${REPORT}`);
}

main();
