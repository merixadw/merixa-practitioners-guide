/**
 * Publish seamless corpus artifacts for progressive Library / Tutor load.
 *
 * Writes:
 *   content/catalog.json
 *   public/corpus/catalog.json
 *   public/corpus/retrieve-index.json  (full GuideIndex for Tutor + IDB)
 *   public/corpus/details/{0..63}.json (card shards for detail-on-open)
 *   public/corpus/meta.json
 *
 * Usage: npx tsx scripts/pipeline/publish-seamless-corpus.ts
 */
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { loadGuideIndex } from "../../src/lib/guide/corpus";
import {
  buildCatalogIndex,
  withRegistryAliases,
} from "../../src/lib/guide/catalog-utils";
import {
  DETAIL_SHARD_COUNT,
  detailShardKey,
} from "../../src/lib/guide/seamless-paths";
import type { GuideCard } from "../../src/lib/guide/types";

const root = process.cwd();
const publicCorpus = join(root, "public", "corpus");
const detailsDir = join(publicCorpus, "details");
const contentCatalog = join(root, "content", "catalog.json");

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value)}\n`, "utf8");
}

function main() {
  const t0 = performance.now();
  // Attach registry-derived aliases so Library search / detail shards match
  // former titles even when content/index.json cards omit `aliases`.
  const index = withRegistryAliases(loadGuideIndex());
  const catalog = buildCatalogIndex(index);

  if (existsSync(detailsDir)) {
    rmSync(detailsDir, { recursive: true, force: true });
  }
  mkdirSync(detailsDir, { recursive: true });
  mkdirSync(join(root, "content"), { recursive: true });

  const shards = new Map<string, GuideCard[]>();
  for (let i = 0; i < DETAIL_SHARD_COUNT; i += 1) {
    shards.set(String(i), []);
  }
  for (const card of index.cards) {
    const key = detailShardKey(card.id);
    const bucket = shards.get(key);
    if (bucket) bucket.push(card);
    else shards.set(key, [card]);
  }

  for (const [key, cards] of shards) {
    writeJson(join(detailsDir, `${key}.json`), {
      version: 1,
      generatedAt: index.generatedAt,
      cards,
    });
  }

  writeJson(contentCatalog, catalog);
  writeJson(join(publicCorpus, "catalog.json"), catalog);
  writeJson(join(publicCorpus, "retrieve-index.json"), index);
  writeJson(join(publicCorpus, "meta.json"), {
    version: 1,
    generatedAt: index.generatedAt,
    cardCount: index.cards.length,
    chunkCount: index.chunks.length,
    catalogCardCount: catalog.cards.length,
    detailShards: DETAIL_SHARD_COUNT,
  });

  const catalogBytes = Buffer.byteLength(JSON.stringify(catalog));
  const retrieveBytes = Buffer.byteLength(JSON.stringify(index));
  const ms = Math.round(performance.now() - t0);
  console.log(
    JSON.stringify(
      {
        ok: true,
        ms,
        cards: index.cards.length,
        chunks: index.chunks.length,
        catalogMB: (catalogBytes / 1024 / 1024).toFixed(2),
        retrieveMB: (retrieveBytes / 1024 / 1024).toFixed(2),
        out: "public/corpus",
      },
      null,
      2,
    ),
  );
}

main();
