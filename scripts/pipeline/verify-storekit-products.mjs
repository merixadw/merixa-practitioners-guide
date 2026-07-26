#!/usr/bin/env node
/**
 * Assert StoreKit Configuration product IDs match entitlements catalog.
 * Usage: node scripts/pipeline/verify-storekit-products.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const productsPath = join(ROOT, "src", "lib", "entitlements", "products.ts");
const storekitPath = join(ROOT, "storekit", "Products.storekit");
const capPath = join(ROOT, "capacitor.config.ts");

function fail(message) {
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(1);
}

const productsSrc = readFileSync(productsPath, "utf8");
const unlock = productsSrc.match(
  /unlock:\s*"([^"]+)"/,
)?.[1];
const premium = productsSrc.match(
  /aiPremium:\s*"([^"]+)"/,
)?.[1];
const lite = productsSrc.match(
  /aiLite:\s*"([^"]+)"/,
)?.[1];

if (!unlock || !premium || !lite) {
  fail("Could not parse PRODUCT_IDS / LEGACY_PRODUCT_IDS from products.ts");
}

const storekit = JSON.parse(readFileSync(storekitPath, "utf8"));
const storekitIds = new Set();
for (const product of storekit.products ?? []) {
  if (product.productID) storekitIds.add(product.productID);
}
for (const group of storekit.subscriptionGroups ?? []) {
  for (const sub of group.subscriptions ?? []) {
    if (sub.productID) storekitIds.add(sub.productID);
  }
}

const required = [unlock, premium, lite];
const missing = required.filter((id) => !storekitIds.has(id));
if (missing.length) {
  fail(`StoreKit missing product IDs: ${missing.join(", ")}`);
}

const cap = readFileSync(capPath, "utf8");
const appId = cap.match(/appId:\s*"([^"]+)"/)?.[1];
if (appId !== "uk.co.merixa.practitionersguide") {
  fail(`capacitor appId mismatch: ${appId}`);
}
if (!unlock.startsWith(`${appId}.`)) {
  fail(`unlock ID ${unlock} does not match appId ${appId}`);
}

const premiumPrice = storekit.subscriptionGroups
  ?.flatMap((g) => g.subscriptions ?? [])
  .find((s) => s.productID === premium)?.displayPrice;
const unlockPrice = (storekit.products ?? []).find(
  (p) => p.productID === unlock,
)?.displayPrice;

console.log(
  JSON.stringify(
    {
      ok: true,
      appId,
      productIds: { unlock, aiPremium: premium, aiLiteLegacy: lite },
      storekitIds: [...storekitIds].sort(),
      displayPrice: { unlock: unlockPrice, aiPremium: premiumPrice },
      note: "Lite remains in StoreKit for restore/sandbox only — not sold in-app",
    },
    null,
    2,
  ),
);
