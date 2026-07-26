"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { findCustomPath } from "@/lib/guide/custom-paths";
import { LEARNING_PATHS } from "@/lib/guide/paths";
import { shouldShowTrialNudge } from "@/lib/entitlements/trial-nudge";
import {
  markWeeklyDigestShown,
  maybeNotifyWeeklyDigest,
  setWeeklyDigestNotifyOptIn,
  shouldOfferWeeklyDigest,
} from "@/lib/guide/weekly-digest";
import type { LearningPathStep } from "@/lib/guide/types";
import { useEntitlements } from "./EntitlementsProvider";
import { useGuideState } from "./GuideState";

/**
 * Once-per-week in-app digest: up to 3 remaining cards on the active path.
 * Optional Web Notification if the learner opts in (never forced).
 */
export function WeeklyPathDigest() {
  const { journey, recent, saved, ready } = useGuideState();
  const { snapshot, ready: entitlementsReady } = useEntitlements();
  const [steps, setSteps] = useState<LearningPathStep[] | null>(null);
  const [pathTitle, setPathTitle] = useState("");
  const [pathId, setPathId] = useState("");

  const path = useMemo(() => {
    if (!journey?.pathId) return null;
    return (
      LEARNING_PATHS.find((item) => item.id === journey.pathId) ??
      findCustomPath(journey.pathId) ??
      null
    );
  }, [journey?.pathId]);

  useEffect(() => {
    if (!ready || !entitlementsReady || !path) {
      setSteps(null);
      return;
    }
    if (shouldShowTrialNudge(snapshot)) {
      setSteps(null);
      return;
    }
    const offered = shouldOfferWeeklyDigest(path, recent, saved);
    if (!offered) {
      setSteps(null);
      return;
    }
    setPathTitle(path.title);
    setPathId(path.id);
    setSteps(offered);
  }, [ready, entitlementsReady, path, recent, saved, snapshot]);

  if (!steps || steps.length === 0) return null;

  function dismiss() {
    markWeeklyDigestShown();
    setSteps(null);
  }

  async function enableNotify() {
    setWeeklyDigestNotifyOptIn(true);
    await maybeNotifyWeeklyDigest({
      pathTitle,
      stepTitles: steps!.map((step) => step.title),
    });
    dismiss();
  }

  return (
    <div
      className="upgrade-sheet-backdrop"
      role="presentation"
      onClick={dismiss}
    >
      <div
        className="upgrade-sheet weekly-digest-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-digest-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="upgrade-sheet-header">
          <h2 id="weekly-digest-title">This week on your path</h2>
          <button type="button" className="text-button" onClick={dismiss}>
            Close
          </button>
        </header>

        <p className="upgrade-sheet-lead">
          Three concepts waiting on “{pathTitle}” — open one when you have a
          spare moment. Not a streak; just a soft nudge.
        </p>

        <ul className="whats-new-list">
          {steps.map((step) => (
            <li key={step.id}>
              <div className="whats-new-row">
                {step.cardId ? (
                  <Link href={`/guide/${step.cardId}/`} onClick={dismiss}>
                    {step.title}
                  </Link>
                ) : (
                  <span>{step.title}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="whats-new-actions">
          <Link
            className="whats-new-primary"
            href={`/paths/#${pathId}`}
            onClick={dismiss}
          >
            Open path
          </Link>
          <button
            type="button"
            className="whats-new-secondary"
            onClick={() => void enableNotify()}
          >
            Remind me next week
          </button>
          <button type="button" className="text-button" onClick={dismiss}>
            Not this week
          </button>
        </div>
      </div>
    </div>
  );
}
