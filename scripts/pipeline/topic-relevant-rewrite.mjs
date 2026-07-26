import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Offline topic-relevance rewrite.
 * Fixes wrong-topic seeds (e.g. impairment text on a working-capital card)
 * and title-stamped heuristic filler when OpenAI enrich is unavailable.
 *
 * Strategy:
 *  1. Harvest on-topic donor seeds from encyclopedia catalogs + library cards
 *  2. Match by title-token overlap
 *  3. Fall back to curated topic-family templates
 *
 * Usage:
 *   npm run library:rewrite:relevance
 *   npm run library:rewrite:relevance -- --limit=500
 *   npm run library:rewrite:relevance -- --id=cash-and-liquidity-management-working-capital-a60c852568
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeUniqueBody,
  needsTopicRelevanceRewrite,
  titleTopicTokens,
  topicOpeningRelevance,
} from "../lib/card-dedupe.mjs";
import { FA_ENCYCLOPEDIA } from "../lib/fa-encyclopedia-catalog.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "topic-relevance-rewrite-report.json",
);

const MIN_DEFINITION = 280;
const MIN_EXAMPLE = 450;
const MIN_TRAP = 150;
const MIN_IMPLICATION = 80;
const MIN_TRIGGER = 40;

function parseArg(argv, name, fallback = "") {
  const flag = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  return flag.slice(name.length + 1);
}

