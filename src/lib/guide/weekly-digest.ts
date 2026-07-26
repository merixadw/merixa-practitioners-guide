/**
 * Optional weekly path digest — in-app first; Web Notification only if granted.
 * Not push spam: at most once per ISO week, only when an active path has steps left.
 */
import type { LearningPath, LearningPathStep } from "./types";
import { digestCardsFromPath } from "./path-progress";

const DIGEST_KEY = "mpg-weekly-digest-v1";

export type WeeklyDigestState = {
  lastWeekKey?: string;
  lastShownAt?: string;
  notifyOptIn?: boolean;
};

function isoWeekKey(date = new Date()): string {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function readWeeklyDigestState(): WeeklyDigestState {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DIGEST_KEY) ?? "");
    if (typeof parsed !== "object" || parsed === null) return {};
    const row = parsed as Record<string, unknown>;
    return {
      lastWeekKey:
        typeof row.lastWeekKey === "string" ? row.lastWeekKey : undefined,
      lastShownAt:
        typeof row.lastShownAt === "string" ? row.lastShownAt : undefined,
      notifyOptIn: row.notifyOptIn === true,
    };
  } catch {
    return {};
  }
}

function writeWeeklyDigestState(state: WeeklyDigestState) {
  try {
    localStorage.setItem(DIGEST_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function markWeeklyDigestShown(): WeeklyDigestState {
  const prev = readWeeklyDigestState();
  const next: WeeklyDigestState = {
    ...prev,
    lastWeekKey: isoWeekKey(),
    lastShownAt: new Date().toISOString(),
  };
  writeWeeklyDigestState(next);
  return next;
}

export function setWeeklyDigestNotifyOptIn(optIn: boolean): WeeklyDigestState {
  const prev = readWeeklyDigestState();
  const next = { ...prev, notifyOptIn: optIn };
  writeWeeklyDigestState(next);
  return next;
}

export function shouldOfferWeeklyDigest(
  path: LearningPath | null,
  recent: string[],
  saved: string[],
): LearningPathStep[] | null {
  if (!path) return null;
  const steps = digestCardsFromPath(path, recent, saved, 3);
  if (steps.length === 0) return null;
  const state = readWeeklyDigestState();
  if (state.lastWeekKey === isoWeekKey()) return null;
  return steps;
}

/** Soft local notification when the learner opted in (Web Notification API). */
export async function maybeNotifyWeeklyDigest(input: {
  pathTitle: string;
  stepTitles: string[];
}): Promise<"shown" | "denied" | "unsupported" | "skipped"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const state = readWeeklyDigestState();
  if (!state.notifyOptIn) return "skipped";
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    setWeeklyDigestNotifyOptIn(false);
    return "denied";
  }
  const body =
    input.stepTitles.length > 0
      ? `This week: ${input.stepTitles.slice(0, 3).join(" · ")}`
      : "Three concepts waiting on your active path.";
  try {
    new Notification(`Merixa · ${input.pathTitle}`, {
      body,
      tag: `mpg-weekly-${isoWeekKey()}`,
      silent: true,
    });
    return "shown";
  } catch {
    return "unsupported";
  }
}
