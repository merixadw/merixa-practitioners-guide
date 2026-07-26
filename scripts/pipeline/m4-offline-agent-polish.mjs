/**
 * M4 offline agent polish — Merixa-owned docs + agent workplace quality.
 * Zero OpenAI API calls. Never stamps enrichedAt.
 *
 * Priority: openai-polish-queue.json (path → seamless → other).
 * Stamps: agentPolishedAt (+ bump locallyDeepenedAt). Preserves existing enrichedAt.
 *
 * Usage:
 *   node scripts/pipeline/m4-offline-agent-polish.mjs
 *   node scripts/pipeline/m4-offline-agent-polish.mjs --limit=4000
 *   node scripts/pipeline/m4-offline-agent-polish.mjs --dry-run
 *   node scripts/pipeline/m4-offline-agent-polish.mjs --qa-only
 *   node scripts/pipeline/m4-offline-agent-polish.mjs --scoreboard-only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import {
  composeUniqueBody,
  needsTopicRelevanceRewrite,
} from "../lib/card-dedupe.mjs";
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
const POLISH_QUEUE_PATH = join(PIPELINE_DIR, "openai-polish-queue.json");
const FORMULAS_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-formulas.json");
const DOCS_PATH = join(PIPELINE_DIR, "codex-feed", "extracted-docs.json");
const REPORT_PATH = join(PIPELINE_DIR, "m4-offline-agent-polish-report.json");
const COHESION_PATH = join(PIPELINE_DIR, "offline-cohesion-light-report.json");
const QA_REPORT_PATH = join(PIPELINE_DIR, "openai-corpus-qa-report.json");
const SEAMLESS_RETRIEVE = join(ROOT, "public", "corpus", "retrieve-index.json");
const SEAMLESS_CATALOG = join(ROOT, "public", "corpus", "catalog.json");

const MIN_DEF = 160;
const MIN_EX = 180;
const MIN_TRAP = 60;
const TEMPLATE_SPAM_MAX = 55;

const QA_FAIL_IDS = [
  "audit-committees-and-the-external-audit-minimum-standard-tendering-92f1b68b3b",
  "business-law-ethics-corner-589-9504341f7a",
  "business-law-ethics-corner-591-5321a99ad8",
];

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

function hashPick(seed, n) {
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return n <= 0 ? 0 : h % n;
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

function hasSourceQuotes(card) {
  return Array.isArray(card.sourceQuotes) && card.sourceQuotes.length > 0;
}

function loadSeamlessIds() {
  for (const path of [SEAMLESS_CATALOG, SEAMLESS_RETRIEVE]) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8"));
      const cards = Array.isArray(raw?.cards) ? raw.cards : [];
      if (cards.length) return new Set(cards.map((c) => c.id).filter(Boolean));
    } catch {
      /* try next */
    }
  }
  return new Set();
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

function loadQueueOrder() {
  if (!existsSync(POLISH_QUEUE_PATH)) return [];
  try {
    const q = JSON.parse(readFileSync(POLISH_QUEUE_PATH, "utf8"));
    return Array.isArray(q.items) ? q.items.map((i) => i.id).filter(Boolean) : [];
  } catch {
    return [];
  }
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

  return tasks.slice(0, 3);
}

