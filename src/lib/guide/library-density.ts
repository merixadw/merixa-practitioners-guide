import type { BodyId, GuideCard, GuideIndex } from "./types";
import { ALL_BODIES } from "./types";
import { isVisibleInLibraryBrowse } from "./publishable";

export type BodyDensity = {
  body: BodyId;
  count: number;
};

export type DomainDensity = {
  domain: string;
  count: number;
};

export type LibraryDensity = {
  visible: number;
  total: number;
  quarantinedHidden: number;
  byBody: BodyDensity[];
  byDomain: DomainDensity[];
};

function domainOf(card: GuideCard): string {
  return card.classification?.domain?.trim() || "Unclassified";
}

/** Body × domain coverage for Library browse (visible cards only). */
export function libraryDensity(
  index: GuideIndex,
  options?: { body?: BodyId | "all" },
): LibraryDensity {
  const bodyFilter = options?.body ?? "all";
  const total = index.cards.length;
  let quarantinedHidden = 0;
  const visibleCards: GuideCard[] = [];

  for (const card of index.cards) {
    if (!isVisibleInLibraryBrowse(card)) {
      quarantinedHidden += 1;
      continue;
    }
    if (bodyFilter !== "all" && !card.bodies.includes(bodyFilter)) continue;
    visibleCards.push(card);
  }

  const bodyCounts = new Map<BodyId, number>();
  for (const body of ALL_BODIES) bodyCounts.set(body, 0);
  for (const card of visibleCards) {
    for (const body of card.bodies) {
      if (body === "Merixa") continue;
      if (!bodyCounts.has(body)) continue;
      bodyCounts.set(body, (bodyCounts.get(body) ?? 0) + 1);
    }
  }

  const domainCounts = new Map<string, number>();
  for (const card of visibleCards) {
    const domain = domainOf(card);
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const byBody = [...bodyCounts.entries()]
    .map(([body, count]) => ({ body, count }))
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count);

  const byDomain = [...domainCounts.entries()]
    .map(([domain, count]) => ({ domain, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  return {
    visible: visibleCards.length,
    total,
    quarantinedHidden,
    byBody,
    byDomain,
  };
}

export type ShelfHealth = {
  shelf: string;
  paths: number;
  continueable: number;
  brokenSteps: number;
};

/** Paths whose every stepped cardId exists in the index (post-remap). */
export function pathIsContinueable(
  path: { steps: { cardId?: string }[] },
  cardIds: Set<string>,
): boolean {
  const stepped = path.steps.filter((step) => step.cardId);
  if (stepped.length === 0) return false;
  return stepped.every((step) => step.cardId && cardIds.has(step.cardId));
}

export function shelfHealth(
  shelves: Record<string, { id: string; steps: { cardId?: string }[] }[]>,
  index: GuideIndex,
): ShelfHealth[] {
  const cardIds = new Set(index.cards.map((card) => card.id));
  return Object.entries(shelves).map(([shelf, paths]) => {
    let brokenSteps = 0;
    let continueable = 0;
    for (const path of paths) {
      if (pathIsContinueable(path, cardIds)) continueable += 1;
      for (const step of path.steps) {
        if (step.cardId && !cardIds.has(step.cardId)) brokenSteps += 1;
      }
    }
    return {
      shelf,
      paths: paths.length,
      continueable,
      brokenSteps,
    };
  });
}
