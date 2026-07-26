"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { findCustomPath, loadCustomPaths } from "@/lib/guide/custom-paths";
import {
  finishThisWeekSuggestion,
  pathProgress,
  pathProgressLabel,
} from "@/lib/guide/path-progress";
import { LEARNING_PATHS } from "@/lib/guide/paths";
import { pathLessonHref, type TutorLaunchMode } from "@/lib/guide/recommend";
import { useEntitlements } from "./EntitlementsProvider";
import { useGuideState } from "./GuideState";
import { useHabits } from "./HabitsProvider";

export function ContinuePathHome() {
  const { journey, ready, recent, saved } = useGuideState();
  const { aiTier } = useEntitlements();
  const { insights } = useHabits();
  const [customReady, setCustomReady] = useState(false);

  useEffect(() => {
    void loadCustomPaths().then(() => setCustomReady(true));
  }, []);

  if (!ready || !journey) return null;

  const path =
    LEARNING_PATHS.find((item) => item.id === journey.pathId) ??
    (customReady ? findCustomPath(journey.pathId) : undefined);
  if (!path) return null;

  const mode: TutorLaunchMode = launchModeFromAiTier(aiTier);
  const progress = pathProgress(path, recent, saved);
  const weekHint = finishThisWeekSuggestion(progress, insights.pace);
  const nextStep =
    progress.nextStep ??
    path.steps.find((step) => step.id === journey.stepId) ??
    path.steps.find((step) => step.cardId === journey.cardId) ??
    path.steps.find((step) => step.cardId);

  const continueHref = pathLessonHref(
    {
      id: path.id,
      title: path.title,
      fromStepId: nextStep?.id ?? journey.stepId,
      fromCardId: nextStep?.cardId ?? journey.cardId,
    },
    mode,
  );

  const stepLabel =
    nextStep?.title ?? journey.stepTitle ?? "Continue where you left off";

  return (
    <section className="continue-path-home" aria-label="Continue path">
      <p className="continue-path-eyebrow">Continue path</p>
      <strong className="continue-path-title">{journey.pathTitle}</strong>
      <p className="continue-path-progress">{pathProgressLabel(progress)}</p>
      {weekHint ? (
        <p className="continue-path-week">{weekHint}</p>
      ) : null}
      <p className="continue-path-step">{stepLabel}</p>
      <div className="continue-path-actions">
        <Link className="continue-path-primary" href={continueHref}>
          {mode === "offline" ? "Resume →" : "Resume live →"}
        </Link>
        <Link className="continue-path-secondary" href={`/paths/#${path.id}`}>
          View path
        </Link>
      </div>
    </section>
  );
}
