/**
 * Quick dead-ref audit for LEARNING_PATHS vs runtime-visible + seed cards.
 */
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LEARNING_PATHS } from "../../src/lib/guide/paths";
import { loadGuideIndex } from "../../src/lib/guide/corpus";
import { isVisibleInLibraryBrowse } from "../../src/lib/guide/publishable";
import { remapPathCardId } from "../../src/lib/guide/path-card-remap";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const index = loadGuideIndex();
const live = new Set(
  index.cards.filter((c) => isVisibleInLibraryBrowse(c)).map((c) => c.id),
);
const seedsRaw = JSON.parse(
  readFileSync(join(ROOT, "content", "pipeline", "seed-cards.json"), "utf8"),
);
const seeds = Array.isArray(seedsRaw) ? seedsRaw : (seedsRaw.cards ?? []);
for (const c of seeds) if (c?.id) live.add(c.id);

type Dead = { path: string; step: string; cardId: string; remapped: string };
const deadSamples: Dead[] = [];
let totalSteps = 0;
let dead = 0;
let deadPaths = 0;
const deadByPrefix: Record<string, number> = {};

for (const path of LEARNING_PATHS) {
  let pathDead = 0;
  for (const step of path.steps) {
    if (!step.cardId) continue;
    totalSteps += 1;
    const remapped = remapPathCardId(step.cardId) || step.cardId;
    if (!live.has(remapped)) {
      dead += 1;
      pathDead += 1;
      const prefix = path.id.split("-").slice(0, 3).join("-");
      deadByPrefix[prefix] = (deadByPrefix[prefix] ?? 0) + 1;
      if (deadSamples.length < 50) {
        deadSamples.push({
          path: path.id,
          step: step.id,
          cardId: step.cardId,
          remapped,
        });
      }
    }
  }
  if (pathDead > 0) deadPaths += 1;
}

// orphan enriched counts by domain / id prefix
const enriched = index.cards.filter(
  (c) => isVisibleInLibraryBrowse(c) && c.enrichedAt,
);
const onPath = new Set<string>();
for (const path of LEARNING_PATHS) {
  for (const step of path.steps) {
    if (step.cardId) onPath.add(remapPathCardId(step.cardId) || step.cardId);
  }
}
const orphanByDomain: Record<string, number> = {};
const orphanByPrefix: Record<string, number> = {};
for (const c of enriched) {
  if (onPath.has(c.id)) continue;
  const d = c.classification?.domain || "(none)";
  orphanByDomain[d] = (orphanByDomain[d] || 0) + 1;
  const pref = c.id.split("-")[0];
  orphanByPrefix[pref] = (orphanByPrefix[pref] || 0) + 1;
}

console.log(
  JSON.stringify(
    {
      paths: LEARNING_PATHS.length,
      totalSteps,
      dead,
      deadPaths,
      deadByPrefix,
      deadSamples,
      enrichedVisible: enriched.length,
      onPath: onPath.size,
      orphanEnriched: Object.values(orphanByDomain).reduce((a, b) => a + b, 0),
      orphanByDomain,
      orphanByPrefixTop: Object.entries(orphanByPrefix)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25),
    },
    null,
    2,
  ),
);
