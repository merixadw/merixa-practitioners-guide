"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";
import {
  coachActionHref,
} from "@/lib/guide/coach-actions";
import type { GuideCard } from "@/lib/guide/types";
import { BodyMark } from "./BodyMark";
import { AiUpgradeSheet } from "./AiUpgradeSheet";
import { useEntitlements } from "./EntitlementsProvider";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { useGuideState } from "./GuideState";

const DOMAIN_SHORT: Record<string, string> = {
  "Strategy and performance": "Strategy",
  "Project delivery": "Delivery",
  "Financial reporting": "Reporting",
  "Financial management": "Finance",
  "Management reporting": "Management",
  "Risk management": "Risk",
  "Governance and controls": "Governance",
  "Audit and assurance": "Assurance",
  Sustainability: "ESG",
};

export function GuideCardTile({
  card,
  motionIndex = 0,
}: {
  card: GuideCard;
  motionIndex?: number;
}) {
  const { saved, ready, toggleSaved } = useGuideState();
  const { aiTier } = useEntitlements();
  const launchMode = launchModeFromAiTier(aiTier);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const isSaved = saved.includes(card.id);
  const previewSource = (card.teachingSummary ?? card.body)
    .replace(/\s+/g, " ")
    .trim();
  const preview = previewSource.slice(0, 140);
  const liveHref = coachActionHref("live_demo", {
    title: card.title,
    cardId: card.id,
    mode: launchMode,
  });
  const shortDomain = card.classification?.domain
    ? DOMAIN_SHORT[card.classification.domain] ?? card.classification.domain
    : null;

  return (
    <article
      className="list-row ml-row compact-concept-row motion-card"
      style={{ "--motion-i": motionIndex } as CSSProperties}
    >
      <Link href={`/guide/${card.id}/`} className="list-row-main">
        <div className="concept-meta-row">
          {shortDomain ? (
            <span className="domain-pill">{shortDomain}</span>
          ) : null}
          <div className="body-row tight" aria-label="Professional bodies">
            {card.bodies.slice(0, 3).map((body) => (
              <span key={body} className="body-chip tiny">
                <BodyMark body={body} />
              </span>
            ))}
          </div>
        </div>
        <h2>{card.title}</h2>
        <p className="compact-definition">
          {preview}
          {previewSource.length > 140 ? "…" : ""}
        </p>
      </Link>
      <div className="list-row-actions">
        {launchMode === "premium" ? (
          <Link
            href={liveHref}
            className="coach-mini-link"
            title="Live AI demo"
          >
            Live
          </Link>
        ) : (
          <button
            type="button"
            className="coach-mini-link"
            title="AI Premium — assisted training"
            onClick={() => setUpgradeOpen(true)}
          >
            Train
          </button>
        )}
        <button
          type="button"
          className={isSaved ? "bookmark-btn saved" : "bookmark-btn"}
          onClick={() => toggleSaved(card.id)}
          aria-label={isSaved ? `Unsave ${card.title}` : `Save ${card.title}`}
          aria-pressed={isSaved}
          disabled={!ready}
        >
          {isSaved ? "★" : "☆"}
        </button>
      </div>
      <AiUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </article>
  );
}
