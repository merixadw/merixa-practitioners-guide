/**
 * OTA corpus “What’s new” — compare published index to last acknowledged sighting.
 */

import type { GuideCard, GuideIndex } from "./types";

const CORPUS_SIGHT_KEY = "mpg-corpus-sight-v1";
const MAX_KNOWN_IDS = 4000;
const MAX_NEW_SHOW = 8;

export type CorpusSighting = {
  acknowledgedGeneratedAt: string;
  knownCardIds: string[];
};

export type CorpusUpdateSummary = {
  generatedAt: string;
  isFresh: boolean;
  newCards: GuideCard[];
  growthCount: number;
  cardCount: number;
};

function readSighting(): CorpusSighting | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CORPUS_SIGHT_KEY) ?? "",
    );
    if (typeof parsed !== "object" || parsed === null) return null;
    const rec = parsed as Record<string, unknown>;
    if (
      typeof rec.acknowledgedGeneratedAt !== "string" ||
      !Array.isArray(rec.knownCardIds)
    ) {
      return null;
    }
    const knownCardIds = rec.knownCardIds
      .filter((id): id is string => typeof id === "string")
      .slice(0, MAX_KNOWN_IDS);
    return {
      acknowledgedGeneratedAt: rec.acknowledgedGeneratedAt,
      knownCardIds,
    };
  } catch {
    return null;
  }
}

function writeSighting(sighting: CorpusSighting) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CORPUS_SIGHT_KEY, JSON.stringify(sighting));
  } catch {
    // Private browsing should not break Tutor.
  }
}

export function summarizeCorpusUpdate(index: GuideIndex): CorpusUpdateSummary {
  const sighting = readSighting();
  const known = new Set(sighting?.knownCardIds ?? []);
  const newCards =
    known.size === 0
      ? []
      : index.cards.filter((card) => !known.has(card.id)).slice(0, MAX_NEW_SHOW);
  const growthCount =
    known.size === 0
      ? 0
      : Math.max(0, index.cards.length - known.size);
  const isFresh =
    Boolean(sighting) &&
    (index.generatedAt !== sighting?.acknowledgedGeneratedAt ||
      growthCount > 0 ||
      newCards.length > 0);

  // First launch: not “fresh” until a later OTA changes the corpus.
  if (!sighting) {
    return {
      generatedAt: index.generatedAt,
      isFresh: false,
      newCards: [],
      growthCount: 0,
      cardCount: index.cards.length,
    };
  }

  return {
    generatedAt: index.generatedAt,
    isFresh,
    newCards,
    growthCount: Math.max(growthCount, newCards.length),
    cardCount: index.cards.length,
  };
}

/** Seed or refresh the known set without marking as unread. */
export function syncCorpusBaseline(index: GuideIndex) {
  const existing = readSighting();
  if (existing) return;
  writeSighting({
    acknowledgedGeneratedAt: index.generatedAt,
    knownCardIds: index.cards.map((card) => card.id).slice(0, MAX_KNOWN_IDS),
  });
}

/** Learner dismissed What’s new — adopt current corpus as known. */
export function acknowledgeCorpusUpdate(index: GuideIndex) {
  writeSighting({
    acknowledgedGeneratedAt: index.generatedAt,
    knownCardIds: index.cards.map((card) => card.id).slice(0, MAX_KNOWN_IDS),
  });
}

export function formatCorpusUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Library ready";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