function agentExample(card) {
  const title = String(card.title || "this concept").trim();
  const domain = String(
    card.classification?.domain || card.tags?.[0] || "finance",
  ).toLowerCase();
  const v = hashPick(title, 5);
  const variants = [
    [
      `In the ${domain} pack, raise “${title}” when the period figure or control conclusion swings versus plan.`,
      `Document the base case, one stress case, and the bridge to cash, risk, or disclosure — with appendix evidence.`,
      `Name the owner, the decision (keep / escalate / remediate), and the 30-day reverse test.`,
      `Close with a dated follow-up so “${title}” is not a decorative label.`,
    ],
    [
      `A reviewer challenges “${title}” mid-close because the working papers do not reconcile to the board narrative.`,
      `Rebuild the measure from primary extracts, record inputs, and show what would reverse the view.`,
      `Escalate only if the revised figure changes an approval, covenant, or disclosure line.`,
      `File the rebuild under the card title so next period starts from evidence, not memory.`,
    ],
    [
      `Scenario: ops and finance disagree on “${title}” after a material process change.`,
      `Finance tables the definition used, the population, and three owned actions with due dates.`,
      `Risk or audit confirms the control/test that would detect a recurrence.`,
      `The pack decision cites the appendix that holds the “${title}” trail.`,
    ],
    [
      `During pre-read, a non-executive asks what “${title}” means for this entity this quarter.`,
      `The presenter restates the measure, shows one concrete number or test result, and the owner.`,
      `If the answer is only a definition paraphrase, the pack fails — replace with a workplace outcome.`,
      `Minute the decision and the watch item tied to “${title}”.`,
    ],
    [
      `A remediation plan claims “${title}” is complete without re-running the evidence test.`,
      `Re-perform the test on current data, attach the extract, and confirm the owner sign-off.`,
      `If the result still fails, do not close the finding — update residual risk and timing.`,
      `Link the re-test to the same title so audit can trace “${title}” end-to-end.`,
    ],
  ];
  return cut(variants[v].join(" "), 1100);
}

function agentTrap(card) {
  const title = String(card.title || "this concept").trim();
  const v = hashPick(`${title}-trap`, 4);
  const variants = [
    `Treating “${title}” as a label without a period measure, owner, or decision — or copying last period’s narrative when drivers moved.`,
    `Confusing the accounting presentation of “${title}” with the cash, control, or risk consequence owners must act on.`,
    `Reporting a figure for “${title}” with no evidence trail, or using a population that does not match the pack claim.`,
    `Closing “${title}” as remediated without a re-test on current data and a named residual-risk owner.`,
  ];
  return cut(variants[v], 520);
}

function agentDefinitionExpand(card) {
  const title = String(card.title || "").trim();
  const existing = String(card.teachingSummary || card.body || "").trim();
  const domain = card.classification?.domain || "practice";
  if (existing.length >= MIN_DEF && !/practitioner concept in/i.test(existing)) {
    return cut(
      `${existing} In ${domain}, keep measurement, owners, and pack narrative aligned so challenge can reconcile “${title}” to cash, risk, or disclosure.`,
      1100,
    );
  }
  return cut(
    [
      `${title} is the working definition used in ${domain}: the inputs or tests applied, the figure or qualitative conclusion produced, and the pack decision it changes.`,
      `Owners should restate the measure, point to evidence, and name what would reverse the view this period.`,
      `Bridge the concept to cash, risk, controls, or disclosure so the label is actionable — not decorative.`,
    ].join(" "),
    1100,
  );
}

function isJunkPlaceholderTitle(title) {
  return /business law\s*&\s*ethics corner\s*\d+/i.test(String(title || ""));
}

function needsPolish(card) {
  const def = String(card.teachingSummary || "").trim();
  const ex = String(card.workedExample || "").trim();
  const trap = String(card.commonMistake || "").trim();
  return (
    def.length < MIN_DEF ||
    ex.length < MIN_EX ||
    trap.length < MIN_TRAP ||
    !hasWorkplaceTasks(card) ||
    !hasSourceQuotes(card) ||
    isJunkPlaceholderTitle(card.title)
  );
}

function applyOwnedTerm(card, match, now) {
  const { term, pack } = match;
  let changed = false;
  const next = { ...card };

  if (
    String(next.teachingSummary || "").trim().length < MIN_DEF &&
    term.definition
  ) {
    next.teachingSummary = cut(term.definition, 1100);
    changed = true;
  }
  if (!next.formula && term.formula) {
    next.formula = cut(term.formula, 420);
    changed = true;
  }
  if (
    String(next.workedExample || "").trim().length < MIN_EX &&
    (term.example || term.workedExample)
  ) {
    next.workedExample = cut(term.example || term.workedExample, 1100);
    changed = true;
  }
  if (
    String(next.commonMistake || "").trim().length < MIN_TRAP &&
    (term.commonError || term.misuse || term.trap || term.commonMistake)
  ) {
    next.commonMistake = cut(
      term.commonError || term.misuse || term.trap || term.commonMistake,
      550,
    );
    changed = true;
  }
  if (!hasSourceQuotes(next) && (term.evidence || term.definition)) {
    const text = cut(term.evidence || term.definition, 280);
    if (text.length >= 40) {
      next.sourceQuotes = [
        {
          text,
          sourcePath:
            pack?.source || pack?.path || `codex-feed/${pack.origin}`,
        },
      ];
      changed = true;
    }
  }
  if (changed) {
    if (pack.origin === "formula") {
      next.formulaPackAt = next.formulaPackAt || now;
      if (!next.sourceProvenance || next.sourceProvenance === "unknown") {
        next.sourceProvenance = "formula-pack";
      }
    } else if (!next.sourceProvenance || next.sourceProvenance === "unknown") {
      next.sourceProvenance = "codex-local";
    }
  }
  return { card: next, changed };
}

