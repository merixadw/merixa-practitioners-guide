"use client";

import { useEffect, useState } from "react";
import {
  acknowledgeTrialNudge,
  shouldShowTrialNudge,
  trialDaysRemaining,
  trialNudgeCopy,
  type TrialNudgePhase,
} from "@/lib/entitlements/trial-nudge";
import { useEntitlements } from "./EntitlementsProvider";

/**
 * Soft sheet at ~day 20 and ~day 27 of unlock-included Premium.
 * Keep live coaching and Stay Offline have equal visual weight.
 */
export function TrialNudgeSheet() {
  const { snapshot, ready, purchase } = useEntitlements();
  const [phase, setPhase] = useState<TrialNudgePhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setPhase(shouldShowTrialNudge(snapshot));
  }, [ready, snapshot]);

  if (!phase) return null;

  const daysLeft =
    snapshot.ai.kind === "premium"
      ? trialDaysRemaining(snapshot.ai.expiresAt) ?? 0
      : 0;
  const copy = trialNudgeCopy(phase, daysLeft);

  function dismissStay() {
    acknowledgeTrialNudge(phase!);
    setPhase(null);
  }

  async function keepCoaching() {
    setBusy(true);
    setError(null);
    try {
      await purchase("aiPremium");
      acknowledgeTrialNudge(phase!);
      setPhase(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start subscription. Try again from Offline & Online.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="upgrade-sheet-backdrop"
      role="presentation"
      onClick={dismissStay}
    >
      <div
        className="upgrade-sheet trial-nudge-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-nudge-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="upgrade-sheet-header">
          <h2 id="trial-nudge-title">{copy.title}</h2>
          <button type="button" className="text-button" onClick={dismissStay}>
            Close
          </button>
        </header>

        <p className="upgrade-sheet-lead">{copy.lead}</p>

        {error ? <p className="upgrade-error">{error}</p> : null}

        <div className="trial-nudge-actions">
          <button
            type="button"
            className="trial-nudge-keep"
            disabled={busy}
            onClick={() => void keepCoaching()}
          >
            {busy ? "Working…" : copy.keepLabel}
          </button>
          <button
            type="button"
            className="trial-nudge-stay"
            disabled={busy}
            onClick={dismissStay}
          >
            {copy.stayLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
