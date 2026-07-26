import type { AiTier } from "@/lib/entitlements";
import { getHabitInsights, habitRetrieveBody, type HabitInsights } from "./habits";
import {
  buildLearningSteps,
  buildPathLearningSteps,
  directStepsFromApi,
  followUpsFromSteps,
  resolvePathContext,
  type LearningStep,
  type PathLessonContext,
} from "./learning";
import { retrieve, type RetrieveHit } from "./retrieve";
import type { BodyId, GuideCard, GuideIndex, LearningPath } from "./types";
import {
  verifyTutorTeaching,
  type BodyWebVerification,
} from "./body-web-verify";
import { fallbackVisualsFromCard } from "./tutor-visuals";
import {
  coveragePromptBlock,
  libraryCoverage,
  type LibraryCoverage,
  mergeLibraryCards,
  resolveTutorJourney,
  type TutorJourney,
} from "./journey";
import {
  pickRelatedCards,
  type TutorChromeOptions,
} from "./tutor-relevance";
import {
  detectProfessorMode,
  detectTutorCostLane,
  type ProfessorArtefactMode,
} from "./professor-mode";
import {
  localComposePathFromCards,
  normalizeCustomPath,
} from "./custom-paths";

export type { TutorJourney } from "./journey";

export type ChatTurn = {
  role: "user" | "tutor";
  text: string;
};

export type TutorReply = {
  steps: LearningStep[];
  hits: RetrieveHit[];
  mode: "api" | "extractive";
  followUps: string[];
  verification?: BodyWebVerification;
  /** Why live AI was not used, when relevant. */
  aiGate?: "offline" | "subscription_required";
  /** Keep the Library ↔ Paths ↔ Tutor loop alive after live answers. */
  journey?: TutorJourney;
  /** How substantive the Library pack was for this ask. */
  coverage?: "rich" | "mixed" | "thin";
};

function hasAnswer(value: unknown): value is {
  answer?: string;
  steps?: unknown;
  verification?: BodyWebVerification;
} {
  if (typeof value !== "object" || value === null) return false;
  if ("steps" in value && Array.isArray(value.steps) && value.steps.length > 0) {
    return true;
  }
  return (
    "answer" in value &&
    typeof value.answer === "string" &&
    value.answer.trim().length > 0
  );
}

function readVerification(value: unknown): BodyWebVerification | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (!("verification" in value)) return undefined;
  const verification = value.verification;
  if (typeof verification !== "object" || verification === null) return undefined;
  if (!("verified" in verification) || typeof verification.verified !== "boolean") {
    return undefined;
  }
  if (!("score" in verification) || typeof verification.score !== "number") {
    return undefined;
  }
  if (!("steps" in verification) || !Array.isArray(verification.steps)) {
    return undefined;
  }
  return verification as BodyWebVerification;
}

function readJourney(
  value: unknown,
  cards: GuideCard[],
  index: GuideIndex,
  path?: LearningPath,
  coverage: LibraryCoverage = "mixed",
  pathActive = false,
  pinnedCardId?: string,
): TutorJourney {
  const record =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return resolveTutorJourney({
    proposed: {
      cardId:
        typeof record.cardId === "string" && record.cardId.trim()
          ? record.cardId.trim()
          : undefined,
      pathId:
        typeof record.pathId === "string" && record.pathId.trim()
          ? record.pathId.trim()
          : undefined,
      libraryInvite:
        typeof record.libraryInvite === "string"
          ? record.libraryInvite
          : undefined,
      pathsInvite:
        typeof record.pathsInvite === "string" ? record.pathsInvite : undefined,
    },
    cards,
    path,
    index,
    coverage,
    pathActive,
    pinnedCardId,
  });
}

function cardPayload(card: GuideCard) {
  return {
    id: card.id,
    title: card.title,
    body: card.body,
    bodies: card.bodies,
    teachingSummary: card.teachingSummary,
    workedExample: card.workedExample,
    commonMistake: card.commonMistake,
    checkQuestion: card.checkQuestion,
    implicationIfIgnored: card.implicationIfIgnored,
    realWorldTrigger: card.realWorldTrigger,
    workplaceTasks: card.workplaceTasks,
    sources: card.sources,
    sourceQuotes: card.sourceQuotes,
    officialReferences: card.officialReferences,
    classification: card.classification,
  };
}

