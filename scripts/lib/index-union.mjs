/**
 * Lost-update guard for content/index.json.
 *
 * Atomic writes prevent torn files but not lost updates: two pipelines that
 * each read-modify-write the index will have the later writer silently wipe
 * the earlier writer's additions (the 25/07 incident lost 2,191 cards).
 *
 * Fix: just before writing, re-read the index from disk and union-merge any
 * card IDs present there but missing from the in-memory set. In-memory cards
 * always win on conflict (the caller just updated them). Intentional removals
 * must be passed via `deletedIds`, otherwise the union would resurrect them
 * (pruneTaxFacetClones is the one path that deletes cards).
 */
import { existsSync, readFileSync } from "node:fs";

export function unionMergeWithDiskIndex(indexPath, cards, { deletedIds } = {}) {
  const deleted = deletedIds instanceof Set ? deletedIds : new Set(deletedIds || []);
  const byId = new Map();
  for (const card of cards) {
    if (card && typeof card.id === "string" && card.id) byId.set(card.id, card);
  }

  let diskCards = [];
  try {
    if (existsSync(indexPath)) {
      const parsed = JSON.parse(readFileSync(indexPath, "utf8"));
      if (Array.isArray(parsed?.cards)) diskCards = parsed.cards;
    }
  } catch {
    // Unreadable/corrupt index on disk: nothing safe to merge, keep memory set.
  }

  let recovered = 0;
  for (const card of diskCards) {
    if (!card || typeof card.id !== "string" || !card.id) continue;
    if (byId.has(card.id) || deleted.has(card.id)) continue;
    byId.set(card.id, card);
    recovered += 1;
  }

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  return { cards: merged, recovered };
}
