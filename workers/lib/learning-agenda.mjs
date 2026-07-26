/**
 * Learning-circle agenda (shared by local circle + Cloudflare worker).
 * Turns researcher gaps/conflicts, weak teaching cards, enrichment
 * failures, and professional-body sustain needs into prioritized work.
 */
const WEAK_QUALITY = 0.72;
const MAX_PER_STAGE = 24;

/** Domain → professional bodies that sustain concepts in that domain. */
const DOMAIN_SUSTAIN_BODIES = {
  "Financial reporting": ["IFRS", "FRC", "ACCA"],
  "Management reporting": ["CGMA", "ACCA"],
  "Financial management": ["CFA", "FRM", "ACCA"],
  "Risk management": ["FRM", "CRMA", "IIA"],
  "Audit and assurance": ["IIA", "ACCA", "FRC"],
  "Governance and controls": ["IIA", "CRMA", "FRC"],
  "Strategy and performance": ["CGMA", "CFA"],
  Sustainability: ["IFRS", "CFA", "ACCA"],
  "Project delivery": ["CGMA", "ACCA", "IIA"],
};

function topicKey(domain, topic) {
  return `${domain} | ${topic}`;
}

function parseTopicKey(value) {
  const [domain, topic] = String(value).split(" | ");
  return { domain: domain?.trim() ?? "", topic: topic?.trim() ?? "" };
}

/**
 * Build a learning agenda from current pipeline + published artifacts.
 */