function hitsFromCards(cards: GuideCard[]): RetrieveHit[] {
  return cards.slice(0, 5).map((card) => ({
    card,
    chunk: {
      id: `${card.id}::path`,
      cardId: card.id,
      title: card.title,
      text: card.teachingSummary || card.body,
      bodies: card.bodies,
      tags: card.tags,
      kind: "summary" as const,
    },
    score: 1,
  }));
}

/** Prefer retrieve scores when present so UI / blind checks stay Library-aware. */
function hitsForLibraryPack(
  cards: GuideCard[],
  retrieveHits: RetrieveHit[],
): RetrieveHit[] {
  const byId = new Map(retrieveHits.map((hit) => [hit.card.id, hit]));
  return cards.map((card) => byId.get(card.id) ?? hitsFromCards([card])[0]!);
}

function journeyFollowUps(_journey: TutorJourney): string[] {
  return [];
}

function pathFocus(
  path: LearningPath,
  pathContext?: PathLessonContext,
): { cardId?: string; stepId?: string; stepTitle?: string } {
  const byCard = pathContext?.cardId
    ? path.steps.find((step) => step.cardId === pathContext.cardId)
    : undefined;
  const byStep = pathContext?.stepId
    ? path.steps.find((step) => step.id === pathContext.stepId)
    : undefined;
  const focus = byCard ?? byStep ?? path.steps.find((step) => step.cardId);
  return {
    cardId: focus?.cardId,
    stepId: focus?.id,
    stepTitle: focus?.title,
  };
}

function stampProfessorMode(
  steps: LearningStep[],
  question: string,
  aiTier: "premium",
): LearningStep[] {
  if (aiTier !== "premium") return steps;
  const mode = detectProfessorMode(question);
  return steps.map((step) => ({
    ...step,
    professorMode: (step.professorMode ?? mode) as ProfessorArtefactMode,
  }));
}

function ensureLiveVisuals(
  steps: LearningStep[],
  cards: GuideCard[],
): LearningStep[] {
  return steps.map((step, index) => {
    if (step.visuals && step.visuals.length > 0) return step;
    const card =
      (step.cardId
        ? cards.find((item) => item.id === step.cardId)
        : undefined) ?? cards[index] ?? cards[0];
    if (!card) return step;
    const visuals = fallbackVisualsFromCard(card);
    return visuals.length > 0 ? { ...step, visuals } : step;
  });
}

async function callLiveTutor({
  askUrl,
  aiTier,
  question,
  history,
  habitInsights,
  cards,
  hits,
  index,
  path,
  pathContext,
}: {
  askUrl: string;
  aiTier: "premium";
  question: string;
  history: ChatTurn[];
  habitInsights: HabitInsights;
  cards: GuideCard[];
  hits: RetrieveHit[];
  index: GuideIndex;
  path?: LearningPath;
  pathContext?: PathLessonContext;
}): Promise<TutorReply | null> {
  if (cards.length === 0) return null;
  const focus = path ? pathFocus(path, pathContext) : {};
  const coverage = libraryCoverage(cards);
  const professorMode = detectProfessorMode(question);
  const costLane = detectTutorCostLane(question);
  const response = await fetch(askUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "tutor",
      tier: aiTier,
      question,
      professorMode,
      costLane,
      history: history.slice(-8),
      habits: habitInsights.summaryForTutor,
      pace: habitInsights.pace,
      coverage,
      coverageNote: coveragePromptBlock(coverage, cards),
      allowedCardIds: cards.map((card) => card.id),
      pathContext: path
        ? {
            pathId: path.id,
            pathTitle: path.title,
            cardId: focus.cardId ?? pathContext?.cardId,
            stepId: focus.stepId ?? pathContext?.stepId,
            stepTitle: focus.stepTitle,
          }
        : undefined,
      cards: cards.slice(0, 5).map(cardPayload),
    }),
  });

  if (!response.ok) return null;
  const value: unknown = await response.json();
  if (!hasAnswer(value)) return null;
  const parsed = directStepsFromApi(value);
  if (!parsed || parsed.length === 0) return null;
  const steps = stampProfessorMode(
    ensureLiveVisuals(parsed, cards),
    question,
    aiTier,
  );

  const journey = readJourney(
    value,
    cards,
    index,
    path,
    coverage,
    Boolean(path),
    pathContext?.cardId ?? focus.cardId,
  );
  const verification =
    readVerification(value) ??
    (await verifyTutorTeaching({ steps, cards }));

  return {
    steps,
    hits: hits.length > 0 ? hits : hitsFromCards(cards),
    mode: "api",
    followUps: [
      ...followUpsFromSteps(steps, habitInsights),
      ...journeyFollowUps(journey),
    ].slice(0, 4),
    verification,
    journey,
    coverage,
  };
}

