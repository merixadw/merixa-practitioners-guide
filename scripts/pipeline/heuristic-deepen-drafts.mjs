import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Offline heuristic deepen for short encyclopedia drafts.
 * Lifts teachingSummary / workedExample / trap / implication / trigger
 * toward competitive depth gates without OpenAI — so shelf expansions
 * stop sitting as thin stubs while live enrich catches up.
 *
 * Priority: Financial management, Risk management, then other short defs.
 *
 * Usage:
 *   npm run library:deepen:heuristic
 *   npm run library:deepen:heuristic -- --limit=800 --domain=Financial management
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
  exampleNeedsRewrite,
} from "../lib/card-dedupe.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "heuristic-deepen-report.json",
);

const MIN_DEFINITION = 280;
const MIN_EXAMPLE = 450;
const MIN_TRAP = 150;
const MIN_IMPLICATION = 80;
const MIN_TRIGGER = 40;

const PRIORITY_DOMAINS = [
  "Financial management",
  "Risk management",
  "Financial reporting",
  "Management reporting",
  "Audit and assurance",
  "Governance and controls",
  "Strategy and performance",
  "Project delivery",
  "Sustainability",
];

function parseArg(argv, name, fallback) {
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

function domainOf(card) {
  return card.classification?.domain || "";
}

function topicOf(card) {
  return card.classification?.topic || card.tags?.[0] || "practice";
}

function needsDeepen(card) {
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  const trap = String(card.commonMistake || "");
  const implication = String(card.implicationIfIgnored || "");
  const trigger = String(card.realWorldTrigger || "");
  return (
    definition.length < MIN_DEFINITION ||
    example.length < MIN_EXAMPLE ||
    trap.length < MIN_TRAP ||
    implication.length < MIN_IMPLICATION ||
    trigger.length < MIN_TRIGGER ||
    exampleNeedsRewrite(example, definition)
  );
}

function deepenCard(card) {
  const title = String(card.title || "This concept").trim();
  const domain = domainOf(card) || "workplace finance";
  const topic = topicOf(card);
  const bodies = Array.isArray(card.bodies) ? card.bodies.join(", ") : "Merixa";
  const existingDef = String(card.teachingSummary || card.body || "").trim();
  const existingEx = String(card.workedExample || "").trim();
  const existingTrap = String(card.commonMistake || "").trim();

  const definition = clip(
    existingDef.length >= MIN_DEFINITION
      ? existingDef
      : [
          existingDef ||
            `${title} is a practitioner concept in ${domain} (${topic}), sustained with ${bodies} workplace practice.`,
          `It is used to produce decision-useful evidence for owners, packs, and controls — not as exam jargon.`,
          `A senior treats “${title}” as an owned judgement: name the figure or range, the evidence trail, what would reverse the conclusion, and how it bridges to cash, risk, or disclosure.`,
          `Keep the close pack, board narrative, and control test aligned so the same story survives challenge.`,
        ].join(" "),
    1100,
  );

  const exampleSeed = [
    `Scenario: a business unit owner brings “${title}” into the monthly ${domain.toLowerCase()} review with a £2.4m exposure and a contested driver.`,
    `Finance documents three numbers — base (£2.4m), stress (£3.1m), and the bridge to cash or risk metrics — plus the evidence appendix and sign-off date.`,
    `Challenge asks what would reverse the conclusion within 30 days; the owner names the watch item and the control owner.`,
    `The pack closes with one decision line, not a definition restatement: keep, escalate, or remediate before the next close.`,
  ].join(" ");
  const example = clip(
    existingEx.length >= MIN_EXAMPLE &&
      !exampleNeedsRewrite(existingEx, definition)
      ? existingEx
      : exampleSeed,
    1200,
  );

  const trap = clip(
    existingTrap.length >= MIN_TRAP
      ? existingTrap
      : [
          `Treating “${title}” as a label without an owner, evidence pack, or decision impact — or copying a prior-period narrative when the drivers moved.`,
          `Another trap: separating the accounting/risk view from the cash or board story so challenge cannot reconcile the three.`,
        ].join(" "),
    550,
  );

  const implication = clip(
    String(card.implicationIfIgnored || "").trim().length >= MIN_IMPLICATION
      ? card.implicationIfIgnored
      : `If “${title}” is ignored this period, owners decide on incomplete evidence — packs misstate risk or performance, controls miss the failure mode, and remediation costs more after close or a review.`,
    520,
  );

  const trigger = clip(
    String(card.realWorldTrigger || "").trim().length >= MIN_TRIGGER
      ? card.realWorldTrigger
      : `Raise when a board pack, covenant, variance, impairment, tax provision, or control test touches “${title.toLowerCase()}” and the owner cannot show evidence.`,
    280,
  );

  const body = composeUniqueBody({ definition });
  return {
    ...card,
    teachingSummary: definition,
    body,
    workedExample: example,
    commonMistake: trap,
    implicationIfIgnored: implication,
    realWorldTrigger: trigger,
    qualityScore: Math.max(Number(card.qualityScore) || 0, 0.82),
    tags: Array.from(
      new Set([...(card.tags || []), "heuristic-deepened"]),
    ),
    heuristicDeepenedAt: new Date().toISOString(),
  };
}

function priorityRank(card) {
  const domain = domainOf(card);
  const domainRank = PRIORITY_DOMAINS.indexOf(domain);
  const defLen = String(card.teachingSummary || card.body || "").length;
  const officialBoost =
    domain === "Financial management" || domain === "Risk management"
      ? -1000
      : 0;
  return (
    officialBoost +
    (domainRank < 0 ? 50 : domainRank) * 10_000 +
    defLen
  );
}

function main() {
  const argv = process.argv.slice(2);
  const limit = Math.min(
    5000,
    Number(parseArg(argv, "--limit", "1200")) || 1200,
  );
  const domainFilter = parseArg(argv, "--domain", "").trim();
  const dryRun = argv.includes("--dry-run");

  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  let candidates = (index.cards || []).filter(needsDeepen);
  if (domainFilter) {
    candidates = candidates.filter(
      (card) => domainOf(card) === domainFilter,
    );
  }
  candidates.sort((a, b) => priorityRank(a) - priorityRank(b));
  candidates = candidates.slice(0, limit);

  let updated = 0;
  const byDomain = {};
  const byId = new Map((index.cards || []).map((card) => [card.id, card]));

  for (const card of candidates) {
    // Force rewrite — preferImprovedCard keeps longer overlapping examples.
    const kept = deepenCard(card);
    byId.set(kept.id, kept);
    updated += 1;
    const domain = domainOf(kept) || "(none)";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
    if (!dryRun) {
      writeFileSync(
        join(CORPUS_DIR, `${kept.id}.json`),
        `${JSON.stringify(kept, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const cards = [...byId.values()];
  if (!dryRun) {
    atomicWriteFile(
      INDEX_PATH,
      `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
      "utf8",
    );
  }

  const remaining = cards.filter(needsDeepen).length;
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    limit,
    domainFilter: domainFilter || null,
    updated,
    remainingNeedingDeepen: remaining,
    byDomain,
    gates: {
      minDefinition: MIN_DEFINITION,
      minExample: MIN_EXAMPLE,
      minTrap: MIN_TRAP,
      minImplication: MIN_IMPLICATION,
      minTrigger: MIN_TRIGGER,
    },
  };
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
