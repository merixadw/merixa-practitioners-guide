import type { CatalogCard, CatalogIndex, GuideCard, GuideIndex } from "./types";
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
 * Build reverse alias lists from the canonical registry so Library search can
 * match former titles / merged ids even when cards lack an `aliases` field.
 */
function buildRegistryAliasMap(index: GuideIndex): Map<string, string[]> {
  const liveIds = new Set(index.cards.map((card) => card.id));
  const byCanonical = new Map<string, Set<string>>();

  const add = (canonicalId: string, alias: string) => {
    if (!liveIds.has(canonicalId)) return;
    const text = String(alias || "").trim();
    if (!text) return;
    const card = index.cards.find((item) => item.id === canonicalId);
    if (!card) return;
    if (normalizeTitle(text) === normalizeTitle(card.title)) return;
    if (text === canonicalId) return;
    if (!byCanonical.has(canonicalId)) byCanonical.set(canonicalId, new Set());
    byCanonical.get(canonicalId)!.add(text);
  };

  for (const [fromId, toId] of Object.entries(GENERATED.idToCanonical ?? {})) {
    if (fromId !== toId) add(toId, fromId);
  }
  for (const [title, toId] of Object.entries(GENERATED.titleToCanonical ?? {})) {
    add(toId, title);
  }
  for (const card of index.cards) {
    for (const alias of card.aliases ?? []) add(card.id, alias);
    for (const fromId of card.mergedFrom ?? []) add(card.id, fromId);
  }

  const out = new Map<string, string[]>();
  for (const [id, set] of byCanonical) {
    out.set(id, [...set].sort((a, b) => a.localeCompare(b)).slice(0, 12));
  }
  return out;
}

export function resolveCardAliases(
  card: GuideCard,
  registryAliases?: Map<string, string[]>,
): string[] | undefined {
  const fromCard = (card.aliases ?? []).filter(Boolean);
  const fromRegistry = registryAliases?.get(card.id) ?? [];
  const merged = [...new Set([...fromCard, ...fromRegistry])].filter(
    (alias) => normalizeTitle(alias) !== normalizeTitle(card.title),
  );
  return merged.length > 0 ? merged.slice(0, 12) : undefined;
}

export function cardToCatalogEntry(
  card: GuideCard,
  registryAliases?: Map<string, string[]>,
): CatalogCard {
  const summary = card.teachingSummary?.replace(/\s+/g, " ").trim();
  const bodyTeaser = card.body.replace(/\s+/g, " ").trim().slice(0, 120);
  const teaser = (summary || bodyTeaser).slice(0, 120);
  const aliases = resolveCardAliases(card, registryAliases);
  return {
    id: card.id,
    title: card.title,
    bodies: card.bodies,
    tags: card.tags,
    teaser,
    classification: card.classification,
    qualityScore: card.qualityScore,
    editorialStatus: card.editorialStatus,
    teachingSummary: card.teachingSummary,
    ...(aliases ? { aliases } : {}),
  };
}

export function buildCatalogIndex(index: GuideIndex): CatalogIndex {
  const registryAliases = buildRegistryAliasMap(index);
  return {
    version: 1,
    generatedAt: index.generatedAt,
    cards: index.cards.map((card) => cardToCatalogEntry(card, registryAliases)),
  };
}

/** Attach registry-derived aliases onto full cards (retrieve-index / shards). */
export function withRegistryAliases(index: GuideIndex): GuideIndex {
  const registryAliases = buildRegistryAliasMap(index);
  return {
    ...index,
    cards: index.cards.map((card) => {
      const aliases = resolveCardAliases(card, registryAliases);
      if (!aliases) return card;
      return { ...card, aliases };
    }),
  };
}

/** Tile-compatible card: teaser stands in for body until detail loads. */
export function catalogCardAsListCard(card: CatalogCard): GuideCard {
  return {
    id: card.id,
    title: card.title,
    body: card.teaser,
    bodies: card.bodies,
    tags: card.tags,
    workplaceTasks: [],
    sources: [],
    classification: card.classification,
    qualityScore: card.qualityScore,
    editorialStatus: card.editorialStatus,
    teachingSummary: card.teachingSummary ?? card.teaser,
    aliases: card.aliases,
  };
}

export function isCatalogIndex(value: unknown): value is CatalogIndex {
  if (typeof value !== "object" || value === null) return false;
  return (
    "version" in value &&
    value.version === 1 &&
    "generatedAt" in value &&
    typeof value.generatedAt === "string" &&
    "cards" in value &&
    Array.isArray(value.cards)
  );
}
