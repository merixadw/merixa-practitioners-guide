import { LEGACY_PRODUCT_IDS, PRODUCT_IDS, type ProductId } from "./products";

export type VerifyMode = "apple-api" | "verifyReceipt" | "jws-claims";

export type VerifiedPurchase = {
  ok: true;
  productId: ProductId;
  transactionId: string;
  expiresAt: string | null;
  environment: "Sandbox" | "Production" | "Unknown";
  verification: VerifyMode;
};

export type VerifyFailure = {
  ok: false;
  error: string;
};

export type VerifyResult = VerifiedPurchase | VerifyFailure;

export type VerifyRequest = {
  productId: string;
  transactionId: string;
  receipt?: string;
  jwsRepresentation?: string;
};

function isProductId(value: string): value is ProductId {
  return (
    value === PRODUCT_IDS.unlock ||
    value === PRODUCT_IDS.aiPremium ||
    value === LEGACY_PRODUCT_IDS.aiLite
  );
}

function isVerifyMode(value: unknown): value is VerifyMode {
  return (
    value === "apple-api" ||
    value === "verifyReceipt" ||
    value === "jws-claims"
  );
}

function parseSuccess(raw: unknown): VerifiedPurchase | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (value.ok !== true) return null;
  if (typeof value.productId !== "string" || !isProductId(value.productId)) {
    return null;
  }
  if (typeof value.transactionId !== "string") return null;
  if (
    value.expiresAt !== null &&
    typeof value.expiresAt !== "string" &&
    value.expiresAt !== undefined
  ) {
    return null;
  }
  if (!isVerifyMode(value.verification)) return null;
  const environment =
    value.environment === "Sandbox" || value.environment === "Production"
      ? value.environment
      : "Unknown";
  return {
    ok: true,
    productId: value.productId,
    transactionId: value.transactionId,
    expiresAt:
      typeof value.expiresAt === "string"
        ? value.expiresAt
        : value.expiresAt === null
          ? null
          : null,
    environment,
    verification: value.verification,
  };
}

/**
 * Server-side Apple receipt / JWS verification.
 * Returns null when the verify URL is unset (local StoreKit testing).
 */
export async function verifyPurchaseWithServer(
  request: VerifyRequest,
): Promise<VerifyResult | null> {
  const url = process.env.NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL?.trim();
  if (!url) return null;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platform: "ios",
      productId: request.productId,
      transactionId: request.transactionId,
      receipt: request.receipt,
      jwsRepresentation: request.jwsRepresentation,
    }),
  });

  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      typeof value === "object" &&
      value !== null &&
      "error" in value &&
      typeof (value as { error: unknown }).error === "string"
        ? (value as { error: string }).error
        : `Verify failed (${response.status})`;
    return { ok: false, error: detail };
  }

  const parsed = parseSuccess(value);
  if (!parsed) {
    return { ok: false, error: "Invalid verify response" };
  }
  return parsed;
}
