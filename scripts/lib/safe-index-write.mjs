/**
 * Single-writer path for content/index.json:
 * disk union-merge + atomic rename. Never use raw writeFileSync on the index.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { atomicWriteFile } from "./atomic-write.mjs";
import { unionMergeWithDiskIndex } from "./index-union.mjs";

/**
 * @param {string} indexPath
 * @param {object[]} cards
 * @param {{
 *   deletedIds?: Iterable<string>,
 *   buildIndex?: (cards: object[]) => object,
 *   corpusDir?: string,
 *   writeCorpus?: boolean,
 * }} [opts]
 */
export function safeWriteIndex(indexPath, cards, opts = {}) {
  const {
    deletedIds,
    buildIndex,
    corpusDir,
    writeCorpus = false,
  } = opts;

  const { cards: merged, recovered } = unionMergeWithDiskIndex(
    indexPath,
    cards,
    { deletedIds },
  );

  if (writeCorpus && corpusDir) {
    mkdirSync(corpusDir, { recursive: true });
    for (const card of merged) {
      if (!card?.id) continue;
      writeFileSync(
        join(corpusDir, `${card.id}.json`),
        `${JSON.stringify(card, null, 2)}\n`,
        "utf8",
      );
    }
  }

  const payload = buildIndex
    ? buildIndex(merged)
    : {
        version: 1,
        generatedAt: new Date().toISOString(),
        cards: merged,
      };

  mkdirSync(dirname(indexPath), { recursive: true });
  atomicWriteFile(indexPath, `${JSON.stringify(payload, null, 2)}\n`);
  return { cards: merged, recovered, index: payload };
}
