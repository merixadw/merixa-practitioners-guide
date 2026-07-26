import type { Transaction } from "@capgo/native-purchases";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import {
  isKnownProductId,
  productKind,
  snapshotFromStoreProducts,
  type StoreOwnedProducts,
} from "./owned";
import { LEGACY_PRODUCT_IDS, PRODUCT_IDS } from "./products";
import { readEntitlements, writeEntitlements } from "./store";
import type { EntitlementSnapshot, IapAdapter, PurchaseKind } from "./types";
import { verifyPurchaseWithServer } from "./verify-client";

type PurchaseMeta = {
  productId: string;
  transactionId: string;
  receipt?: string;
  jwsRepresentation?: string;
  expirationDate?: string;
  purchaseDate?: string;
  isActive?: boolean;
};

function kindToProduct(kind: PurchaseKind): {
  productId: string;
  productType: PURCHASE_TYPE;
} {
  switch (kind) {
    case "unlock":
      return {
        productId: PRODUCT_IDS.unlock,
        productType: PURCHASE_TYPE.INAPP,
      };
    case "aiPremium":
      return {
        productId: PRODUCT_IDS.aiPremium,
        productType: PURCHASE_TYPE.SUBS,
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function fromTransaction(tx: Transaction): PurchaseMeta {
  const raw = tx as Transaction & {
    purchaseDate?: string;
    transactionDate?: string;
  };
  return {
    productId: tx.productIdentifier,
    transactionId: tx.transactionId,
    receipt: tx.receipt,
    jwsRepresentation: tx.jwsRepresentation,
    expirationDate: tx.expirationDate,
    purchaseDate: raw.purchaseDate ?? raw.transactionDate,
    isActive: tx.isActive,
  };
}

async function assertBillingSupported(): Promise<void> {
  const { isBillingSupported } = await NativePurchases.isBillingSupported();
  if (!isBillingSupported) {
    throw new Error("StoreKit billing is not available on this device");
  }
}

/**
 * Prefer Apple server verification. When the verify worker URL is unset,
 * allow StoreKit Configuration / sandbox local testing only if explicitly
 * opted in via NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true.
 */
async function requireVerified(meta: PurchaseMeta): Promise<{
  expiresAt: string | null;
}> {
  if (!isKnownProductId(meta.productId)) {
    throw new Error(`Unknown product: ${meta.productId}`);
  }

  const verified = await verifyPurchaseWithServer({
    productId: meta.productId,
    transactionId: meta.transactionId,
    receipt: meta.receipt,
    jwsRepresentation: meta.jwsRepresentation,
  });

  if (verified === null) {
    const allowUnverified =
      process.env.NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED === "true";
    if (!allowUnverified) {
      throw new Error(
        "Purchase verification is required. Configure NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL.",
      );
    }
    return {
      expiresAt: meta.expirationDate ?? null,
    };
  }

  if (!verified.ok) {
    throw new Error(verified.error);
  }

  if (verified.productId !== meta.productId) {
    throw new Error("Verified product does not match purchase");
  }

  return { expiresAt: verified.expiresAt ?? meta.expirationDate ?? null };
}

async function collectOwned(): Promise<StoreOwnedProducts> {
  const [inapp, subs] = await Promise.all([
    NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP }),
    NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS }),
  ]);

  let unlock = false;
  let unlockPurchasedAt: string | null = null;
  let ai: "premium" | null = null;
  let aiExpiresAt: string | null = null;
  let fromLegacyLite = false;

  for (const purchase of inapp.purchases) {
    if (purchase.productIdentifier === PRODUCT_IDS.unlock) {
      unlock = true;
      const raw = purchase as typeof purchase & {
        purchaseDate?: string;
        transactionDate?: string;
      };
      unlockPurchasedAt =
        raw.purchaseDate ?? raw.transactionDate ?? unlockPurchasedAt;
    }
  }

  for (const purchase of subs.purchases) {
    const kind = productKind(purchase.productIdentifier);
    if (kind !== "aiLite" && kind !== "aiPremium") continue;
    const active =
      purchase.isActive === true ||
      (purchase.expirationDate
        ? Date.parse(purchase.expirationDate) > Date.now()
        : false);
    if (!active) continue;

    // Lite SKU grandfathered as online Premium entitlement.
    ai = "premium";
    aiExpiresAt = purchase.expirationDate ?? null;
    fromLegacyLite = kind === "aiLite";
    if (kind === "aiPremium") {
      fromLegacyLite = false;
      break;
    }
  }

  return { unlock, unlockPurchasedAt, ai, aiExpiresAt, fromLegacyLite };
}

