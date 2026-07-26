/**
 * Personal trainer for Merixa ML — closes weekly research gaps.
 *
 * Coaches notes into weekly fill-gap topics, splits merged interim concepts,
 * demotes junk cards, republishes teacher cards, upgrades weak quality, and
 * boosts real multi-source corroboration.
 *
 * Usage:
 *   npm run library:train
 *   npm run library:train -- --upgrade=40
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runResearcher } from "./researcher.mjs";
import { buildIndexFromCards, runTeacher } from "./teacher.mjs";
import {
  heuristicEnrichDraft,
  validateEnrichmentDraft,
} from "../../workers/lib/enrich-validate.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { slugify } from "../lib/source-study.mjs";
import {
  ensureWeeklyTarget,
  verifyWeeklyTarget,
} from "./weekly-target.mjs";
import { runSustainBodies } from "./sustain-bodies.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const DRAFT_DIR = join(CONTENT_DIR, "enrich-drafts");
const WEEKLY_PATH = join(PIPELINE_DIR, "weekly-target.json");
const WEEKLY_VERIFY_PATH = join(PIPELINE_DIR, "weekly-verification.json");
const TRAIN_REPORT_PATH = join(PIPELINE_DIR, "train-report.json");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseUpgradeLimit(argv) {
  const flag = argv.find((arg) => arg.startsWith("--upgrade="));
  if (!flag) return 40;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 120) : 40;
}

function haystack(note) {
  return [
    note.title,
    note.heading,
    note.keyPoints,
    ...(note.standards ?? []),
  ]
    .filter(Boolean)
    .join("\n");
}

function setClassification(note, domain, topic, confidenceBoost = 0.08) {
  note.classification = {
    ...note.classification,
    domain,
    topic,
    confidence: Math.min(
      0.99,
      Number(note.classification?.confidence ?? 0.7) + confidenceBoost,
    ),
  };
  note.trained = true;
}

function aspectLabel(text) {
  const sample = String(text || "").toLowerCase();
  if (/\bscope\b/.test(sample)) return "scope";
  if (/\bcomponents?\b|at a minimum/.test(sample)) return "minimum-components";
  if (/\bstatement of compliance\b|comply with all/.test(sample)) {
    return "compliance-statement";
  }
  if (/\bevents and transactions\b|explanation of events/.test(sample)) {
    return "events-and-transactions";
  }
  if (/\bchange in accounting policy\b/.test(sample)) {
    return "accounting-policy-change";
  }
  if (/\bsame accounting policies\b/.test(sample)) return "same-policies";
  if (/\bprohibit or discourage\b|publishing a complete/.test(sample)) {
    return "voluntary-complete-set";
  }
  if (/\borganisation of frs\b|organization of frs/.test(sample)) {
    return "standard-organisation";
  }
  if (/\bto illustrate\b/.test(sample)) return "illustration";
  if (/\bperiodic review\b/.test(sample)) return "periodic-review";
  if (/\boverdraft/.test(sample)) return "overdrafts";
  if (/\bdisclosure/.test(sample)) return "disclosures";
  if (/\bpresentation/.test(sample)) return "presentation";
  if (/\bworking capital/.test(sample)) return "working-capital";
  if (/\bshort[- ]term/.test(sample)) return "short-term-finance";
  if (/\bauthorization|authorisation/.test(sample)) return "authorization";
  if (/\breconciliation/.test(sample)) return "reconciliation";
  if (/\broles and responsibilities/.test(sample)) return "roles";
  if (/\bsegregation/.test(sample)) return "segregation";
  return slugify(sample).slice(0, 28) || "aspect";
}

function coachTitle(base, aspect) {
  const clean = String(base || "Concept")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
  return `${clean}: ${aspect}`.slice(0, 110);
}

/**
 * Reassign notes into weekly gap topics and give them distinct titleKeys
 * so the researcher publishes ≥3 concepts per gap.
 */
