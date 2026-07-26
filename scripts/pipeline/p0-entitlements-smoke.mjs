/**
 * P0 entitlement smoke — unlock includes 30 days Premium; then offline or paid.
 * Usage: npx tsx scripts/pipeline/p0-entitlements-smoke.mjs
 */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_IDS,
  UNLOCK_PREMIUM_TRIAL_DAYS,
} from "../../src/lib/entitlements/products.ts";
import {
  expireAiIfNeeded,
  lockedSnapshot,
  parseSnapshot,
  unlockPremiumTrialExpiresAt,
  withAiPremium,
  withGuideUnlocked,
} from "../../src/lib/entitlements/store.ts";
import {
  canUseOnlineCoach,
  isGuideUnlocked,
  isPaidPremium,
  isUnlockTrialPremium,
} from "../../src/lib/entitlements/types.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REPORT = join(ROOT, "content", "pipeline", "p0-pricing-complete.json");

function main() {
  const checks = [];

  assert.equal(UNLOCK_PREMIUM_TRIAL_DAYS, 30);
  checks.push({ id: "trial-days-30", ok: true });

  const unlocked = withGuideUnlocked(lockedSnapshot(), "preview");
  assert.equal(isGuideUnlocked(unlocked), true);
  assert.equal(canUseOnlineCoach(unlocked), true);
  assert.equal(isUnlockTrialPremium(unlocked), true);
  assert.equal(isPaidPremium(unlocked), false);
  assert.equal(unlocked.ai.kind, "premium");
  if (unlocked.ai.kind === "premium") {
    assert.equal(unlocked.ai.fromUnlockTrial, true);
    assert.equal(unlocked.ai.productId, PRODUCT_IDS.unlock);
    assert.ok(unlocked.ai.expiresAt);
    assert.equal(
      unlocked.ai.expiresAt,
      unlockPremiumTrialExpiresAt(unlocked.guide.status === "unlocked"
        ? unlocked.guide.unlockedAt
        : ""),
    );
  }
  checks.push({ id: "unlock-grants-30d-premium", ok: true });

  const paid = withAiPremium(unlocked, "preview", null);
  assert.equal(canUseOnlineCoach(paid), true);
  assert.equal(isPaidPremium(paid), true);
  assert.equal(isUnlockTrialPremium(paid), false);
  checks.push({ id: "paid-premium-replaces-trial", ok: true });

  const afterUnlockKeepPaid = withGuideUnlocked(paid, "preview");
  assert.equal(canUseOnlineCoach(afterUnlockKeepPaid), true);
  assert.equal(isPaidPremium(afterUnlockKeepPaid), true);
  checks.push({ id: "unlock-preserves-paid-premium", ok: true });

  const expired = expireAiIfNeeded({
    ...unlocked,
    ai: {
      ...unlocked.ai,
      kind: "premium",
      source: "preview",
      productId: PRODUCT_IDS.unlock,
      startedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2000-01-01T00:00:00.000Z",
      fromUnlockTrial: true,
    },
  });
  assert.equal(expired.ai.kind, "offline");
  assert.equal(isGuideUnlocked(expired), true);
  checks.push({ id: "expired-trial-goes-offline-keeps-library", ok: true });

  const oldUnlock = withGuideUnlocked(lockedSnapshot(), "preview", {
    unlockedAt: "2020-01-01T00:00:00.000Z",
  });
  assert.equal(oldUnlock.ai.kind, "offline");
  assert.equal(isGuideUnlocked(oldUnlock), true);
  checks.push({ id: "restore-old-unlock-no-trial-reset", ok: true });

  const roundTrip = parseSnapshot(unlocked);
  assert.ok(roundTrip);
  assert.equal(isUnlockTrialPremium(roundTrip), true);
  checks.push({ id: "parse-preserves-fromUnlockTrial", ok: true });

  const report = {
    phase: "P0",
    status: "done",
    pricing: {
      unlock: "£7.99 once — Library + 30 days AI Premium",
      afterMonth: "Subscribe £7.99/mo or stay Offline Library",
      freeStandalonePremium: false,
    },
    completedAt: new Date().toISOString(),
    checks,
    remainingOps: [
      "App Store Connect: unlock metadata states includes 1 month AI Premium",
      "Sandbox: purchase unlock → Premium online for 30 days",
      "Sandbox: after trial expiry → Offline Library; subscribe restores Premium",
      "Restore: unlock purchaseDate must drive trial end (no reset)",
    ],
  };
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