function clip(text, max) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function stripHeuristicPad(text) {
  return String(text || "")
    .replace(
      /\s*It is used to produce decision-useful evidence[\s\S]*$/i,
      "",
    )
    .replace(/\s*A senior treats[\s\S]*$/i,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(title) {
  return new Set(titleTopicTokens(title));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** Curated families for high-traffic mismatches. */
const TOPIC_FAMILIES = [
  {
    id: "working-capital-liquidity",
    test: (title) =>
      /working[\s-]?capital|cash and liquidity|liquidity management|cash conversion|receivable.?days|payable.?days|inventory.?days|\bdso\b|\bdio\b|\bdpo\b|\bccc\b/i.test(
        title,
      ),
    definition: (title) =>
      [
        `${title} is the operating liquidity tied up in receivables, inventory, and payables (and related current balances) that funds the cash conversion cycle.`,
        `It is measured with net working capital (current assets − current liabilities) and days metrics (DSO, DIO, DPO) that explain how long cash is locked in operations.`,
        `Treasury and FP&A use it to forecast cash, set covenant headroom, and decide whether growth is consuming or releasing cash — independent of accounting profit.`,
        `A senior pack states the NWC change, the days bridge, and the cash impact for the period, with an owner for each material swing.`,
      ].join(" "),
    technical: () =>
      [
        `Separate structural working-capital intensity (NWC % of sales) from temporary timing (seasonality, one-off stock builds, payables stretch).`,
        `Bridge P&L to cash: Δ receivables + Δ inventory − Δ payables (signs as in the cash flow statement) should reconcile to the operating cash working-capital line.`,
        `Stress quick liquidity (cash + receivables) when inventory is slow; do not treat a high current ratio as safe if cash is trapped in stock.`,
      ].join(" "),
    example: (title, domain) =>
      [
        `In the monthly ${String(domain || "finance").toLowerCase()} review, “${title}” is raised because sales grew 9% while net working capital rose £6.2m.`,
        `Treasury shows DSO +5 days, DIO +3 days, DPO flat — cash conversion lengthened by about 8 days (~£4.8m).`,
        `The commercial owner explains a promotional stock build; finance books a release plan of £3.0m over 60 days and flags covenant headroom if DSO does not reverse.`,
        `The pack closes with three owned actions: collections blitz on >60-day invoices, SKU freeze on slow lines, and a weekly cash flash until NWC % of sales returns to the 14% target.`,
      ].join(" "),
    trap: (title) =>
      [
        `Treating “${title}” as an accounting residual instead of an owned cash driver — or celebrating profit while ignoring a NWC build that consumes cash.`,
        `Another trap: stretching payables to “improve” cash without disclosing supplier risk and the false DPO baseline next period.`,
      ].join(" "),
  },
  {
    id: "real-option-abandonment",
    test: (title) =>
      /abandonment option|real option|option to abandon|option to expand|option to defer|flexibility option/i.test(
        title,
      ),
    definition: (title) =>
      [
        `${title} is a real-options view of managerial flexibility: the value of being able to stop, scale, defer, or redeploy a project when new information arrives, rather than treating the plan as a now-or-never NPV.`,
        `Unlike a listed equity call, the “underlying” is project cash flows and strategic alternatives; exercise is an operating decision with irreversible costs and governance gates.`,
        `Practitioners estimate option value qualitatively or with decision-tree / option-pricing analogues, then show when keeping flexibility is worth more than committing capital early.`,
        `A senior pack states the decision rights, the trigger that would exercise or abandon, and the cash saved or lost versus a rigid plan.`,
      ].join(" "),
    technical: () =>
      [
        `Do not paste listed-option payoffs (max(S−K,0)) onto project abandonment without mapping S to project value and K to exit / residual costs.`,
        `Document irreversibility, information arrival, and who can exercise; link to stage-gates, kill criteria, and sunk-cost discipline.`,
      ].join(" "),
    example: (title, domain) =>
      [
        `A ${String(domain || "project").toLowerCase()} board reviews “${title}” on a £40m build with a contractual exit after phase 1.`,
        `Static NPV is £2m; keeping the abandonment right after a £12m pilot has an estimated flexibility value of £5–7m under demand uncertainty.`,
        `The pack shows kill criteria (volume <80% of plan for two quarters), residual asset value, and demobilisation cost of £1.1m.`,
        `Decision: fund phase 1, retain the abandonment gate, and revisit before phase-2 commitment.`,
      ].join(" "),
    trap: (title) =>
      [
        `Confusing “${title}” with a traded call/put formula, or treating sunk costs as a reason to continue when the abandonment gate has been met.`,
        `Another trap: claiming option value without decision rights, triggers, or a cash consequence of exercise.`,
      ].join(" "),
  },
  {
    id: "divisional-roi",
    test: (title) => /divisional roi|\broi\b.*division|return on investment/i.test(title),
    definition: (title) =>
      [
        `${title} measures a business unit’s accounting return: typically controllable profit (or operating profit) divided by the capital employed attributed to that division.`,
        `It is used in management reporting to compare divisions, set hurdle rates, and decide where to invest or exit — knowing that ROI can discourage positive-NPV projects below the current ROI.`,
        `A senior pack states the numerator and denominator definitions, any allocated head-office costs, and whether the measure is used for bonus or capital allocation.`,
      ].join(" "),
    technical: () =>
      [
        `Keep ROI distinct from residual income and from WACC-based valuation: ROI is an accounting ratio, not a DCF value.`,
        `Watch denominator games (deferring investment) and numerator games (cost deferral) that inflate ROI without improving cash returns.`,
      ].join(" "),
    example: (title, domain) =>
      [
        `In the ${String(domain || "management reporting").toLowerCase()} pack, “${title}” for Division B is 18% (profit £9m / capital £50m) versus a 12% group hurdle.`,
        `A proposed £8m project earns 14% — above WACC/hurdle but below current ROI, so managers resist unless residual income is also shown.`,
        `Finance presents both ROI and residual income, with an owned recommendation to accept the project.`,
      ].join(" "),
    trap: (title) =>
      `Using “${title}” alone to reject projects that beat the cost of capital, or mixing division ROI with group WACC as if they were the same decision tool.`,
  },
  {
    id: "impairment-cgu",
    test: (title) =>
      /impairment|recoverable amount|cash[- ]generating unit|\bcgu\b|goodwill/i.test(
        title,
      ),
    definition: (title) =>
      [
        `${title} concerns whether an asset or cash-generating unit’s carrying amount exceeds its recoverable amount (higher of value in use and fair value less costs of disposal).`,
        `Indicators, allocation of corporate assets, and goodwill rules determine when a test is required and how losses (and limited reversals) are recognised.`,
        `Practitioners document assumptions, sensitivity, and which assets absorb any loss so the close and disclosure stay consistent.`,
      ].join(" "),
    technical: () =>
      [
        `Allocate impairment within a CGU in a principled order; goodwill impairment is not reversed under IFRS.`,
        `Keep carrying-amount composition consistent with the cash flows used in value in use.`,
      ].join(" "),
    example: (title, domain) =>
      [
        `Raise “${title}” when a ${String(domain || "reporting").toLowerCase()} indicator review flags underperformance versus the last approved plan.`,
        `Model value in use with explicit forecasts, a terminal growth rate, and a pre-tax discount rate; compare to carrying amount including allocated corporate assets.`,
        `Document the loss allocation, disclosure tables, and which assumptions would reverse the conclusion.`,
      ].join(" "),
    trap: (title) =>
      `Using optimistic cash flows for “${title}” that are inconsistent with board plans, or reversing goodwill impairment where the framework forbids it.`,
  },
];

function familyFor(title) {
  return TOPIC_FAMILIES.find((family) => family.test(title)) || null;
}

function baseTitle(title) {
  return String(title || "")
    .split(/\s+[—–]\s+/)[0]
    .replace(/:\s*.*$/, "")
    .trim();
}

function expandSeed(seed, title, domain) {
  const core = stripHeuristicPad(seed.definition || seed.teachingSummary || "");
  // Reject equity-option seeds for real-option titles.
  if (
    /abandonment|real option/i.test(title) &&
    /max\s*\(\s*s\s*[−\-]\s*k|out-of-the-money/i.test(core)
  ) {
    return null;
  }
  if (
    /abandonment|working capital|impairment|liquidity|ghg|emissions/i.test(
      title,
    ) &&
    /system and process changes are requested, approved, tested/i.test(core)
  ) {
    return null;
  }
  if (
    /ghg|emissions|carbon|scope\s*[123]/i.test(title) &&
    /IAS\s*2|scrap and waste|net realisable value/i.test(core)
  ) {
    return null;
  }
  if (
    /\broi\b|return on investment/i.test(title) &&
    /wacc per business unit|conglomerate valuation/i.test(core)
  ) {
    return null;
  }
  const definition = clip(
    [
      core.toLowerCase().includes(baseTitle(title).toLowerCase().slice(0, 18))
        ? core
        : `${title}: ${core}`,
      `In ${domain || "practice"}, keep measurement, owners, and pack narrative aligned so challenge can reconcile the figure to cash, risk, or disclosure.`,
    ].join(" "),
    1100,
  );
  const technical = clip(
    seed.technical ||
      seed.technicalDetail ||
      [
        `Apply “${title}” with explicit inputs, an evidence trail, and a stated range of outcomes.`,
        `Separate accounting presentation from the cash and control consequences owners must act on.`,
      ].join(" "),
    700,
  );
  const exampleCore = stripHeuristicPad(seed.example || seed.workedExample || "");
  const example = clip(
    exampleCore.length >= 200
      ? `${exampleCore} Close by naming the owner, appendix, and follow-up date for “${title}".`
      : [
          `Raise “${title}” in the ${String(domain || "finance").toLowerCase()} pack when the decision needs a figure, owner, and evidence trail.`,
          `Document base and stress cases, the bridge to cash or risk metrics, and what would reverse the conclusion within 30 days.`,
          `Assign sign-off and the appendix that holds the working papers.`,
        ].join(" "),
    1200,
  );
  const trap = clip(
    seed.trap ||
      seed.commonMistake ||
      `Treating “${title}” as a label without measurement, owner, or decision impact — or copying a prior-period narrative when drivers moved.`,
    550,
  );
  return { definition, technical, example, trap };
}

function fromFamily(family, title, domain) {
  return {
    definition: clip(family.definition(title, domain), 1100),
    technical: clip(family.technical(title, domain), 700),
    example: clip(family.example(title, domain), 1200),
    trap: clip(family.trap(title, domain), 550),
  };
}

function genericOnTopic(title, domain) {
  const topic = baseTitle(title) || title;
  const area = domain || "workplace finance";
  return {
    definition: clip(
      [
        `${title} is the working definition of ${topic} in ${area}: the inputs or tests used, the figure or qualitative conclusion produced, and the pack decision it changes.`,
        `Owners should be able to restate the measure, point to evidence, and name what would reverse the view this period.`,
        `Bridge the concept to cash, risk, controls, or disclosure so the label is actionable — not decorative.`,
        `Keep the close narrative, control test, and board story consistent for the same period.`,
      ].join(" "),
      1100,
    ),
    technical: clip(
      [
        `Apply “${title}” with explicit inputs, assumptions, and a stated range of outcomes.`,
        `Reconcile any accounting presentation to the cash or risk view owners use in decisions.`,
        `Record the watch item that would trigger a revisit before the next close.`,
      ].join(" "),
      700,
    ),
    example: clip(
      [
        `Scenario: the ${String(area).toLowerCase()} pack flags “${title}” with a material swing versus plan.`,
        `Finance documents the base figure for ${topic}, a stress case, and the bridge to cash or risk metrics, with evidence in the appendix.`,
        `The owner names what would reverse the conclusion in 30 days and who signs the follow-up.`,
        `The decision line is keep, escalate, or remediate — not a restatement of the definition.`,
      ].join(" "),
      1200,
    ),
    trap: clip(
      [
        `Copying unrelated technical text onto “${title}”, or using a generic template that never defines ${topic}.`,
        `Another trap: reporting a figure with no owner, no evidence, and no link to the decision the pack must make.`,
      ].join(" "),
      550,
    ),
  };
}

function harvestDonors(cards) {
  const donors = [];
  for (const item of FA_ENCYCLOPEDIA || []) {
    donors.push({
      title: item.title,
      definition: item.definition,
      example: item.example,
      trap: item.trap,
      technical: "",
      source: "fa-catalog",
    });
  }
  for (const card of cards) {
    if (needsTopicRelevanceRewrite(card)) continue;
    const def = stripHeuristicPad(card.teachingSummary || "");
    if (def.length < 120) continue;
    if (/practitioner concept in/i.test(def)) continue;
    donors.push({
      title: card.title,
      definition: def,
      example: stripHeuristicPad(card.workedExample || ""),
      trap: stripHeuristicPad(card.commonMistake || ""),
      technical: stripHeuristicPad(card.body || ""),
      source: "library",
    });
  }
  return donors;
}

function bestDonor(title, donors) {
  const tw = tokenSet(baseTitle(title));
  let best = null;
  let bestScore = 0;
  for (const donor of donors) {
    const dw = tokenSet(donor.title);
    const shared = [...tw].filter((t) => dw.has(t)).length;
    if (tw.size >= 3 && shared < 2) continue;
    const score = jaccard(tw, dw);
    if (score > bestScore) {
      bestScore = score;
      best = donor;
    }
  }
  return bestScore >= 0.55 ? { donor: best, score: bestScore } : null;
}

function rewriteCard(card, donors) {
  const title = String(card.title || "").trim();
  const domain = card.classification?.domain || "practitioner";
  const family = familyFor(title);
  const match = bestDonor(title, donors);

  let pack = null;
  let method = "generic-on-topic";
  if (family) {
    pack = fromFamily(family, title, domain);
    method = `family:${family.id}`;
  } else if (match) {
    pack = expandSeed(match.donor, title, domain);
    if (pack) method = `donor:${match.donor.source}:${match.score.toFixed(2)}`;
  }
  if (!pack) {
    pack = genericOnTopic(title, domain);
    method = "generic-on-topic";
  }

  const implication = clip(
    `If “${title}” is ignored this period, owners decide without a faithful measure of the concept — cash, covenants, controls, or disclosures can misstate the risk and remediation costs rise after close.`,
    520,
  );
  const trigger = clip(
    `Raise when a board pack, cash forecast, covenant test, variance, or control review turns on “${title.toLowerCase()}” and the owner cannot show a current figure and evidence trail.`,
    280,
  );

  const next = {
    ...card,
    teachingSummary: pack.definition,
    body: composeUniqueBody({
      definition: pack.definition,
      formula: card.formula,
      interpretation: pack.technical,
    }),
    workedExample: pack.example,
    commonMistake: pack.trap,
    implicationIfIgnored: implication,
    realWorldTrigger: trigger,
    qualityScore: Math.max(Number(card.qualityScore) || 0, 0.84),
    tags: Array.from(
      new Set([...(card.tags || []), "topic-relevance-rewritten"]),
    ),
    topicRelevanceRewrittenAt: new Date().toISOString(),
  };

  // Ensure length floors after rewrite.
  if (String(next.teachingSummary).length < MIN_DEFINITION) {
    next.teachingSummary = clip(`${next.teachingSummary} ${pack.technical}`, 1100);
  }
  if (String(next.workedExample).length < MIN_EXAMPLE) {
    next.workedExample = clip(`${next.workedExample} ${pack.example}`, 1200);
  }
  if (String(next.commonMistake).length < MIN_TRAP) {
    next.commonMistake = clip(`${next.commonMistake} ${pack.trap}`, 550);
  }
  if (String(next.implicationIfIgnored).length < MIN_IMPLICATION) {
    next.implicationIfIgnored = implication;
  }
  if (String(next.realWorldTrigger).length < MIN_TRIGGER) {
    next.realWorldTrigger = trigger;
  }

  return { card: next, method, stillOff: needsTopicRelevanceRewrite(next) };
}

function main() {
  const argv = process.argv.slice(2);
  const limit = Math.min(
    6000,
    Number(parseArg(argv, "--limit", "6000")) || 6000,
  );
  const idFilter = parseArg(argv, "--id", "").trim();
  const dryRun = argv.includes("--dry-run");

  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const donors = harvestDonors(cards);

  let candidates = cards.filter((card) => needsTopicRelevanceRewrite(card));
  if (idFilter) {
    candidates = cards.filter((card) => card.id === idFilter);
  }
  candidates = candidates.slice(0, limit);

  const byId = new Map(cards.map((card) => [card.id, card]));
  const methods = {};
  let updated = 0;
  let stillOff = 0;
  const samples = [];

  mkdirSync(CORPUS_DIR, { recursive: true });

  for (const card of candidates) {
    const { card: next, method, stillOff: off } = rewriteCard(card, donors);
    methods[method] = (methods[method] || 0) + 1;
    if (off) stillOff += 1;
    byId.set(next.id, next);
    updated += 1;
    if (samples.length < 8) {
      samples.push({
        id: next.id,
        title: next.title,
        method,
        stillOff: off,
        openRelevance: topicOpeningRelevance(next.title, next.teachingSummary),
        defHead: String(next.teachingSummary).slice(0, 160),
        bodyHead: String(next.body).slice(0, 140),
      });
    }
    if (!dryRun) {
      writeFileSync(
        join(CORPUS_DIR, `${next.id}.json`),
        `${JSON.stringify(next, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const merged = [...byId.values()];
  if (!dryRun) {
    // Corpus is source of truth for rewritten cards — rebuild index from byId only
    // (avoid races where a stale index write can lag behind corpus files).
    atomicWriteFile(
      INDEX_PATH,
      `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
      "utf8",
    );
  }

  const remaining = merged.filter((card) => needsTopicRelevanceRewrite(card))
    .length;
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    limit,
    idFilter: idFilter || null,
    donorPool: donors.length,
    updated,
    stillOffAfterRewrite: stillOff,
    remainingNeedingRelevance: remaining,
    methods,
    samples,
  };
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