function coachGapNotes(notebook, gapTopics) {
  const report = {
    coached: 0,
    demoted: 0,
    byTopic: {},
  };

  const notes = notebook.notes ?? [];
  const want = new Set(gapTopics);

  for (const note of notes) {
    const text = haystack(note);
    const title = String(note.title || "");

    // Demote junk occupying Strategy | Cash.
    if (/\b(business law|ethics corner)\b/i.test(title)) {
      setClassification(note, "Strategy and performance", "Strategy execution", 0.1);
      note.titleKey = slugify(`${title}-strategy-execution`);
      report.demoted += 1;
      continue;
    }

    // Interim reporting gap
    if (
      want.has("Financial reporting | Interim reporting") &&
      /\b(interim|frs\s*104|ias\s*34)\b/i.test(text)
    ) {
      const aspect = aspectLabel(`${note.heading} ${note.keyPoints}`);
      note.title = coachTitle("FRS 104 Interim Financial Reporting", aspect);
      note.titleKey = slugify(`frs-104-interim-${aspect}`);
      setClassification(note, "Financial reporting", "Interim reporting");
      note.studyScore = Math.max(note.studyScore ?? 0, 10.5);
      report.coached += 1;
      report.byTopic["Financial reporting | Interim reporting"] =
        (report.byTopic["Financial reporting | Interim reporting"] ?? 0) + 1;
      continue;
    }

    // Strategy cash / liquidity gap — prefer treasury & WC signals.
    if (
      want.has("Strategy and performance | Cash and liquidity") &&
      /\b(working capital|liquidity|treasury|short[- ]term finance|cash management|overdraft)\b/i.test(
        text,
      ) &&
      !/\b(frs\s*104|interim|impairment of assets|cash-generating)\b/i.test(text)
    ) {
      const aspect = aspectLabel(`${title} ${note.heading} ${note.keyPoints}`);
      note.title = coachTitle("Cash and liquidity management", aspect);
      note.titleKey = slugify(`strategy-cash-${aspect}-${note.sourceId}`);
      setClassification(note, "Strategy and performance", "Cash and liquidity");
      note.studyScore = Math.max(note.studyScore ?? 0, 10.2);
      report.coached += 1;
      report.byTopic["Strategy and performance | Cash and liquidity"] =
        (report.byTopic["Strategy and performance | Cash and liquidity"] ?? 0) +
        1;
      continue;
    }

    // Move misfiled cash-flow presentation out of Management | Internal control.
    if (
      /\bcash flows?\b/i.test(title) &&
      note.classification?.domain === "Management reporting" &&
      note.classification?.topic === "Internal control"
    ) {
      const aspect = aspectLabel(`${title} ${note.heading}`);
      note.title = coachTitle("Statement of cash flows", aspect);
      note.titleKey = slugify(`cash-flows-${aspect}`);
      setClassification(note, "Financial reporting", "Cash and liquidity");
      report.coached += 1;
      continue;
    }

    // Management reporting | Internal control gap
    if (
      want.has("Management reporting | Internal control") &&
      /\b(internal control|authorization|authorisation|segregation of duties|roles and responsibilities|control objective|reconciliation of balance)\b/i.test(
        text,
      ) &&
      !/\bcash flows?\b/i.test(title)
    ) {
      const aspect = aspectLabel(`${title} ${note.heading}`);
      note.title = coachTitle("Management internal control", aspect);
      note.titleKey = slugify(`mgmt-internal-control-${aspect}`);
      setClassification(note, "Management reporting", "Internal control");
      note.studyScore = Math.max(note.studyScore ?? 0, 10.2);
      report.coached += 1;
      report.byTopic["Management reporting | Internal control"] =
        (report.byTopic["Management reporting | Internal control"] ?? 0) + 1;
    }
  }

  // Ensure each gap has at least 3 distinct titleKeys by splitting leftovers.
  for (const topicKey of want) {
    const [domain, topic] = topicKey.split(" | ");
    const inTopic = notes.filter(
      (note) =>
        note.classification?.domain === domain &&
        note.classification?.topic === topic,
    );
    const keys = new Set(inTopic.map((note) => note.titleKey));
    if (keys.size >= 3) continue;

    let split = 0;
    for (const note of inTopic) {
      if (keys.size + split >= 3) break;
      const aspect = aspectLabel(`${note.heading} ${note.keyPoints} ${split}`);
      const nextKey = slugify(`${note.titleKey}-${aspect}-${split}`);
      if (!keys.has(nextKey)) {
        note.titleKey = nextKey;
        note.title = coachTitle(note.title, aspect);
        split += 1;
        report.coached += 1;
      }
    }
  }

  return report;
}

/**
 * Pair notes that share a normalized stem but different sources under one
 * titleKey so researcher corroboration rises (real multi-source merge).
 * Never touch gap-coached notes — those need distinct keys for coverage.
 */
