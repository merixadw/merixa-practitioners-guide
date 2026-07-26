import type { HabitInsights } from "./habits";
import type { BodyId, GuideCard, LearningPath } from "./types";

function bodyScore(card: GuideCard, preferred: BodyId[]): number {
  let score = 0;
  preferred.forEach((body, index) => {
    if (card.bodies.includes(body)) score += 12 - index * 3;
  });
  return score;
}

function themeScore(card: GuideCard, themes: string[]): number {
  const hay =
    `${card.title} ${card.body} ${card.classification?.domain ?? ""} ${card.classification?.topic ?? ""} ${card.tags.join(" ")}`.toLowerCase();
  return themes.reduce(
    (sum, theme, index) => (hay.includes(theme) ? sum + (8 - index) : sum),
    0,
  );
}

/** Rank Guide cards for the learner Merixa ML has been observing. */
export function rankCardsForLearner(
  cards: GuideCard[],
  insights: HabitInsights,
): GuideCard[] {
  return [...cards].sort((left, right) => {
    const leftScore =
      bodyScore(left, insights.preferredBodies) +
      themeScore(left, insights.askThemes) +
      (left.qualityScore ?? 0.5) * 10;
    const rightScore =
      bodyScore(right, insights.preferredBodies) +
      themeScore(right, insights.askThemes) +
      (right.qualityScore ?? 0.5) * 10;
    if (rightScore !== leftScore) return rightScore - leftScore;
    return left.title.localeCompare(right.title);
  });
}

export function rankPathsForLearner(
  paths: LearningPath[],
  insights: HabitInsights,
): LearningPath[] {
  return [...paths].sort((left, right) => {
    const leftHit = left.bodies.filter((body) =>
      insights.preferredBodies.includes(body),
    ).length;
    const rightHit = right.bodies.filter((body) =>
      insights.preferredBodies.includes(body),
    ).length;
    if (rightHit !== leftHit) return rightHit - leftHit;
    return left.title.localeCompare(right.title);
  });
}

export type TutorLaunchMode = "offline" | "premium";

/** Deep lesson / live demo in Tutor for one concept (Library / detail outbound). */
export function lessonHref(
  input: {
    title: string;
    id?: string;
    pathId?: string;
    stepId?: string;
  },
  mode: TutorLaunchMode = "offline",
): string {
  const cardHint = input.id
    ? ` Ground every claim in Guide card ${input.id}.`
    : "";
  const pathHint = input.pathId
    ? ` This card sits in learning path ${input.pathId}${
        input.stepId ? ` at step ${input.stepId}` : ""
      }.`
    : "";
  const params = new URLSearchParams();

  if (mode === "offline") {
    params.set(
      "q",
      `Teach me “${input.title}” as a full practitioner lesson in the Accruals-ratio pattern: Definition, At work (workplace evidence), Watch for (trap), Quick check, then name the next concept or path step so I stay in the learning cycle.${cardHint}${pathHint}`,
    );
  } else {
    params.set(
      "q",
      `Give a senior live demonstration of “${input.title}”. Answer directly with specialist depth — Definition cue, At-work sheet, Watch-for trap, then name the next concept or Live path step so I stay in the learning cycle.${cardHint}${pathHint}`,
    );
  }

  if (input.pathId) params.set("path", input.pathId);
  if (input.id) params.set("card", input.id);
  if (input.stepId) params.set("step", input.stepId);
  return `/?${params.toString()}`;
}

/** Walk a learning path — offline paced steps, or live AI demo for subscribers. */
export function pathLessonHref(
  path: {
    id: string;
    title: string;
    fromStepId?: string;
    fromCardId?: string;
  },
  mode: TutorLaunchMode = "offline",
): string {
  const fromHint = path.fromCardId
    ? ` Start from card ${path.fromCardId}${
        path.fromStepId ? ` (step ${path.fromStepId})` : ""
      }.`
    : " Start from the next open step.";
  const params = new URLSearchParams();

  if (mode === "offline") {
    params.set(
      "q",
      `Walk me through the learning path “${path.title}” (path ${path.id}) as a paced practitioner lesson.${fromHint} For each step use Definition → At work → Watch for → Quick check, then move to the next concept so I stay in the learning cycle.`,
    );
  } else {
    params.set(
      "q",
      `I am on the Paths journey “${path.title}” (path ${path.id}). Give a senior live tutoring of the current step.${fromHint} Use At-work evidence and a Watch-for trap, then name the next path step so I stay in the learning cycle.`,
    );
  }

  params.set("path", path.id);
  if (path.fromCardId) params.set("card", path.fromCardId);
  if (path.fromStepId) params.set("step", path.fromStepId);
  return `/?${params.toString()}`;
}

/** @deprecated Prefer lessonHref — kept for any remaining call sites. */
export function teachHref(title: string): string {
  return lessonHref({ title });
}

export type CoachSurface = "tutor" | "library" | "paths" | "saved";

export function mlCoachCopy(
  insights: HabitInsights,
  surface: CoachSurface = "tutor",
  mode: TutorLaunchMode = "offline",
): {
  eyebrow: string;
  title: string;
  action: string;
  href: string;
} {
  const starter =
    insights.starters[0] ?? "What should I learn next as a practitioner?";
  const live = mode === "premium";

  switch (surface) {
    case "library":
      return {
        eyebrow: "Library",
        title: "Browse concepts — breadth expands over time.",
        action: live ? "Ask Tutor" : "Browse",
        href: live ? `/?q=${encodeURIComponent(starter)}` : "/library/",
      };
    case "paths":
      return {
        eyebrow: "Paths",
        title: "Journeys grow with OpenAI — start with a flagship route.",
        action: live ? "Ask Tutor" : "Open Tutor",
        href: `/?q=${encodeURIComponent(starter)}`,
      };
    case "saved":
      return {
        eyebrow: "Saved",
        title: live
          ? "Ask Tutor about a saved concept."
          : "Quiz a saved concept in Tutor.",
        action: "Open Tutor",
        href: `/?q=${encodeURIComponent(starter)}`,
      };
    case "tutor":
      return {
        eyebrow: "Tutor",
        title: "Ask away.",
        action: "Browse Library",
        href: "/library/",
      };
    default: {
      const _exhaustive: never = surface;
      return _exhaustive;
    }
  }
}
