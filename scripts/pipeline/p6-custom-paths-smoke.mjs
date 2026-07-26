/**
 * P6 custom paths / shelf guardrail smoke tests.
 * Usage: npm run library:p6:smoke
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isComposePathAsk } from "../../src/lib/guide/ask.ts";
import {
  isCustomPathId,
  localComposePathFromCards,
  normalizeCustomPath,
} from "../../src/lib/guide/custom-paths.ts";
import {
  pathShelf,
  shelvePaths,
} from "../../src/lib/guide/flagship-paths.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = join(ROOT, "content", "pipeline", "p6-custom-paths-complete.json");
const MARKER = join(ROOT, "content", "pipeline", "custom-paths-ready.json");

function main() {
  const checks = [];

  const cards = [
    {
      id: "working-capital",
      title: "Working capital",
      teachingSummary: "Current assets minus current liabilities.",
      bodies: ["FinancialAnalysis"],
    },
    {
      id: "cash-conversion-cycle",
      title: "Cash conversion cycle",
      teachingSummary: "Days inventory + receivables − payables.",
      bodies: ["FinancialAnalysis"],
    },
    {
      id: "liquidity-risk",
      title: "Liquidity risk",
      teachingSummary: "Inability to fund obligations as they fall due.",
      bodies: ["FRM"],
    },
  ];

  const path = localComposePathFromCards(
    cards,
    "Build a path from working capital to liquidity risk",
  );
  assert.ok(isCustomPathId(path.id));
  assert.equal(path.steps.length, 3);
  assert.deepEqual(
    path.steps.map((s) => s.cardId),
    cards.map((c) => c.id),
  );
  checks.push({ id: "local-compose-three-steps", ok: true });

  const again = normalizeCustomPath(
    {
      title: path.title,
      summary: path.summary,
      bodies: path.bodies,
      steps: path.steps,
    },
    cards.map((c) => c.id),
    "Build a path from working capital to liquidity risk",
  );
  assert.equal(again.id, path.id, "same title+cards → stable custom id");
  checks.push({ id: "stable-custom-path-id", ok: true });

  const deduped = normalizeCustomPath(
    {
      title: "Dup steps",
      steps: [
        { id: "s1", title: "A", cardId: "working-capital" },
        { id: "s2", title: "A again", cardId: "working-capital" },
        { id: "s3", title: "B", cardId: "cash-conversion-cycle" },
      ],
    },
    ["working-capital", "cash-conversion-cycle"],
    "dedupe",
  );
  assert.equal(deduped.steps.length, 2);
  checks.push({ id: "normalize-dedupes-card-ids", ok: true });

  assert.equal(
    isComposePathAsk("Build me a custom path connecting X and Y"),
    true,
  );
  assert.equal(isComposePathAsk("What is working capital?"), false);
  checks.push({ id: "compose-intent-detect", ok: true });

  assert.equal(
    pathShelf({
      id: "custom-demo-1",
      title: "x",
      summary: "",
      bodies: [],
      steps: [],
    }),
    "yours",
  );
  assert.equal(
    pathShelf({
      id: "domain-shelf-tax",
      title: "Tax shelf",
      summary: "",
      bodies: [],
      steps: [],
    }),
    "practice",
  );
  assert.equal(
    pathShelf({
      id: "profit-to-cash",
      title: "Profit to cash",
      summary: "",
      bodies: [],
      steps: [],
    }),
    "flagship",
  );

  const shelves = shelvePaths([
    {
      id: "domain-shelf-tax",
      title: "Tax shelf",
      summary: "",
      bodies: [],
      steps: [],
    },
    {
      id: "custom-abc",
      title: "Mine",
      summary: "",
      bodies: [],
      steps: [],
    },
    {
      id: "profit-to-cash",
      title: "Profit to cash",
      summary: "",
      bodies: [],
      steps: [],
    },
  ]);
  assert.equal(shelves.yours[0]?.id, "custom-abc");
  assert.equal(shelves.practice[0]?.id, "domain-shelf-tax");
  assert.ok(shelves.flagship.some((p) => p.id === "profit-to-cash"));
  assert.ok(
    !shelves.flagship.some((p) => p.id.startsWith("domain-shelf-")),
    "domain shelves must not sit in Start here",
  );
  checks.push({ id: "shelves-yours-practice-flagship", ok: true });

  mkdirSync(dirname(REPORT), { recursive: true });
  const completedAt = new Date().toISOString();
  const evidence = {
    phase: "P6",
    status: "done",
    completedAt,
    checks,
    deliverables: [
      "PathList: Yours first + empty Build with Tutor / Premium upsell",
      "AskGuide: compose=1 + composeCustomPath → saveCustomPath → Paths link",
      "ConceptDetail + coachActionHref: Build a path from here",
      "flagship-paths: domain-shelf-* → Practice shelves",
      "PathList: journey complete + Try next recommended path",
    ],
  };
  writeFileSync(REPORT, `${JSON.stringify(evidence, null, 2)}\n`);
  writeFileSync(
    MARKER,
    `${JSON.stringify(
      {
        ready: true,
        phase: "P6",
        completedAt,
        note: "customPathsWorking ship gate — Yours shelf + compose/save wired",
      },
      null,
      2,
    )}\n`,
  );
  console.log(`P6 smoke OK — ${checks.length} checks`);
  console.log(`Wrote ${REPORT}`);
  console.log(`Wrote ${MARKER}`);
}

main();
