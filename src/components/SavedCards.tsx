"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { coachActionHref } from "@/lib/guide/coach-actions";
import { catalogCardAsListCard } from "@/lib/guide/catalog-utils";
import { useCatalogIndex } from "@/lib/guide/seamless-corpus";
import type { GuideCard } from "@/lib/guide/types";
import { AiUpgradeSheet } from "./AiUpgradeSheet";
import { CoachActionStrip } from "./CoachActionStrip";
import { GuideCardTile } from "./GuideCardTile";
import { TutorFocusToggle } from "./TutorFocusToggle";
import { useEntitlements } from "./EntitlementsProvider";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { useGuideState } from "./GuideState";
import { useHabits } from "./HabitsProvider";

export function SavedCards() {
  const { catalog, ready: catalogReady } = useCatalogIndex();
  const { saved, recent, ready } = useGuideState();
  const { insights } = useHabits();
  const { aiTier, fairUseHeavyExhausted } = useEntitlements();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const launchMode = launchModeFromAiTier(aiTier);

  const byId = useMemo(() => {
    const map = new Map<string, GuideCard>();
    for (const entry of catalog?.cards ?? []) {
      map.set(entry.id, catalogCardAsListCard(entry));
    }
    return map;
  }, [catalog]);

  const savedCards = saved.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });
  const recentCards = recent
    .filter((id) => !saved.includes(id))
    .flatMap((id) => {
      const card = byId.get(id);
      return card ? [card] : [];
    });

  if (!ready || !catalogReady) {
    return <p className="list-meta">Loading…</p>;
  }

  const focus = savedCards[0];
  const reviewHref = focus
    ? coachActionHref("exam_drill", {
        title: focus.title,
        cardId: focus.id,
        mode: launchMode,
      })
    : insights.starters[0]
      ? `/?q=${encodeURIComponent(insights.starters[0])}`
      : "/";

  return (
    <div className="screen-stack">
      <p className="screen-lead">
        Saved concepts for quick review — set how Tutor should open below.
      </p>

      {aiTier === "premium" ? <TutorFocusToggle /> : null}

      <div className="list-meta">
        {savedCards.length} saved
        {recentCards.length > 0 ? ` · ${recentCards.length} recent` : ""}
      </div>

      {focus ? (
        <>
          <Link className="ml-review" href={reviewHref}>
            {launchMode === "offline"
              ? "Review in Tutor →"
              : "Exam drill →"}
          </Link>
          <CoachActionStrip
            compact
            mode={launchMode}
            title={focus.title}
            cardId={focus.id}
            exclude={["continue_path", "quiz", "exam_drill"]}
            onPremiumUpsell={
              launchMode === "offline" ? () => setUpgradeOpen(true) : undefined
            }
            heavyPaceLocked={fairUseHeavyExhausted}
          />
        </>
      ) : null}

      <section className="list-stack" aria-label="Saved concepts">
        {savedCards.map((card) => (
          <GuideCardTile key={card.id} card={card} />
        ))}
        {savedCards.length === 0 ? (
          <div className="empty-state">
            <h2>Nothing saved yet</h2>
            <p>
              Bookmark concepts from{" "}
              <Link href="/library/" className="inline-ml-link">
                Library
              </Link>{" "}
              for review here.
            </p>
          </div>
        ) : null}
      </section>

      {recentCards.length > 0 ? (
        <section className="list-stack" aria-label="Recently opened">
          <h2 className="section-title">Recent</h2>
          {recentCards.map((card) => (
            <GuideCardTile key={card.id} card={card} />
          ))}
        </section>
      ) : null}

      <AiUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
