/**
 * Improvement-only Library guardrails.
 * Pipelines may add cards or deepen teaching fields — never silently regress.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { needsTopicRelevanceRewrite } from "./card-dedupe.mjs";
import { backupCorpus } from "./corpus-backup.mjs";

export function teachingDepthScore(card) {
  if (!card || typeof card !== "object") return 0;
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  const trap = String(card.commonMistake || "");
  const implication = String(card.implicationIfIgnored || "");
  const trigger = String(card.realWorldTrigger || "");
  const enrichedBonus = card.enrichedAt ? 8_000 : 0;
  const deepenedBonus = card.deepenedAt ? 2_000 : 0;
  const quality = Number(card.qualityScore);
  const qualityBonus = Number.isFinite(quality) ? quality * 200 : 0;
  return (
    definition.length +
    example.length +
    trap.length +
    implication.length +
    trigger.length +
    enrichedBonus +
    deepenedBonus +
    qualityBonus
  );
}

export function snapshotLibraryHealth(index) {
  const cards = Array.isArray(index?.cards) ? index.cards : [];
  let enriched = 0;
  let deep = 0;
  let depthSum = 0;
  for (const card of cards) {
    const score = teachingDepthScore(card);
    depthSum += score;
    if (card.enrichedAt) enriched += 1;
    const definition = String(card.teachingSummary || card.body || "");
    const example = String(card.workedExample || "");
    if (definition.length >= 280 && example.length >= 450) deep += 1;
  }
  return {
    cardCount: cards.length,
    enrichedCount: enriched,
    deepCount: deep,
    depthSum,
    averageDepth:
      cards.length > 0 ? Math.round(depthSum / cards.length) : 0,
    generatedAt: index?.generatedAt ?? null,
  };
}

export function readLibraryHealth(contentDir) {
  const indexPath = join(contentDir, "index.json");
  if (!existsSync(indexPath)) {
    return snapshotLibraryHealth({ cards: [] });
  }
  try {
    return snapshotLibraryHealth(
      JSON.parse(readFileSync(indexPath, "utf8")),
    );
  } catch {
    return snapshotLibraryHealth({ cards: [] });
  }
}

function longerText(left, right) {
  const a = String(left || "");
  const b = String(right || "");
  return b.length > a.length ? b : a;
}

function unionStrings(left = [], right = []) {
  return [...new Set([...left, ...right].map(String).filter(Boolean))];
}

/**
 * Pick teaching field text. Length never beats relevance or live enrich.
 * When preferIncoming, use incoming if present; else fall back to existing.
 */
function preferTeachingText(existingText, incomingText, preferIncoming) {
  const a = String(existingText || "");
  const b = String(incomingText || "");
  if (preferIncoming) return b || a;
  return longerText(a, b);
}

function mergeCardShell(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    id: existing.id,
    tags: unionStrings(existing.tags, incoming.tags),
    bodies: unionStrings(existing.bodies, incoming.bodies),
    enrichedAt: incoming.enrichedAt || existing.enrichedAt,
    deepenedAt: incoming.deepenedAt || existing.deepenedAt,
    qualityScore: Math.max(
      Number(existing.qualityScore) || 0,
      Number(incoming.qualityScore) || 0,
    ),
  };
}

/**
 * Prefer the better teaching body. Metadata/tags may merge from incoming.
 * Never replace an enriched/deeper card with a thinner catalog/heuristic draft.
 * Never keep a longer off-topic definition over a relevant rewrite.
 * Live enrichedAt and relevance-fix always beat longer heuristic text.
 */
