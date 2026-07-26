import {
  LEGACY_PRODUCT_IDS,
  PRODUCT_IDS,
  UNLOCK_PREMIUM_TRIAL_DAYS,
  type ProductId,
} from "./products";
import type { AiEntitlement, EntitlementSnapshot, GuideEntitlement } from "./types";

export const ENTITLEMENTS_KEY = "mpg-entitlements-v1";
const LEGACY_PREVIEW_KEY = "mpg-preview-access-v1";

function nowIso(): string {
  return new Date().toISOString();
}

function monthEndIso(from = new Date()): string {
  const end = new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59);
  return end.toISOString();
}

/** Trial end = unlockedAt + UNLOCK_PREMIUM_TRIAL_DAYS (UTC calendar days). */
export function unlockPremiumTrialExpiresAt(unlockedAt: string): string {
  const start = new Date(unlockedAt);
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() + UNLOCK_PREMIUM_TRIAL_DAYS);
    return fallback.toISOString();
  }
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + UNLOCK_PREMIUM_TRIAL_DAYS);
  return end.toISOString();
}

export function lockedSnapshot(): EntitlementSnapshot {
  return {
    guide: { status: "locked" },
    ai: { kind: "offline" },
    updatedAt: nowIso(),
  };
}

export function unlockedOfflineSnapshot(
  source: "preview" | "storekit" = "preview",
): EntitlementSnapshot {
  return {
    guide: {
      status: "unlocked",
      source,
      unlockedAt: nowIso(),
      productId: PRODUCT_IDS.unlock,
    },
    ai: { kind: "offline" },
    updatedAt: nowIso(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGuide(value: unknown): GuideEntitlement | null {
  if (!isRecord(value)) return null;
  if (value.status === "locked") return { status: "locked" };
  if (
    value.status === "unlocked" &&
    (value.source === "preview" || value.source === "storekit") &&
    typeof value.unlockedAt === "string" &&
    typeof value.productId === "string"
  ) {
    return {
      status: "unlocked",
      source: value.source,
      unlockedAt: value.unlockedAt,
      productId: PRODUCT_IDS.unlock,
    };
  }
  return null;
}

/**
 * Parse AI entitlement. Legacy `kind: "lite"` snapshots are grandfathered
 * to Premium (online) until expiry — Lite is no longer a sold tier.
 * `fromUnlockTrial` Premium from Guide unlock is accepted until expiresAt.
 */
function parseAi(value: unknown): AiEntitlement | null {
  if (!isRecord(value)) return null;
  if (value.kind === "offline") return { kind: "offline" };

  const legacyLite = value.kind === "lite";
  const premium = value.kind === "premium" || legacyLite;
  if (
    premium &&
    (value.source === "preview" || value.source === "storekit") &&
    typeof value.startedAt === "string" &&
    (value.expiresAt === null || typeof value.expiresAt === "string")
  ) {
    const fromUnlockTrial = value.fromUnlockTrial === true;
    const productId =
      typeof value.productId === "string" &&
      (value.productId === PRODUCT_IDS.aiPremium ||
        value.productId === PRODUCT_IDS.unlock ||
        value.productId === LEGACY_PRODUCT_IDS.aiLite)
        ? value.productId
        : fromUnlockTrial
          ? PRODUCT_IDS.unlock
          : legacyLite
            ? LEGACY_PRODUCT_IDS.aiLite
            : PRODUCT_IDS.aiPremium;
    return {
      kind: "premium",
      source: value.source,
      productId,
      expiresAt: value.expiresAt,
      startedAt: value.startedAt,
      grandfatheredFromLite:
        legacyLite || productId === LEGACY_PRODUCT_IDS.aiLite || undefined,
      fromUnlockTrial: fromUnlockTrial || undefined,
    };
  }
  return null;
}

export function parseSnapshot(raw: unknown): EntitlementSnapshot | null {
  if (!isRecord(raw)) return null;
  const guide = parseGuide(raw.guide);
  const ai = parseAi(raw.ai);
  if (!guide || !ai) return null;
  if (typeof raw.updatedAt !== "string") return null;
  return { guide, ai, updatedAt: raw.updatedAt };
}

function migrateLegacyPreview(): EntitlementSnapshot | null {
  try {
    if (localStorage.getItem(LEGACY_PREVIEW_KEY) === "unlocked") {
      // Legacy unlock flag → grant current offer (unlock + trial window).
      return withGuideUnlocked(lockedSnapshot(), "preview");
    }
  } catch {
    // Ignore storage failures.
  }
  return null;
}

export function readEntitlements(): EntitlementSnapshot {
  if (typeof window === "undefined") return lockedSnapshot();
  try {
    const raw = localStorage.getItem(ENTITLEMENTS_KEY);
    if (raw) {
      const parsed = parseSnapshot(JSON.parse(raw) as unknown);
      if (parsed) {
        const next = expireAiIfNeeded(parsed);
        if (JSON.stringify(next) !== raw) writeEntitlements(next);
        return next;
      }
    }
    const migrated = migrateLegacyPreview();
    if (migrated) {
      writeEntitlements(migrated);
      return migrated;
    }
  } catch {
    // Fall through to locked.
  }
  return lockedSnapshot();
}

export function writeEntitlements(snapshot: EntitlementSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(snapshot));
  } catch {
    // Preview remains usable for the current render.
  }
}

/** Drop expired preview/store AI memberships to offline (Library stays unlocked). */
export function expireAiIfNeeded(
  snapshot: EntitlementSnapshot,
): EntitlementSnapshot {
  if (snapshot.ai.kind === "offline") return snapshot;
  const expiresAt = snapshot.ai.expiresAt;
  if (!expiresAt) return snapshot;
  if (Date.parse(expiresAt) >= Date.now()) return snapshot;
  return {
    ...snapshot,
    ai: { kind: "offline" },
    updatedAt: nowIso(),
  };
}

function isActivePaidPremium(ai: AiEntitlement): boolean {
  if (ai.kind !== "premium") return false;
  if (ai.fromUnlockTrial) return false;
  if (ai.expiresAt && Date.parse(ai.expiresAt) < Date.now()) return false;
  return true;
}

/**
 * Unlock Guide + include 30 days of AI Premium from unlockedAt.
 * Does not overwrite an active paid Premium subscription.
 * Pass unlockedAt from the original StoreKit purchase date on restore
 * so the trial window cannot reset.
 */
export function withGuideUnlocked(
  snapshot: EntitlementSnapshot,
  source: "preview" | "storekit",
  opts?: { unlockedAt?: string },
): EntitlementSnapshot {
  const unlockedAt =
    opts?.unlockedAt ??
    (snapshot.guide.status === "unlocked"
      ? snapshot.guide.unlockedAt
      : nowIso());
  const trialExpiresAt = unlockPremiumTrialExpiresAt(unlockedAt);
  const trialStillActive = Date.parse(trialExpiresAt) >= Date.now();

  const ai: AiEntitlement = isActivePaidPremium(snapshot.ai)
    ? snapshot.ai
    : trialStillActive
      ? {
          kind: "premium",
          source,
          productId: PRODUCT_IDS.unlock,
          expiresAt: trialExpiresAt,
          startedAt: unlockedAt,
          fromUnlockTrial: true,
        }
      : { kind: "offline" };

  return {
    ...snapshot,
    guide: {
      status: "unlocked",
      source,
      unlockedAt,
      productId: PRODUCT_IDS.unlock,
    },
    ai,
    updatedAt: nowIso(),
  };
}

/** @deprecated Lite removed — aliases to Premium for any leftover call sites. */
export function withAiLite(
  snapshot: EntitlementSnapshot,
  source: "preview" | "storekit",
  expiresAt?: string | null,
): EntitlementSnapshot {
  return withAiPremium(snapshot, source, expiresAt, {
    grandfatheredFromLite: true,
    productId: LEGACY_PRODUCT_IDS.aiLite,
  });
}

export function withAiPremium(
  snapshot: EntitlementSnapshot,
  source: "preview" | "storekit",
  expiresAt?: string | null,
  opts?: {
    grandfatheredFromLite?: boolean;
    productId?: ProductId;
  },
): EntitlementSnapshot {
  const unlocked =
    snapshot.guide.status === "unlocked"
      ? snapshot
      : withGuideUnlocked(snapshot, source);
  return {
    ...unlocked,
    ai: {
      kind: "premium",
      source,
      productId: opts?.productId ?? PRODUCT_IDS.aiPremium,
      expiresAt: expiresAt === undefined ? monthEndIso() : expiresAt,
      startedAt: nowIso(),
      grandfatheredFromLite: opts?.grandfatheredFromLite || undefined,
      // Paid / grandfathered sub — not the unlock trial.
      fromUnlockTrial: undefined,
    },
    updatedAt: nowIso(),
  };
}

export function withAiCancelled(snapshot: EntitlementSnapshot): EntitlementSnapshot {
  return {
    ...snapshot,
    ai: { kind: "offline" },
    updatedAt: nowIso(),
  };
}
