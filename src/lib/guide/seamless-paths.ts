/** Static corpus URLs served from `public/corpus/` (dev + Cap export). */

export const CORPUS_BASE = "/corpus";

export const CATALOG_URL = `${CORPUS_BASE}/catalog.json`;
export const RETRIEVE_INDEX_URL = `${CORPUS_BASE}/retrieve-index.json`;
export const DETAILS_DIR = `${CORPUS_BASE}/details`;
export const CORPUS_META_URL = `${CORPUS_BASE}/meta.json`;

export const DETAIL_SHARD_COUNT = 64;

/** Stable shard id for a card — must match publish-seamless-corpus. */
export function detailShardKey(cardId: string): string {
  let hash = 0;
  for (let i = 0; i < cardId.length; i += 1) {
    hash = (hash * 31 + cardId.charCodeAt(i)) >>> 0;
  }
  return String(hash % DETAIL_SHARD_COUNT);
}

export function detailShardUrl(cardId: string): string {
  return `${DETAILS_DIR}/${detailShardKey(cardId)}.json`;
}