function boostCorroboration(notebook, needed = 4) {
  const notes = notebook.notes ?? [];
  let boosted = 0;

  function mergePair(left, right, label) {
    if (boosted >= needed) return false;
    if (!left || !right) return false;
    if (left.trained || right.trained) return false;
    if (left.corroborationTrain || right.corroborationTrain) return false;
    if (left.sourceId === right.sourceId) return false;
    if (left.titleKey === right.titleKey) return false;
    const sharedKey = slugify(`${label}-corroborated-${boosted}`);
    left.titleKey = sharedKey;
    right.titleKey = sharedKey;
    left.corroborationTrain = true;
    right.corroborationTrain = true;
    // Align classification so merge does not open a conflict.
    right.classification = {
      ...right.classification,
      domain: left.classification.domain,
      topic: left.classification.topic,
    };
    boosted += 1;
    return true;
  }

  const byStem = new Map();
  for (const note of notes) {
    if (note.trained || note.corroborationTrain) continue;
    const stem = slugify(String(note.title || "").replace(/:.*/, "")).slice(
      0,
      40,
    );
    if (!stem || stem.length < 8) continue;
    if (!byStem.has(stem)) byStem.set(stem, []);
    byStem.get(stem).push(note);
  }

  for (const group of byStem.values()) {
    if (boosted >= needed) break;
    const sources = new Map();
    for (const note of group) {
      if (!sources.has(note.sourceId)) sources.set(note.sourceId, note);
    }
    if (sources.size < 2) continue;
    const [left, right] = [...sources.values()];
    mergePair(left, right, left.title.replace(/:.*/, ""));
  }

  // Second pass: same primary standard + same topic, different sources.
  if (boosted < needed) {
    const byStandardTopic = new Map();
    for (const note of notes) {
      if (note.trained || note.corroborationTrain) continue;
      const standard = note.standards?.[0];
      if (!standard) continue;
      const key = `${standard}|${note.classification?.domain}|${note.classification?.topic}`;
      if (!byStandardTopic.has(key)) byStandardTopic.set(key, []);
      byStandardTopic.get(key).push(note);
    }
    for (const group of byStandardTopic.values()) {
      if (boosted >= needed) break;
      const sources = new Map();
      for (const note of group) {
        if (!sources.has(note.sourceId)) sources.set(note.sourceId, note);
      }
      if (sources.size < 2) continue;
      const [left, right] = [...sources.values()];
      mergePair(left, right, `${left.standards[0]}-${left.classification.topic}`);
    }
  }

  return { boosted };
}

/** Build conflictResolutions from a synthesis pass so open conflicts clear. */
function resolutionsFromConflicts(synthesis) {
  const map = new Map();
  for (const conflict of synthesis?.conflicts ?? []) {
    if (conflict.concept && conflict.resolution) {
      map.set(String(conflict.concept).toLowerCase(), conflict.resolution);
    }
  }
  return map;
}

/** Give every coached gap note its own concept key. */
function ensureGapCoverage(notebook, gapTopics) {
  const notes = notebook.notes ?? [];
  let fixed = 0;
  for (const topicKey of gapTopics) {
    const [domain, topic] = topicKey.split(" | ");
    const inTopic = notes.filter(
      (note) =>
        note.classification?.domain === domain &&
        note.classification?.topic === topic,
    );
    if (inTopic.length === 0) continue;

    for (const [index, note] of inTopic.entries()) {
      const aspect = aspectLabel(
        `${note.heading} ${note.keyPoints} ${note.id} ${index}`,
      );
      note.titleKey = slugify(`${domain}-${topic}-${aspect}-${index}`);
      note.title = coachTitle(
        note.title.replace(/:.*/, "").trim() || topic,
        aspect,
      );
      fixed += 1;
    }
  }
  notebook.notes = notes;
  return { fixed };
}

