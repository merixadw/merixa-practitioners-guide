/**
 * Merixa IAP verify worker — validates Apple StoreKit purchases.
 *
 * Env (preferred App Store Server API):
 * - APPLE_BUNDLE_ID (required) e.g. uk.co.merixa.practitionersguide
 * - APPLE_ISSUER_ID
 * - APPLE_KEY_ID
 * - APPLE_PRIVATE_KEY  (PKCS8 .p8 PEM contents)
 * - APPLE_IAP_ENVIRONMENT  Sandbox | Production (default: try Production then Sandbox)
 *
 * Env (legacy verifyReceipt fallback):
 * - APPLE_IAP_SHARED_SECRET
 *
 * Env (local / StoreKit Configuration only):
 * - ALLOW_JWS_CLAIMS_ONLY=true  — accept decoded JWS payload without Apple API
 */
const PRODUCT_IDS = new Set([
  "uk.co.merixa.practitionersguide.unlock",
  "uk.co.merixa.practitionersguide.ai.lite.monthly",
  "uk.co.merixa.practitionersguide.ai.premium.monthly",
]);

const worker = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const productId =
      typeof payload?.productId === "string" ? payload.productId.trim() : "";
    const transactionId =
      typeof payload?.transactionId === "string"
        ? payload.transactionId.trim()
        : "";
    const receipt =
      typeof payload?.receipt === "string" ? payload.receipt.trim() : "";
    const jwsRepresentation =
      typeof payload?.jwsRepresentation === "string"
        ? payload.jwsRepresentation.trim()
        : "";

    if (!productId || !PRODUCT_IDS.has(productId)) {
      return json({ error: "Unknown productId" }, 400);
    }
    if (!transactionId) {
      return json({ error: "transactionId is required" }, 400);
    }

    const bundleId =
      typeof env.APPLE_BUNDLE_ID === "string" && env.APPLE_BUNDLE_ID.trim()
        ? env.APPLE_BUNDLE_ID.trim()
        : "uk.co.merixa.practitionersguide";

    // 1) App Store Server API — Get Transaction Info
    if (
      env.APPLE_ISSUER_ID &&
      env.APPLE_KEY_ID &&
      env.APPLE_PRIVATE_KEY
    ) {
      try {
        const api = await verifyViaAppStoreApi({
          env,
          transactionId,
          expectedProductId: productId,
          bundleId,
        });
        if (api) return json(api);
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "App Store API failed";
        // Fall through to other methods.
        console.warn("apple-api", detail);
      }
    }

    // 2) Legacy verifyReceipt
    if (receipt && env.APPLE_IAP_SHARED_SECRET) {
      try {
        const legacy = await verifyViaReceipt({
          receipt,
          sharedSecret: env.APPLE_IAP_SHARED_SECRET,
          expectedProductId: productId,
          expectedTransactionId: transactionId,
          bundleId,
        });
        if (legacy) return json(legacy);
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "verifyReceipt failed";
        console.warn("verifyReceipt", detail);
      }
    }

    // 3) JWS claims-only (sandbox / StoreKit Configuration)
    if (jwsRepresentation && env.ALLOW_JWS_CLAIMS_ONLY === "true") {
      const claims = decodeJwsPayload(jwsRepresentation);
      if (claims) {
        const claimProduct =
          typeof claims.productId === "string"
            ? claims.productId
            : typeof claims.product_id === "string"
              ? claims.product_id
              : "";
        const claimBundle =
          typeof claims.bundleId === "string"
            ? claims.bundleId
            : typeof claims.bid === "string"
              ? claims.bid
              : "";
        const claimTx =
          typeof claims.transactionId === "string"
            ? claims.transactionId
            : typeof claims.transaction_id === "string"
              ? claims.transaction_id
              : "";

        if (
          claimProduct === productId &&
          (!claimBundle || claimBundle === bundleId) &&
          (!claimTx || claimTx === transactionId)
        ) {
          const expiresAt = expiresFromClaims(claims);
          return json({
            ok: true,
            productId,
            transactionId,
            expiresAt,
            environment:
              claims.environment === "Sandbox" ||
              claims.environment === "Production"
                ? claims.environment
                : "Unknown",
            verification: "jws-claims",
          });
        }
      }
    }

    return json(
      {
        error: "Unable to verify purchase",
        detail:
          "Configure App Store Server API keys, or APPLE_IAP_SHARED_SECRET + receipt, or ALLOW_JWS_CLAIMS_ONLY for local testing.",
      },
      402,
    );
  },
};

export default worker;