export function buildLearningAgenda({
  catalog,
  notebook,
  synthesis,
  index,
  enrichReport,
  previousAgenda,
}) {
  const librarian = [];
  const scholar = [];
  const researcher = [];
  const teacher = [];

  const gaps = Array.isArray(synthesis?.researchGaps)
    ? synthesis.researchGaps
    : [];
  const conflicts = Array.isArray(synthesis?.conflicts)
    ? synthesis.conflicts
    : [];
  const cards = Array.isArray(index?.cards) ? index.cards : [];
  const notes = Array.isArray(notebook?.notes) ? notebook.notes : [];
  const entries = Array.isArray(catalog?.entries) ? catalog.entries : [];
  const rejectedEnrichment = Array.isArray(enrichReport?.rejected)
    ? enrichReport.rejected
    : [];

  for (const gap of gaps.slice(0, MAX_PER_STAGE)) {
    const { domain, topic } = parseTopicKey(gap.topic);
    researcher.push({
      action: "fill-gap",
      priority: 3 + Math.max(0, 3 - (gap.concepts ?? 0)),
      domain,
      topic,
      topicKey: gap.topic,
      reason: `Only ${gap.concepts} concept(s) in ${gap.topic}`,
    });
  }
  for (const conflict of conflicts.slice(0, MAX_PER_STAGE)) {
    researcher.push({
      action: "resolve-conflict",
      priority: 4,
      concept: conflict.concept,
      domains: conflict.domains,
      topics: conflict.topics,
      resolution: conflict.resolution,
      reason: `Classification conflict for "${conflict.concept}"`,
    });
  }

  const sustainBodies = new Set();
  for (const item of researcher.filter((row) => row.action === "fill-gap")) {
    for (const body of DOMAIN_SUSTAIN_BODIES[item.domain] ?? []) {
      sustainBodies.add(body);
    }
  }
  for (const body of sustainBodies) {
    if (researcher.length >= MAX_PER_STAGE) break;
    researcher.push({
      action: "sustain-body",
      priority: 3,
      body,
      reason: `Fetch/attach official ${body} website guidance to sustain gap topics`,
    });
  }

  const gapTopics = new Set(
    researcher
      .filter((item) => item.action === "fill-gap")
      .map((item) => item.topicKey),
  );
  const conflictTitles = new Set(
    researcher
      .filter((item) => item.action === "resolve-conflict")
      .map((item) => String(item.concept || "").toLowerCase()),
  );

  const sourceIdsForGaps = new Set();
  for (const note of notes) {
    const key = topicKey(note.classification?.domain, note.classification?.topic);
    if (gapTopics.has(key)) sourceIdsForGaps.add(note.sourceId);
    if (conflictTitles.has(String(note.title || "").toLowerCase())) {
      sourceIdsForGaps.add(note.sourceId);
    }
  }
  for (const entry of entries) {
    if (entry.status !== "cataloged" || !entry.classification) continue;
    const key = topicKey(entry.classification.domain, entry.classification.topic);
    if (!gapTopics.has(key) && !sourceIdsForGaps.has(entry.id)) continue;
    if (scholar.length >= MAX_PER_STAGE) break;
    scholar.push({
      action: "deepen",
      priority: gapTopics.has(key) ? 4 : 3,
      sourceId: entry.id,
      source: entry.source,
      topicKey: key,
      reason: gapTopics.has(key)
        ? `Deepen study for gap topic ${key}`
        : "Restudy source tied to classification conflict",
    });
  }

  for (const entry of entries) {
    if (entry.status !== "cataloged") continue;
    const key = entry.classification
      ? topicKey(entry.classification.domain, entry.classification.topic)
      : "";
    const lowConfidence = (entry.classification?.confidence ?? 1) < 0.7;
    const inConflict = sourceIdsForGaps.has(entry.id);
    const fillsGap = gapTopics.has(key);
    if (!lowConfidence && !inConflict && !fillsGap) continue;
    if (librarian.length >= MAX_PER_STAGE) break;
    librarian.push({
      action: "reclassify",
      priority: inConflict ? 4 : fillsGap ? 3 : 2,
      sourceId: entry.id,
      source: entry.source,
      topicKey: key || null,
      reason: inConflict
        ? "Reclassify source involved in conflict/gap study"
        : lowConfidence
          ? "Low document-level classification confidence"
          : `Priority catalog for gap topic ${key}`,
    });
  }

  const failedIds = new Set(rejectedEnrichment.map((item) => item.id));
  const weakCards = cards
    .map((card) => {
      const hasTeaching =
        Boolean(card.teachingSummary) &&
        Boolean(card.workedExample) &&
        Boolean(card.commonMistake);
      return {
        card,
        score: card.qualityScore ?? 0.5,
        failed: failedIds.has(card.id),
        gap:
          gapTopics.has(
            topicKey(card.classification?.domain, card.classification?.topic),
          ) || false,
        needsModel: card.editorialStatus !== "model-reviewed",
        hasTeaching,
      };
    })
    .filter((row) => {
      if (row.failed) return true;
      if (row.score < WEAK_QUALITY) return true;
      if (row.gap && row.needsModel) return true;
      // Prefer model upgrade only when teaching fields are missing or thin.
      if (row.needsModel && !row.hasTeaching) return true;
      if (row.needsModel && row.score < 0.85) return true;
      return false;
    })
    .sort((left, right) => {
      const leftRank =
        (left.failed ? 5 : 0) +
        (left.gap ? 2 : 0) +
        (1 - left.score) * 3 +
        (left.needsModel && !left.hasTeaching ? 2 : 0) +
        (left.needsModel ? 1 : 0);
      const rightRank =
        (right.failed ? 5 : 0) +
        (right.gap ? 2 : 0) +
        (1 - right.score) * 3 +
        (right.needsModel && !right.hasTeaching ? 2 : 0) +
        (right.needsModel ? 1 : 0);
      return rightRank - leftRank;
    })
    .slice(0, MAX_PER_STAGE);

  for (const row of weakCards) {
    teacher.push({
      action: row.failed ? "retry-enrich" : "enrich",
      priority: row.failed ? 5 : row.gap ? 4 : 3,
      cardId: row.card.id,
      title: row.card.title,
      qualityScore: row.score,
      topicKey: topicKey(
        row.card.classification?.domain,
        row.card.classification?.topic,
      ),
      reason: row.failed
        ? "Previous enrichment failed quality gate"
        : row.gap
          ? "Strengthen teaching for a research-gap topic"
          : `Upgrade weak teaching card (quality ${row.score})`,
    });
  }

  if (previousAgenda?.stages) {
    for (const [stage, items] of Object.entries(previousAgenda.stages)) {
      const bucket =
        stage === "librarian"
          ? librarian
          : stage === "scholar"
            ? scholar
            : stage === "researcher"
              ? researcher
              : stage === "teacher"
                ? teacher
                : null;
      if (!bucket || !Array.isArray(items)) continue;
      for (const item of items.slice(0, 8)) {
        const key = JSON.stringify({
          action: item.action,
          sourceId: item.sourceId,
          cardId: item.cardId,
          concept: item.concept,
          topicKey: item.topicKey,
        });
        const exists = bucket.some(
          (current) =>
            JSON.stringify({
              action: current.action,
              sourceId: current.sourceId,
              cardId: current.cardId,
              concept: current.concept,
              topicKey: current.topicKey,
            }) === key,
        );
        if (exists || bucket.length >= MAX_PER_STAGE) continue;
        bucket.push({
          ...item,
          priority: Math.max(1, (item.priority ?? 2) - 1),
          reason: `Carried from previous circle: ${item.reason}`,
          carried: true,
        });
      }
    }
  }

  const sortPriority = (items) =>
    items.sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));

  return {
    generatedAt: new Date().toISOString(),
    version: 1,
    summary: {
      librarian: librarian.length,
      scholar: scholar.length,
      researcher: researcher.length,
      teacher: teacher.length,
      total:
        librarian.length +
        scholar.length +
        researcher.length +
        teacher.length,
    },
    stages: {
      librarian: sortPriority(librarian),
      scholar: sortPriority(scholar),
      researcher: sortPriority(researcher),
      teacher: sortPriority(teacher),
    },
  };
}

export function agendaFocusSourceIds(agenda) {
  return new Set(
    [
      ...(agenda?.stages?.librarian ?? []),
      ...(agenda?.stages?.scholar ?? []),
    ]
      .map((item) => item.sourceId)
      .filter(Boolean),
  );
}

export function agendaFocusCardIds(agenda) {
  return new Set(
    (agenda?.stages?.teacher ?? []).map((item) => item.cardId).filter(Boolean),
  );
}

export function agendaGapTopicKeys(agenda) {
  return new Set(
    (agenda?.stages?.researcher ?? [])
      .filter((item) => item.action === "fill-gap")
      .map((item) => item.topicKey)
      .filter(Boolean),
  );
}

export function agendaConflictResolutions(agenda) {
  const map = new Map();
  for (const item of agenda?.stages?.researcher ?? []) {
    if (item.action !== "resolve-conflict" || !item.concept || !item.resolution) {
      continue;
    }
    map.set(String(item.concept).toLowerCase(), item.resolution);
  }
  return map;
}
