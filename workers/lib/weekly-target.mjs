/**
 * Weekly ML learning target + full verification.
 * Shared by local circle (`scripts/pipeline`) and Cloudflare learn worker.
 *
 * Each ISO week Merixa ML gets measurable goals derived from research gaps,
 * classification conflicts, weak teaching cards, and body-sustain coverage.
 * Verification re-measures the live corpus and only marks the week verified
 * when every goal passes.
 */

export const WEEKLY_DEFAULTS = {
  gapTopicsToClose: 3,
  minConceptsPerTopic: 3,
  maxOpenConflicts: 5,
  weakCardsToUpgrade: 20,
  minCardQuality: 0.78,
  minOfficialCoverage: 0.85,
  minCorroboratedGain: 2,
  minSustainBodies: 4,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

/** ISO week id, e.g. 2026-W29 */
export function isoWeekId(date = new Date()) {
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${pad(week)}`;
}

export function isoWeekBounds(weekId) {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) {
    const now = new Date();
    return { startsAt: now.toISOString(), endsAt: now.toISOString() };
  }
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    startsAt: monday.toISOString(),
    endsAt: sunday.toISOString(),
  };
}

function topicCoverage(index, synthesis) {
  if (synthesis?.topicCoverage && typeof synthesis.topicCoverage === "object") {
    return { ...synthesis.topicCoverage };
  }
  const coverage = {};
  for (const card of index?.cards ?? []) {
    const domain = card.classification?.domain || "Unknown";
    const topic = card.classification?.topic || "Unknown";
    const key = `${domain} | ${topic}`;
    coverage[key] = (coverage[key] ?? 0) + 1;
  }
  return coverage;
}

function measureCorpus({ index, synthesis, sustainReport }) {
  const cards = index?.cards ?? [];
  const coverage = topicCoverage(index, synthesis);
  const gaps = Object.entries(coverage)
    .filter(([, count]) => count < WEEKLY_DEFAULTS.minConceptsPerTopic)
    .map(([topic, concepts]) => ({ topic, concepts }))
    .sort((left, right) => left.concepts - right.concepts);

  const weak = cards.filter(
    (card) => (card.qualityScore ?? 0) < WEEKLY_DEFAULTS.minCardQuality,
  );
  const withTeaching = cards.filter(
    (card) =>
      card.teachingSummary && card.workedExample && card.commonMistake,
  );
  const withOfficial = cards.filter(
    (card) =>
      (card.officialReferences?.length ?? 0) > 0 ||
      (card.sources ?? []).some(
        (source) =>
          source.kind === "official-open" || /^https?:\/\//i.test(source.path),
      ),
  );
  const corroborated =
    synthesis?.stats?.corroborated ??
    cards.filter((card) => (card.sources?.length ?? 0) > 1).length;
  const conflicts = synthesis?.conflicts?.length ?? 0;
  const bodiesPresent = new Set();
  for (const card of cards) {
    for (const body of card.bodies ?? []) bodiesPresent.add(body);
    for (const ref of card.officialReferences ?? []) bodiesPresent.add(ref.body);
  }

  return {
    measuredAt: new Date().toISOString(),
    cards: cards.length,
    gaps,
    gapCount: gaps.length,
    conflicts,
    weakCards: weak.length,
    teachingCoverage: cards.length
      ? Number((withTeaching.length / cards.length).toFixed(3))
      : 0,
    officialCoverage: cards.length
      ? Number((withOfficial.length / cards.length).toFixed(3))
      : 0,
    corroborated,
    bodiesPresent: [...bodiesPresent].sort(),
    sustainFetched: sustainReport?.fetched?.length ?? 0,
    topicCoverage: coverage,
  };
}

function goalId(parts) {
  return parts
    .join("|")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function planWeeklyTarget({
  index,
  synthesis,
  sustainReport,
  weekId = isoWeekId(),
  defaults = WEEKLY_DEFAULTS,
}) {
  const baseline = measureCorpus({ index, synthesis, sustainReport });
  const bounds = isoWeekBounds(weekId);
  const goals = [];

  const gapTargets = baseline.gaps.slice(0, defaults.gapTopicsToClose);
  for (const gap of gapTargets) {
    goals.push({
      id: goalId(["fill-gap", gap.topic, weekId]),
      kind: "fill-gap",
      priority: 5,
      topicKey: gap.topic,
      baseline: gap.concepts,
      target: defaults.minConceptsPerTopic,
      unit: "concepts",
      reason: `Close research gap: raise ${gap.topic} to at least ${defaults.minConceptsPerTopic} concepts`,
    });
  }

  goals.push({
    id: goalId(["resolve-conflicts", weekId]),
    kind: "resolve-conflicts",
    priority: 4,
    baseline: baseline.conflicts,
    target: Math.min(baseline.conflicts, defaults.maxOpenConflicts),
    ceiling: defaults.maxOpenConflicts,
    unit: "open-conflicts",
    reason: `Reduce open classification conflicts to ≤ ${defaults.maxOpenConflicts}`,
  });

  const weakTarget = Math.min(baseline.weakCards, defaults.weakCardsToUpgrade);
  goals.push({
    id: goalId(["upgrade-quality", weekId]),
    kind: "upgrade-quality",
    priority: 4,
    baseline: baseline.weakCards,
    target: Math.max(0, baseline.weakCards - weakTarget),
    unit: "weak-cards-remaining",
    minQuality: defaults.minCardQuality,
    reason: `Upgrade at least ${weakTarget} weak cards to quality ≥ ${defaults.minCardQuality}`,
  });

  goals.push({
    id: goalId(["official-coverage", weekId]),
    kind: "official-coverage",
    priority: 3,
    baseline: baseline.officialCoverage,
    target: defaults.minOfficialCoverage,
    unit: "share-of-cards",
    reason: `Sustain ≥ ${Math.round(defaults.minOfficialCoverage * 100)}% of cards with official body website references`,
  });

  goals.push({
    id: goalId(["corroborate", weekId]),
    kind: "corroborate",
    priority: 3,
    baseline: baseline.corroborated,
    target: baseline.corroborated + defaults.minCorroboratedGain,
    unit: "multi-source-concepts",
    reason: `Increase corroborated (multi-source) concepts by ≥ ${defaults.minCorroboratedGain}`,
  });

  const missingBodies = [
    "IFRS",
    "FRC",
    "ACCA",
    "IIA",
    "CGMA",
    "CFA",
    "FRM",
    "CRMA",
  ].filter((body) => !baseline.bodiesPresent.includes(body));
  goals.push({
    id: goalId(["sustain-bodies", weekId]),
    kind: "sustain-bodies",
    priority: 3,
    baseline: baseline.bodiesPresent.length,
    target: Math.max(
      defaults.minSustainBodies,
      baseline.bodiesPresent.length,
    ),
    preferBodies: missingBodies.slice(0, 4),
    unit: "bodies-present",
    reason: `Keep at least ${defaults.minSustainBodies} professional bodies attached across the corpus`,
  });

  return {
    version: 1,
    weekId,
    startsAt: bounds.startsAt,
    endsAt: bounds.endsAt,
    status: "active",
    createdAt: new Date().toISOString(),
    defaults,
    baseline,
    goals: goals.sort((left, right) => right.priority - left.priority),
  };
}

function evaluateGoal(goal, current) {
  switch (goal.kind) {
    case "fill-gap": {
      const count = current.topicCoverage[goal.topicKey] ?? 0;
      return {
        current: count,
        pass: count >= goal.target,
        detail: `${goal.topicKey}: ${count}/${goal.target} concepts`,
      };
    }
    case "resolve-conflicts": {
      const ceiling = goal.ceiling ?? goal.target;
      return {
        current: current.conflicts,
        pass: current.conflicts <= ceiling,
        detail: `open conflicts ${current.conflicts} (ceiling ${ceiling})`,
      };
    }
    case "upgrade-quality": {
      return {
        current: current.weakCards,
        pass: current.weakCards <= goal.target,
        detail: `weak cards remaining ${current.weakCards} (target ≤ ${goal.target})`,
      };
    }
    case "official-coverage": {
      return {
        current: current.officialCoverage,
        pass: current.officialCoverage >= goal.target,
        detail: `official coverage ${(current.officialCoverage * 100).toFixed(1)}% (target ≥ ${(goal.target * 100).toFixed(0)}%)`,
      };
    }
    case "corroborate": {
      return {
        current: current.corroborated,
        pass: current.corroborated >= goal.target,
        detail: `corroborated concepts ${current.corroborated}/${goal.target}`,
      };
    }
    case "sustain-bodies": {
      return {
        current: current.bodiesPresent.length,
        pass: current.bodiesPresent.length >= goal.target,
        detail: `bodies present ${current.bodiesPresent.length}/${goal.target} [${current.bodiesPresent.join(", ")}]`,
      };
    }
    default: {
      const _exhaustive = goal.kind;
      return {
        current: 0,
        pass: false,
        detail: `unknown goal kind: ${_exhaustive}`,
      };
    }
  }
}

export function verifyWeeklyTarget({
  weeklyTarget,
  index,
  synthesis,
  sustainReport,
}) {
  const current = measureCorpus({ index, synthesis, sustainReport });
  const checks = (weeklyTarget.goals ?? []).map((goal) => {
    const result = evaluateGoal(goal, current);
    return {
      id: goal.id,
      kind: goal.kind,
      reason: goal.reason,
      baseline: goal.baseline,
      target: goal.target,
      ...result,
    };
  });

  const passed = checks.length > 0 && checks.every((check) => check.pass);
  const score =
    checks.length === 0
      ? 0
      : Number(
          (checks.filter((check) => check.pass).length / checks.length).toFixed(
            3,
          ),
        );

  return {
    version: 1,
    weekId: weeklyTarget.weekId,
    verifiedAt: new Date().toISOString(),
    passed,
    score,
    status: passed ? "verified" : "active",
    checks,
    current,
    failed: checks.filter((check) => !check.pass).map((check) => check.kind),
  };
}

export function ensureWeeklyTarget({
  existing,
  index,
  synthesis,
  sustainReport,
  now = new Date(),
}) {
  const weekId = isoWeekId(now);
  if (
    existing?.weekId === weekId &&
    existing?.status !== "missed" &&
    Array.isArray(existing.goals) &&
    existing.goals.length > 0
  ) {
    return existing;
  }
  return planWeeklyTarget({ index, synthesis, sustainReport, weekId });
}

export function focusAgendaOnWeeklyTarget(agenda, weeklyTarget, verification) {
  if (!agenda?.stages || !weeklyTarget?.goals) return agenda;
  const failed = new Set(verification?.failed ?? []);
  const openGoals = weeklyTarget.goals.filter((goal) => {
    if (failed.size === 0) return true;
    return failed.has(goal.kind);
  });
  const gapTopics = new Set(
    openGoals
      .filter((goal) => goal.kind === "fill-gap")
      .map((goal) => goal.topicKey)
      .filter(Boolean),
  );

  const boost = (item) => {
    let priority = item.priority ?? 1;
    if (item.topicKey && gapTopics.has(item.topicKey)) priority += 2;
    if (
      item.action === "sustain-body" &&
      openGoals.some((goal) => goal.kind === "sustain-bodies")
    ) {
      priority += 2;
    }
    if (
      (item.action === "enrich" || item.action === "retry-enrich") &&
      openGoals.some((goal) => goal.kind === "upgrade-quality")
    ) {
      priority += 1;
    }
    if (
      item.action === "resolve-conflict" &&
      openGoals.some((goal) => goal.kind === "resolve-conflicts")
    ) {
      priority += 2;
    }
    return { ...item, priority, weekly: true };
  };

  const sortPriority = (items) =>
    items
      .map(boost)
      .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));

  return {
    ...agenda,
    weeklyWeekId: weeklyTarget.weekId,
    stages: {
      librarian: sortPriority(agenda.stages.librarian ?? []),
      scholar: sortPriority(agenda.stages.scholar ?? []),
      researcher: sortPriority(agenda.stages.researcher ?? []),
      teacher: sortPriority(agenda.stages.teacher ?? []),
    },
  };
}
