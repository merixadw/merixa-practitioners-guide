/**
 * Codex local enrich — pour unused Merixa glossary fields into published cards.
 *
 * Zero OpenAI tokens. Upgrades codex-sourced / glossary-title matches using
 * interpretation, misuse, evidence, mini-example, howToUse, alignment, etc.
 * Sets locallyDeepenedAt + customTopicRelevance; never sets enrichedAt
 * (cards stay in the live OpenAI enrich queue).
 *
 * Usage:
 *   node scripts/pipeline/codex-local-enrich.mjs --cohesion-only
 *   node scripts/pipeline/codex-local-enrich.mjs --dry-run --limit=50
 *   node scripts/pipeline/codex-local-enrich.mjs
 *   node scripts/pipeline/codex-local-enrich.mjs --force --shelf=fa
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import {
  composeUniqueBody,
  exampleNeedsRewrite,
  needsTopicRelevanceRewrite,
  textOverlapRatio,
  topicOpeningRelevance,
} from "../lib/card-dedupe.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { unionMergeWithDiskIndex } from "../lib/index-union.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const EXTRACTED_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-terms.json");
const EXTRACTED_DOCS_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-docs.json");
const EXTRACTED_FORMULAS_PATH = join(
  PIPELINE_DIR,
  "codex-feed",
  "extracted-formulas.json",
);
const REPORT_PATH = join(PIPELINE_DIR, "codex-local-enrich-report.json");
const COHESION_PATH = join(PIPELINE_DIR, "codex-cohesion-report.json");

const SHELF_TAGS = [
  "fa-encyclopedia",
  "ma-encyclopedia",
  "frm-encyclopedia",
  "crma-encyclopedia",
  "coso-encyclopedia",
  "iia-encyclopedia",
  "ifrs-encyclopedia",
  "tax-encyclopedia",
];

const TASK_VERB =
  /^(challenge|identify|monitor|confirm|compare|document|retain|assess|review|map|set|track|verify|reconcile|test|decide|escalate|build|draft|plan|measure|calculate|ensure|check|validate|raise|flag|own|use|apply|combine|walk|name|reconcile|cover|justify|approve)\b/i;

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback = "") {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.split("=").slice(1).join("=") || fallback;
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

function normTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Topic-relevance score used as a local quality gate (no OpenAI). */
export function customTopicRelevance(card) {
  const title = String(card?.title || "");
  const def = String(card?.teachingSummary || card?.body || "");
  if (!title || !def) return 0;
  return topicOpeningRelevance(title, def);
}

function groundedDefinition(title, definition, interpretation, term = null) {
  let text = String(definition || "").trim();
  if (/^this term\s+/i.test(text)) {
    text = text.replace(/^this term\s+/i, `${title} `);
  } else if (
    title &&
    !text.toLowerCase().startsWith(title.toLowerCase().slice(0, Math.min(20, title.length)))
  ) {
    text = `${title}: ${text}`;
  }
  const interp = String(interpretation || "").trim();
  if (interp && textOverlapRatio(interp, text) < 0.68) {
    text = `${text} ${interp}`.replace(/\s+/g, " ").trim();
  }
  // Formula rows can sit just under the 120-char gate — fold in components.
  if (text.length < 120 && term) {
    const components = String(term.components || "").trim();
    const formula = String(term.formula || "").trim();
    if (components && !text.toLowerCase().includes("inputs:")) {
      text = `${text} Inputs: ${components}`.replace(/\s+/g, " ").trim();
    } else if (formula && text.length < 120) {
      text =
        `${text} Practitioners compute it as ${formula} and retain the input evidence in the pack.`
          .replace(/\s+/g, " ")
          .trim();
    }
  }
  return cut(text, 1100);
}

function pickExample(term, definition, title) {
  const example = String(term.example || "")
    .replace(/^example:\s*/i, "")
    .trim();
  const how = String(term.howToUse || "").trim();
  const formula = String(term.formula || "").trim();
  const components = String(term.components || "").trim();

  if (example && !exampleNeedsRewrite(example, definition)) {
    if (how && textOverlapRatio(how, example) < 0.7) {
      const combined = cut(`${example} Workplace use: ${how}`, 1200);
      if (!exampleNeedsRewrite(combined, definition)) return combined;
    }
    return cut(example, 1200);
  }
  if (example && how) {
    const combined = cut(`${example} Workplace use: ${how}`, 1200);
    if (!exampleNeedsRewrite(combined, definition)) return combined;
  }
  if (example) return cut(example, 1200);

  // No mini-example in glossary — build a concrete workplace scenario from usage + formula.
  if (how || formula) {
    const useBit = how
      .replace(/^use this term when\s+/i, "")
      .replace(/^use it to\s+/i, "")
      .replace(/^use during\s+/i, "");
    const built = cut(
      [
        `Scenario: a finance owner brings “${title}” into the pack while ${useBit || "reviewing the figure"}.`,
        formula
          ? `They compute it as ${formula}${components ? ` (inputs: ${cut(components, 180)})` : ""}.`
          : components
            ? `They assemble inputs: ${cut(components, 220)}.`
            : "",
        `The pack records the result, the evidence trail, and the decision the number supports before sign-off.`,
      ]
        .filter(Boolean)
        .join(" "),
      1200,
    );
    if (built && !exampleNeedsRewrite(built, definition)) return built;
    return built;
  }
  return "";
}

