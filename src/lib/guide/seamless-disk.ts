/**
 * Server/build-time readers for seamless corpus on disk (static export).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isCatalogIndex } from "./catalog-utils";
import { detailShardKey } from "./seamless-paths";
import type { CatalogIndex, GuideCard } from "./types";

const CORPUS_DIR = join(process.cwd(), "public", "corpus");

export function readCatalogFromDisk(): CatalogIndex | null {
  const path = join(CORPUS_DIR, "catalog.json");
  if (!existsSync(path)) return null;
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return isCatalogIndex(value) ? value : null;
  } catch {
    return null;
  }
}

export function readCardDetailFromDisk(cardId: string): GuideCard | null {
  const shardPath = join(
    CORPUS_DIR,
    "details",
    `${detailShardKey(cardId)}.json`,
  );
  if (!existsSync(shardPath)) return null;
  try {
    const value: unknown = JSON.parse(readFileSync(shardPath, "utf8"));
    if (
      typeof value !== "object" ||
      value === null ||
      !("cards" in value) ||
      !Array.isArray(value.cards)
    ) {
      return null;
    }
    for (const card of value.cards) {
      if (
        card &&
        typeof card === "object" &&
        "id" in card &&
        card.id === cardId
      ) {
        return card as GuideCard;
      }
    }
    return null;
  } catch {
    return null;
  }
}