/**
 * Sync entitlements from StoreKit ownership, verifying unlock + active AI
 * purchases when a verify worker is configured.
 */
export async function refreshFromStoreKit(): Promise<EntitlementSnapshot> {
  await assertBillingSupported();
  await NativePurchases.restorePurchases();
  const owned = await collectOwned();

  if (owned.unlock) {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP,
    });
    const unlockTx = purchases.find(
      (p) => p.productIdentifier === PRODUCT_IDS.unlock,
    );
    if (unlockTx) {
      await requireVerified(fromTransaction(unlockTx));
    }
  }

  if (owned.ai) {
    const { purchases } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.SUBS,
    });
    const productId = owned.fromLegacyLite
      ? LEGACY_PRODUCT_IDS.aiLite
      : PRODUCT_IDS.aiPremium;
    const subTx = purchases.find((p) => p.productIdentifier === productId);
    if (subTx) {
      const { expiresAt } = await requireVerified(fromTransaction(subTx));
      owned.aiExpiresAt = expiresAt ?? owned.aiExpiresAt;
    }
  }

  const next = snapshotFromStoreProducts(owned);
  writeEntitlements(next);
  return next;
}

export function createStoreKitIap(): IapAdapter {
  return {
    async purchase(kind) {
      await assertBillingSupported();
      const { productId, productType } = kindToProduct(kind);
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: productId,
        productType,
        quantity: 1,
      });
      const meta = fromTransaction(transaction);
      const { expiresAt } = await requireVerified(meta);

      let owned = await collectOwned();
      if (kind === "unlock") {
        owned = {
          ...owned,
          unlock: true,
          unlockPurchasedAt:
            meta.purchaseDate ?? owned.unlockPurchasedAt ?? new Date().toISOString(),
        };
      }
      if (kind === "aiPremium") {
        owned = {
          ...owned,
          unlock: true,
          ai: "premium",
          aiExpiresAt: expiresAt ?? owned.aiExpiresAt,
          fromLegacyLite: false,
        };
      }

      const next = snapshotFromStoreProducts(owned);
      writeEntitlements(next);
      return next;
    },

    async restore() {
      return refreshFromStoreKit();
    },

    async cancelAi() {
      await NativePurchases.manageSubscriptions();
      return readEntitlements();
    },
  };
}

/** Localized StoreKit prices for paywall display (sold SKUs only). */
export async function loadStorePrices(): Promise<
  Partial<Record<"unlock" | "aiPremium", string>>
> {
  try {
    await assertBillingSupported();
    const [inapp, subs] = await Promise.all([
      NativePurchases.getProducts({
        productIdentifiers: [PRODUCT_IDS.unlock],
        productType: PURCHASE_TYPE.INAPP,
      }),
      NativePurchases.getProducts({
        productIdentifiers: [PRODUCT_IDS.aiPremium],
        productType: PURCHASE_TYPE.SUBS,
      }),
    ]);

    const prices: Partial<Record<"unlock" | "aiPremium", string>> = {};
    for (const product of inapp.products) {
      if (product.identifier === PRODUCT_IDS.unlock && product.priceString) {
        prices.unlock = product.priceString;
      }
    }
    for (const product of subs.products) {
      if (
        product.identifier === PRODUCT_IDS.aiPremium &&
        product.priceString
      ) {
        prices.aiPremium = product.priceString;
      }
    }
    return prices;
  } catch {
    return {};
  }
}