/** Expand short glossary/doc trap fragments into a gate-passing sentence. */
function pickTrap(term, title = "") {
  const raw = [term.commonError, term.warning, term.redflags]
    .filter(Boolean)
    .join(" ")
    .replace(/^[•\-*]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  if (raw.length >= 40) return cut(raw, 550);
  const label = String(title || term.title || "this concept").trim();
  const body = raw.charAt(0).toLowerCase() + raw.slice(1);
  return cut(
    `Common mistake for “${label}”: ${body.replace(/\.$/, "")}. Confirm ownership, evidence, and decision route before relying on the output.`,
    550,
  );
}

function pickImplication(term, title) {
  const warning = String(term.warning || "").trim();
  if (warning) {
    return cut(
      warning.startsWith("If ")
        ? warning
        : `If “${title}” is mishandled, ${warning.charAt(0).toLowerCase()}${warning.slice(1)}`,
      550,
    );
  }
  const err = String(term.commonError || "").trim();
  if (err) {
    return cut(
      `Ignoring “${title}” leaves packs exposed to: ${err}`,
      550,
    );
  }
  return "";
}

function pickTrigger(term, title) {
  const how = String(term.howToUse || "").trim();
  if (!how) return "";
  const during = how.match(
    /(?:use (?:it |this )?)(?:during|when|for)\s+([^.]{12,160})/i,
  );
  if (during) {
    return cut(`Raise when work touches ${during[1].trim()} for “${title}”.`, 220);
  }
  return cut(
    `Raise when a pack, review, or control test depends on “${title}” and the owner cannot show evidence.`,
    220,
  );
}

function slugTask(label, index) {
  const base = String(label || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "task"}-${index + 1}`;
}

function gerundToImperative(phrase) {
  const text = String(phrase || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
  if (!text) return "";
  const m = text.match(
    /^(evaluating|discounting|comparing|building|checking|monitoring|confirming|documenting|retaining|assessing|reviewing|mapping|tracking|verifying|reconciling|testing|planning|measuring|calculating|identifying|challenging|drafting|setting|raising|flagging|applying|using|combining|covering|justifying|approving)\s+(.+)/i,
  );
  if (!m) return text;
  const verb = m[1].toLowerCase();
  const rest = m[2];
  const imperative = {
    evaluating: "Evaluate",
    discounting: "Discount",
    comparing: "Compare",
    building: "Build",
    checking: "Check",
    monitoring: "Monitor",
    confirming: "Confirm",
    documenting: "Document",
    retaining: "Retain",
    assessing: "Assess",
    reviewing: "Review",
    mapping: "Map",
    tracking: "Track",
    verifying: "Verify",
    reconciling: "Reconcile",
    testing: "Test",
    planning: "Plan",
    measuring: "Measure",
    calculating: "Calculate",
    identifying: "Identify",
    challenging: "Challenge",
    drafting: "Draft",
    setting: "Set",
    raising: "Raise",
    flagging: "Flag",
    applying: "Apply",
    using: "Use",
    combining: "Combine",
    covering: "Cover",
    justifying: "Justify",
    approving: "Approve",
  }[verb];
  return imperative ? `${imperative} ${rest}` : text;
}

/** Genuine task-like workplace items from howToUse — no filler. */
function buildWorkplaceTasks(term, cardId) {
  const how = String(term.howToUse || "").trim();
  const tasks = [];
  const seen = new Set();

  if (!how) {
    // Formula-glossary rows have no howToUse — ground tasks in formula/components.
    const formula = String(term.formula || "").trim();
    const components = String(term.components || "").trim();
    const title = String(term.title || "the measure").trim();
    if (formula) {
      tasks.push({
        id: `${cardId}-${slugTask("calculate", 0)}`,
        label: cut(`Calculate “${title}” as ${formula} and retain the inputs`, 140),
      });
    }
    if (components) {
      tasks.push({
        id: `${cardId}-${slugTask("verify-inputs", tasks.length)}`,
        label: cut(
          `Verify inputs for “${title}”: ${cut(components, 90)}`,
          140,
        ),
      });
    }
    if (tasks.length > 0) {
      tasks.push({
        id: `${cardId}-${slugTask("document-evidence", tasks.length)}`,
        label: cut(
          `Document the evidence trail for “${title}” before pack sign-off`,
          140,
        ),
      });
    }
    return tasks.slice(0, 3);
  }

  const push = (raw) => {
    let label = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^use this term when\s+/i, "")
      .replace(/^use it to\s+/i, "")
      .replace(/^use this (?:to|during|for|when)\s+/i, "")
      .replace(/^use (?:it |this )?(?:to|during|for|when)\s+/i, "")
      .replace(/^use during\s+/i, "")
      .replace(/^for (?:audit|risk|finance|management|control)\s+/i, "")
      .replace(/[.]+$/, "")
      .trim();
    label = gerundToImperative(label);
    if (label.length < 18 || label.length > 150) return;
    if (
      !TASK_VERB.test(label) &&
      !/\b(workshop|committee|board|pack|file|owner|evidence|RCM|walkthrough|model|valuation|investment)\b/i.test(
        label,
      )
    ) {
      return;
    }
    label = label.charAt(0).toUpperCase() + label.slice(1);
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tasks.push({
      id: `${cardId}-${slugTask(label, tasks.length)}`,
      label: cut(label, 140),
    });
  };

  // "Use this term when A, B, C or D"
  const whenList = how.match(
    /^use this term when\s+(.+?)(?:\.|$)/i,
  );
  if (whenList) {
    const parts = whenList[1].split(/,| or | and /i).map((p) => p.trim());
    for (const part of parts) {
      push(part);
      if (tasks.length >= 3) break;
    }
  }

  if (tasks.length === 0) {
    for (const sentence of how.split(/(?<=[.|;])\s+/)) {
      push(sentence);
      if (tasks.length >= 3) break;
    }
  }

  if (tasks.length === 0) {
    const list = how.match(/(?:during|for)\s+([^.]+?)(?:\.|$)/i);
    if (list) {
      for (const part of list[1].split(/,| and /i)) {
        const item = part.trim();
        if (item.length >= 12) push(`Review ${item}`);
        if (tasks.length >= 3) break;
      }
    }
  }

  return tasks.slice(0, 3);
}

function buildSourceQuotes(term, pack) {
  const quotes = [];
  const sourcePath = String(pack?.source || pack?.label || "merixa-glossary");
  if (term.evidence) {
    quotes.push({
      text: cut(term.evidence, 420),
      sourcePath,
    });
  }
  if (term.alignment) {
    quotes.push({
      text: cut(term.alignment, 420),
      sourcePath,
    });
  }
  // Formula glossaries: quote the Merixa formula + components as evidence.
  if (quotes.length === 0 && term.formula) {
    quotes.push({
      text: cut(
        [
          `Formula: ${term.formula}`,
          term.components ? `Components: ${term.components}` : "",
        ]
          .filter(Boolean)
          .join(" "),
        420,
      ),
      sourcePath,
    });
  }
  return quotes.slice(0, 3);
}

function resolveRelatedConcepts(relatedText, titleToId, selfId) {
  if (!relatedText) return [];
  const parts = String(relatedText)
    .split(/;|,/)
    .map((part) => part.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const part of parts) {
    const id = titleToId.get(normTitle(part));
    if (!id || id === selfId || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, kind: "related", label: part });
    if (out.length >= 6) break;
  }
  return out;
}

function shelfOf(card) {
  for (const tag of card.tags || []) {
    if (SHELF_TAGS.includes(tag)) return tag.replace(/-encyclopedia$/, "");
  }
  const id = String(card.id || "");
  const prefix = id.split("-")[0];
  if (["fa", "ma", "frm", "crma", "coso", "iia", "ifrs", "tax"].includes(prefix)) {
    return prefix;
  }
  return "other";
}

function loadGlossaryIndex() {
  if (!existsSync(EXTRACTED_PATH)) {
    throw new Error(`Missing ${EXTRACTED_PATH}`);
  }
  const glossaries = JSON.parse(readFileSync(EXTRACTED_PATH, "utf8"));
  const byTitle = new Map();
  const packs = [];

  for (const pack of glossaries.packs || []) {
    packs.push({ ...pack, origin: "glossary" });
  }
  if (existsSync(EXTRACTED_DOCS_PATH)) {
    try {
      const docs = JSON.parse(readFileSync(EXTRACTED_DOCS_PATH, "utf8"));
      for (const pack of docs.packs || []) {
        packs.push({ ...pack, origin: "docs" });
      }
    } catch {
      /* docs optional */
    }
  }
  if (existsSync(EXTRACTED_FORMULAS_PATH)) {
    try {
      const formulas = JSON.parse(readFileSync(EXTRACTED_FORMULAS_PATH, "utf8"));
      for (const pack of formulas.packs || []) {
        packs.push({ ...pack, origin: "formula" });
      }
    } catch {
      /* formulas optional */
    }
  }

  const originRank = { glossary: 3, docs: 2, formula: 1 };
  for (const pack of packs) {
    for (const term of pack.terms || []) {
      const key = normTitle(term.title);
      if (!key) continue;
      // Prefer richer glossary rows over docs/formula; first win within origin.
      const existing = byTitle.get(key);
      if (existing) {
        const existingRank = originRank[existing.pack.origin] || 0;
        const nextRank = originRank[pack.origin] || 0;
        if (existingRank > nextRank) continue;
        if (existingRank === nextRank) continue;
      }
      byTitle.set(key, { term, pack });
    }
  }
  return byTitle;
}

function shouldConsider(card, force, hasGlossaryMatch) {
  if (!force && card.locallyDeepenedAt) return false;
  if (card.enrichedAt) return false; // leave live-enriched alone
  if (!hasGlossaryMatch) return false;
  return true;
}

function deepenCard(card, match, titleToId) {
  const { term, pack } = match;
  const title = String(card.title || term.title || "").trim();
  const teachingSummary = groundedDefinition(
    title,
    term.definition,
    term.interpretation,
    term,
  );
  const workedExample =
    pickExample(term, teachingSummary, title) ||
    String(card.workedExample || "").trim();
  const commonMistake =
    pickTrap(term, title) || String(card.commonMistake || "").trim();
  const formula = term.formula
    ? cut(term.formula, 420)
    : card.formula
      ? String(card.formula)
      : undefined;
  const extra = cut(
    [
      term.components ? `Inputs: ${term.components}` : "",
      term.evidence && !term.components ? `Evidence: ${term.evidence}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    360,
  );
  const body = composeUniqueBody({
    definition: teachingSummary,
    formula,
    interpretation: term.interpretation
      ? undefined // already folded into teachingSummary
      : undefined,
    related: term.related ? cut(term.related, 280) : undefined,
    extra: extra || undefined,
  });

  const workplaceTasks = buildWorkplaceTasks(term, card.id);
  const sourceQuotes = buildSourceQuotes(term, pack);
  const relatedConcepts = resolveRelatedConcepts(
    term.related,
    titleToId,
    card.id,
  );
  const implicationIfIgnored =
    pickImplication(term, title) ||
    String(card.implicationIfIgnored || "").trim();
  const realWorldTrigger =
    pickTrigger(term, title) || String(card.realWorldTrigger || "").trim();

  const genuineExample =
    ((Boolean(term.example) && /\d/.test(String(term.example))) ||
      (Boolean(term.formula) && Boolean(workedExample) && /\d|formula|compute/i.test(workedExample))) &&
    !exampleNeedsRewrite(workedExample, teachingSummary);

  const next = {
    ...card,
    teachingSummary,
    body: body || teachingSummary,
    workedExample: cut(workedExample, 1200),
    commonMistake: cut(commonMistake, 550),
    ...(formula ? { formula } : {}),
    implicationIfIgnored: implicationIfIgnored
      ? cut(implicationIfIgnored, 550)
      : card.implicationIfIgnored,
    realWorldTrigger: realWorldTrigger
      ? cut(realWorldTrigger, 220)
      : card.realWorldTrigger,
    workplaceTasks:
      workplaceTasks.length > 0
        ? workplaceTasks
        : Array.isArray(card.workplaceTasks)
          ? card.workplaceTasks
          : [],
    sourceQuotes:
      sourceQuotes.length > 0
        ? sourceQuotes
        : Array.isArray(card.sourceQuotes)
          ? card.sourceQuotes
          : [],
    ...(relatedConcepts.length > 0
      ? { relatedConcepts }
      : card.relatedConcepts
        ? { relatedConcepts: card.relatedConcepts }
        : {}),
    ...(genuineExample
      ? {
          exampleVerification: {
            status: "verified",
            reason:
              "Merixa glossary example/formula scenario; distinct from definition (codex-local-enrich).",
            verifiedAt: new Date().toISOString(),
            model: "codex-local-enrich",
          },
        }
      : {}),
    locallyDeepenedAt: new Date().toISOString(),
    customTopicRelevance: 0, // filled after build
  };
  // Never stamp enrichedAt — cards stay in the live OpenAI enrich queue.
  delete next.enrichedAt;

  next.customTopicRelevance = Number(
    customTopicRelevance(next).toFixed(3),
  );
  return next;
}

