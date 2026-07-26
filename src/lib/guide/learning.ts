import type { HabitInsights } from "./habits";
import type { RetrieveHit } from "./retrieve";
import {
  parseTutorVisuals,
  type TutorVisual,
} from "./tutor-visuals";
import type { GuideCard, GuideIndex, LearningPath } from "./types";
import { LEARNING_PATHS } from "./paths";
import { findCustomPath } from "./custom-paths";
import { awarenessCopy } from "./concept-graph";
import { atWorkCopy, quickCheckCopy } from "./learning-cycle";

export type LearningStep = {
  id: string;
  title: string;
  body: string;
  /** Optional one-tap reply the learner can send next */
  suggest?: string;
  cardId?: string;
  /** Accruals-ratio shell block — styles Offline Tutor like Library detail. */
  shellKind?:
    | "definition"
    | "technical"
    | "at_work"
    | "watch_for"
    | "implication"
    | "trigger"
    | "quick_check"
    | "formula"
    | "other";
  /** Live AI visual demonstrations (tables, charts, worksheets). */
  visuals?: TutorVisual[];
  /** Premium board-pack short memo (S3). */
  boardMemo?: string;
  /** Detected Premium artefact mode for workbook tabs. */
  professorMode?:
    | "judgement"
    | "board"
    | "stress"
    | "harder"
    | "implication"
    | "demo";
};

export type PathLessonContext = {
  pathId?: string;
  cardId?: string;
  stepId?: string;
};

const LESSON_BODY_MAX = 1200;
const API_BODY_MAX = 900;