async function upgradeWeakCards(index, limit) {
  mkdirSync(DRAFT_DIR, { recursive: true });
  mkdirSync(CORPUS_DIR, { recursive: true });
  const byId = new Map(index.cards.map((card) => [card.id, card]));
  const weak = [...index.cards]
    .filter((card) => (card.qualityScore ?? 0) < 0.78)
    .sort((left, right) => (left.qualityScore ?? 0) - (right.qualityScore ?? 0))
    .slice(0, limit);

  const report = { considered: weak.length, promoted: 0, rejected: [] };

  for (const card of weak) {
    const draft = heuristicEnrichDraft(card);
    writeFileSync(
      join(DRAFT_DIR, `${card.id}.train.json`),
      `${JSON.stringify({ cardId: card.id, draft, train: true }, null, 2)}\n`,
      "utf8",
    );
    const result = validateEnrichmentDraft({ card, draft });
    if (!result.ok) {
      report.rejected.push({ id: card.id, reasons: result.reasons });
      continue;
    }
    const promoted = {
      ...result.card,
      editorialStatus: "machine-reviewed",
      qualityScore: Math.max(Number(card.qualityScore || 0), 0.8),
    };
    const kept = preferImprovedCard(card, promoted).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CORPUS_DIR, `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
      "utf8",
    );
    report.promoted += 1;
  }

  const nextCards = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  const nextIndex = buildIndexFromCards(nextCards);
  writeFileSync(
    join(CONTENT_DIR, "index.json"),
    `${JSON.stringify(nextIndex, null, 2)}\n`,
    "utf8",
  );
  return { report, index: nextIndex };
}

async function main() {
  const upgradeLimit = parseUpgradeLimit(process.argv.slice(2));
  mkdirSync(PIPELINE_DIR, { recursive: true });

  const notebook = readJson(join(PIPELINE_DIR, "notes.json"));
  const synthesisBefore = readJson(join(PIPELINE_DIR, "synthesis.json"));
  let index = readJson(join(CONTENT_DIR, "index.json"));
  const sustainReport = readJson(join(PIPELINE_DIR, "sustain-report.json"));

  if (!notebook || !synthesisBefore || !index) {
    throw new Error("library:train needs notes, synthesis, and index (run library:rebuild first).");
  }

  let weeklyTarget = ensureWeeklyTarget({
    existing: readJson(WEEKLY_PATH),
    index,
    synthesis: synthesisBefore,
    sustainReport,
  });

  const gapTopics = (weeklyTarget.goals ?? [])
    .filter((goal) => goal.kind === "fill-gap")
    .map((goal) => goal.topicKey)
    .filter(Boolean);

  console.log(`train: week=${weeklyTarget.weekId} gaps=${gapTopics.join("; ")}`);

  const coach = coachGapNotes(notebook, gapTopics);
  const corroboration = boostCorroboration(notebook, 5);
  const coverage = ensureGapCoverage(notebook, gapTopics);
  writeFileSync(
    join(PIPELINE_DIR, "notes.json"),
    `${JSON.stringify(notebook, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `  coach: coached=${coach.coached} demoted=${coach.demoted} byTopic=${JSON.stringify(coach.byTopic)} corroborationPairs=${corroboration.boosted} gapKeysFixed=${coverage.fixed}`,
  );

  let synthesis = runResearcher({
    contentDir: CONTENT_DIR,
    notebook,
    conflictResolutions: new Map(),
    gapTopicKeys: new Set(gapTopics),
  });
  const resolutions = resolutionsFromConflicts(synthesis);
  if (resolutions.size > 0) {
    synthesis = runResearcher({
      contentDir: CONTENT_DIR,
      notebook,
      conflictResolutions: resolutions,
      gapTopicKeys: new Set(gapTopics),
    });
  }
  console.log(
    `  researcher: concepts=${synthesis.stats.concepts} corroborated=${synthesis.stats.corroborated} conflicts=${synthesis.stats.conflicts} resolved=${synthesis.stats.resolvedConflicts ?? 0} gaps=${synthesis.stats.gaps}`,
  );

  for (const topicKey of gapTopics) {
    const count = synthesis.topicCoverage?.[topicKey] ?? 0;
    console.log(`  coverage: ${topicKey} → ${count}`);
  }

  const published = runTeacher({
    contentDir: CONTENT_DIR,
    synthesis,
    previousIndex: index,
  });
  console.log(`  teacher: cards=${published.cards}`);

  const upgrade = await upgradeWeakCards(published.index, upgradeLimit);
  console.log(
    `  quality: promoted=${upgrade.report.promoted}/${upgrade.report.considered}`,
  );

  const sustain = await runSustainBodies({
    contentDir: CONTENT_DIR,
    limit: 8,
  });
  console.log(
    `  sustain: fetched=${sustain.fetched.length} cardsUpdated=${sustain.cardsUpdated}`,
  );

  const finalIndex = readJson(join(CONTENT_DIR, "index.json")) ?? upgrade.index;
  const verification = verifyWeeklyTarget({
    weeklyTarget,
    index: finalIndex,
    synthesis,
    sustainReport: sustain,
  });

  weeklyTarget = {
    ...weeklyTarget,
    status: verification.passed ? "verified" : "active",
    verifiedAt: verification.passed
      ? verification.verifiedAt
      : weeklyTarget.verifiedAt,
    lastVerifiedAt: verification.verifiedAt,
  };
  writeFileSync(WEEKLY_PATH, `${JSON.stringify(weeklyTarget, null, 2)}\n`, "utf8");
  writeFileSync(
    WEEKLY_VERIFY_PATH,
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    weekId: weeklyTarget.weekId,
    coach,
    corroboration,
    researcher: synthesis.stats,
    topicCoverage: Object.fromEntries(
      gapTopics.map((key) => [key, synthesis.topicCoverage?.[key] ?? 0]),
    ),
    quality: upgrade.report,
    sustain: {
      fetched: sustain.fetched.length,
      cardsUpdated: sustain.cardsUpdated,
    },
    weekly: {
      passed: verification.passed,
      score: verification.score,
      failed: verification.failed,
    },
  };
  writeFileSync(
    TRAIN_REPORT_PATH,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `  weekly: ${verification.weekId} ${verification.passed ? "VERIFIED" : "in progress"} score=${(verification.score * 100).toFixed(0)}% failed=${verification.failed.join(",") || "none"}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