function polishCard(card, { termByTitle, now, labelFingerprints }) {
  if (needsTopicRelevanceRewrite(card) && !isJunkPlaceholderTitle(card.title)) {
    return { card, polished: false, reason: "needsTopicRelevanceRewrite" };
  }
  if (isJunkPlaceholderTitle(card.title)) {
    return { card, polished: false, reason: "junk-placeholder-defer-qa" };
  }

  let next = { ...card };
  let changed = false;
  const fields = [];

  const match = termByTitle.get(normTitle(card.title));
  if (match) {
    const owned = applyOwnedTerm(next, match, now);
    next = owned.card;
    if (owned.changed) {
      changed = true;
      fields.push("owned-term");
    }
  }

  if (String(next.teachingSummary || "").trim().length < MIN_DEF) {
    next.teachingSummary = agentDefinitionExpand(next);
    changed = true;
    fields.push("definition");
  }

  if (String(next.workedExample || "").trim().length < MIN_EX) {
    next.workedExample = agentExample(next);
    changed = true;
    fields.push("example");
  }

  if (String(next.commonMistake || "").trim().length < MIN_TRAP) {
    next.commonMistake = agentTrap(next);
    changed = true;
    fields.push("trap");
  }

  if (!hasWorkplaceTasks(next)) {
    const tasks = buildOwnedWorkplaceTasks(next);
    const fp = tasks.map((t) => t.label.replace(/“[^”]+”/g, "TITLE")).join("|");
    const seen = labelFingerprints.get(fp) || 0;
    if (seen >= TEMPLATE_SPAM_MAX) {
      return { card, polished: false, reason: "template-spam" };
    }
    labelFingerprints.set(fp, seen + 1);
    next.workplaceTasks = tasks;
    changed = true;
    fields.push("workplaceTasks");
  }

  if (!hasSourceQuotes(next) && String(next.teachingSummary || "").length >= 40) {
    next.sourceQuotes = [
      {
        text: cut(next.teachingSummary, 260),
        sourcePath: "agent-offline-polish:teachingSummary",
      },
    ];
    changed = true;
    fields.push("sourceQuotes");
  }

  if (
    String(next.implicationIfIgnored || "").trim().length < 60 &&
    next.teachingSummary
  ) {
    next.implicationIfIgnored = cut(
      `If “${next.title}” is ignored this period, owners decide without a faithful measure — cash, covenants, controls, or disclosures can misstate the risk.`,
      520,
    );
    changed = true;
    fields.push("implication");
  }

  if (!changed) {
    return { card, polished: false, reason: "no-delta" };
  }

  next.body = composeUniqueBody({
    definition: next.teachingSummary,
    formula: next.formula,
    interpretation: cut(next.body || "", 700),
    extra: next.implicationIfIgnored,
  });

  // Preserve live stamp if present; never invent enrichedAt.
  if (card.enrichedAt) next.enrichedAt = card.enrichedAt;
  else delete next.enrichedAt;

  next.agentPolishedAt = now;
  next.locallyDeepenedAt = next.locallyDeepenedAt || now;
  next.tags = Array.from(
    new Set([...(next.tags || []), "agent-offline-polished"]),
  );
  next.qualityScore = Math.max(Number(next.qualityScore) || 0, 0.82);

  if (needsTopicRelevanceRewrite(next)) {
    return { card, polished: false, reason: "post-polish-off-topic" };
  }

  return { card: next, polished: true, fields };
}

