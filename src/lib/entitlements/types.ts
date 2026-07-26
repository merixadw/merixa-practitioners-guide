import type { ProductId } from "./products";
import { PRODUCT_IDS } from "./products";

export type PurchaseSource = "preview" | "storekit";

export type GuideEntitlement =
  | { status: "locked" }
  | {
      status: "unlocked";
      source: PurchaseSource;
      unlockedAt: string;
      productId: ProductId;
    };

/**
 * Coach entitlement. Online = Premium only (Lite removed from sale).
 * Offline = Guide unlocked, no active AI (trial expired or never subscribed).
 */
export type AiEntitlement =
  | { kind: "offline" }
  | {
      kind: "premium";
      source: PurchaseSource;
      productId: ProductId;
      expiresAt: string | null;
      startedAt: string;
      /** True when access came from a legacy AI Lite receipt. */
      grandfatheredFromLite?: boolean;
      /** True when Premium came from the unlock-included 30-day grant. */
      fromUnlockTrial?: boolean;
    };

export type AiTier = AiEntitlement["kind"];

export type EntitlementSnapshot = {
  guide: GuideEntitlement;
  ai: AiEntitlement;
  updatedAt: string;
};

/** In-app purchase kinds offered for sale (Lite removed). */
export type PurchaseKind = "unlock" | "aiPremium";

export type IapAdapter = {
  purchase: (kind: PurchaseKind) => Promise<EntitlementSnapshot>;
  restore: () => Promise<EntitlementSnapshot>;
  /** Ends AI sub locally (preview). Native opens Apple Subscriptions. */
  cancelAi: () => Promise<EntitlementSnapshot>;
};

export function isGuideUnlocked(snapshot: EntitlementSnapshot): boolean {
  return snapshot.guide.status === "unlocked";
}

export function aiTierOf(snapshot: EntitlementSnapshot): AiTier {
  return snapshot.ai.kind;
}

export function canUseOnlineCoach(snapshot: EntitlementSnapshot): boolean {
  return snapshot.ai.kind === "premium";
}

/** Map entitlement tier → Tutor launch mode (no Lite). */
export function launchModeFromAiTier(
  aiTier: AiTier,
): "offline" | "premium" {
  return aiTier === "premium" ? "premium" : "offline";
}

export function isPremiumProductId(productId: string): boolean {
  return productId === PRODUCT_IDS.aiPremium;
}

/** Paid monthly Premium (not unlock trial, not grandfathered Lite). */
export function isPaidPremium(snapshot: EntitlementSnapshot): boolean {
  return (
    snapshot.ai.kind === "premium" &&
    !snapshot.ai.grandfatheredFromLite &&
    !snapshot.ai.fromUnlockTrial
  );
}

export function isUnlockTrialPremium(snapshot: EntitlementSnapshot): boolean {
  return snapshot.ai.kind === "premium" && snapshot.ai.fromUnlockTrial === true;
}
