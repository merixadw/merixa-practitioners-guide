/**
 * Last Paths journey position — powers Continue on Tutor home.
 */

export type JourneyProgress = {
  pathId: string;
  pathTitle: string;
  stepId?: string;
  stepTitle?: string;
  cardId?: string;
  updatedAt: string;
};

const JOURNEY_KEY = "mpg-journey-v1";

export function readJourneyProgress(): JourneyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(JOURNEY_KEY) ?? "");
    if (typeof parsed !== "object" || parsed === null) return null;
    const rec = parsed as Record<string, unknown>;
    if (
      typeof rec.pathId !== "string" ||
      !rec.pathId.trim() ||
      typeof rec.pathTitle !== "string" ||
      !rec.pathTitle.trim()
    ) {
      return null;
    }
    return {
      pathId: rec.pathId.trim().slice(0, 80),
      pathTitle: rec.pathTitle.trim().slice(0, 120),
      stepId:
        typeof rec.stepId === "string" && rec.stepId.trim()
          ? rec.stepId.trim().slice(0, 80)
          : undefined,
      stepTitle:
        typeof rec.stepTitle === "string" && rec.stepTitle.trim()
          ? rec.stepTitle.trim().slice(0, 120)
          : undefined,
      cardId:
        typeof rec.cardId === "string" && rec.cardId.trim()
          ? rec.cardId.trim().slice(0, 80)
          : undefined,
      updatedAt:
        typeof rec.updatedAt === "string"
          ? rec.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeJourneyProgress(
  progress: Omit<JourneyProgress, "updatedAt"> & { updatedAt?: string },
): JourneyProgress {
  const next: JourneyProgress = {
    pathId: progress.pathId.trim().slice(0, 80),
    pathTitle: progress.pathTitle.trim().slice(0, 120),
    stepId: progress.stepId?.trim().slice(0, 80),
    stepTitle: progress.stepTitle?.trim().slice(0, 120),
    cardId: progress.cardId?.trim().slice(0, 80),
    updatedAt: progress.updatedAt ?? new Date().toISOString(),
  };
  try {
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode.
  }
  return next;
}
