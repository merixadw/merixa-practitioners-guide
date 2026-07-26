import { writeFileSync } from "node:fs";
import { loadGuideIndex } from "../../src/lib/guide/corpus";
import { isVisibleInLibraryBrowse } from "../../src/lib/guide/publishable";

const index = loadGuideIndex();
const visible = index.cards.filter((c) => isVisibleInLibraryBrowse(c));
console.log("runtime cards:", index.cards.length, "visible:", visible.length);
const enriched = visible.filter((c) => c.enrichedAt).length;
console.log("visible enrichedAt:", enriched);
writeFileSync(
  "content/pipeline/runtime-live-ids.json",
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    ids: visible.map((c) => c.id),
  }),
);
const byDomain: Record<string, number> = {};
for (const c of visible) {
  const d = c.classification?.domain || "(none)";
  byDomain[d] = (byDomain[d] || 0) + 1;
}
console.log(JSON.stringify(byDomain, null, 1));
