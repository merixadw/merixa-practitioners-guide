"use client";

import { useEffect, useState } from "react";
import { CATALOG, PRODUCT_IDS, loadStorePrices } from "@/lib/entitlements";
import { useEntitlements } from "./EntitlementsProvider";

type AiUpgradeSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function AiUpgradeSheet({ open, onClose }: AiUpgradeSheetProps) {
  const {
    aiTier,
    purchase,
    cancelAi,
    fairUseNearLimit,
    fairUseExhausted,
    fairUseAskCount,
    fairUseDailyCap,
    fairUseHeavyCount,
    fairUseHeavyCap,
    nativeBilling,
  } = useEntitlements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<{
    premium?: string;
  }>({});

  useEffect(() => {
    if (!open || !nativeBilling) return;
    let cancelled = false;
    void loadStorePrices().then((store) => {
      if (cancelled) return;
      setPrices({
        premium: store.aiPremium,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [open, nativeBilling]);

  if (!open) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update membership. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upgrade-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="upgrade-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-upgrade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="upgrade-sheet-header">
          <h2 id="ai-upgrade-title">Offline &amp; Online</h2>
          <button type="button" className="text-button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="upgrade-sheet-lead">
          Guide unlock includes AI Premium for 30 days. After that month,
          subscribe to keep live coaching — or stay on Offline Library with no
          extra charge.
        </p>

        {fairUseExhausted ? (
          <p className="upgrade-fair-use">
            Today&apos;s live pace is resting ({fairUseAskCount}/{fairUseDailyCap}
            ). Library stays open — pace resets tomorrow.
          </p>
        ) : fairUseNearLimit ? (
          <p className="upgrade-fair-use">
            Pace check: {fairUseAskCount}/{fairUseDailyCap} live ·{" "}
            {fairUseHeavyCount}/{fairUseHeavyCap} heavy today. Resets tomorrow —
            not a monthly pool.
          </p>
        ) : null}

        <div className="upgrade-tiers">
          <article
            className={
              aiTier === "offline" ? "upgrade-tier active muted" : "upgrade-tier muted"
            }
          >
            <h3>Offline (after trial)</h3>
            <p className="upgrade-price">
              Included with unlock
              <span></span>
            </p>
            <p>{CATALOG.unlock.blurb}</p>
            <ul className="upgrade-features">
              {CATALOG.unlock.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            {aiTier === "offline" ? (
              <p className="upgrade-active-label">Current plan</p>
            ) : null}
          </article>

          <article
            className={
              aiTier === "premium" ? "upgrade-tier active" : "upgrade-tier"
            }
          >
            <h3>{CATALOG.aiPremium.label}</h3>
            <p className="upgrade-price">
              {prices.premium ?? CATALOG.aiPremium.price.gbp}
              <span>/mo</span>
            </p>
            <p>{CATALOG.aiPremium.blurb}</p>
            <ul className="upgrade-features">
              {CATALOG.aiPremium.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <p className="upgrade-sku">
              <code>{PRODUCT_IDS.aiPremium}</code>
            </p>
            {aiTier === "premium" ? (
              <p className="upgrade-active-label">Current plan</p>
            ) : (
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => void run(() => purchase("aiPremium"))}
              >
                Start Premium
              </button>
            )}
          </article>
        </div>

        {error ? <p className="paywall-error">{error}</p> : null}

        {aiTier !== "offline" ? (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await cancelAi();
              })
            }
          >
            {nativeBilling
              ? "Manage in Apple Subscriptions"
              : "Cancel AI (preview)"}
          </button>
        ) : null}

        <p className="upgrade-sheet-note">
          Unlock includes 30 days of Premium. After that, one credit = one
          calendar month of membership. No rollover. Billing is iOS-only via
          Apple.
          {nativeBilling
            ? " Purchases are verified with Apple before coaching unlocks."
            : ""}
        </p>
      </div>
    </div>
  );
}

export function AiTierChip() {
  const { aiTier, onlineCoach } = useEntitlements();
  const [open, setOpen] = useState(false);

  const label = aiTier === "premium" ? "AI Premium" : "Offline coach";

  const chipClass =
    aiTier === "premium"
      ? "ai-tier-chip live premium"
      : onlineCoach
        ? "ai-tier-chip live"
        : "ai-tier-chip";

  return (
    <>
      <button
        type="button"
        className={chipClass}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      <AiUpgradeSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