async function verifyViaAppStoreApi({
  env,
  transactionId,
  expectedProductId,
  bundleId,
}) {
  const token = await createAppStoreJwt(env);
  const hosts =
    env.APPLE_IAP_ENVIRONMENT === "Sandbox"
      ? ["https://api.storekit-sandbox.itunes.apple.com"]
      : env.APPLE_IAP_ENVIRONMENT === "Production"
        ? ["https://api.storekit.itunes.apple.com"]
        : [
            "https://api.storekit.itunes.apple.com",
            "https://api.storekit-sandbox.itunes.apple.com",
          ];

  for (const host of hosts) {
    const response = await fetch(
      `${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (response.status === 404) continue;
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Apple API ${response.status}: ${detail.slice(0, 200)}`);
    }
    const body = await response.json();
    const signed = typeof body?.signedTransactionInfo === "string"
      ? body.signedTransactionInfo
      : "";
    const claims = decodeJwsPayload(signed);
    if (!claims) throw new Error("Could not decode signedTransactionInfo");

    const claimProduct =
      typeof claims.productId === "string" ? claims.productId : "";
    const claimBundle =
      typeof claims.bundleId === "string" ? claims.bundleId : "";
    if (claimProduct !== expectedProductId) {
      throw new Error("Product mismatch from Apple API");
    }
    if (claimBundle && claimBundle !== bundleId) {
      throw new Error("Bundle ID mismatch from Apple API");
    }

    return {
      ok: true,
      productId: expectedProductId,
      transactionId,
      expiresAt: expiresFromClaims(claims),
      environment:
        claims.environment === "Sandbox" || claims.environment === "Production"
          ? claims.environment
          : host.includes("sandbox")
            ? "Sandbox"
            : "Production",
      verification: "apple-api",
    };
  }
  return null;
}

async function verifyViaReceipt({
  receipt,
  sharedSecret,
  expectedProductId,
  expectedTransactionId,
  bundleId,
}) {
  const endpoints = [
    "https://buy.itunes.apple.com/verifyReceipt",
    "https://sandbox.itunes.apple.com/verifyReceipt",
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "receipt-data": receipt,
        password: sharedSecret,
        "exclude-old-transactions": true,
      }),
    });
    if (!response.ok) continue;
    const body = await response.json();
    // 21007 = sandbox receipt sent to production
    if (body?.status === 21007) continue;
    if (body?.status !== 0) continue;

    const receiptBundle =
      typeof body?.receipt?.bundle_id === "string"
        ? body.receipt.bundle_id
        : "";
    if (receiptBundle && receiptBundle !== bundleId) {
      throw new Error("Bundle ID mismatch from verifyReceipt");
    }

    const entries = [
      ...(Array.isArray(body?.latest_receipt_info)
        ? body.latest_receipt_info
        : []),
      ...(Array.isArray(body?.receipt?.in_app) ? body.receipt.in_app : []),
    ];

    const match = entries.find((entry) => {
      const pid =
        typeof entry?.product_id === "string" ? entry.product_id : "";
      const tid =
        typeof entry?.transaction_id === "string"
          ? entry.transaction_id
          : typeof entry?.original_transaction_id === "string"
            ? entry.original_transaction_id
            : "";
      return pid === expectedProductId && tid === expectedTransactionId;
    }) || entries.find((entry) => entry?.product_id === expectedProductId);

    if (!match) continue;

    let expiresAt = null;
    if (typeof match.expires_date_ms === "string") {
      const ms = Number(match.expires_date_ms);
      if (Number.isFinite(ms)) expiresAt = new Date(ms).toISOString();
    } else if (typeof match.expires_date === "string") {
      const parsed = Date.parse(match.expires_date);
      if (Number.isFinite(parsed)) expiresAt = new Date(parsed).toISOString();
    }

    if (expiresAt && Date.parse(expiresAt) < Date.now()) {
      throw new Error("Subscription expired");
    }

    return {
      ok: true,
      productId: expectedProductId,
      transactionId: expectedTransactionId,
      expiresAt,
      environment: endpoint.includes("sandbox") ? "Sandbox" : "Production",
      verification: "verifyReceipt",
    };
  }
  return null;
}

function expiresFromClaims(claims) {
  if (typeof claims.expiresDate === "number") {
    return new Date(claims.expiresDate).toISOString();
  }
  if (typeof claims.expiresDate === "string") {
    const n = Number(claims.expiresDate);
    if (Number.isFinite(n)) return new Date(n).toISOString();
    const parsed = Date.parse(claims.expiresDate);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  if (typeof claims.expires_date_ms === "string") {
    const n = Number(claims.expires_date_ms);
    if (Number.isFinite(n)) return new Date(n).toISOString();
  }
  return null;
}

function decodeJwsPayload(jws) {
  const parts = jws.split(".");
  if (parts.length < 2) return null;
  try {
    const json = base64UrlToString(parts[1]);
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function base64UrlToString(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function createAppStoreJwt(env) {
  const header = { alg: "ES256", kid: env.APPLE_KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: env.APPLE_ISSUER_ID,
    iat: now,
    exp: now + 3500,
    aud: "appstoreconnect-v1",
    bid: env.APPLE_BUNDLE_ID || "uk.co.merixa.practitionersguide",
  };
  const enc = new TextEncoder();
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const data = enc.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(env.APPLE_PRIVATE_KEY),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    data,
  );
  return `${encodedHeader}.${encodedPayload}.${base64UrlFromBuffer(signature)}`;
}

function pemToArrayBuffer(pem) {
  const b64 = String(pem)
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN EC PRIVATE KEY-----/g, "")
    .replace(/-----END EC PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64Url(value) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlFromBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
