/**
 * Proof-of-learning streak — consecutive Quick-check “got it” taps.
 * Not a login streak.
 */
const STREAK_KEY = "mpg-check-streak-v1";

export type CheckStreak = {
  current: number;
  best: number;
  lastCardId?: string;
  lastAt?: string;
  lastResult?: "got_it" | "missed";
};

const EMPTY: CheckStreak = { current: 0, best: 0 };

function isStreak(value: unknown): value is CheckStreak {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.current === "number" && typeof row.best === "number";
}

export function readCheckStreak(): CheckStreak {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STREAK_KEY) ?? "");
    if (!isStreak(parsed)) return { ...EMPTY };
    return {
      current: Math.max(0, Math.floor(parsed.current)),
      best: Math.max(0, Math.floor(parsed.best)),
      lastCardId:
        typeof parsed.lastCardId === "string" ? parsed.lastCardId : undefined,
      lastAt: typeof parsed.lastAt === "string" ? parsed.lastAt : undefined,
      lastResult:
        parsed.lastResult === "got_it" || parsed.lastResult === "missed"
          ? parsed.lastResult
          : undefined,
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeCheckStreak(streak: CheckStreak) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  } catch {
    // Private browsing should not break the app.
  }
}

export function recordCheckResult(
  cardId: string,
  result: "got_it" | "missed",
): CheckStreak {
  const prev = readCheckStreak();
  const current = result === "got_it" ? prev.current + 1 : 0;
  const next: CheckStreak = {
    current,
    best: Math.max(prev.best, current),
    lastCardId: cardId.slice(0, 80),
    lastAt: new Date().toISOString(),
    lastResult: result,
  };
  writeCheckStreak(next);
  return next;
}
