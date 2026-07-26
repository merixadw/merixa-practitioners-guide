/**
 * Client detail-on-open: load one card from a static shard (with memory cache).
 */

import type { GuideCard } from "./types";
import { detailShardUrl } from "./seamless-paths";

type DetailShard = {
  version: 1;
  generatedAt: string;
  cards: GuideCard[];
};

const shardCache = new Map<string, Promise<Map<string, GuideCard>>>();

function isDetailShard(value: unknown): value is DetailShard {
  if (typeof value !== "object" || value === null) return false;
  return (
    "version" in value &&
    value.version === 1 &&
    "cards" in value &&
    Array.isArray(value.cards)
  );
}

async function loadShardMap(url: string): Promise<Map<string, GuideCard>> {
  const existing = shardCache.get(url);
  if (existing) return existing;

  const pending = (async () => {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Detail shard ${response.status}`);
    }
    const value: unknown = await response.json();
    if (!isDetailShard(value)) {
      throw new Error("Invalid detail shard");
    }
    const map = new Map<string, GuideCard>();
    for (const card of value.cards) {
      if (card && typeof card.id === "string") map.set(card.id, card);
    }
    return map;
  })();

  shardCache.set(url, pending);
  try {
    return await pending;
  } catch (error) {
    shardCache.delete(url);
    throw error;
  }
}

export async function fetchGuideCardDetail(
  cardId: string,
  signal?: AbortSignal,
): Promise<GuideCard | null> {
  if (signal?.aborted) return null;
  const url = detailShardUrl(cardId);
  const map = await loadShardMap(url);
  if (signal?.aborted) return null;
  return map.get(cardId) ?? null;
}

/** Prefetch shard for a card (Show more / hover neighbors). */
export function prefetchGuideCardDetail(cardId: string): void {
  void loadShardMap(detailShardUrl(cardId)).catch(() => {
    /* ignore prefetch errors */
  });
}
