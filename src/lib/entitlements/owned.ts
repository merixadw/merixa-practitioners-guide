import { LEGACY_PRODUCT_IDS, PRODUCT_IDS, type ProductId } from "./products";
import type { EntitlementSnapshot } from "./types";
import {
  lockedSnapshot,
  withAiPremium,
  withGuideUnlocked,
} from "./store";

export type StoreOwnedProducts = {
  unlock: boolean;
  /**
   * Original unlock purchase date (ISO). Required on restore so the
   * included Premium month cannot restart from “now”.
   */
  unlockPurchasedAt?: string | null;
  /** Active online coach from StoreKit (Premium sold; Lite grandfathered). */
  ai: "premium" | null;
  aiExpiresAt: string | null;
  /** True when the active AI product is the legacy Lite SKU. */
  fromLegacyLite?: boolean;
};

export function productKind(
  productId: string,
): "unlock" | "aiLite" | "aiPremium" | null {
  switch (productId) {
    case PRODUCT_IDS.unlock:
      return "unlock";
    case LEGACY_PRODUCT_IDS.aiLite:
      return "aiLite";
    case PRODUCT_IDS.aiPremium:
      return "aiPremium";
    default:
      return null;
  }
}

export function isKnownProductId(productId: string): productId is ProductId {
  return productKind(productId) !== null;
}

/** Build entitlement snapshot from verified StoreKit ownership. */
export function snapshotFromStoreProducts(
  owned: StoreOwnedProducts,
): EntitlementSnapshot {
  let next = lockedSnapshot();
  if (owned.unlock) {
    next = withGuideUnlocked(next, "storekit", {
      unlockedAt: owned.unlockPurchasedAt ?? undefined,
    });
  }
  if (owned.ai === "premium") {
    next = withAiPremium(next, "storekit", owned.aiExpiresAt, {
      grandfatheredFromLite: owned.fromLegacyLite,
      productId: owned.fromLegacyLite
        ? LEGACY_PRODUCT_IDS.aiLite
        : PRODUCT_IDS.aiPremium,
    });
  }
  return next;
}