export function preferImprovedCard(existing, incoming) {
  if (!existing) return { card: incoming, action: "insert" };
  if (!incoming) return { card: existing, action: "keep" };

  const existingOffTopic = needsTopicRelevanceRewrite(existing);
  const incomingOffTopic = needsTopicRelevanceRewrite(incoming);
  const incomingOnTopic = !incomingOffTopic;
  const preferIncomingTeaching =
    (existingOffTopic && incomingOnTopic) ||
    Boolean(incoming.enrichedAt && (!existing.enrichedAt || existingOffTopic));

  if (existingOffTopic && incomingOnTopic) {
    return {
      card: {
        ...mergeCardShell(existing, incoming),
        title: existing.title || incoming.title,
        teachingSummary: preferTeachingText(
          existing.teachingSummary,
          incoming.teachingSummary,
          true,
        ),
        body: preferTeachingText(existing.body, incoming.body, true),
        workedExample: preferTeachingText(
          existing.workedExample,
          incoming.workedExample,
          true,
        ),
        commonMistake: preferTeachingText(
          existing.commonMistake,
          incoming.commonMistake,
          true,
        ),
        implicationIfIgnored: preferTeachingText(
          existing.implicationIfIgnored,
          incoming.implicationIfIgnored,
          true,
        ),
        realWorldTrigger: preferTeachingText(
          existing.realWorldTrigger,
          incoming.realWorldTrigger,
          true,
        ),
      },
      action: "relevance-fix",
    };
  }

  // Live enrich always replaces non-enriched (or still-off-topic) teaching fields.
  if (preferIncomingTeaching && incoming.enrichedAt) {
    return {
      card: {
        ...mergeCardShell(existing, incoming),
        title: existing.title || incoming.title,
        teachingSummary: preferTeachingText(
          existing.teachingSummary,
          incoming.teachingSummary,
          true,
        ),
        body: preferTeachingText(existing.body, incoming.body, true),
        workedExample: preferTeachingText(
          existing.workedExample,
          incoming.workedExample,
          true,
        ),
        commonMistake: preferTeachingText(
          existing.commonMistake,
          incoming.commonMistake,
          true,
        ),
        implicationIfIgnored: preferTeachingText(
          existing.implicationIfIgnored,
          incoming.implicationIfIgnored,
          true,
        ),
        realWorldTrigger: preferTeachingText(
          existing.realWorldTrigger,
          incoming.realWorldTrigger,
          true,
        ),
      },
      action: "enrich-upgrade",
    };
  }

  const existingScore = teachingDepthScore(existing);
  const incomingScore = teachingDepthScore(incoming);
  // When existing is off-topic, do not let length win teaching fields.
  const discardExistingTeaching = existingOffTopic && !incomingOffTopic;

  if (incomingScore > existingScore * 1.02) {
    return {
      card: {
        ...mergeCardShell(existing, incoming),
        title: existing.title || incoming.title,
        teachingSummary: preferTeachingText(
          existing.teachingSummary,
          incoming.teachingSummary,
          discardExistingTeaching || preferIncomingTeaching,
        ),
        body: preferTeachingText(
          existing.body,
          incoming.body,
          discardExistingTeaching || preferIncomingTeaching,
        ),
        workedExample: preferTeachingText(
          existing.workedExample,
          incoming.workedExample,
          discardExistingTeaching || preferIncomingTeaching,
        ),
        commonMistake: preferTeachingText(
          existing.commonMistake,
          incoming.commonMistake,
          discardExistingTeaching || preferIncomingTeaching,
        ),
        implicationIfIgnored: preferTeachingText(
          existing.implicationIfIgnored,
          incoming.implicationIfIgnored,
          discardExistingTeaching || preferIncomingTeaching,
        ),
        realWorldTrigger: preferTeachingText(
          existing.realWorldTrigger,
          incoming.realWorldTrigger,
          discardExistingTeaching || preferIncomingTeaching,
        ),
      },
      action: "upgrade",
    };
  }

  // Keep existing depth; allow non-destructive metadata refresh.
  // longerText must not reintroduce off-topic existing over on-topic incoming.
  const keepIncomingTeaching =
    discardExistingTeaching ||
    (incomingOnTopic && existingOffTopic) ||
    Boolean(incoming.enrichedAt && !existing.enrichedAt);

  return {
    card: {
      ...incoming,
      ...existing,
      id: existing.id,
      title: existing.title || incoming.title,
      tags: unionStrings(existing.tags, incoming.tags),
      bodies: unionStrings(existing.bodies, incoming.bodies),
      teachingSummary: preferTeachingText(
        existing.teachingSummary,
        incoming.teachingSummary,
        keepIncomingTeaching,
      ),
      body: preferTeachingText(existing.body, incoming.body, keepIncomingTeaching),
      workedExample: preferTeachingText(
        existing.workedExample,
        incoming.workedExample,
        keepIncomingTeaching,
      ),
      commonMistake: preferTeachingText(
        existing.commonMistake,
        incoming.commonMistake,
        keepIncomingTeaching,
      ),
      implicationIfIgnored: preferTeachingText(
        existing.implicationIfIgnored,
        incoming.implicationIfIgnored,
        keepIncomingTeaching,
      ),
      realWorldTrigger: preferTeachingText(
        existing.realWorldTrigger,
        incoming.realWorldTrigger,
        keepIncomingTeaching,
      ),
      formula: existing.formula || incoming.formula,
      enrichedAt: existing.enrichedAt || incoming.enrichedAt,
      deepenedAt: existing.deepenedAt || incoming.deepenedAt,
      qualityScore: Math.max(
        Number(existing.qualityScore) || 0,
        Number(incoming.qualityScore) || 0,
      ),
      sources:
        Array.isArray(existing.sources) && existing.sources.length > 0
          ? existing.sources
          : incoming.sources,
    },
    action: "preserve-depth",
  };
}