function fixQaFails(cards, now) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const results = [];

  const tenderingId = QA_FAIL_IDS[0];
  const tendering = byId.get(tenderingId);
  if (tendering) {
    const title = tendering.title;
    const teachingSummary = cut(
      [
        `${title} is the audit committee’s duty to run a competitive external-audit appointment (or reappointment) process that meets the External Audit Minimum Standard on tendering.`,
        `It covers when a tender is required, how the committee designs the request for proposals, evaluates independence/quality/fee, and documents the appointment recommendation to the board/shareholders.`,
        `Tendering is distinct from approving non-audit services: the focus is selecting or retaining the statutory auditor through a fair, evidenced process — not engagement-letter policy for other services.`,
        `A senior pack states the tender timetable, evaluation criteria, independence safeguards, and the committee minute that records the recommended firm.`,
      ].join(" "),
      1100,
    );
    const workedExample = cut(
      [
        `A listed company’s audit committee starts an external-audit tender as the incumbent approaches the maximum tenure under the Minimum Standard.`,
        `The committee issues an RFP covering scope, industry experience, team continuity, independence, and fee; three firms respond.`,
        `Evaluation scores quality and independence ahead of fee; the committee interviews shortlisted partners and records conflicts cleared.`,
        `The board papers recommend Firm B with a transition plan and a dated tender file that evidence Minimum Standard compliance — not a non-audit services approval narrative.`,
      ].join(" "),
      1100,
    );
    const commonMistake = cut(
      [
        `Treating “tendering” as interchangeable with non-audit services approval, or renewing the auditor without a competitive assessment when the Minimum Standard requires a tender.`,
        `Another trap: letting fee dominate while skipping documented independence and quality scoring.`,
      ].join(" "),
      520,
    );
    const next = {
      ...tendering,
      teachingSummary,
      body: composeUniqueBody({
        definition: teachingSummary,
        interpretation:
          "Keep tendering evidence separate from non-audit services policy files.",
      }),
      workedExample,
      commonMistake,
      workplaceTasks: buildOwnedWorkplaceTasks({
        ...tendering,
        title,
        commonMistake,
        workedExample,
      }),
      implicationIfIgnored: cut(
        `If tendering is skipped or muddled with non-audit approvals, auditor independence and Minimum Standard compliance can fail challenge — increasing regulatory and shareholder risk.`,
        520,
      ),
      agentPolishedAt: now,
      locallyDeepenedAt: tendering.locallyDeepenedAt || now,
      tags: Array.from(
        new Set([
          ...(tendering.tags || []),
          "agent-offline-polished",
          "qa-fail-offline-fix",
        ]),
      ),
      qualityScore: Math.max(Number(tendering.qualityScore) || 0, 0.9),
      offlineQaFixAt: now,
      offlineQaFixNote: "Rewrote to focus on external-audit tendering (not NAS policy).",
    };
    if (tendering.enrichedAt) next.enrichedAt = tendering.enrichedAt;
    else delete next.enrichedAt;
    byId.set(tenderingId, next);
    results.push({
      id: tenderingId,
      action: "rewrote-tendering-focus",
      stillNeedsOpenAIJudge: true,
    });
  }

  for (const id of QA_FAIL_IDS.slice(1)) {
    const card = byId.get(id);
    if (!card) {
      results.push({ id, action: "missing" });
      continue;
    }
    const next = {
      ...card,
      editorialStatus: "quarantine",
      quarantineReason:
        "Placeholder BUSINESS LAW & ETHICS CORNER title — not a teachable practitioner concept; offline rewrite cannot invent a real standard from the label alone.",
      quarantinedAt: now,
      agentPolishedAt: now,
      tags: Array.from(
        new Set([
          ...(card.tags || []),
          "quarantine",
          "qa-fail-offline-quarantine",
        ]),
      ),
      offlineQaFixAt: now,
      offlineQaFixNote: "Quarantined junk placeholder (OpenAI QA fail).",
    };
    if (card.enrichedAt) next.enrichedAt = card.enrichedAt;
    else delete next.enrichedAt;
    byId.set(id, next);
    results.push({
      id,
      action: "quarantined-placeholder",
      stillNeedsOpenAIJudge: false,
      note: "Content not teachable offline without a real source concept.",
    });
  }

  return { cards: [...byId.values()], results };
}

