"use client";

import Link from "next/link";
import type { GuideIndex } from "@/lib/guide/types";
import { useGuideState } from "./GuideState";

export function WhatsNewSheet({
  open,
  onClose,
  index,
}: {
  open: boolean;
  onClose: () => void;
  index: GuideIndex | null;
}) {
  const { corpus, acknowledgeWhatsNew } = useGuideState();
  if (!open || !corpus || !index) return null;

  function dismiss() {
    if (index) acknowledgeWhatsNew(index);
    onClose();
  }

  return (
    <div className="upgrade-sheet-backdrop" role="presentation" onClick={dismiss}>
      <div
        className="upgrade-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="upgrade-sheet-header">
          <h2 id="whats-new-title">What&apos;s new</h2>
          <button type="button" className="text-button" onClick={dismiss}>
            Close
          </button>
        </header>

        <p className="upgrade-sheet-lead">
          Your Library updated over the air
          {corpus.growthCount > 0
            ? ` — about ${corpus.growthCount} new concept${
                corpus.growthCount === 1 ? "" : "s"
              }.`
            : "."}{" "}
          Offline Tutor grows with it; AI subscribers get the same corpus for
          live demos.
        </p>

        {corpus.newCards.length > 0 ? (
          <ul className="whats-new-list">
            {corpus.newCards.map((card) => (
              <li key={card.id}>
                <div className="whats-new-row">
                  <Link href={`/guide/${card.id}/`} onClick={dismiss}>
                    {card.title}
                  </Link>
                  <Link
                    className="whats-new-demo"
                    href={`/?q=${encodeURIComponent(
                      `Live spreadsheet demo: ${card.title}`,
                    )}&card=${encodeURIComponent(card.id)}`}
                    onClick={dismiss}
                  >
                    Live demo →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="whats-new-empty">
            Open Library to browse the refreshed concepts, or continue a Path.
          </p>
        )}

        <div className="whats-new-actions">
          <Link className="whats-new-primary" href="/library/" onClick={dismiss}>
            Browse Library
          </Link>
          <button type="button" className="text-button" onClick={dismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export function CorpusBadge({
  onOpen,
}: {
  onOpen?: () => void;
}) {
  const { corpus, corpusLabel, ready } = useGuideState();
  if (!ready || !corpus || !corpusLabel) return null;

  if (corpus.isFresh && onOpen) {
    return (
      <button
        type="button"
        className="corpus-badge fresh"
        onClick={onOpen}
        title={corpusLabel}
      >
        What&apos;s new
        {corpus.growthCount > 0 ? ` · ${corpus.growthCount}` : ""}
      </button>
    );
  }

  return (
    <span className="corpus-badge" title={corpusLabel}>
      OTA · {corpus.cardCount}
    </span>
  );
}
