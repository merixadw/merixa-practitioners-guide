/**
 * Accruals-ratio-style learning cycle surface for every Library card.
 * Fills missing pedagogical fields with grounded heuristics so the detail
 * shell always teaches: Definition → At work → Watch for → Quick check →
 * Concept links → Paths → See it live → next loop.
 */
import {
  awarenessCopy,
  resolveConceptRelations,
  type ResolvedRelation,
} from "./concept-graph";
import {
  nextStepInPath,
  pathsContainingCard,
} from "./flagship-paths";
import { LEARNING_PATHS } from "./paths";
import {
  hasWorkplaceNumbers,
  isTemplateVoice,
} from "./template-voice";
import type { GuideCard, GuideIndex, LearningPath } from "./types";

export type LearningCycleSurface = {
  definition: string;
  atWork: string;
  atWorkInferred: boolean;
  /** No authored workplace example worth showing (hide or empty CTA). */
  atWorkEmpty: boolean;
  /** Authored example lacks figures — still show, but nudge live board pack. */
  atWorkNeedsFigures: boolean;
  watchFor: string;
  trigger: string | null;
  implication: string | null;
  quickCheck: string;
  quickCheckInferred: boolean;
  formula: string | null;
  technicalNote: string | null;
  relations: ResolvedRelation[];
  paths: LearningPath[];
  /** Path used for journey CTAs (membership first, else domain-suggested). */
  primaryPath: LearningPath | null;
  pathSuggested: boolean;
  nextConcept: { id: string; title: string } | null;
  cycleComplete: boolean;
};

function definitionOf(card: GuideCard): string {
  return String(card.teachingSummary || card.body || "").trim();
}

function formulaOf(card: GuideCard): string | null {
  if (card.formula?.trim()) return card.formula.trim();
  const match = String(card.body || "").match(
    /Formula:\s*([^\n]+(?:\n(?!Interpretation:|Evidence:|Related:|Trap:)[^\n]+)*)/i,
  );
  const extracted = match?.[1]?.replace(/\s+/g, " ").trim();
  return extracted || null;
}

/** Workplace “At work” — authored example only; never fake a template as content. */
export function atWorkCopy(card: GuideCard): {
  text: string;
  inferred: boolean;
  empty: boolean;
  needsFigures: boolean;
} {
  const authored = card.workedExample?.trim() || "";
  if (!authored || isTemplateVoice(authored)) {
    return { text: "", inferred: false, empty: true, needsFigures: false };
  }
  const needsFigures = !hasWorkplaceNumbers(authored);
  return {
    text: authored,
    inferred: false,
    empty: false,
    needsFigures,
  };
}

/** Quick check — prefer authored; else a retention question that loops to the trap. */
export function quickCheckCopy(card: GuideCard): {
  text: string;
  inferred: boolean;
} {
  const authored = card.checkQuestion?.trim();
  if (authored) return { text: authored, inferred: false };
  return {
    text: `After the worked example on “${card.title}”, what would you cross-check in the financial statements or board pack before acting?`,
    inferred: true,
  };
}

function pathAffinity(card: GuideCard, path: LearningPath): number {
  let score = 0;
  const cardBodies = new Set(card.bodies.map(String));
  for (const body of path.bodies ?? []) {
    if (cardBodies.has(String(body))) score += 4;
  }
  const domain = (card.classification?.domain ?? "").toLowerCase();
  const topic = (card.classification?.topic ?? "").toLowerCase();
  const hay = `${path.title} ${path.summary}`.toLowerCase();
  if (domain && hay.includes(domain.split(" ")[0] ?? "")) score += 3;
  if (topic && hay.includes(topic.split(" ")[0] ?? "")) score += 2;
  for (const tag of card.tags.slice(0, 6)) {
    if (hay.includes(String(tag).toLowerCase())) score += 1;
  }
  return score;
}

/** Prefer membership; else best-matching journey so every card can “Appear in paths”. */
export function pathsForLearningCycle(card: GuideCard): {
  paths: LearningPath[];
  primary: LearningPath | null;
  suggested: boolean;
} {
  const membership = dedupePaths(pathsContainingCard(card.id, LEARNING_PATHS));
  if (membership.length > 0) {
    return {
      paths: membership,
      primary: membership[0] ?? null,
      suggested: false,
    };
  }

  const ranked = [...LEARNING_PATHS]
    .map((path) => ({ path, score: pathAffinity(card, path) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return { paths: [], primary: null, suggested: false };
  }

  const top = dedupePaths(ranked.map((item) => item.path)).slice(0, 2);
  return { paths: top, primary: top[0] ?? null, suggested: true };
}

function dedupePaths(paths: LearningPath[]): LearningPath[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const out: LearningPath[] = [];
  for (const path of paths) {
    const id = String(path.id || "");
    const title = String(path.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (id && seenIds.has(id)) continue;
    if (title && seenTitles.has(title)) continue;
    if (id) seenIds.add(id);
    if (title) seenTitles.add(title);
    out.push(path);
  }
  return out;
}

function nextFromRelations(
  relations: ResolvedRelation[],
): { id: string; title: string } | null {
  const leads = relations.find((item) => item.kind === "consequence");
  if (leads) return { id: leads.card.id, title: leads.label };
  const related = relations.find((item) => item.kind === "related");
  if (related) return { id: related.card.id, title: related.label };
  return null;
}

/**
 * Full Accruals-style surface for one card. Always returns Definition, At work,
 * Watch for, Quick check; links/paths/next when resolvable.
 */
export function buildLearningCycle(
  card: GuideCard,
  index: GuideIndex,
): LearningCycleSurface {
  const definition = definitionOf(card);
  const formula = formulaOf(card);
  const atWork = atWorkCopy(card);
  const awareness = awarenessCopy(card);
  const quickCheck = quickCheckCopy(card);
  const relations = resolveConceptRelations(card, index);
  const { paths, primary, suggested } = pathsForLearningCycle(card);

  let nextConcept: { id: string; title: string } | null = null;
  if (primary && !suggested) {
    const step = nextStepInPath(primary, card.id);
    if (step?.cardId) {
      nextConcept = { id: step.cardId, title: step.title };
    }
  }
  if (!nextConcept) {
    nextConcept = nextFromRelations(relations);
  }

  const cycleComplete = Boolean(
    definition &&
      atWork.text &&
      !atWork.empty &&
      awareness.watchFor &&
      quickCheck.text &&
      (relations.length > 0 || paths.length > 0),
  );

  return {
    definition,
    atWork: atWork.text,
    atWorkInferred: atWork.inferred,
    atWorkEmpty: atWork.empty,
    atWorkNeedsFigures: atWork.needsFigures,
    watchFor: awareness.watchFor,
    trigger: awareness.trigger,
    implication: awareness.implication,
    quickCheck: quickCheck.text,
    quickCheckInferred: quickCheck.inferred,
    formula,
    technicalNote: null,
    relations,
    paths,
    primaryPath: primary,
    pathSuggested: suggested,
    nextConcept,
    cycleComplete,
  };
}