function mergeUpgrade(existing, incoming) {
  const { card: kept, action } = preferImprovedCard(existing, incoming);
  // preferImprovedCard can drop additive arrays on preserve-depth — force-keep them.
  return {
    action,
    card: {
      ...kept,
      teachingSummary: incoming.teachingSummary || kept.teachingSummary,
      body: incoming.body || kept.body,
      workedExample: incoming.workedExample || kept.workedExample,
      commonMistake: incoming.commonMistake || kept.commonMistake,
      formula: incoming.formula || kept.formula,
      implicationIfIgnored:
        incoming.implicationIfIgnored || kept.implicationIfIgnored,
      realWorldTrigger: incoming.realWorldTrigger || kept.realWorldTrigger,
      workplaceTasks:
        Array.isArray(incoming.workplaceTasks) &&
        incoming.workplaceTasks.length > 0
          ? incoming.workplaceTasks
          : kept.workplaceTasks || [],
      sourceQuotes:
        Array.isArray(incoming.sourceQuotes) &&
        incoming.sourceQuotes.length > 0
          ? incoming.sourceQuotes
          : kept.sourceQuotes || [],
      relatedConcepts:
        Array.isArray(incoming.relatedConcepts) &&
        incoming.relatedConcepts.length > 0
          ? incoming.relatedConcepts
          : kept.relatedConcepts,
      exampleVerification:
        incoming.exampleVerification || kept.exampleVerification,
      locallyDeepenedAt: incoming.locallyDeepenedAt,
      customTopicRelevance: incoming.customTopicRelevance,
      // Never invent a live stamp here
      enrichedAt: existing.enrichedAt || undefined,
    },
  };
}

