/**
 * Unlock-trial soft nudges at ~day 20 and ~day 27 of the 30-day Premium month.
 */
import {
  isUnlockTrialPremium,
  type EntitlementSnapshot,
} from "@/lib/entitlements";

const ACK_KEY = "mpg-trial-nudge-v1";

export type TrialNudgePhase = "day20" | "day27";

export type TrialNudgeAck = {
  day20At?: string;
  day27At?: string;
};

export function trialDaysRemaining(
  expiresAt: string | null | undefined,
  now = Date.now(),
): number | null {
  if (!expiresAt) return null;
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return null;
  const ms = end - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * day20 ≈ 10 days left; day27 ≈ 3 days left (30-day unlock trial).
 */
export function trialNudgePhase(
  snapshot: EntitlementSnapshot,
  now = Date.now(),
): TrialNudgePhase | null {
  if (!isUnlockTrialPremium(snapshot)) return null;
  if (snapshot.ai.kind !== "premium") return null;
  const days = trialDaysRemaining(snapshot.ai.expiresAt, now);
  if (days === null || days <= 0) return null;
  if (days <= 3) return "day27";
  if (days <= 10) return "day20";
  return null;
}

export function readTrialNudgeAck(): TrialNudgeAck {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ACK_KEY) ?? "");
    if (typeof parsed !== "object" || parsed === null) return {};
    const row = parsed as Record<string, unknown>;
    return {
      day20At: typeof row.day20At === "string" ? row.day20At : undefined,
      day27At: typeof row.day27At === "string" ? row.day27At : undefined,
    };
  } catch {
    return {};
  }
}

export function acknowledgeTrialNudge(phase: TrialNudgePhase): TrialNudgeAck {
  const prev = readTrialNudgeAck();
  const next: TrialNudgeAck = {
    ...prev,
    ...(phase === "day20"
      ? { day20At: new Date().toISOString() }
      : { day27At: new Date().toISOString() }),
  };
  try {
    localStorage.setItem(ACK_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function shouldShowTrialNudge(
  snapshot: EntitlementSnapshot,
  now = Date.now(),
): TrialNudgePhase | null {
  const phase = trialNudgePhase(snapshot, now);
  if (!phase) return null;
  const ack = readTrialNudgeAck();
  if (phase === "day20" && ack.day20At) return null;
  if (phase === "day27" && ack.day27At) return null;
  return phase;
}

export function trialNudgeCopy(phase: TrialNudgePhase, daysLeft: number): {
  title: string;
  lead: string;
  keepLabel: string;
  stayLabel: string;
} {
  if (phase === "day27") {
    return {
      title: "Keep live coaching?",
      lead: `About ${daysLeft} day${daysLeft === 1 ? "" : "s"} left on your unlock-included Premium month. Subscribe to keep live Tutor — or stay on Offline Library with equal weight. No pressure either way.`,
      keepLabel: "Keep live coaching",
      stayLabel: "Stay on Offline Library",
    };
  }
  return {
    title: "Keep live coaching?",
    lead: `You’re past day 20 of your unlock-included Premium month — about ${daysLeft} days left. Subscribe when you’re ready, or keep Offline Library after the month. Both options are fine.`,
    keepLabel: "Keep live coaching",
    stayLabel: "I’ll stay Offline after",
  };
}
