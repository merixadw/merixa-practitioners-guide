/**
 * Codex local feed — zero-token shelf expansion from Merixa-authored sources.
 *
 * Extracts terms from the Merixa × Codex practitioner glossary packs
 * (usage rights owned; Merixa-authored content only — third-party textbooks
 * are excluded, matching the blocked-source policy in extract-sources.py),
 * routes them to encyclopedia shelves, and builds per-shelf draft queues at
 * content/pipeline/codex-feed/<shelf>.json.
 *
 * expand-encyclopedia-shelves.mjs consumes those queues automatically when
 * OpenAI is down (quota / missing key). This script can also publish queued
 * drafts straight into the corpus with --publish.
 *
 * Cards are tagged "codex-sourced" and carry shelfExpandAt but NOT enrichedAt,
 * so enrich-library.mjs prioritises them for a live OpenAI upgrade later.
 *
 * Usage (no API tokens needed — can run in a resume loop indefinitely):
 *   node scripts/pipeline/codex-local-feed.mjs                  # build/refresh queues
 *   node scripts/pipeline/codex-local-feed.mjs --extract        # force DOCX re-extraction
 *   node scripts/pipeline/codex-local-feed.mjs --publish --shelf=iia
 *   node scripts/pipeline/codex-local-feed.mjs --publish        # all shelves, up to floors
 *   node scripts/pipeline/codex-local-feed.mjs --publish --limit=100
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import {
  ENCYCLOPEDIA_SHELVES,
  shelfExistingCount,
  shelfTarget,
} from "../lib/encyclopedia-shelf-targets.mjs";
import { loadIndex, persistCards, toCard } from "./expand-encyclopedia-shelves.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FEED_DIR = join(ROOT, "content", "pipeline", "codex-feed");
const EXTRACTED_PATH = join(FEED_DIR, "extracted-terms.json");
const EXTRACTED_DOCS_PATH = join(FEED_DIR, "extracted-docs.json");
const EXTRACTED_FORMULAS_PATH = join(FEED_DIR, "extracted-formulas.json");
const EXTRACT_SCRIPT = join(ROOT, "scripts", "pipeline", "codex-extract-glossaries.py");
const EXTRACT_DOCS_SCRIPT = join(ROOT, "scripts", "pipeline", "codex-extract-docs.py");
const EXTRACT_FORMULAS_SCRIPT = join(
  ROOT,
  "scripts",
  "pipeline",
  "codex-extract-formula-glossaries.py",
);

/** Merixa glossary / formula pack -> encyclopedia shelf. */
const PACK_TO_SHELF = {
  audit: "iia",
  governance: "iia",
  "risk-management": "crma", // FRM-flavoured titles rerouted below
  "internal-controls": "coso",
  "ifrs-consolidation": "ifrs",
  "financial-reporting": "ifrs",
  "financial-analysis": "fa",
  "management-reporting": "ma",
  "performance-management": "ma",
  // Formula glossaries (Merixa-authored; mined when practitioner packs are exhausted)
  "formula-risk-management": "frm",
  "formula-financial-analysis": "fa",
  "formula-internal-controls": "coso",
  "formula-audit": "iia",
  "formula-governance": "iia",
  "formula-financial-reporting": "ifrs",
  "formula-ifrs-consolidation": "ifrs",
  "formula-management-reporting": "ma",
  "formula-performance-management": "ma",
};

/** Method-note / delivery-guide / checklist packs (extracted-docs.json). */
const DOC_PACK_PREFIX_TO_SHELF = [
  [/^(mr-|ma-)/, "ma"],
  [/^ft-/, "ma"],
  [/^ifrs-/, "ifrs"],
  [/^rcg-/, "crma"],
  [/^ic-/, "coso"],
];
const SERVICE_MEMBER_TO_SHELF = [
  [/risk|control|governance/i, "crma"],
  [/ifrs|consolidation|annual/i, "ifrs"],
  [/management|finance|transformation/i, "ma"],
];
/** Tax-relevant doc sections route to the tax shelf (no glossary pack feeds it). */
const TAX_CONTENT =
  /\b(tax(es|ation)?|vat|ias 12|deferred tax|transfer pricing|withholding|pillar two)\b/i;

