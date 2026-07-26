"use client";

/**
 * Boots the simple cut-end cache standard once providers are ready:
 * silent inventory sweep (heavy-first budgets) for Premium users.
 */

import { useEffect, useRef } from "react";
import { maybeSweepCoachInventory } from "@/lib/guide/coach-inventory";
import { useEntitlements } from "./EntitlementsProvider";
import { useGuideState } from "./GuideState";

export function CutEndCacheBootstrap() {
  const { aiTier } = useEntitlements();
  const { saved, ready } = useGuideState();
  const ran = useRef(false);

  useEffect(() => {
    if (!ready || aiTier !== "premium" || ran.current) return;
    ran.current = true;
    void maybeSweepCoachInventory({ savedCardIds: saved });
  }, [aiTier, ready, saved]);

  return null;
}