/** Upsert into a Map of cards with improvement-only semantics. */
export function upsertLibraryCard(byId, incoming) {
  const existing = byId.get(incoming.id);
  const { card, action } = preferImprovedCard(existing, incoming);
  byId.set(card.id, card);
  return action;
}

/**
 * Assert after snapshot is not worse than before.
 * Throws unless allowRegression is explicitly true.
 */
export function assertLibraryImproved({
  before,
  after,
  context = "pipeline",
  allowRegression = false,
  minCardFloor = null,
}) {
  const regressions = [];
  if (after.cardCount < before.cardCount) {
    regressions.push(
      `cardCount ${before.cardCount} → ${after.cardCount}`,
    );
  }
  if (after.enrichedCount < before.enrichedCount) {
    regressions.push(
      `enrichedCount ${before.enrichedCount} → ${after.enrichedCount}`,
    );
  }
  if (after.deepCount < before.deepCount) {
    regressions.push(
      `deepCount ${before.deepCount} → ${after.deepCount}`,
    );
  }
  if (after.depthSum + 500 < before.depthSum) {
    regressions.push(
      `depthSum ${before.depthSum} → ${after.depthSum}`,
    );
  }
  if (
    minCardFloor != null &&
    after.cardCount < minCardFloor
  ) {
    regressions.push(
      `cardCount ${after.cardCount} below floor ${minCardFloor}`,
    );
  }

  const result = {
    ok: regressions.length === 0,
    context,
    before,
    after,
    regressions,
    improved:
      after.cardCount > before.cardCount ||
      after.enrichedCount > before.enrichedCount ||
      after.deepCount > before.deepCount ||
      after.depthSum > before.depthSum,
  };

  if (!result.ok && !allowRegression) {
    const error = new Error(
      `IMPROVEMENT GUARDRAIL: ${context} would regress Library (${regressions.join("; ")}). Refusing to accept write.`,
    );
    error.guardrail = result;
    throw error;
  }
  return result;
}

/**
 * Snapshot → run mutator → verify improvement. Restores index from backup on failure.
 */
export function withImprovementGate(contentDir, reason, mutateFn) {
  const before = readLibraryHealth(contentDir);
  const backup = backupCorpus(contentDir, `gate-${reason}`);
  const mutation = mutateFn(before);
  const after = readLibraryHealth(contentDir);
  try {
    const gate = assertLibraryImproved({
      before,
      after,
      context: reason,
      allowRegression: false,
    });
    return { before, after, backup, gate, mutation };
  } catch (error) {
    if (backup?.ok && backup.dir) {
      try {
        const snap = join(backup.dir, "index.json");
        if (existsSync(snap)) {
          writeFileSync(
            join(contentDir, "index.json"),
            readFileSync(snap, "utf8"),
          );
        }
      } catch {
        // Best-effort restore.
      }
    }
    throw error;
  }
}

export function writeGuardrailReport(pipelineDir, report) {
  mkdirSync(pipelineDir, { recursive: true });
  writeFileSync(
    join(pipelineDir, "improvement-guardrail-report.json"),
    `${JSON.stringify({ ...report, writtenAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}
