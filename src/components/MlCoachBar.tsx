"use client";

import Link from "next/link";
import {
  mlCoachCopy,
  type CoachSurface,
  type TutorLaunchMode,
} from "@/lib/guide/recommend";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { useEntitlements } from "./EntitlementsProvider";
import { useHabits } from "./HabitsProvider";

export function MlCoachBar({
  compact = false,
  surface = "tutor",
}: {
  compact?: boolean;
  surface?: CoachSurface;
}) {
  const { insights, ready } = useHabits();
  const { aiTier, ready: entitlementsReady } = useEntitlements();
  if (!ready || !entitlementsReady) return null;

  const mode: TutorLaunchMode = launchModeFromAiTier(aiTier);
  const copy = mlCoachCopy(insights, surface, mode);

  return (
    <section className={compact ? "ml-coach compact" : "ml-coach"}>
      <div className="ml-coach-copy">
        <p className="ml-coach-eyebrow">{copy.eyebrow}</p>
        <p className="ml-coach-title">{copy.title}</p>
      </div>
      <Link className="ml-coach-action" href={copy.href}>
        {copy.action}
      </Link>
    </section>
  );
}
