import { createStoreKitIap } from "./storekit-adapter";
import { isNativeIos } from "./platform";
import {
  readEntitlements,
  withAiCancelled,
  withAiPremium,
  withGuideUnlocked,
  writeEntitlements,
} from "./store";
import type { EntitlementSnapshot, IapAdapter, PurchaseKind } from "./types";

export type { IapAdapter } from "./types";

function applyPurchase(
  current: EntitlementSnapshot,
  kind: PurchaseKind,
  source: "preview" | "storekit",
): EntitlementSnapshot {
  switch (kind) {
    case "unlock":
      return withGuideUnlocked(current, source);
    case "aiPremium":
      return withAiPremium(current, source);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Preview / web shell — persists locally; no Apple receipt. */
export function createPreviewIap(): IapAdapter {
  return {
    async purchase(kind) {
      const next = applyPurchase(readEntitlements(), kind, "preview");
      writeEntitlements(next);
      return next;
    },
    async restore() {
      const current = readEntitlements();
      writeEntitlements(current);
      return current;
    },
    async cancelAi() {
      const next = withAiCancelled(readEntitlements());
      writeEntitlements(next);
      return next;
    },
  };
}

export function createIapAdapter(): IapAdapter {
  if (typeof window === "undefined") return createPreviewIap();
  if (!isNativeIos()) return createPreviewIap();
  return createStoreKitIap();
}
