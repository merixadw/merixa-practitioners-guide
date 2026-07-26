import type { GuideCard, GuideIndex } from "./types";
import canonicalRegistryGenerated from "./canonical-registry.generated.json";

type GeneratedRegistry = {
  idToCanonical?: Record<string, string>;
  titleToCanonical?: Record<string, string>;
};

const GENERATED = canonicalRegistryGenerated as GeneratedRegistry;

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * One title → one card. Alias IDs come from:
 *   1. published canonical-registry.generated.json (idToCanonical / titleToCanonical)
 *   2. live index mergedFrom / aliases (overrides stale registry entries)
 *
 * Shipped cards rarely carry mergedFrom after the 2026-07-23 dedupe wave; the
 * generated registry is the durable alias map.
 */
export function buildCanonicalRegistry(index: GuideIndex): {
  byId: Map<string, string>;
  byTitle: Map<string, string>;
} {
  const byId = new Map<string, string>();
  const byTitle = new Map<string, string>();
  const liveIds = new Set(index.cards.map((card) => card.id));

  for (const [fromId, toId] of Object.entries(GENERATED.idToCanonical ?? {})) {
    if (!liveIds.has(toId)) continue;
    byId.set(fromId, toId);
  }
  for (const [title, toId] of Object.entries(GENERATED.titleToCanonical ?? {})) {
    if (!liveIds.has(toId)) continue;
    if (title) byTitle.set(title, toId);
  }

  for (const card of index.cards) {
    byId.set(card.id, card.id);
    const titleKey = normalizeTitle(card.title);
    if (titleKey) byTitle.set(titleKey, card.id);
    for (const alias of card.aliases ?? []) {
      const key = normalizeTitle(alias);
      if (key) byTitle.set(key, card.id);
    }
    for (const fromId of card.mergedFrom ?? []) {
      byId.set(fromId, card.id);
    }
  }

  return { byId, byTitle };
}

export function resolveCanonicalCardId(
  index: GuideIndex,
  idOrTitle: string,
): string | null {
  const { byId, byTitle } = buildCanonicalRegistry(index);
  if (byId.has(idOrTitle)) return byId.get(idOrTitle) ?? null;
  const titleKey = normalizeTitle(idOrTitle);
  return byTitle.get(titleKey) ?? null;
}

export function getCanonicalCard(
  index: GuideIndex,
  id: string,
): GuideCard | null {
  const canonicalId = resolveCanonicalCardId(index, id);
  if (!canonicalId) return null;
  return index.cards.find((card) => card.id === canonicalId) ?? null;
}

/** Static alias map for path remaps / generateStaticParams (live targets only). */
export function getGeneratedIdAliases(): Record<string, string> {
  return GENERATED.idToCanonical ?? {};
}
