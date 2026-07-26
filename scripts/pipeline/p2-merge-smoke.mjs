/**
 * P2 merge / relevance guardrail smoke tests.
 * Usage: npm run library:p2:smoke
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { needsTopicRelevanceRewrite } from "../lib/card-dedupe.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = join(ROOT, "content", "pipeline", "p2-merge-complete.json");

function main() {
  const checks = [];

  const longOffTopic = {
    id: "wc-1",
    title: "Working capital",
    teachingSummary:
      "Working capital covers Working capital in Financial management: what it means, how it is measured or tested, and how it changes a pack decision. " +
      "State the figure or qualitative conclusion, the evidence trail, and what would reverse the view this period. Bridge the concept to cash, risk, controls, or disclosure so owners can act — not a detached label. Keep the close narrative, control test, and board story consistent for the same period. " +
      "Extra padding to make this longer than the good rewrite that follows — impairment reversal concerning a CGU and carrying amount (CA) of a CGU do not belong here but historically won on length.",
    body: "padding ".repeat(80),
    workedExample: "Long wrong example ".repeat(40),
    qualityScore: 0.9,
  };

  assert.equal(needsTopicRelevanceRewrite(longOffTopic), true);
  checks.push({ id: "template-flagged-off-topic", ok: true });

  const shortOnTopic = {
    id: "wc-1",
    title: "Working capital",
    teachingSummary:
      "Working capital is current assets minus current liabilities. Practitioners track the cash conversion cycle, inventory days, and payables stretch so the board sees liquidity risk before covenants breach.",
    body: "Focus on receivables ageing and inventory turns in the monthly pack.",
    workedExample:
      "Receivables stretch 12 days; inventory +8 days; payables −5 days → CCC +15 days. Treasury flags a £4m revolver draw risk before quarter-end.",
    commonMistake: "Treating working capital as a balance-sheet plug without cash timing.",
    implicationIfIgnored: "Covenant headroom disappears mid-quarter.",
    realWorldTrigger: "CCC moves >10 days vs plan.",
    qualityScore: 0.82,
  };

  const relevance = preferImprovedCard(longOffTopic, shortOnTopic);
  assert.equal(relevance.action, "relevance-fix");
  assert.match(relevance.card.teachingSummary, /current assets minus current liabilities/i);
  assert.doesNotMatch(relevance.card.teachingSummary, /covers Working capital in/i);
  assert.ok(
    relevance.card.teachingSummary.length < longOffTopic.teachingSummary.length,
  );
  checks.push({ id: "shorter-on-topic-beats-longer-off-topic", ok: true });

  const heuristicLong = {
    id: "lease-1",
    title: "Lease liability",
    teachingSummary:
      "Lease liability is the present value of unpaid lease payments. Discount at the incremental borrowing rate unless the rate implicit in the lease is readily determinable. Remeasure when payments or term change.",
    body: "x".repeat(900),
    workedExample: "y".repeat(500),
    qualityScore: 0.8,
  };
  const liveEnrich = {
    id: "lease-1",
    title: "Lease liability",
    teachingSummary:
      "A lease liability is the discounted obligation for fixed lease payments (and in-substance fixed), excluding short-term/low-value exemptions when applied.",
    body: "Remeasure for index resets and term options reasonably certain.",
    workedExample:
      "5-year lease, £120k/yr, IBR 5% → initial liability ~£519k. Year-2 index +3% remeasures the remaining payments.",
    enrichedAt: "2026-07-23T00:00:00.000Z",
    qualityScore: 0.88,
  };
  const enrichMerge = preferImprovedCard(heuristicLong, liveEnrich);
  assert.ok(
    enrichMerge.action === "enrich-upgrade" || enrichMerge.action === "upgrade",
  );
  assert.equal(enrichMerge.card.enrichedAt, liveEnrich.enrichedAt);
  assert.match(enrichMerge.card.teachingSummary, /discounted obligation/i);
  assert.ok(
    !enrichMerge.card.teachingSummary.includes("x".repeat(50)),
  );
  checks.push({ id: "enrichedAt-beats-longer-heuristic", ok: true });

  const report = {
    phase: "P2",
    status: "done",
    completedAt: new Date().toISOString(),
    checks,
  };
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
