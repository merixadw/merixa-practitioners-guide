/**
 * Path progress helpers — % complete, next step, finish-this-week nudge.
 * Completion uses opened/saved card ids (same signal as PathList).
 */
import type { HabitInsights } from "./habits";
import type { LearningPath, LearningPathStep } from "./types";

export type PathProgress = {
  opened: number;
  total: number;
  percent: number;
  complete: boolean;
  nextStep: LearningPathStep | null;
  remaining: number;
};

export function stepOpened(
  cardId: string | undefined,
  recent: string[],
  saved: string[],
): boolean {
  if (!cardId) return false;
  return recent.includes(cardId) || saved.includes(cardId);
}

export function pathProgress(
  path: LearningPath,
  recent: string[],
  saved: string[],
): PathProgress {
  const total = path.steps.length;
  const opened = path.steps.filter((step) =>
    stepOpened(step.cardId, recent, saved),
  ).length;
  const complete = total > 0 && opened >= total;
  const nextStep =
    path.steps.find(
      (step) => step.cardId && !stepOpened(step.cardId, recent, saved),
    ) ?? null;
  const percent =
    total === 0 ? 0 : Math.min(100, Math.round((opened / total) * 100));
  return {
    opened,
    total,
    percent,
    complete,
    nextStep,
    remaining: Math.max(0, total - opened),
  };
}

export function pathProgressLabel(progress: PathProgress): string {
  if (progress.total === 0) return "No steps yet";
  if (progress.complete) {
    return `${progress.opened}/${progress.total} · 100% · Journey complete`;
  }
  return `${progress.opened}/${progress.total} · ${progress.percent}%`;
}

/**
 * Soft retention nudge when the learner is mid-path and habits say they
 * can finish the remaining steps this week (not a login streak).
 */
export function finishThisWeekSuggestion(
  progress: PathProgress,
  pace: HabitInsights["pace"] = "steady",
): string | null {
  if (progress.complete || progress.opened === 0 || progress.remaining <= 0) {
    return null;
  }
  const ambitious =
    pace === "fast" || progress.percent >= 50 || progress.remaining <= 3;
  if (!ambitious) return null;
  return progress.remaining === 1
    ? "One step left — finish this week."
    : `${progress.remaining} steps left — finish this week.`;
}

/** First incomplete ranked path that isn’t the current one. */
export function nextRecommendedPath(
  ranked: LearningPath[],
  currentId: string,
  recent: string[],
  saved: string[],
): LearningPath | null {
  return (
    ranked.find((path) => {
      if (path.id === currentId) return false;
      return !pathProgress(path, recent, saved).complete;
    }) ?? null
  );
}

/** Up to `limit` incomplete card ids from an active path (weekly digest). */
export function digestCardsFromPath(
  path: LearningPath,
  recent: string[],
  saved: string[],
  limit = 3,
): LearningPathStep[] {
  return path.steps
    .filter((step) => step.cardId && !stepOpened(step.cardId, recent, saved))
    .slice(0, limit);
}