export async function askTutor({
  index,
  question,
  history = [],
  insights,
  body,
  pathContext,
  aiTier = "offline",
}: {
  index: GuideIndex;
  question: string;
  history?: ChatTurn[];
  insights?: HabitInsights;
  body?: BodyId | "all";
  pathContext?: PathLessonContext;
  /** Online coach tier from entitlements. Offline skips the live worker. */
  aiTier?: AiTier;
}): Promise<TutorReply> {
  const habitInsights = insights ?? getHabitInsights();
  const preferredBody = body ?? habitRetrieveBody(habitInsights);
  const path = resolvePathContext(pathContext);
  const onlineTier = aiTier === "premium";
  const askUrl = process.env.NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL?.trim();

  // Always retrieve Library cards for the question (multi-body grounding).
  let retrieveHits = retrieve({
    index,
    query: question,
    limit: 5,
    body: preferredBody,
  });
  if (retrieveHits.length === 0 && preferredBody !== "all") {
    retrieveHits = retrieve({ index, query: question, limit: 5, body: "all" });
  }

  if (path && onlineTier && askUrl) {
    const focus = pathFocus(path, pathContext);
    const orderedIds = path.steps
      .map((step) => step.cardId)
      .filter((id): id is string => Boolean(id));
    const start = focus.cardId ? orderedIds.indexOf(focus.cardId) : 0;
    const sliceIds = orderedIds.slice(
      Math.max(0, start),
      Math.max(0, start) + 4,
    );
    const pathCards = sliceIds
      .map((id) => index.cards.find((card) => card.id === id))
      .filter((card): card is GuideCard => Boolean(card));
    const focusCard = focus.cardId
      ? index.cards.find((card) => card.id === focus.cardId)
      : undefined;
    const cards = mergeLibraryCards(
      [focusCard, ...pathCards].filter((card): card is GuideCard => Boolean(card)),
      retrieveHits.map((hit) => hit.card),
      5,
    );
    const hits = hitsForLibraryPack(
      cards.length > 0 ? cards : index.cards.slice(0, 3),
      retrieveHits,
    );

    try {
      const live = await callLiveTutor({
        askUrl,
        aiTier: "premium",
        question,
        history,
        habitInsights,
        cards: cards.length > 0 ? cards : index.cards.slice(0, 3),
        hits,
        index,
        path,
        pathContext,
      });
      if (live) return live;
    } catch {
      // Fall through to extractive path steps.
    }
  }

  if (path) {
    const steps = buildPathLearningSteps({
      guideIndex: index,
      path,
      fromCardId: pathContext?.cardId,
      insights: habitInsights,
    });
    const cardIds = steps
      .map((step) => step.cardId)
      .filter((id): id is string => Boolean(id));
    const cards = mergeLibraryCards(
      index.cards.filter((card) => cardIds.includes(card.id)),
      retrieveHits.map((hit) => hit.card),
      5,
    );
    const hits = hitsForLibraryPack(cards, retrieveHits);
    const verification = await verifyTutorTeaching({ steps, cards });
    const journey = resolveTutorJourney({
      proposed: {
        cardId: pathContext?.cardId ?? cards[0]?.id,
        pathId: path.id,
      },
      cards,
      path,
      index,
      coverage: libraryCoverage(cards),
      pathActive: true,
      pinnedCardId: pathContext?.cardId,
    });
    return {
      steps,
      hits,
      mode: "extractive",
      followUps: followUpsFromSteps(steps, habitInsights),
      verification,
      aiGate: onlineTier ? undefined : "offline",
      journey,
      coverage: libraryCoverage(cards),
    };
  }

  const cards = mergeLibraryCards(
    pathContext?.cardId
      ? [
          index.cards.find((card) => card.id === pathContext.cardId),
        ].filter((card): card is GuideCard => Boolean(card))
      : [],
    retrieveHits.map((hit) => hit.card),
    5,
  );
  const hits = hitsForLibraryPack(
    cards.length > 0 ? cards : retrieveHits.map((hit) => hit.card),
    retrieveHits,
  );
  const pack = hits.map((hit) => hit.card);

  if (onlineTier && askUrl && pack.length > 0) {
    try {
      const live = await callLiveTutor({
        askUrl,
        aiTier: "premium",
        question,
        history,
        habitInsights,
        cards: pack,
        hits,
        index,
      });
      if (live) return live;
    } catch {
      // Fall back to local teaching steps.
    }
  }

  const steps = buildLearningSteps({
    query: question,
    hits,
    insights: habitInsights,
  });
  const verification = await verifyTutorTeaching({ steps, cards: pack });
  const packCoverage = libraryCoverage(pack);
  const journey = resolveTutorJourney({
    proposed: { cardId: pathContext?.cardId ?? pack[0]?.id },
    cards: pack,
    index,
    coverage: packCoverage,
    pathActive: Boolean(pathContext?.pathId),
    pinnedCardId: pathContext?.cardId,
  });

  return {
    steps,
    hits,
    mode: "extractive",
    followUps: followUpsFromSteps(steps, habitInsights),
    verification,
    aiGate: onlineTier ? undefined : "offline",
    journey,
    coverage: packCoverage,
  };
}