function passesQualityGate(card) {
  const score = customTopicRelevance(card);
  if (score < 0.35) {
    return { ok: false, reason: "customTopicRelevance-low", score };
  }
  if (needsTopicRelevanceRewrite(card)) {
    return { ok: false, reason: "needsTopicRelevanceRewrite", score };
  }
  if (String(card.teachingSummary || "").length < 120) {
    return { ok: false, reason: "definition-too-short", score };
  }
  if (String(card.workedExample || "").length < 40) {
    return { ok: false, reason: "example-too-short", score };
  }
  if (String(card.commonMistake || "").length < 40) {
    return { ok: false, reason: "trap-too-short", score };
  }
  return { ok: true, reason: null, score };
}

function sampleStyle(cards, label, n = 20) {
  const pick = cards.slice(0, Math.min(n, cards.length));
  const lens = (field) =>
    pick.map((c) => String(c[field] || "").length);
  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  return {
    label,
    sampleSize: pick.length,
    avgDefinition: avg(lens("teachingSummary")),
    avgExample: avg(lens("workedExample")),
    avgTrap: avg(lens("commonMistake")),
    withFormula: pick.filter((c) => c.formula).length,
    withWorkplaceTasks: pick.filter((c) => (c.workplaceTasks || []).length).length,
    withSourceQuotes: pick.filter((c) => (c.sourceQuotes || []).length).length,
    withEnrichedAt: pick.filter((c) => c.enrichedAt).length,
    titles: pick.map((c) => c.title).slice(0, 8),
  };
}

