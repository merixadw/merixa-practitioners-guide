/**
 * Milestone M3 offline depth runner (no OpenAI, no volume minting).
 *
 * Phases:
 *   --phase=provenance   E9 backfill sourceProvenance + stamps
 *   --phase=polish-queue E10 openai-polish-queue.json + dilution math
 *   --phase=workplace    E7 fill empty workplaceTasks (path-first, quality-gated)
 *   --phase=formula      E8 formula/docs field upgrades (glossary exhausted pivot)
 *   --phase=all          run all phases under one index holder
 *
 * Usage:
 *   node scripts/pipeline/m3-offline-depth.mjs --phase=all
 *   node scripts/pipeline/m3-offline-depth.mjs --phase=workplace --limit=800 --dry-run
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import { pathCardIds } from "../lib/path-sources.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const OPS_PATH = join(PIPELINE_DIR, "ops-status.json");
const FORMULAS_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-formulas.json");
const DOCS_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-docs.json");
const REPORT_PATH = join(PIPELINE_DIR, "m3-offline-depth-report.json");
const POLISH_PATH = join(PIPELINE_DIR, "openai-polish-queue.json");
const FORMULA_REPORT_PATH = join(PIPELINE_DIR, "formula-enrich-report.json");
const WORKPLACE_REPORT_PATH = join(PIPELINE_DIR, "workplace-tasks-fill-report.json");
const PROVENANCE_REPORT_PATH = join(PIPELINE_DIR, "provenance-backfill-report.json");

const PROVENANCE = {
  OPENAI_LIVE: "openai-live",
  AGENT: "agent-authored",
  CODEX: "codex-local",
  FORMULA: "formula-pack",
  REGISTRY: "registry",
  UNKNOWN: "unknown",
};

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback = "") {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.split("=").slice(1).join("=") || fallback;
}

function cut(text, max) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function normTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugTask(label, i) {
  const base = String(label || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "task"}-${i}`;
}

function hasWorkplaceTasks(card) {
  return Array.isArray(card.workplaceTasks) && card.workplaceTasks.length > 0;
}

function inferProvenance(card) {
  if (card.enrichedAt) return PROVENANCE.OPENAI_LIVE;
  if (card.sourceProvenance && Object.values(PROVENANCE).includes(card.sourceProvenance)) {
    return card.sourceProvenance;
  }
  const tags = card.tags || [];
  if (card.agentAuthoredAt || tags.includes("agent-authored")) {
    return PROVENANCE.AGENT;
  }
  if (tags.includes("codex-sourced") || card.codexDeepenedAt) {
    return PROVENANCE.CODEX;
  }
  if (tags.includes("formula-pack") || card.formulaPackAt) {
    return PROVENANCE.FORMULA;
  }
  if (Array.isArray(card.aliases) && card.aliases.length > 0) {
    return PROVENANCE.REGISTRY;
  }
  if (card.locallyDeepenedAt) return PROVENANCE.CODEX;
  return PROVENANCE.UNKNOWN;
}

function loadPathIds() {
  try {
    return pathCardIds();
  } catch {
    return new Set();
  }
}

function loadSeamlessIds() {
  const retrieve = join(ROOT, "public", "corpus", "retrieve-index.json");
  if (!existsSync(retrieve)) return new Set();
  try {
    const raw = JSON.parse(readFileSync(retrieve, "utf8"));
    const cards = Array.isArray(raw?.cards) ? raw.cards : [];
    return new Set(cards.map((c) => c.id).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** E9 */