/** @deprecated Use askTutor */
export async function askGuide(args: {
  index: GuideIndex;
  question: string;
  body?: BodyId | "all";
}): Promise<TutorReply> {
  return askTutor(args);
}

export type AskResult = TutorReply;

const COMPOSE_PATH_RE =
  /\b(connect|link|bridge|path\s+between|journey\s+from|build\s+(?:me\s+)?a\s+path|customise|customize|custom\s+path|relate|relationship\s+between|how\s+(?:are|is|do)\b.+\b(?:related|connected|linked))\b/i;

/** True when the learner is asking Tutor to build a custom path. */
export function isComposePathAsk(question: string): boolean {
  return COMPOSE_PATH_RE.test(String(question || ""));
}

export type ComposePathResult = {
  path: LearningPath;
  mode: "api" | "local";
  cards: GuideCard[];
  fromCache?: boolean;
};

/**
 * Premium: compose a LearningPath that connects 2+ Library concepts.
 * Steps use existing cardIds only — same structure as catalog paths.
 */
export async function composeCustomPath({
  index,
  question,
  cardIds,
  aiTier = "offline",
}: {
  index: GuideIndex;
  question: string;
  cardIds?: string[];
  aiTier?: AiTier;
}): Promise<ComposePathResult> {
  const byId = new Map(index.cards.map((card) => [card.id, card]));
  let ids = (cardIds || []).filter((id) => byId.has(id));

  if (ids.length < 2) {
    const hits = retrieve({ index, query: question, limit: 6, body: "all" });
    ids = [
      ...new Set([...ids, ...hits.map((hit) => hit.card.id)]),
    ].filter((id) => byId.has(id));
  }
  ids = ids.slice(0, 6);
  const cards = ids
    .map((id) => byId.get(id))
    .filter((card): card is GuideCard => Boolean(card));

  if (cards.length < 2) {
    throw new Error(
      "Need at least two Guide concepts to build a custom path. Name the titles clearly.",
    );
  }

  const askUrl = process.env.NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL?.trim();
  if (aiTier === "premium" && askUrl) {
    try {
      const response = await fetch(askUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "compose_path",
          tier: "premium",
          question,
          cards: cards.map(cardPayload),
          allowedCardIds: cards.map((card) => card.id),
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { path?: Partial<LearningPath> };
        if (data?.path) {
          const path = normalizeCustomPath(
            data.path,
            cards.map((card) => card.id),
            question,
          );
          // Restore titles from Library when model used id as title.
          path.steps = path.steps.map((step) => {
            const card = step.cardId ? byId.get(step.cardId) : undefined;
            if (!card) return step;
            return {
              ...step,
              title:
                step.title === step.cardId || step.title.length < 4
                  ? card.title
                  : step.title,
              summary:
                step.summary.length >= 40
                  ? step.summary
                  : String(card.teachingSummary || card.body || "")
                      .replace(/\s+/g, " ")
                      .trim()
                      .slice(0, 220),
            };
          });
          return { path, mode: "api", cards };
        }
      }
    } catch {
      // Fall through to local compose.
    }
  }

  return {
    path: localComposePathFromCards(cards, question),
    mode: "local",
    cards,
  };
}