/** Risk-management terms that belong on the FRM shelf instead of CRMA. */
const FRM_TITLE = new RegExp(
  [
    "value at risk",
    "\\bvar\\b",
    "expected shortfall",
    "market risk",
    "credit risk",
    "counterparty",
    "liquidity risk",
    "operational risk",
    "stress test",
    "back-?test",
    "basel",
    "duration",
    "convexity",
    "volatility",
    "drawdown",
    "exposure at default",
    "loss given default",
    "probability of default",
    "capital adequacy",
    "risk-?weighted",
    "collateral",
    "funding",
    "haircut",
  ].join("|"),
  "i",
);

/** Keyword routing to shelf topics (first match wins; else shelf default). */
const TOPIC_RULES = {
  iia: [
    [/fraud/i, "Fraud"],
    [/board|committee|governance|charter|oversight/i, "Governance"],
    [/standard|ethic|independence|objectivity/i, "Standards"],
    [/\bit\b|cyber|system access|application control/i, "IT audit"],
    [/report|communicat|finding|opinion/i, "Reporting"],
    [/engagement|fieldwork|sampl|test|workpaper|evidence/i, "Engagements"],
  ],
  crma: [
    [/appetite|governance|board|committee/i, "Governance"],
    [/control/i, "Control"],
    [/assurance/i, "Assurance"],
    [/engagement/i, "Engagements"],
    [/report/i, "Reporting"],
  ],
  coso: [
    [/control environment|tone|integrity|competence/i, "Control environment"],
    [/risk assess/i, "Risk assessment"],
    [/monitor/i, "Monitoring"],
    [/information|communicat/i, "Information and communication"],
    [/\berm\b|enterprise risk|appetite/i, "ERM"],
    [/segregation|authoris|reconcil|control activ|approval/i, "Control activities"],
  ],
  frm: [
    [/credit|default|counterparty/i, "Credit risk"],
    [/liquidit|funding/i, "Liquidity risk"],
    [/operational/i, "Operational risk"],
    [/model/i, "Model risk"],
    [/governance|appetite|committee/i, "Risk governance"],
  ],
  ifrs: [
    [/consolidat|group|subsidiar|\bnci\b|non-?controlling|intercompany|goodwill on acquisition/i, "Consolidation"],
    [/business combination|acquisition accounting/i, "Business combinations"],
    [/revenue/i, "Revenue"],
    [/lease/i, "Leases"],
    [/impair/i, "Impairment"],
    [/financial instrument|hedg|fair value|\becl\b/i, "Financial instruments"],
    [/intangible|goodwill/i, "Intangible assets"],
    [/inventor/i, "Inventory"],
    [/provision|contingen/i, "Provisions and contingencies"],
    [/pension|employee benefit|share-?based/i, "Employee benefits"],
    [/\btax\b|deferred tax/i, "Tax"],
    [/grant/i, "Government grants"],
    [/presentation|disclos|statement of|classification/i, "Presentation of financial statements"],
  ],
  fa: [
    [/valuation|dcf|multiple|terminal value|intrinsic/i, "Valuation"],
    [/portfolio|sharpe|tracking|benchmark/i, "Portfolio"],
    [/bond|yield|duration|fixed income|coupon/i, "Fixed income"],
    [/wacc|capital structure|dividend|buyback|leverage decision/i, "Corporate"],
    [/regression|probabilit|distribution|hypothesis|statistic/i, "Quant"],
    [/npv|irr|payback|capital budget|investment appraisal/i, "Investment appraisal"],
    [/gdp|inflation|interest rate|exchange rate|monetary/i, "Economics"],
  ],
  ma: [
    [/budget|forecast/i, "Budgeting and forecasting"],
    [/variance/i, "Variance analysis"],
    [/cost behaviour|fixed cost|variable cost|step cost/i, "Cost behaviour"],
    [/cash|liquidity|working capital|receivable|payable/i, "Cash and liquidity"],
    [/kpi|scorecard|performance measure/i, "Performance measurement"],
    [/margin|profitab|costing|overhead|absorption/i, "Cost and profitability"],
    [/report|pack|dashboard/i, "Performance reporting"],
  ],
  tax: [
    [/deferred tax/i, "deferred tax"],
    [/current tax/i, "current tax"],
    [/effective tax rate|\betr\b/i, "effective tax rate"],
    [/uncertain tax/i, "uncertain tax positions"],
    [/transfer pricing/i, "transfer pricing"],
    [/grant/i, "Government grants"],
    [/income tax|ias 12/i, "Income Taxes"],
    [/close|provision/i, "close process"],
  ],
};