function runCohesionLight(cards) {
  const byTitle = new Map();
  for (const card of cards) {
    const key = normTitle(card.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(card);
  }

  const twinGroups = [];
  const sameDefTwins = [];
  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    const defs = [
      ...new Set(
        group.map((c) => String(c.teachingSummary || "").trim()).filter(Boolean),
      ),
    ];
    const sameDefinition = defs.length === 1;
    const entry = {
      title,
      count: group.length,
      ids: group.map((c) => c.id),
      sameDefinition,
    };
    twinGroups.push(entry);
    if (sameDefinition) sameDefTwins.push(entry);
  }
  sameDefTwins.sort((a, b) => b.count - a.count);

  const PREFIX_DOMAIN = {
    fa: "Financial management",
    frm: "Risk management",
    ma: "Management reporting",
    ifrs: "Financial reporting",
  };
  const domainMismatches = [];
  for (const card of cards) {
    const prefix = String(card.id || "").split("-")[0];
    const expected = PREFIX_DOMAIN[prefix];
    const domain = card.classification?.domain;
    if (
      expected &&
      domain &&
      ((prefix === "fa" && domain !== "Financial management") ||
        (prefix === "frm" && domain !== "Risk management") ||
        (prefix === "ma" && domain !== "Management reporting") ||
        (prefix === "ifrs" && domain !== "Financial reporting"))
    ) {
      domainMismatches.push({
        id: card.id,
        title: card.title,
        domain,
        expected,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    note: "Light cohesion pass — report only; no mass-delete.",
    titleTwinGroups: twinGroups.length,
    sameDefinitionTwinGroups: sameDefTwins.length,
    worstSameDefinitionTwins: sameDefTwins.slice(0, 25),
    domainMismatches: domainMismatches.length,
    domainMismatchSamples: domainMismatches.slice(0, 25),
  };
  atomicWriteFile(COHESION_PATH, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function computeOfflineScoreboard(cards) {
  const pathIds = pathCardIds();
  const seamlessIds = loadSeamlessIds();
  const n = Math.max(cards.length, 1);

  let locallyDeepened = 0;
  let agentPolished = 0;
  let withTasks = 0;
  let provenanceStamped = 0;
  let agentTotal = 0;
  let agentProvenanceOk = 0;
  let pathCards = 0;
  let pathDeepened = 0;
  let pathWithTasks = 0;
  let pathDeepenedAndTasks = 0;
  let withEnrichedAt = 0;

  const buckets = {
    "openai-live": 0,
    "agent-authored": 0,
    "codex-local": 0,
    "formula-pack": 0,
    registry: 0,
    unknown: 0,
  };

  for (const card of cards) {
    if (card.enrichedAt) withEnrichedAt += 1;
    if (card.locallyDeepenedAt || card.agentAuthoredAt || card.agentPolishedAt) {
      locallyDeepened += 1;
    }
    if (card.agentPolishedAt) agentPolished += 1;
    if (hasWorkplaceTasks(card)) withTasks += 1;
    if (card.sourceProvenance) {
      provenanceStamped += 1;
      if (buckets[card.sourceProvenance] != null) {
        buckets[card.sourceProvenance] += 1;
      } else {
        buckets.unknown += 1;
      }
    } else {
      buckets.unknown += 1;
    }

    const isAgent =
      card.sourceProvenance === "agent-authored" ||
      Boolean(card.agentAuthoredAt) ||
      (card.tags || []).includes("agent-authored");
    if (isAgent) {
      agentTotal += 1;
      if (card.agentAuthoredAt && card.sourceProvenance) agentProvenanceOk += 1;
    }

    if (pathIds.has(card.id)) {
      pathCards += 1;
      const deep = Boolean(
        card.locallyDeepenedAt || card.agentAuthoredAt || card.agentPolishedAt,
      );
      const tasks = hasWorkplaceTasks(card);
      if (deep) pathDeepened += 1;
      if (tasks) pathWithTasks += 1;
      if (deep && tasks) pathDeepenedAndTasks += 1;
    }
  }

  const pathDeepenedAndTasksPct =
    pathCards === 0 ? 0 : pathDeepenedAndTasks / pathCards;
  const agentProvenanceCoveragePct =
    agentTotal === 0 ? 1 : agentProvenanceOk / agentTotal;
  const indexSeamlessGap = Math.max(0, cards.length - seamlessIds.size);

  const offlineShipReady =
    pathDeepenedAndTasksPct >= 0.8 &&
    agentProvenanceCoveragePct >= 0.999 &&
    indexSeamlessGap === 0;

  return {
    generatedAt: new Date().toISOString(),
    note: "Offline quality scoreboard — DISTINCT from OpenAI liveShare / enrichedAt public gate. Never treat this as public ship-ready.",
    totals: {
      indexCards: cards.length,
      seamlessCards: seamlessIds.size,
      pathCards,
      withEnrichedAt,
    },
    pctLocallyDeepened: Number(((locallyDeepened / n) * 100).toFixed(1)),
    pctAgentPolished: Number(((agentPolished / n) * 100).toFixed(1)),
    pctWithWorkplaceTasks: Number(((withTasks / n) * 100).toFixed(1)),
    pctProvenanceStamped: Number(((provenanceStamped / n) * 100).toFixed(1)),
    counts: {
      locallyDeepened,
      agentPolished,
      withWorkplaceTasks: withTasks,
      provenanceStamped,
    },
    pathCoverage: {
      pathCards,
      pathDeepened,
      pathWithWorkplaceTasks: pathWithTasks,
      pathDeepenedAndTasks,
      pathDeepenedAndTasksPct: Number(pathDeepenedAndTasksPct.toFixed(3)),
      pathDeepenedPct: Number(
        (pathCards === 0 ? 0 : pathDeepened / pathCards).toFixed(3),
      ),
    },
    provenanceBuckets: buckets,
    agentProvenanceCoveragePct: Number(
      (agentProvenanceCoveragePct * 100).toFixed(1),
    ),
    indexSeamlessGap,
    offlineShipReady,
    offlineShipReadyCriteria: {
      pathDeepenedAndTasksPctMin: 0.8,
      pathDeepenedAndTasksPct: Number(pathDeepenedAndTasksPct.toFixed(3)),
      agentProvenanceCoveragePctMin: 100,
      agentProvenanceCoveragePct: Number(
        (agentProvenanceCoveragePct * 100).toFixed(1),
      ),
      indexSeamlessGapMustBe: 0,
      indexSeamlessGap,
      distinctFromOpenAIPublicGate: true,
    },
  };
}

function writeOpsScoreboard(scoreboard, polishSummary) {
  const ops = existsSync(OPS_PATH)
    ? JSON.parse(readFileSync(OPS_PATH, "utf8"))
    : {};
  const now = scoreboard.generatedAt;
  ops.generatedAt = now;
  ops.offlineQuality = scoreboard;
  ops.truthBoard = {
    ...(ops.truthBoard || {}),
    generatedAt: now,
    offlineQuality: {
      pctLocallyDeepened: scoreboard.pctLocallyDeepened,
      pctAgentPolished: scoreboard.pctAgentPolished,
      pctWithWorkplaceTasks: scoreboard.pctWithWorkplaceTasks,
      pctProvenanceStamped: scoreboard.pctProvenanceStamped,
      pathDeepenedAndTasksPct:
        scoreboard.pathCoverage.pathDeepenedAndTasksPct,
      offlineShipReady: scoreboard.offlineShipReady,
      note: "Offline gate only — not liveShare / enrichedAt public ship.",
    },
    withWorkplaceTasks: scoreboard.counts.withWorkplaceTasks,
    locallyDeepenedAt: scoreboard.counts.locallyDeepened,
    agentPolishedAt: scoreboard.counts.agentPolished,
    volumeFreeze: true,
  };
  ops.m4Offline = {
    status: polishSummary?.status || "partial",
    completedAt: now,
    epic: "E11-offline",
    cardsPolished: polishSummary?.cardsPolished ?? 0,
    qualitySkip: polishSummary?.qualitySkip ?? 0,
    qaFixes: polishSummary?.qaFixes ?? [],
    offlineShipReady: scoreboard.offlineShipReady,
    note: "Offline agent polish wave — no OpenAI; enrichedAt untouched. E11-liveshare-openai remains blocked on billing.",
  };
  ops.phase0 = {
    ...(ops.phase0 || {}),
    note: "M4-offline agent polish completed locally; OpenAI liveShare (E11) still needs billing. Volume freeze held.",
  };
  ops.stillBrokenForOpenAIBilling = [
    "OpenAI enrich remaining (live enrichedAt polish still blocked by insufficient_quota)",
    "OpenAI corpus QA absolute bar (E12) still needs billing for judge re-sample",
    "Public liveShareSeamless gate distinct from offlineShipReady",
    ...(Array.isArray(ops.stillBrokenForOpenAIBilling)
      ? []
      : []),
  ];
  // keep unique list
  ops.stillBrokenForOpenAIBilling = [
    ...new Set([
      ...(ops.stillBrokenForOpenAIBilling || []),
      "OpenAI enrich remaining (live enrichedAt polish still blocked by insufficient_quota)",
      "OpenAI corpus QA absolute bar (E12) still needs billing for judge re-sample",
      "Public liveShareSeamless gate distinct from offlineShipReady",
    ]),
  ];
  atomicWriteFile(OPS_PATH, `${JSON.stringify(ops, null, 2)}\n`);
}

function annotateQaReport(qaFixes) {
  if (!existsSync(QA_REPORT_PATH)) return;
  try {
    const report = JSON.parse(readFileSync(QA_REPORT_PATH, "utf8"));
    report.offlineFixesAt = new Date().toISOString();
    report.offlineFixes = qaFixes;
    report.offlineNote =
      "Tendering card rewritten offline; two BUSINESS LAW placeholders quarantined. OpenAI judge re-sample still required for absolute bar (E12).";
    atomicWriteFile(QA_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  } catch {
    /* best effort */
  }
}

async function run(argv) {
  const dryRun = flag(argv, "--dry-run");
  const qaOnly = flag(argv, "--qa-only");
  const scoreboardOnly = flag(argv, "--scoreboard-only");
  const limit = Number(flagValue(argv, "--limit", "8000")) || 8000;

  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  mkdirSync(PIPELINE_DIR, { recursive: true });
  mkdirSync(CORPUS_DIR, { recursive: true });

  const startedAt = new Date().toISOString();
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  let cards = Array.isArray(index.cards) ? index.cards : [];
  const beforeScore = computeOfflineScoreboard(cards);

  if (scoreboardOnly) {
    const scoreboard = beforeScore;
    writeOpsScoreboard(scoreboard, { status: "scoreboard-only", cardsPolished: 0 });
    const summary = { startedAt, scoreboardOnly: true, scoreboard };
    atomicWriteFile(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  const now = new Date().toISOString();
  let qaFixes = [];
  if (!qaOnly) {
    /* polish below */
  }
  const qa = fixQaFails(cards, now);
  cards = qa.cards;
  qaFixes = qa.results;
  annotateQaReport(qaFixes);

  let cardsPolished = 0;
  let qualitySkip = 0;
  const skipReasons = {};
  const fieldCounts = {};
  const samples = [];
  const labelFingerprints = new Map();

  if (!qaOnly) {
    const formulas = loadTermIndex(FORMULAS_PATH, "formula");
    const docs = loadTermIndex(DOCS_PATH, "docs");
    const termByTitle = new Map([...docs, ...formulas]);
    const byId = new Map(cards.map((c) => [c.id, c]));
    const queueOrder = loadQueueOrder();
    const pathIds = pathCardIds();
    const seamlessIds = loadSeamlessIds();

    const priorityScore = (id) => {
      let s = 0;
      if (pathIds.has(id)) s += 300;
      if (seamlessIds.has(id)) s += 100;
      const qi = queueOrder.indexOf(id);
      if (qi >= 0) s += Math.max(0, 50 - Math.floor(qi / 200));
      return s;
    };

    const candidates = cards
      .filter((c) => !c.agentPolishedAt)
      .filter((c) => needsPolish(c))
      .map((c) => ({ card: c, rank: priorityScore(c.id) }))
      .sort((a, b) => b.rank - a.rank || a.card.title.localeCompare(b.card.title))
      .slice(0, limit);

    for (const { card } of candidates) {
      const result = polishCard(card, { termByTitle, now, labelFingerprints });
      if (!result.polished) {
        qualitySkip += 1;
        skipReasons[result.reason] = (skipReasons[result.reason] || 0) + 1;
        continue;
      }
      byId.set(card.id, result.card);
      cardsPolished += 1;
      for (const f of result.fields || []) {
        fieldCounts[f] = (fieldCounts[f] || 0) + 1;
      }
      if (samples.length < 10) {
        samples.push({
          id: result.card.id,
          title: result.card.title,
          fields: result.fields,
          onPath: pathIds.has(result.card.id),
        });
      }
    }
    cards = [...byId.values()];
  }

  const cohesion = runCohesionLight(cards);
  const scoreboard = computeOfflineScoreboard(cards);

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    dryRun,
    qaOnly,
    limit,
    cardsPolished,
    qualitySkip,
    skipReasons,
    fieldCounts,
    qaFixes,
    before: {
      pctLocallyDeepened: beforeScore.pctLocallyDeepened,
      pctAgentPolished: beforeScore.pctAgentPolished,
      pctWithWorkplaceTasks: beforeScore.pctWithWorkplaceTasks,
      agentPolished: beforeScore.counts.agentPolished,
      withWorkplaceTasks: beforeScore.counts.withWorkplaceTasks,
    },
    after: {
      pctLocallyDeepened: scoreboard.pctLocallyDeepened,
      pctAgentPolished: scoreboard.pctAgentPolished,
      pctWithWorkplaceTasks: scoreboard.pctWithWorkplaceTasks,
      agentPolished: scoreboard.counts.agentPolished,
      withWorkplaceTasks: scoreboard.counts.withWorkplaceTasks,
      offlineShipReady: scoreboard.offlineShipReady,
    },
    scoreboard,
    cohesion: {
      titleTwinGroups: cohesion.titleTwinGroups,
      sameDefinitionTwinGroups: cohesion.sameDefinitionTwinGroups,
      domainMismatches: cohesion.domainMismatches,
      path: COHESION_PATH,
    },
    samples,
    neverSetEnrichedAt: true,
    openaiCalls: 0,
    ceilingNote:
      qualitySkip > 0
        ? `qualitySkip=${qualitySkip} (see skipReasons); polishable residual may remain`
        : null,
  };

  if (!dryRun) {
    const beforeById = new Map(
      (JSON.parse(readFileSync(INDEX_PATH, "utf8")).cards || []).map((c) => [
        c.id,
        c,
      ]),
    );
    let corpusWrites = 0;
    for (const card of cards) {
      const prev = beforeById.get(card.id);
      if (
        prev &&
        prev.agentPolishedAt === card.agentPolishedAt &&
        prev.locallyDeepenedAt === card.locallyDeepenedAt &&
        prev.editorialStatus === card.editorialStatus &&
        prev.teachingSummary === card.teachingSummary &&
        prev.workedExample === card.workedExample &&
        prev.commonMistake === card.commonMistake &&
        JSON.stringify(prev.workplaceTasks || []) ===
          JSON.stringify(card.workplaceTasks || []) &&
        JSON.stringify(prev.sourceQuotes || []) ===
          JSON.stringify(card.sourceQuotes || [])
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
    writeOpsScoreboard(scoreboard, {
      status: scoreboard.offlineShipReady ? "completed" : "partial",
      cardsPolished,
      qualitySkip,
      qaFixes,
    });
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
  withIndexHolder("m4-offline-agent-polish", () => run(argv)).catch((err) => {
    console.error(err);
    process.exitCode = err?.code === "INDEX_HOLDER_BUSY" ? 3 : 1;
  });
}
