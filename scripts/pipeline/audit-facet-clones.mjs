/**
 * Audit facet-clone spam (P3).
 * Usage: npm run library:audit:facets
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isFacetCloneTitle,
  planFacetCull,
  splitFacetTitle,
  KNOWN_FACET_LABELS,
} from "../lib/facet-clones.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "facet-clone-audit-report.json",
);

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];

  const facetLabelCounts = Object.fromEntries(
    KNOWN_FACET_LABELS.map((label) => [label, 0]),
  );
  let cloneCount = 0;
  for (const card of cards) {
    const split = splitFacetTitle(card.title);
    if (!split.isClone) continue;
    cloneCount += 1;
    if (split.facet && facetLabelCounts[split.facet] != null) {
      facetLabelCounts[split.facet] += 1;
    } else if (split.facet) {
      facetLabelCounts[split.facet] = (facetLabelCounts[split.facet] || 0) + 1;
    }
  }

  const plan = planFacetCull(cards);
  const samples = plan.quarantine.slice(0, 40).map((card) => ({
    id: card.id,
    title: card.title,
    base: splitFacetTitle(card.title).base,
  }));
  const keptLensSamples = plan.keep
    .filter((c) => isFacetCloneTitle(c.title))
    .slice(0, 20)
    .map((card) => ({ id: card.id, title: card.title }));

  const report = {
    generatedAt: new Date().toISOString(),
    catalogCards: cards.length,
    cloneCount,
    cloneShare: cards.length
      ? Math.round((cloneCount / cards.length) * 1000) / 1000
      : 0,
    plan: plan.stats,
    targetCullShareOfClones: 0.5,
    meetsCullTarget: plan.stats.cullShareOfClones >= 0.5,
    facetLabelCounts: Object.fromEntries(
      Object.entries(facetLabelCounts).sort((a, b) => b[1] - a[1]),
    ),
    quarantineSamples: samples,
    keptLensSamples,
    next: "npm run library:quarantine:facets",
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