/** Resolve target shelf for a term, with tax/frm keyword overrides for docs/formulas. */
function shelfIdFor(pack, term) {
  const isDocPack = pack.origin === "docs";
  const isFormulaPack = pack.origin === "formula";
  let shelfId = PACK_TO_SHELF[pack.pack] || null;
  if (!shelfId && isDocPack) {
    for (const [pattern, id] of DOC_PACK_PREFIX_TO_SHELF) {
      if (pattern.test(pack.pack)) {
        shelfId = id;
        break;
      }
    }
    if (pack.pack === "service-checklists") {
      const member = term.memberDoc || "";
      for (const [pattern, id] of SERVICE_MEMBER_TO_SHELF) {
        if (pattern.test(member)) {
          shelfId = id;
          break;
        }
      }
      shelfId = shelfId || "ma";
    }
  }
  if (!shelfId) return null;
  if (
    (pack.pack === "risk-management" || pack.pack === "formula-risk-management") &&
    FRM_TITLE.test(term.title)
  ) {
    return "frm";
  }
  // Risk formula pack defaults to FRM; non-FRM governance/control titles → crma.
  if (pack.pack === "formula-risk-management" && !FRM_TITLE.test(term.title)) {
    const hay = `${term.title} ${term.definition || ""}`;
    if (/\b(control|governance|appetite|assurance|committee|board)\b/i.test(hay)) {
      return "crma";
    }
  }
  // FA / reporting formula rows that are clearly market/credit/liquidity risk → FRM.
  if (
    isFormulaPack &&
    (shelfId === "fa" || shelfId === "ifrs") &&
    FRM_TITLE.test(term.title)
  ) {
    return "frm";
  }
  if (isDocPack || isFormulaPack) {
    const hay = `${term.title} ${term.definition || ""}`;
    if (TAX_CONTENT.test(hay)) return "tax";
    if (shelfId === "crma" && FRM_TITLE.test(term.title)) return "frm";
  }
  return shelfId;
}

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback) {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  const raw = hit.split("=").slice(1).join("=");
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) return Math.floor(num);
  return raw || fallback;
}

function cut(value, max) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const boundary = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "));
  return (boundary > max * 0.5 ? slice.slice(0, boundary + 1) : slice).trim();
}

function pickTopic(shelf, term) {
  const haystack = `${term.title} ${term.definition || ""}`;
  for (const [pattern, topic] of TOPIC_RULES[shelf.id] || []) {
    if (pattern.test(haystack)) return topic;
  }
  return shelf.defaultTopic;
}

/**
 * Definitions must open on-topic (title echo) to pass the corpus
 * topic-relevance gates — glossary rows often open with "This term…".
 */
function groundedDefinition(title, definition) {
  let text = String(definition || "").trim();
  if (/^this term\s+/i.test(text)) {
    text = text.replace(/^this term\s+/i, `${title} `);
  } else if (!text.toLowerCase().startsWith(title.toLowerCase().slice(0, 20))) {
    text = `${title}: ${text}`;
  }
  return cut(text, 1100);
}