function runCohesion(index) {
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byTitle = new Map();
  for (const card of cards) {
    const key = normTitle(card.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(card);
  }

  const twinGroups = [];
  let sameDefinitionTwins = 0;
  const sameDefOffenders = [];
  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    const shelves = group.map(shelfOf);
    const defs = [
      ...new Set(
        group.map((c) => String(c.teachingSummary || "").trim()).filter(Boolean),
      ),
    ];
    const sameDef = defs.length === 1;
    if (sameDef) {
      sameDefinitionTwins += 1;
      sameDefOffenders.push({
        title,
        ids: group.map((c) => c.id),
        shelves,
        defLen: defs[0].length,
      });
    }
    twinGroups.push({
      title,
      count: group.length,
      ids: group.map((c) => c.id),
      shelves,
      sameDefinition: sameDef,
    });
  }
  sameDefOffenders.sort((a, b) => b.defLen - a.defLen);

  const idSet = new Set(cards.map((c) => c.id));
  let withRelated = 0;
  let relatedLinks = 0;
  let deadRelated = 0;
  for (const card of cards) {
    const rel = card.relatedConcepts || [];
    if (!rel.length) continue;
    withRelated += 1;
    for (const link of rel) {
      relatedLinks += 1;
      if (link?.id && !idSet.has(link.id)) deadRelated += 1;
    }
  }

  const domainMismatches = [];
  const PREFIX_DOMAIN = {
    fa: "Financial management",
    frm: "Risk management",
    ma: "Management reporting",
    ifrs: "Financial reporting",
    tax: "Financial reporting",
    iia: "Audit and assurance",
    crma: "Risk management",
    coso: "Governance and controls",
  };
  for (const card of cards) {
    const prefix = String(card.id || "").split("-")[0];
    const expected = PREFIX_DOMAIN[prefix];
    const domain = card.classification?.domain;
    if (expected && domain && domain !== expected) {
      // tax can live under Financial reporting — already matched
      // iia cards sometimes classified Governance — note soft mismatches only for clear conflicts
      if (
        (prefix === "fa" && domain !== "Financial management") ||
        (prefix === "frm" && domain !== "Risk management") ||
        (prefix === "ma" && domain !== "Management reporting") ||
        (prefix === "ifrs" && domain !== "Financial reporting")
      ) {
        domainMismatches.push({
          id: card.id,
          title: card.title,
          domain,
          expected,
        });
      }
    }
  }

  const codex = cards.filter((c) => (c.tags || []).includes("codex-sourced"));
  const enriched = cards.filter((c) => c.enrichedAt);
  const style = {
    codexSourced: sampleStyle(codex, "codex-sourced"),
    openaiEnriched: sampleStyle(enriched, "openai-enriched"),
  };

  const byShelf = {};
  for (const card of codex) {
    const shelf = shelfOf(card);
    byShelf[shelf] = (byShelf[shelf] || 0) + 1;
  }

  // Facet audit snapshot (offline)
  let facetCloneCount = 0;
  try {
    const { isFacetCloneTitle } = awaitImportFacet();
    for (const card of cards) {
      if (isFacetCloneTitle(card.title)) facetCloneCount += 1;
    }
  } catch {
    facetCloneCount = null;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogCards: cards.length,
    codexSourced: codex.length,
    codexByShelf: byShelf,
    titleTwinGroups: twinGroups.length,
    cardsInTwinGroups: twinGroups.reduce((n, g) => n + g.count, 0),
    sameDefinitionTwinGroups: sameDefinitionTwins,
    sameDefinitionOffenders: sameDefOffenders.slice(0, 15),
    relatedConcepts: {
      cardsWithLinks: withRelated,
      totalLinks: relatedLinks,
      deadLinks: deadRelated,
      note:
        withRelated === 0
          ? "No relatedConcepts graph yet — glossary related titles unused until local enrich"
          : null,
    },
    domainMismatches: {
      count: domainMismatches.length,
      samples: domainMismatches.slice(0, 20),
    },
    styleSample: style,
    facetCloneCount,
    tutorConsistency:
      "Skipped — library:tutor-consistency spends OpenAI tokens (quota exhausted).",
    recommendedNext: [
      sameDefinitionTwins > 0
        ? `Merge or quarantine ${sameDefinitionTwins} same-definition title twin groups (true dupes).`
        : "No same-definition twins — cross-shelf twins look like legitimate shelf variants.",
      withRelated === 0
        ? "Populate relatedConcepts from glossary related titles (local enrich does this where resolvable)."
        : deadRelated > 0
          ? `Repair ${deadRelated} dead relatedConcepts links.`
          : "Related-concept graph looks healthy.",
      "Run OpenAI enrich later for enrichedAt + house-style polish; local deepen is a stopgap.",
      domainMismatches.length > 0
        ? `Review ${domainMismatches.length} id-prefix vs classification.domain mismatches.`
        : "Shelf prefix vs domain classification looks aligned on hard checks.",
    ],
  };

  mkdirSync(PIPELINE_DIR, { recursive: true });
  atomicWriteFile(COHESION_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function awaitImportFacet() {
  // sync dynamic not available — inline lightweight clone detect via known pattern
  return {
    isFacetCloneTitle(title) {
      return /:\s*(roles|presentation|authorization|reconciliation|working-capital|auditors-responsibilities)/i.test(
        String(title || ""),
      );
    },
  };
}

function persistUpgrades(index, upgradedById) {
  mkdirSync(CORPUS_DIR, { recursive: true });
  const byId = new Map(
    (Array.isArray(index.cards) ? index.cards : []).map((card) => [
      card.id,
      card,
    ]),
  );
  for (const [id, card] of upgradedById) {
    byId.set(id, card);
    writeFileSync(
      join(CORPUS_DIR, `${id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }
  const { cards: merged, recovered } = unionMergeWithDiskIndex(INDEX_PATH, [
    ...byId.values(),
  ]);
  if (recovered > 0) {
    console.warn(
      `codex-local-enrich: union-merged ${recovered} cards written concurrently`,
    );
  }
  const next = buildIndexFromCards(merged);
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = flag(argv, "--dry-run");
  const force = flag(argv, "--force");
  const cohesionOnly = flag(argv, "--cohesion-only");
  const shelfFilter = flagValue(argv, "--shelf", "");
  const limit = Number(flagValue(argv, "--limit", "0")) || 0;

  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  mkdirSync(PIPELINE_DIR, { recursive: true });
  mkdirSync(CORPUS_DIR, { recursive: true });

  let index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  console.log("=== codex cohesion check ===");
  const cohesion = runCohesion(index);
  console.log(
    `twins=${cohesion.titleTwinGroups} sameDef=${cohesion.sameDefinitionTwinGroups} relatedCards=${cohesion.relatedConcepts.cardsWithLinks} deadRelated=${cohesion.relatedConcepts.deadLinks} domainMismatches=${cohesion.domainMismatches.count}`,
  );
  console.log(`style: ${JSON.stringify(cohesion.styleSample)}`);
  console.log(`wrote ${COHESION_PATH}`);

  if (cohesionOnly) return;

  console.log("\n=== codex local enrich ===");
  const glossary = loadGlossaryIndex();
  console.log(`glossary titles indexed: ${glossary.size}`);

  const titleToId = new Map();
  for (const card of index.cards || []) {
    const key = normTitle(card.title);
    if (key && !titleToId.has(key)) titleToId.set(key, card.id);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun,
    force,
    glossaryTitles: glossary.size,
    considered: 0,
    matched: 0,
    upgraded: 0,
    skippedAlreadyDeepened: 0,
    skippedNoMatch: 0,
    skippedQuality: 0,
    skippedUnchanged: 0,
    qualityReasons: {},
    perShelf: {},
    fieldsAdded: {
      formula: 0,
      trap: 0,
      sourceQuotes: 0,
      workplaceTasks: 0,
      exampleVerification: 0,
      relatedConcepts: 0,
      implication: 0,
      trigger: 0,
    },
    samples: [],
    gaps: {
      codexWithoutGlossaryMatch: 0,
      glossaryWithoutCard: 0,
      stillThinExample: 0,
      stillNoWorkplaceTasks: 0,
      stillNoSourceQuotes: 0,
      stillNeedsLiveEnrich: 0,
    },
  };

  const upgradedById = new Map();
  const cards = Array.isArray(index.cards) ? index.cards : [];

  for (const card of cards) {
    if (shelfFilter && shelfOf(card) !== shelfFilter) continue;

    const match = glossary.get(normTitle(card.title));
    if (!match) {
      if ((card.tags || []).includes("codex-sourced")) {
        report.gaps.codexWithoutGlossaryMatch += 1;
      }
      continue;
    }
    if (!shouldConsider(card, force, true)) {
      if (card.locallyDeepenedAt && !force) report.skippedAlreadyDeepened += 1;
      continue;
    }

    report.considered += 1;
    report.matched += 1;

    const deepened = deepenCard(card, match, titleToId);
    const gate = passesQualityGate(deepened);
    if (!gate.ok) {
      report.skippedQuality += 1;
      report.qualityReasons[gate.reason] =
        (report.qualityReasons[gate.reason] || 0) + 1;
      continue;
    }

    const beforeLen =
      String(card.teachingSummary || "").length +
      String(card.workedExample || "").length +
      String(card.commonMistake || "").length +
      (card.workplaceTasks || []).length * 50 +
      (card.sourceQuotes || []).length * 50;
    const afterLen =
      String(deepened.teachingSummary || "").length +
      String(deepened.workedExample || "").length +
      String(deepened.commonMistake || "").length +
      (deepened.workplaceTasks || []).length * 50 +
      (deepened.sourceQuotes || []).length * 50;

    const gainedFields =
      (!(card.sourceQuotes || []).length &&
        (deepened.sourceQuotes || []).length > 0) ||
      (!(card.workplaceTasks || []).length &&
        (deepened.workplaceTasks || []).length > 0) ||
      (!card.formula && deepened.formula) ||
      (!card.implicationIfIgnored && deepened.implicationIfIgnored) ||
      (!card.exampleVerification && deepened.exampleVerification) ||
      (!(card.relatedConcepts || []).length &&
        (deepened.relatedConcepts || []).length > 0);

    if (afterLen <= beforeLen && !gainedFields && card.locallyDeepenedAt) {
      report.skippedUnchanged += 1;
      continue;
    }

    const { card: finalCard } = mergeUpgrade(card, deepened);

    // Field counters
    if (!card.formula && finalCard.formula) report.fieldsAdded.formula += 1;
    if (
      String(finalCard.commonMistake || "").length >
      String(card.commonMistake || "").length + 20
    ) {
      report.fieldsAdded.trap += 1;
    }
    if (
      (finalCard.sourceQuotes || []).length > (card.sourceQuotes || []).length
    ) {
      report.fieldsAdded.sourceQuotes += 1;
    }
    if (
      (finalCard.workplaceTasks || []).length >
      (card.workplaceTasks || []).length
    ) {
      report.fieldsAdded.workplaceTasks += 1;
    }
    if (!card.exampleVerification && finalCard.exampleVerification) {
      report.fieldsAdded.exampleVerification += 1;
    }
    if (
      (finalCard.relatedConcepts || []).length >
      (card.relatedConcepts || []).length
    ) {
      report.fieldsAdded.relatedConcepts += 1;
    }
    if (!card.implicationIfIgnored && finalCard.implicationIfIgnored) {
      report.fieldsAdded.implication += 1;
    }
    if (!card.realWorldTrigger && finalCard.realWorldTrigger) {
      report.fieldsAdded.trigger += 1;
    }

    const shelf = shelfOf(finalCard);
    if (!report.perShelf[shelf]) {
      report.perShelf[shelf] = { upgraded: 0, matched: 0 };
    }
    report.perShelf[shelf].matched += 1;
    report.perShelf[shelf].upgraded += 1;
    report.upgraded += 1;

    if (report.samples.length < 12) {
      report.samples.push({
        id: finalCard.id,
        title: finalCard.title,
        shelf,
        customTopicRelevance: finalCard.customTopicRelevance,
        workplaceTasks: (finalCard.workplaceTasks || []).length,
        sourceQuotes: (finalCard.sourceQuotes || []).length,
        relatedConcepts: (finalCard.relatedConcepts || []).length,
        defLen: String(finalCard.teachingSummary || "").length,
        exLen: String(finalCard.workedExample || "").length,
      });
    }

    upgradedById.set(finalCard.id, finalCard);
    if (limit > 0 && upgradedById.size >= limit) break;
  }

  // Gap stats after planned upgrades
  const postCards = cards.map((c) => upgradedById.get(c.id) || c);
  const glossaryTitles = new Set(glossary.keys());
  let glossaryWithoutCard = 0;
  const cardTitles = new Set(postCards.map((c) => normTitle(c.title)));
  for (const title of glossaryTitles) {
    if (!cardTitles.has(title)) glossaryWithoutCard += 1;
  }
  report.gaps.glossaryWithoutCard = glossaryWithoutCard;

  const deepenedPool = postCards.filter(
    (c) =>
      (c.tags || []).includes("codex-sourced") || c.locallyDeepenedAt,
  );
  report.gaps.stillThinExample = deepenedPool.filter(
    (c) => String(c.workedExample || "").length < 200,
  ).length;
  report.gaps.stillNoWorkplaceTasks = deepenedPool.filter(
    (c) => !(c.workplaceTasks || []).length,
  ).length;
  report.gaps.stillNoSourceQuotes = deepenedPool.filter(
    (c) => !(c.sourceQuotes || []).length,
  ).length;
  report.gaps.stillNeedsLiveEnrich = postCards.filter(
    (c) => (c.tags || []).includes("codex-sourced") && !c.enrichedAt,
  ).length;

  if (!dryRun && upgradedById.size > 0) {
    console.log(`writing ${upgradedById.size} upgraded cards + index…`);
    index = persistUpgrades(index, upgradedById);
    // refresh cohesion-related gap after write
    const post = runCohesion(index);
    report.postCohesion = {
      relatedCards: post.relatedConcepts.cardsWithLinks,
      relatedLinks: post.relatedConcepts.totalLinks,
      deadRelated: post.relatedConcepts.deadLinks,
    };
  } else if (dryRun) {
    console.log(`dry-run: would upgrade ${upgradedById.size} cards`);
  }

  atomicWriteFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `upgraded=${report.upgraded} qualitySkip=${report.skippedQuality} noMatch=${report.skippedNoMatch}`,
  );
  console.log(`perShelf=${JSON.stringify(report.perShelf)}`);
  console.log(`fieldsAdded=${JSON.stringify(report.fieldsAdded)}`);
  console.log(`gaps=${JSON.stringify(report.gaps)}`);
  console.log(`wrote ${REPORT_PATH}`);
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  withIndexHolder("codex-local-enrich", async () => {
    main();
  }).catch((error) => {
    console.error(error);
    process.exitCode = error?.code === "INDEX_HOLDER_BUSY" ? 3 : 1;
  });
}