function phaseProvenance(cards, { dryRun }) {
  const now = new Date().toISOString();
  let stamped = 0;
  let agentAuthoredAtBackfill = 0;
  const buckets = {
    [PROVENANCE.OPENAI_LIVE]: 0,
    [PROVENANCE.AGENT]: 0,
    [PROVENANCE.CODEX]: 0,
    [PROVENANCE.FORMULA]: 0,
    [PROVENANCE.REGISTRY]: 0,
    [PROVENANCE.UNKNOWN]: 0,
  };
  let agentWithStamp = 0;
  let agentTotal = 0;

  const next = cards.map((card) => {
    const provenance = inferProvenance(card);
    buckets[provenance] = (buckets[provenance] || 0) + 1;
    const isAgent =
      provenance === PROVENANCE.AGENT ||
      Boolean(card.agentAuthoredAt) ||
      (card.tags || []).includes("agent-authored");
    if (isAgent) {
      agentTotal += 1;
      if (card.agentAuthoredAt && card.sourceProvenance) agentWithStamp += 1;
    }

    let changed = false;
    const out = { ...card };
    if (out.sourceProvenance !== provenance) {
      out.sourceProvenance = provenance;
      changed = true;
    }
    if (isAgent && !out.agentAuthoredAt) {
      out.agentAuthoredAt =
        out.locallyDeepenedAt || out.agentAuthoredAt || now;
      agentAuthoredAtBackfill += 1;
      changed = true;
    }
    if (changed) stamped += 1;
    return out;
  });

  const agentCoverage =
    agentTotal === 0 ? 1 : (agentWithStamp + agentAuthoredAtBackfill) / agentTotal;

  const report = {
    generatedAt: now,
    dryRun,
    stamped,
    agentAuthoredAtBackfill,
    agentTotal,
    agentCoveragePct: Number((agentCoverage * 100).toFixed(1)),
    buckets,
    bucketsSum: Object.values(buckets).reduce((a, b) => a + b, 0),
    totalCards: cards.length,
  };
  atomicWriteFile(PROVENANCE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return { cards: next, report };
}

/** E10 */
function phasePolishQueue(cards) {
  const pathIds = loadPathIds();
  const seamlessIds = loadSeamlessIds();
  const now = new Date().toISOString();

  const needing = cards.filter((c) => !c.enrichedAt);
  const agentAuthored = cards.filter(
    (c) =>
      c.agentAuthoredAt ||
      (c.tags || []).includes("agent-authored") ||
      c.sourceProvenance === PROVENANCE.AGENT,
  );
  const agentWithoutLive = agentAuthored.filter((c) => !c.enrichedAt);
  const codexWithoutLive = cards.filter(
    (c) =>
      !c.enrichedAt &&
      (c.sourceProvenance === PROVENANCE.CODEX ||
        (c.tags || []).includes("codex-sourced") ||
        c.codexDeepenedAt),
  );

  const priorityScore = (card) => {
    let score = 0;
    if (pathIds.has(card.id)) score += 300;
    if (seamlessIds.has(card.id)) score += 100;
    if (card.agentAuthoredAt || (card.tags || []).includes("agent-authored")) {
      score += 50;
    }
    if (hasWorkplaceTasks(card)) score += 10;
    if (card.locallyDeepenedAt) score += 5;
    return score;
  };

  const items = needing
    .map((card) => ({
      id: card.id,
      title: card.title,
      sourceProvenance: card.sourceProvenance || inferProvenance(card),
      onPath: pathIds.has(card.id),
      inSeamless: seamlessIds.has(card.id),
      agentAuthored: Boolean(
        card.agentAuthoredAt || (card.tags || []).includes("agent-authored"),
      ),
      score: priorityScore(card),
    }))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  const dilutionPts = Number(
    ((agentWithoutLive.length / Math.max(cards.length, 1)) * 100).toFixed(2),
  );

  const queue = {
    generatedAt: now,
    note: "Agent/codex cards without enrichedAt are expected. Queue for OpenAI polish after quota restore (M4). Offline writers must never stamp enrichedAt.",
    totals: {
      totalIndexCards: cards.length,
      needingEnrichedAt: needing.length,
      agentAuthoredCount: agentAuthored.length,
      agentWithoutEnrichedAt: agentWithoutLive.length,
      codexWithoutEnrichedAt: codexWithoutLive.length,
      dilutionPts,
      pathMembersInQueue: items.filter((i) => i.onPath).length,
      seamlessInQueue: items.filter((i) => i.inSeamless).length,
    },
    priorityOrder: ["path", "seamless", "other"],
    items: items.slice(0, 12000),
  };
  atomicWriteFile(POLISH_PATH, `${JSON.stringify(queue, null, 2)}\n`);
  return queue;
}

function buildOwnedWorkplaceTasks(card) {
  const title = String(card.title || "this concept").trim();
  const trap = cut(card.commonMistake || "", 80);
  const example = String(card.workedExample || "");
  const hasNumbers = /\d/.test(example);
  const tasks = [];

  tasks.push({
    id: `${card.id}-${slugTask("owner", 0)}`,
    label: cut(
      `Name the owner who must evidence “${title}” before pack or file sign-off`,
      140,
    ),
  });

  if (hasNumbers || card.formula) {
    tasks.push({
      id: `${card.id}-${slugTask("recompute", 1)}`,
      label: cut(
        `Recompute the key figure for “${title}” from source extracts and keep the inputs`,
        140,
      ),
    });
  } else {
    tasks.push({
      id: `${card.id}-${slugTask("evidence", 1)}`,
      label: cut(
        `Attach one primary evidence item that proves “${title}” in this period’s file`,
        140,
      ),
    });
  }

  tasks.push({
    id: `${card.id}-${slugTask("reverse", 2)}`,
    label: cut(
      trap
        ? `Stress-test the reverse conclusion — watch for: ${trap}`
        : `Write the reverse conclusion that would fail if “${title}” were ignored`,
      140,
    ),
  });

  // Quality: reject if labels are near-identical across cards (caller tracks spam)
  return tasks.slice(0, 3);
}

/** E7 — stop when qualitySkip rises (template spam). */
function phaseWorkplace(cards, { dryRun, limit }) {
  const pathIds = loadPathIds();
  const seamlessIds = loadSeamlessIds();
  const now = new Date().toISOString();

  const candidates = cards
    .filter((c) => !hasWorkplaceTasks(c))
    .map((c) => {
      let rank = 0;
      if (pathIds.has(c.id)) rank += 300;
      if (seamlessIds.has(c.id)) rank += 100;
      if (String(c.workedExample || "").length >= 80) rank += 20;
      if (String(c.commonMistake || "").length >= 40) rank += 10;
      return { card: c, rank };
    })
    .filter(({ card }) => {
      // Require some teaching depth so tasks are grounded
      const def = String(card.teachingSummary || card.body || "").trim();
      return def.length >= 80;
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);

  const byId = new Map(cards.map((c) => [c.id, c]));
  let filled = 0;
  let qualitySkip = 0;
  const labelFingerprints = new Map();
  const samples = [];

  for (const { card } of candidates) {
    const tasks = buildOwnedWorkplaceTasks(card);
    const fp = tasks.map((t) => t.label.replace(/“[^”]+”/g, "TITLE")).join("|");
    const seen = labelFingerprints.get(fp) || 0;
    if (seen >= 40) {
      // Same skeleton reused too often → spam risk; skip further identical templates
      qualitySkip += 1;
      continue;
    }
    labelFingerprints.set(fp, seen + 1);

    const next = {
      ...card,
      workplaceTasks: tasks,
      locallyDeepenedAt: card.locallyDeepenedAt || now,
      sourceProvenance: card.sourceProvenance || inferProvenance(card),
    };
    // Never stamp enrichedAt
    delete next.enrichedAt;
    if (card.enrichedAt) next.enrichedAt = card.enrichedAt;

    byId.set(card.id, next);
    filled += 1;
    if (samples.length < 8) {
      samples.push({ id: card.id, title: card.title, tasks: tasks.map((t) => t.label) });
    }
  }

  const outCards = [...byId.values()];
  const withTasks = outCards.filter(hasWorkplaceTasks).length;
  const pathCards = outCards.filter((c) => pathIds.has(c.id));
  const pathWithTasks = pathCards.filter(hasWorkplaceTasks).length;
  const pathCoverage =
    pathCards.length === 0 ? 0 : pathWithTasks / pathCards.length;

  const report = {
    generatedAt: now,
    dryRun,
    limit,
    candidates: candidates.length,
    filled,
    qualitySkip,
    withWorkplaceTasks: withTasks,
    pathCards: pathCards.length,
    pathWithWorkplaceTasks: pathWithTasks,
    pathWorkplaceCoverage: Number(pathCoverage.toFixed(3)),
    stopReason:
      qualitySkip > filled * 0.25 && qualitySkip > 50
        ? "template-spam-risk"
        : null,
    samples,
  };
  atomicWriteFile(WORKPLACE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return { cards: outCards, report };
}

function loadTermIndex(path, origin) {
  const byTitle = new Map();
  if (!existsSync(path)) return byTitle;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    for (const pack of raw.packs || []) {
      for (const term of pack.terms || []) {
        const key = normTitle(term.title);
        if (!key || byTitle.has(key)) continue;
        byTitle.set(key, { term, pack: { ...pack, origin } });
      }
    }
  } catch {
    /* optional */
  }
  return byTitle;
}

/** E8 — formula/docs matcher; no fake glossary regen. */
function phaseFormula(cards, { dryRun, limit }) {
  const now = new Date().toISOString();
  const formulas = loadTermIndex(FORMULAS_PATH, "formula");
  const docs = loadTermIndex(DOCS_PATH, "docs");
  // Prefer formula over docs for quantitative fields
  const byTitle = new Map([...docs, ...formulas]);

  const byId = new Map(cards.map((c) => [c.id, c]));
  let upgrades = 0;
  let matched = 0;
  const fieldCounts = { formula: 0, trap: 0, sourceQuotes: 0, workplaceTasks: 0, implication: 0 };
  const samples = [];

  const candidates = cards
    .filter((c) => !c.enrichedAt)
    .map((c) => {
      const key = normTitle(c.title);
      const match = byTitle.get(key);
      if (!match) return null;
      const needs =
        !c.formula ||
        !hasWorkplaceTasks(c) ||
        !(c.sourceQuotes || []).length ||
        String(c.commonMistake || "").length < 40 ||
        String(c.implicationIfIgnored || "").length < 60;
      if (!needs) return null;
      return { card: c, match, key };
    })
    .filter(Boolean)
    .slice(0, limit);

  for (const { card, match } of candidates) {
    matched += 1;
    const { term, pack } = match;
    let changed = false;
    const next = { ...card };

    if (!next.formula && term.formula) {
      next.formula = cut(term.formula, 420);
      fieldCounts.formula += 1;
      changed = true;
    }
    if (
      String(next.commonMistake || "").length < 40 &&
      (term.misuse || term.trap || term.commonMistake)
    ) {
      next.commonMistake = cut(
        term.misuse || term.trap || term.commonMistake,
        550,
      );
      fieldCounts.trap += 1;
      changed = true;
    }
    if (
      !(next.sourceQuotes || []).length &&
      (term.evidence || term.definition)
    ) {
      const text = cut(term.evidence || term.definition, 280);
      if (text.length >= 40) {
        next.sourceQuotes = [
          {
            text,
            sourcePath: pack?.source || pack?.path || `codex-feed/${pack.origin}`,
          },
        ];
        fieldCounts.sourceQuotes += 1;
        changed = true;
      }
    }
    if (
      String(next.implicationIfIgnored || "").length < 60 &&
      (term.interpretation || term.howToUse)
    ) {
      next.implicationIfIgnored = cut(
        `If ignored, ${term.interpretation || term.howToUse}`,
        520,
      );
      fieldCounts.implication += 1;
      changed = true;
    }
    if (!hasWorkplaceTasks(next) && (term.howToUse || term.formula)) {
      next.workplaceTasks = buildOwnedWorkplaceTasks({
        ...next,
        title: term.title || next.title,
        formula: term.formula || next.formula,
        commonMistake: next.commonMistake,
        workedExample: term.example || next.workedExample,
      });
      fieldCounts.workplaceTasks += 1;
      changed = true;
    }

    if (!changed) continue;

    next.locallyDeepenedAt = next.locallyDeepenedAt || now;
    next.sourceProvenance =
      pack.origin === "formula" ? PROVENANCE.FORMULA : PROVENANCE.CODEX;
    if (pack.origin === "formula") next.formulaPackAt = now;
    // Preserve live stamp if present; never invent
    if (card.enrichedAt) next.enrichedAt = card.enrichedAt;
    else delete next.enrichedAt;

    byId.set(card.id, next);
    upgrades += 1;
    if (samples.length < 8) {
      samples.push({
        id: card.id,
        title: card.title,
        origin: pack.origin,
        fields: Object.entries(fieldCounts)
          .filter(([, n]) => n > 0)
          .map(([k]) => k),
      });
    }
  }

  const report = {
    generatedAt: now,
    dryRun,
    glossaryMatching: "exhausted",
    formulaTermsIndexed: formulas.size,
    docsTermsIndexed: docs.size,
    matched,
    upgrades,
    fieldCounts,
    residualOwnedSourceExhaustion: upgrades < 50,
    samples,
  };
  atomicWriteFile(FORMULA_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return { cards: [...byId.values()], report };
}

function countDeepened(cards) {
  return cards.filter((c) => c.locallyDeepenedAt || c.agentAuthoredAt).length;
}

function countThinExamples(cards) {
  return cards.filter((c) => String(c.workedExample || "").trim().length < 120)
    .length;
}

async function run(argv) {
  const dryRun = flag(argv, "--dry-run");
  const phase = flagValue(argv, "--phase", "all");
  const limit = Number(flagValue(argv, "--limit", "2500")) || 2500;

  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  mkdirSync(PIPELINE_DIR, { recursive: true });
  mkdirSync(CORPUS_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  let index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  let cards = Array.isArray(index.cards) ? index.cards : [];
  const before = {
    totalIndexCards: cards.length,
    withEnrichedAt: cards.filter((c) => c.enrichedAt).length,
    locallyDeepenedAt: countDeepened(cards),
    withWorkplaceTasks: cards.filter(hasWorkplaceTasks).length,
    thinExamples: countThinExamples(cards),
  };

  const summary = {
    startedAt,
    dryRun,
    phase,
    before,
    phases: {},
  };

  const runPhase = (name) => phase === "all" || phase === name;

  if (runPhase("provenance")) {
    const result = phaseProvenance(cards, { dryRun });
    cards = result.cards;
    summary.phases.provenance = result.report;
  }
  if (runPhase("formula")) {
    const result = phaseFormula(cards, { dryRun, limit });
    cards = result.cards;
    summary.phases.formula = result.report;
  }
  if (runPhase("workplace")) {
    const result = phaseWorkplace(cards, { dryRun, limit });
    cards = result.cards;
    summary.phases.workplace = result.report;
  }
  if (runPhase("polish-queue")) {
    // Ensure provenance fields present for queue labeling
    if (!summary.phases.provenance) {
      const result = phaseProvenance(cards, { dryRun: true });
      cards = result.cards;
      summary.phases.provenanceDry = result.report;
    }
    summary.phases.polishQueue = phasePolishQueue(cards);
  }

  summary.after = {
    totalIndexCards: cards.length,
    withEnrichedAt: cards.filter((c) => c.enrichedAt).length,
    locallyDeepenedAt: countDeepened(cards),
    withWorkplaceTasks: cards.filter(hasWorkplaceTasks).length,
    thinExamples: countThinExamples(cards),
    cardGrowth: cards.length - before.totalIndexCards,
  };
  summary.finishedAt = new Date().toISOString();

  if (!dryRun && (runPhase("provenance") || runPhase("formula") || runPhase("workplace"))) {
    // Write only changed corpus files for upgraded ids (avoid rewriting 14k files)
    const beforeById = new Map(
      (JSON.parse(readFileSync(INDEX_PATH, "utf8")).cards || []).map((c) => [
        c.id,
        c,
      ]),
    );
    mkdirSync(CORPUS_DIR, { recursive: true });
    let corpusWrites = 0;
    for (const card of cards) {
      const prev = beforeById.get(card.id);
      if (
        prev &&
        prev.sourceProvenance === card.sourceProvenance &&
        prev.agentAuthoredAt === card.agentAuthoredAt &&
        prev.locallyDeepenedAt === card.locallyDeepenedAt &&
        JSON.stringify(prev.workplaceTasks || []) ===
          JSON.stringify(card.workplaceTasks || []) &&
        prev.formula === card.formula &&
        JSON.stringify(prev.sourceQuotes || []) ===
          JSON.stringify(card.sourceQuotes || []) &&
        prev.commonMistake === card.commonMistake &&
        prev.implicationIfIgnored === card.implicationIfIgnored
      ) {
        continue;
      }
      writeFileSync(
        join(CORPUS_DIR, `${card.id}.json`),
        `${JSON.stringify(card, null, 2)}\n`,
        "utf8",
      );
      corpusWrites += 1;
    }
    summary.corpusWrites = corpusWrites;
    safeWriteIndex(INDEX_PATH, cards, { buildIndex: buildIndexFromCards });
  }

  atomicWriteFile(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const argv = process.argv.slice(2);
  withIndexHolder("m3-offline-depth", () => run(argv)).catch((err) => {
    console.error(err);
    process.exitCode = err?.code === "INDEX_HOLDER_BUSY" ? 3 : 1;
  });
}