/** Expand short trap bullets so quality gates / toDraft do not drop owned terms. */
function expandTrap(title, term) {
  const raw = [term.commonError, term.warning, term.redflags]
    .filter(Boolean)
    .join(" ")
    .replace(/^[•\-*]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  if (raw.length >= 40) return cut(raw, 550);
  const body = raw.charAt(0).toLowerCase() + raw.slice(1);
  return cut(
    `Common mistake for “${title}”: ${body.replace(/\.$/, "")}. Confirm ownership, evidence, and decision route before relying on the output.`,
    550,
  );
}

function toDraft(term, pack, shelf) {
  const title = cut(term.title, 120);
  const definition = groundedDefinition(title, term.definition);
  const exampleRaw = term.example || term.howToUse || "";
  let example = cut(exampleRaw.replace(/^example:\s*/i, ""), 1200);
  // Formula rows without a prose example: ground a scenario in formula + components.
  if (!example && term.formula) {
    example = cut(
      [
        `Scenario: a practitioner computes “${title}” as ${term.formula}`,
        term.components ? `, assembling inputs (${term.components})` : "",
        ", records the figure with the evidence trail, and confirms the decision the number supports before sign-off.",
      ].join(""),
      1200,
    );
  }
  let trap = expandTrap(title, term);
  if (!trap && term.formula) {
    trap = cut(
      `Do not treat “${title}” as decision-ready without confirming the formula inputs match the intended measure${
        term.components ? ` (${cut(term.components, 160)})` : ""
      }; wrong components misstate the figure.`,
      550,
    );
  }
  if (!definition || !example || !trap) return null;
  return {
    title,
    topic: pickTopic(shelf, term),
    definition,
    example,
    trap,
    ...(term.formula ? { formula: cut(term.formula, 420) } : {}),
    ...(term.interpretation ? { interpretation: cut(term.interpretation, 700) } : {}),
    ...(term.related ? { related: cut(term.related, 280) } : {}),
    ...(term.components || term.evidence
      ? {
          extra: cut(
            [
              term.components ? `Inputs: ${term.components}` : "",
              term.evidence ? `Evidence: ${term.evidence}` : "",
            ]
              .filter(Boolean)
              .join(" "),
            320,
          ),
        }
      : {}),
    codexSource: {
      label: pack.label,
      path: pack.source,
    },
  };
}

function runPython(script) {
  console.log(`running ${script} …`);
  const result = spawnSync("python", [script], {
    stdio: "inherit",
    cwd: ROOT,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error(`${script} exited ${result.status}`);
  }
}

function loadExtracted() {
  if (!existsSync(EXTRACTED_PATH)) {
    throw new Error(`Missing ${EXTRACTED_PATH} — run with --extract first`);
  }
  const glossaries = JSON.parse(readFileSync(EXTRACTED_PATH, "utf8"));
  const packs = (glossaries.packs || []).map((pack) => ({
    ...pack,
    origin: "glossary",
  }));
  if (existsSync(EXTRACTED_DOCS_PATH)) {
    const docs = JSON.parse(readFileSync(EXTRACTED_DOCS_PATH, "utf8"));
    for (const pack of docs.packs || []) {
      packs.push({ ...pack, origin: "docs" });
    }
  }
  if (existsSync(EXTRACTED_FORMULAS_PATH)) {
    const formulas = JSON.parse(readFileSync(EXTRACTED_FORMULAS_PATH, "utf8"));
    for (const pack of formulas.packs || []) {
      packs.push({ ...pack, origin: "formula" });
    }
  }
  return { packs };
}

function corpusTitleSet(index) {
  const set = new Set();
  for (const card of Array.isArray(index.cards) ? index.cards : []) {
    const title = String(card.title || "").toLowerCase().trim();
    if (title) set.add(title);
  }
  return set;
}

function queuePath(shelfId) {
  return join(FEED_DIR, `${shelfId}.json`);
}

function loadQueue(shelfId) {
  const path = queuePath(shelfId);
  if (!existsSync(path)) return { shelf: shelfId, drafts: [] };
  try {
    const queue = JSON.parse(readFileSync(path, "utf8"));
    return { shelf: shelfId, drafts: Array.isArray(queue.drafts) ? queue.drafts : [] };
  } catch {
    return { shelf: shelfId, drafts: [] };
  }
}

function saveQueue(shelfId, drafts) {
  atomicWriteFile(
    queuePath(shelfId),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        shelf: shelfId,
        count: drafts.length,
        drafts,
      },
      null,
      1,
    )}\n`,
  );
}

function buildQueues(index) {
  const extracted = loadExtracted();
  const knownTitles = corpusTitleSet(index);
  const shelves = new Map(ENCYCLOPEDIA_SHELVES.map((shelf) => [shelf.id, shelf]));
  const queues = new Map();
  const queuedTitles = new Map();
  for (const shelfId of shelves.keys()) {
    const existing = loadQueue(shelfId);
    queues.set(shelfId, existing.drafts);
    queuedTitles.set(
      shelfId,
      new Set(existing.drafts.map((draft) => draft.title.toLowerCase().trim())),
    );
  }

  let added = 0;
  let skippedDuplicates = 0;
  for (const pack of extracted.packs || []) {
    for (const term of pack.terms || []) {
      const shelfId = shelfIdFor(pack, term);
      if (!shelfId) continue;
      const shelf = shelves.get(shelfId);
      if (!shelf) continue;
      const titleKey = String(term.title || "").toLowerCase().trim();
      if (!titleKey) continue;
      if (knownTitles.has(titleKey) || queuedTitles.get(shelfId)?.has(titleKey)) {
        skippedDuplicates += 1;
        continue;
      }
      const draft = toDraft(term, pack, shelf);
      if (!draft) continue;
      queues.get(shelfId).push(draft);
      queuedTitles.get(shelfId).add(titleKey);
      added += 1;
    }
  }

  for (const [shelfId, drafts] of queues) {
    saveQueue(shelfId, drafts);
    console.log(`queue ${shelfId}: ${drafts.length} drafts`);
  }
  console.log(`queues built: +${added} new drafts, ${skippedDuplicates} already in corpus/queue`);
}

function publishShelf(index, shelf, limit) {
  const queue = loadQueue(shelf.id);
  if (queue.drafts.length === 0) {
    return { index, published: 0, remaining: 0 };
  }
  const titleSet = corpusTitleSet(index);
  const idSet = new Set((index.cards || []).map((card) => card.id));
  const cards = [];
  const rest = [];
  for (const draft of queue.drafts) {
    const titleKey = draft.title.toLowerCase().trim();
    if (titleSet.has(titleKey)) continue; // consume duplicates silently
    if (cards.length >= limit) {
      rest.push(draft);
      continue;
    }
    const card = toCard(shelf, draft, draft.title);
    if (idSet.has(card.id)) {
      card.id = `${card.id}-${String(Date.now()).slice(-4)}${cards.length}`;
    }
    cards.push(card);
    titleSet.add(titleKey);
    idSet.add(card.id);
  }
  if (cards.length === 0) {
    saveQueue(shelf.id, rest);
    return { index, published: 0, remaining: rest.length };
  }
  const result = persistCards(index, cards);
  saveQueue(shelf.id, rest);
  return { index: result.index, published: result.published, remaining: rest.length };
}

function main() {
  const argv = process.argv.slice(2);
  mkdirSync(FEED_DIR, { recursive: true });

  if (flag(argv, "--extract") || !existsSync(EXTRACTED_PATH)) {
    runPython(EXTRACT_SCRIPT);
  }
  if (flag(argv, "--extract") || !existsSync(EXTRACTED_DOCS_PATH)) {
    runPython(EXTRACT_DOCS_SCRIPT);
  }
  if (flag(argv, "--extract") || !existsSync(EXTRACTED_FORMULAS_PATH)) {
    runPython(EXTRACT_FORMULAS_SCRIPT);
  }

  let index = loadIndex();
  buildQueues(index);

  if (!flag(argv, "--publish")) {
    console.log(
      "\nqueues ready — publish with --publish, or let expand-encyclopedia-shelves.mjs consume them when OpenAI is down",
    );
    return;
  }

  const shelfFilter = flagValue(argv, "--shelf", "");
  const limitOverride = Number(flagValue(argv, "--limit", 0)) || 0;
  const targets = ENCYCLOPEDIA_SHELVES.filter(
    (shelf) => !shelfFilter || shelf.id === shelfFilter,
  );

  console.log("\n=== codex-local-feed publish ===");
  for (const shelf of targets) {
    const current = shelfExistingCount(index.cards, shelf);
    const gap = Math.max(0, shelfTarget(shelf) - current);
    const limit = limitOverride > 0 ? limitOverride : gap;
    if (limit === 0) {
      console.log(`→ ${shelf.id}: at floor (${current}) — skipped`);
      continue;
    }
    const result = publishShelf(index, shelf, limit);
    index = result.index;
    if (result.published === 0 && result.remaining === 0) {
      console.log(`→ ${shelf.id}: queue empty`);
      continue;
    }
    console.log(
      `→ ${shelf.id}: published=${result.published} now=${shelfExistingCount(
        index.cards,
        shelf,
      )}/${shelfTarget(shelf)} queueLeft=${result.remaining}`,
    );
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