function cleanProse(text: string, max = LESSON_BODY_MAX): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\b(shall|pursuant to|hereinafter)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function shortenTitle(title: string): string {
  return title
    .replace(/^\d+\s+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

function paceTitles(pace: HabitInsights["pace"]): {
  core: string;
  context: string;
  example: string;
  trap: string;
  check: string;
  cite: string;
} {
  switch (pace) {
    case "fast":
      return {
        core: "Definition",
        context: "Technical note",
        example: "At work",
        trap: "Watch for",
        check: "Quick check",
        cite: "Source",
      };
    case "reflective":
      return {
        core: "Start here",
        context: "Why it matters",
        example: "Workplace picture",
        trap: "Common trap",
        check: "Check yourself",
        cite: "Cited source",
      };
    case "steady":
      return {
        core: "Definition",
        context: "Technical context",
        example: "Worked example",
        trap: "Common trap",
        check: "Check question",
        cite: "Cited source",
      };
    default: {
      const _exhaustive: never = pace;
      void _exhaustive;
      return {
        core: "Definition",
        context: "Technical context",
        example: "Worked example",
        trap: "Common trap",
        check: "Check question",
        cite: "Cited source",
      };
    }
  }
}

export function resolvePathContext(
  context: PathLessonContext | undefined,
): LearningPath | undefined {
  if (!context?.pathId) return undefined;
  return (
    LEARNING_PATHS.find((path) => path.id === context.pathId) ??
    findCustomPath(context.pathId)
  );
}

/**
 * Path-aware Tutor: remaining path steps in order.
 * Each step is one paced beat grounded in the Guide card storyline.
 */
export function buildPathLearningSteps({
  guideIndex,
  path,
  fromCardId,
  insights,
}: {
  guideIndex: GuideIndex;
  path: LearningPath;
  fromCardId?: string;
  insights?: HabitInsights;
}): LearningStep[] {
  const labels = paceTitles(insights?.pace ?? "steady");
  const startRaw = fromCardId
    ? path.steps.findIndex((step) => step.cardId === fromCardId)
    : 0;
  const startIndex = startRaw < 0 ? 0 : startRaw;
  const remaining = path.steps.slice(startIndex);
  const byId = new Map(guideIndex.cards.map((card) => [card.id, card]));

  const steps: LearningStep[] = [
    {
      id: "path-intro",
      title: path.title,
      body: cleanProse(
        `${path.summary} Walking ${remaining.length} step${
          remaining.length === 1 ? "" : "s"
        } in order. Storyline on each: Definition → At work → Watch for → Quick check.`,
        520,
      ),
      suggest: remaining[0]
        ? `Continue with “${remaining[0].title}”`
        : undefined,
    },
  ];

  remaining.forEach((pathStep, stepIndex) => {
    const card = pathStep.cardId ? byId.get(pathStep.cardId) : undefined;
    const next = remaining[stepIndex + 1];
    const definition = card
      ? cleanProse(card.teachingSummary || card.body || pathStep.summary, 520)
      : cleanProse(pathStep.summary, 400);
    const example = card
      ? cleanProse(
          atWorkCopy(card).text ||
            `At work: use “${pathStep.title}” with an owner, a figure, and the evidence that would reverse the call.`,
          480,
        )
      : `At work: use “${pathStep.title}” on the next pack or working paper and note the evidence that would change the conclusion.`;
    const trap = card
      ? cleanProse(awarenessCopy(card).watchFor, 360)
      : `Trap: naming “${pathStep.title}” without evidence, owner, and decision impact.`;
    const check = card
      ? cleanProse(quickCheckCopy(card).text, 280)
      : `Check: where does “${pathStep.title}” change a decision this week?`;

    steps.push({
      id: `path-${pathStep.id}`,
      title: `${stepIndex + 1}. ${pathStep.title}`,
      body: cleanProse(
        `${labels.core}: ${definition} ${labels.example}: ${example} ${labels.trap}: ${trap} ${labels.check}: ${check}`,
        1100,
      ),
      suggest: next
        ? `Continue to “${next.title}”`
        : "What should I learn next on this path?",
      cardId: pathStep.cardId,
    });
  });

  return steps.slice(0, 10);
}

/** Offline: rewrite Guide hits into a full practitioner lesson (not clipped chat). */
export function buildLearningSteps({
  query,
  hits,
  insights,
}: {
  query: string;
  hits: RetrieveHit[];
  insights?: HabitInsights;
}): LearningStep[] {
  const pace = insights?.pace ?? "steady";
  const labels = paceTitles(pace);
  const theme = insights?.askThemes[0];
  const bodyHint = insights?.preferredBodies[0];

  if (hits.length === 0) {
    return [
      {
        id: "empty",
        title: "I couldn’t find that yet",
        body: `I don’t have a clear Guide card for “${query.trim()}”. Try a shorter concept name${
          bodyHint ? `, or stay with ${bodyHint}` : ""
        }. Browse Library to look it up, or open Paths for a guided route.`,
        suggest: bodyHint
          ? `Teach me a core ${bodyHint} concept as a full lesson`
          : "Teach me profit versus cash as a full lesson",
      },
    ];
  }

  const first = hits[0];
  const card = first.card;
  const definition =
    cleanProse(card.teachingSummary || first.chunk.text) ||
    shortenTitle(card.title);
  const focusNote =
    theme && pace !== "fast"
      ? ` I’ll keep this useful for your interest in ${theme}.`
      : "";
  const sourceNote = card.sources[0]
    ? ` Drawn from ${card.sources[0].label}.`
    : "";

  const steps: LearningStep[] = [
    {
      id: "core",
      title: labels.core,
      body: `${definition}${focusNote}${sourceNote}`,
      suggest: `Give me the technical context for “${shortenTitle(card.title)}”`,
      cardId: card.id,
      shellKind: "definition",
    },
  ];

  const classification = card.classification;
  if (classification) {
    steps.push({
      id: "context",
      title: labels.context,
      body: cleanProse(
        `${classification.domain} · ${classification.topic} (${classification.contentType}, ${classification.technicalLevel}). ${
          card.body && card.body !== card.teachingSummary
            ? card.body.slice(0, 500)
            : `Use this when the decision turns on ${classification.topic.toLowerCase()}.`
        }`,
      ),
      suggest: `Show a worked workplace example of “${shortenTitle(card.title)}”`,
      cardId: card.id,
      shellKind: "technical",
    });
  }

  const atWork = atWorkCopy(card);
  steps.push({
    id: "example",
    title: labels.example,
    body: cleanProse(
      atWork.text ||
        (atWork.empty
          ? `No figured workplace example is on this card yet. In practice: name the owner, one base figure, and what would reverse the conclusion on “${shortenTitle(card.title)}”.`
          : ""),
    ),
    suggest: "What trap should I avoid?",
    cardId: card.id,
    shellKind: "at_work",
  });

  const awareness = awarenessCopy(card);
  steps.push({
    id: "mistake",
    title: labels.trap,
    body: cleanProse(awareness.watchFor),
    suggest: awareness.implication
      ? "What happens if I ignore this at work?"
      : "Quiz me with one practitioner question",
    cardId: card.id,
    shellKind: "watch_for",
  });

  if (awareness.implication && awareness.implication !== awareness.watchFor) {
    steps.push({
      id: "implication",
      title: "If you ignore this",
      body: cleanProse(awareness.implication),
      suggest: awareness.trigger
        ? "What workplace trigger should I watch for?"
        : "Quiz me with one practitioner question",
      cardId: card.id,
      shellKind: "implication",
    });
  }

  if (awareness.trigger) {
    steps.push({
      id: "trigger",
      title: "Trigger",
      body: cleanProse(awareness.trigger, 400),
      suggest: "Quiz me with one practitioner question",
      cardId: card.id,
      shellKind: "trigger",
    });
  }

  const check = quickCheckCopy(card);
  steps.push({
    id: "check",
    title: labels.check,
    body: cleanProse(check.text, 400),
    suggest: "Check my answer against the Guide card",
    cardId: card.id,
    shellKind: "quick_check",
  });

  if (card.formula) {
    steps.push({
      id: "formula",
      title: "Formula",
      body: cleanProse(card.formula, 600),
      suggest: "Show a worked example using this formula",
      cardId: card.id,
      shellKind: "formula",
    });
  } else if (card.body && card.teachingSummary) {
    const extra = card.body
      .replace(String(card.teachingSummary), "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 700);
    if (extra.length > 80) {
      steps.push({
        id: "context",
        title: labels.cite,
        body: cleanProse(extra, 700),
        suggest: "Walk me through the worked example again",
        cardId: card.id,
        shellKind: "technical",
      });
    }
  }

  return steps;
}

/** Prefer structured API steps; otherwise split a plain answer into paced beats. */
export function stepsFromAnswer(
  answer: string,
  insights?: HabitInsights,
): LearningStep[] | null {
  const trimmed = answer.trim();
  if (!trimmed) return null;
  const labels = paceTitles(insights?.pace ?? "steady");
  const labelList = [
    labels.core,
    labels.example,
    labels.trap,
    labels.check,
    labels.cite,
  ];

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "steps" in parsed &&
      Array.isArray(parsed.steps)
    ) {
      const steps = parsed.steps.reduce<LearningStep[]>(
        (result, step, index) => {
          if (typeof step !== "object" || step === null) return result;
          const title =
            "title" in step && typeof step.title === "string"
              ? step.title.trim()
              : labelList[index] ?? `Step ${index + 1}`;
          const body =
            "body" in step && typeof step.body === "string"
              ? step.body.trim()
              : "";
          const suggest =
            "suggest" in step && typeof step.suggest === "string"
              ? step.suggest.trim().slice(0, 160)
              : undefined;
          const cardId =
            "cardId" in step && typeof step.cardId === "string"
              ? step.cardId
              : undefined;
          if (!body) return result;
          result.push({
            id: `api-${index}`,
            title: title.slice(0, 64),
            body: body.slice(0, API_BODY_MAX),
            suggest,
            cardId,
          });
          return result;
        },
        [],
      );
      if (steps.length > 0) return steps.slice(0, 6);
    }
  } catch {
    // Plain text answers fall through to paragraph splitting.
  }

  const blocks = trimmed
    .split(/\n{2,}|(?=\n\s*(?:\d+[.)]|[-•])\s+)/)
    .map((block) =>
      block
        .replace(/^\s*(?:\d+[.)]|[-•])\s*/, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((block) => block.length > 24);

  if (blocks.length >= 2) {
    return blocks.slice(0, 6).map((body, index) => ({
      id: `split-${index}`,
      title: labelList[index] ?? `Step ${index + 1}`,
      body: body.slice(0, API_BODY_MAX),
    }));
  }

  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
  const chunks: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    const next = `${buffer} ${sentence}`.trim();
    if (next.length > 320 && buffer) {
      chunks.push(buffer);
      buffer = sentence.trim();
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);
  if (chunks.length === 0) return null;

  return chunks.slice(0, 5).map((body, index) => ({
    id: `plain-${index}`,
    title: labelList[index] ?? `Step ${index + 1}`,
    body: body.slice(0, API_BODY_MAX),
  }));
}

/**
 * Live AI (Lite / Premium) replies — keep as a direct answer, not a paced
 * Library lesson arc.
 */
export function directStepsFromApi(value: unknown): LearningStep[] | null {
  if (typeof value !== "object" || value === null) return null;

  const topVisuals =
    "visuals" in value ? parseTutorVisuals(value.visuals) : [];
  const boardMemo =
    "boardMemo" in value && typeof value.boardMemo === "string"
      ? value.boardMemo.trim().slice(0, 900)
      : undefined;

  if ("answer" in value && typeof value.answer === "string") {
    const body = value.answer.trim();
    if (!body) return null;
    const suggest =
      "suggest" in value && typeof value.suggest === "string"
        ? value.suggest.trim().slice(0, 160)
        : undefined;
    const cardId =
      "cardId" in value && typeof value.cardId === "string"
        ? value.cardId
        : undefined;
    return [
      {
        id: "direct-0",
        title: "Answer",
        body: body.slice(0, API_BODY_MAX),
        suggest,
        cardId,
        visuals: topVisuals.length > 0 ? topVisuals : undefined,
        boardMemo: boardMemo || undefined,
      },
    ];
  }

  if ("steps" in value && Array.isArray(value.steps)) {
    const steps = value.steps.reduce<LearningStep[]>((result, step, index) => {
      if (typeof step !== "object" || step === null) return result;
      const body =
        "body" in step && typeof step.body === "string" ? step.body.trim() : "";
      if (!body) return result;
      const title =
        "title" in step && typeof step.title === "string" && step.title.trim()
          ? step.title.trim()
          : index === 0
            ? "Answer"
            : "Going deeper";
      const suggest =
        "suggest" in step && typeof step.suggest === "string"
          ? step.suggest.trim().slice(0, 160)
          : undefined;
      const cardId =
        "cardId" in step && typeof step.cardId === "string"
          ? step.cardId
          : undefined;
      const stepVisuals =
        "visuals" in step
          ? parseTutorVisuals(step.visuals)
          : index === 0
            ? topVisuals
            : [];
      const stepMemo =
        "boardMemo" in step && typeof step.boardMemo === "string"
          ? step.boardMemo.trim().slice(0, 900)
          : index === 0
            ? boardMemo
            : undefined;
      result.push({
        id: `direct-${index}`,
        title: title.slice(0, 64),
        body: body.slice(0, API_BODY_MAX),
        suggest,
        cardId,
        visuals: stepVisuals.length > 0 ? stepVisuals : undefined,
        boardMemo: stepMemo || undefined,
      });
      return result;
    }, []);
    return steps.length > 0 ? steps.slice(0, 2) : null;
  }

  return null;
}

export function followUpsFromSteps(
  steps: LearningStep[],
  insights?: HabitInsights,
): string[] {
  const fromSteps = steps
    .map((step) => step.suggest)
    .filter((value): value is string => Boolean(value));
  const habitExtras = insights?.followUps ?? [];
  return [...new Set([...fromSteps, ...habitExtras])].slice(0, 3);
}
