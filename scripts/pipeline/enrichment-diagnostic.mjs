/**
 * Enrichment + competitiveness diagnostic against internal competitive targets.
 *
 * Competitive bar (practitioner encyclopedia peers):
 *   - Deep teaching pack ≥ 85% of visible cards
 *   - Full enrichment gate ≥ 70%
 *   - Official reference coverage ≥ 85%
 *   - Weak quality (<0.78) ≤ 10%
 *   - Average teaching depth ≥ 1,200
 *   - Path membership ≥ 40% of visible cards
 *
 * Usage: npm run library:enrich:diagnostic
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  exampleNeedsRewrite,
  needsTopicRelevanceRewrite,
} from "../lib/card-dedupe.mjs";
import { teachingDepthScore } from "../lib/improvement-guardrails.mjs";
import { loadAllPaths, pathCardIds } from "../lib/path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const SEAMLESS_CATALOG = join(ROOT, "public", "corpus", "catalog.json");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "enrichment-diagnostic-report.json",
);

const COMPETITIVE = {
  deepShare: 0.85,
  enrichedGateShare: 0.7,
  officialCoverage: 0.85,
  maxWeakShare: 0.1,
  averageDepth: 1200,
  pathMembershipShare: 0.4,
  minDefinition: 280,
  minExample: 450,
  minTrap: 150,
  minImplication: 80,
  minTrigger: 40,
  minQuality: 0.78,
};

const NON_FIN =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|shop drawings|moh approval|detailed construction|detailed design schedule|install ceramic|install demountable|laminar flow|hepa filter|pneumatic conveying|activity id|leveling concrete|working meeting milestones)\b/i;

/** Heuristic “covers X in domain” filler (offline rewrite residue). */
const TEMPLATE_COVERS =
  /\bcovers\b[\s\S]{0,120}\bin\b[\s\S]{0,80}:\s*what it means,\s*how it is measured/i;

function isVisible(card) {
  if (card.editorialStatus === "quarantined") return false;
  if ((card.tags || []).includes("quarantined")) return false;
  if (NON_FIN.test(card.title || "")) return false;
  return true;
}

function meetsDeep(card) {
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  return definition.length >= COMPETITIVE.minDefinition && example.length >= COMPETITIVE.minExample;
}

function meetsFullGate(card) {
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  const trap = String(card.commonMistake || "");
  const implication = String(card.implicationIfIgnored || "");
  const trigger = String(card.realWorldTrigger || "");
  return (
    definition.length >= COMPETITIVE.minDefinition &&
    example.length >= COMPETITIVE.minExample &&
    trap.length >= COMPETITIVE.minTrap &&
    implication.length >= COMPETITIVE.minImplication &&
    trigger.length >= COMPETITIVE.minTrigger &&
    !exampleNeedsRewrite(example, definition)
  );
}

function gapTo(current, target, higherIsBetter = true) {
  if (higherIsBetter) {
    return {
      current,
      target,
      gap: Math.max(0, target - current),
      met: current >= target,
    };
  }
  return {
    current,
    target,
    gap: Math.max(0, current - target),
    met: current <= target,
  };
}

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 1000) / 1000;
}

function loadSeamlessIds() {
  if (!existsSync(SEAMLESS_CATALOG)) return new Set();
  const catalog = JSON.parse(readFileSync(SEAMLESS_CATALOG, "utf8"));
  return new Set((catalog.cards || []).map((c) => c.id));
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const allCards = index.cards || [];
  const cards = allCards.filter(isVisible);
  const pathIds = pathCardIds();
  const paths = loadAllPaths();
  const seamlessIds = loadSeamlessIds();

  let deep = 0;
  let fullGate = 0;
  let withOfficial = 0;
  let weak = 0;
  let enrichedAt = 0;
  let inPaths = 0;
  let pathEnrichedAt = 0;
  let indexEnrichedAt = 0;
  let seamlessEnrichedAt = 0;
  let templateHits = 0;
  let topicMismatch = 0;
  let depthSum = 0;
  const byDomain = {};
  const missing = {
    definition: 0,
    example: 0,
    trap: 0,
    implication: 0,
    trigger: 0,
    overlappingExample: 0,
  };

  for (const card of allCards) {
    if (card.enrichedAt) {
      indexEnrichedAt += 1;
      if (seamlessIds.has(card.id)) seamlessEnrichedAt += 1;
    }
  }

  for (const card of cards) {
    const domain = card.classification?.domain || "(none)";
    if (!byDomain[domain]) {
      byDomain[domain] = { total: 0, deep: 0, fullGate: 0, official: 0, weak: 0 };
    }
    byDomain[domain].total += 1;

    const definition = String(card.teachingSummary || card.body || "");
    const example = String(card.workedExample || "");
    const trap = String(card.commonMistake || "");
    const implication = String(card.implicationIfIgnored || "");
    const trigger = String(card.realWorldTrigger || "");
    const teachingBlob = `${card.teachingSummary || ""}\n${card.body || ""}`;

    if (definition.length < COMPETITIVE.minDefinition) missing.definition += 1;
    if (example.length < COMPETITIVE.minExample) missing.example += 1;
    if (trap.length < COMPETITIVE.minTrap) missing.trap += 1;
    if (implication.length < COMPETITIVE.minImplication) missing.implication += 1;
    if (trigger.length < COMPETITIVE.minTrigger) missing.trigger += 1;
    if (exampleNeedsRewrite(example, definition)) missing.overlappingExample += 1;

    depthSum += teachingDepthScore(card);
    if (meetsDeep(card)) {
      deep += 1;
      byDomain[domain].deep += 1;
    }
    if (meetsFullGate(card)) {
      fullGate += 1;
      byDomain[domain].fullGate += 1;
    }
    if ((card.officialReferences || []).length > 0) {
      withOfficial += 1;
      byDomain[domain].official += 1;
    }
    const quality = Number(card.qualityScore);
    if (!Number.isFinite(quality) || quality < COMPETITIVE.minQuality) {
      weak += 1;
      byDomain[domain].weak += 1;
    }
    if (card.enrichedAt) enrichedAt += 1;
    if (pathIds.has(card.id)) {
      inPaths += 1;
      if (card.enrichedAt) pathEnrichedAt += 1;
    }
    if (TEMPLATE_COVERS.test(teachingBlob)) templateHits += 1;
    if (needsTopicRelevanceRewrite(card)) topicMismatch += 1;
  }

  const n = cards.length || 1;
  const metrics = {
    deepShare: gapTo(pct(deep, n), COMPETITIVE.deepShare),
    enrichedGateShare: gapTo(pct(fullGate, n), COMPETITIVE.enrichedGateShare),
    officialCoverage: gapTo(pct(withOfficial, n), COMPETITIVE.officialCoverage),
    weakShare: gapTo(pct(weak, n), COMPETITIVE.maxWeakShare, false),
    averageDepth: gapTo(
      Math.round(depthSum / n),
      COMPETITIVE.averageDepth,
    ),
    pathMembershipShare: gapTo(
      pct(inPaths, n),
      COMPETITIVE.pathMembershipShare,
    ),
  };

  const met = Object.values(metrics).filter((m) => m.met).length;
  const totalChecks = Object.keys(metrics).length;
  const competitivenessScore = Math.round((met / totalChecks) * 100);

  const pathN = inPaths || 1;
  const indexN = allCards.length || 1;
  const seamlessN = seamlessIds.size || 1;
  // Public gate denominator = seamless runtime (what users load), not index orphans
  // and not the visible-filter theater that produced the stale 80.6% green.
  const liveShareIndex = pct(indexEnrichedAt, indexN);
  const liveShareSeamless = pct(seamlessEnrichedAt, seamlessN);
  const liveShareCatalog = liveShareSeamless;
  const liveSharePath = pct(pathEnrichedAt, pathN);
  const templateShare = pct(templateHits, n);
  const topicMismatchShare = pct(topicMismatch, n);
  // Automated QA fail proxy until spot-QA report exists: topic mismatches.
  const qaFailRate = topicMismatchShare;

  const denominatorCounts = {
    indexCards: allCards.length,
    seamlessCards: seamlessIds.size,
    pathCards: inPaths,
    visibleCards: cards.length,
    withEnrichedAt: indexEnrichedAt,
    seamlessWithEnrichedAt: seamlessEnrichedAt,
    pathWithEnrichedAt: pathEnrichedAt,
    indexSeamlessGap: Math.max(0, allCards.length - seamlessIds.size),
  };

  const shipMetrics = {
    liveShareIndex: gapTo(liveShareIndex, 0.4),
    liveShareSeamless: gapTo(liveShareSeamless, 0.4),
    liveShareCatalog: gapTo(liveShareCatalog, 0.4),
    liveSharePath: gapTo(liveSharePath, 0.7),
    templateShare: gapTo(templateShare, 0.15, false),
    topicMismatchShare: gapTo(topicMismatchShare, 0.02, false),
    qaFailRate: gapTo(qaFailRate, 0.05, false),
    denominatorCounts,
    denominators: {
      liveShareIndex: "enrichedAt / totalIndexCards",
      liveShareSeamless: "enrichedAt ∩ seamless / seamlessCards (public gate)",
      liveShareCatalog: "alias of liveShareSeamless (public gate)",
      liveSharePath: "enrichedAt ∩ pathCards / pathCards (soft gate)",
    },
    note: "Ship gates use liveSharePath (soft) and liveShareSeamless/Catalog (public). competitivenessScore is structural only — not a ship gate.",
  };

  const cardsToCompetitive = {
    deep: Math.max(0, Math.ceil(COMPETITIVE.deepShare * n) - deep),
    fullGate: Math.max(0, Math.ceil(COMPETITIVE.enrichedGateShare * n) - fullGate),
    official: Math.max(0, Math.ceil(COMPETITIVE.officialCoverage * n) - withOfficial),
    weakUpgrade: Math.max(0, weak - Math.floor(COMPETITIVE.maxWeakShare * n)),
    pathLink: Math.max(0, Math.ceil(COMPETITIVE.pathMembershipShare * n) - inPaths),
    liveEnrichPath: Math.max(
      0,
      Math.ceil(0.7 * pathN) - pathEnrichedAt,
    ),
    liveEnrichCatalog: Math.max(
      0,
      Math.ceil(0.4 * seamlessN) - seamlessEnrichedAt,
    ),
  };

  // Provenance buckets (E9) — never treat locallyDeepenedAt as enrichedAt.
  const provenanceBuckets = {
    "openai-live": 0,
    "agent-authored": 0,
    "codex-local": 0,
    "formula-pack": 0,
    registry: 0,
    unknown: 0,
  };
  for (const card of allCards) {
    let key = card.sourceProvenance;
    if (!provenanceBuckets[key]) {
      if (card.enrichedAt) key = "openai-live";
      else if (
        card.agentAuthoredAt ||
        (card.tags || []).includes("agent-authored")
      ) {
        key = "agent-authored";
      } else if (
        (card.tags || []).includes("codex-sourced") ||
        card.codexDeepenedAt ||
        card.locallyDeepenedAt
      ) {
        key = "codex-local";
      } else if (card.formulaPackAt) key = "formula-pack";
      else if (Array.isArray(card.aliases) && card.aliases.length) key = "registry";
      else key = "unknown";
    }
    provenanceBuckets[key] = (provenanceBuckets[key] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalog: {
      totalCards: index.cards?.length ?? 0,
      visibleCards: cards.length,
      seamlessCards: seamlessIds.size,
      paths: paths.length,
      cardsInAnyPath: pathIds.size,
    },
    denominatorCounts,
    competitiveTargets: COMPETITIVE,
    metrics,
    competitivenessScore,
    competitivenessScoreIsNotShipGate: true,
    provenanceBuckets,
    provenanceBucketsSum: Object.values(provenanceBuckets).reduce(
      (a, b) => a + b,
      0,
    ),
    shipMetrics,
    verdict:
      competitivenessScore >= 85
        ? "competitive-structural"
        : competitivenessScore >= 60
          ? "approaching-structural"
          : "below-competitive-structural",
    counts: {
      deep,
      fullGate,
      withOfficial,
      weak,
      enrichedAt,
      pathEnrichedAt,
      inPaths,
      templateHits,
      topicMismatch,
      averageDepth: Math.round(depthSum / n),
    },
    missingFields: missing,
    cardsStillNeededForCompetitive: cardsToCompetitive,
    byDomain: Object.fromEntries(
      Object.entries(byDomain)
        .map(([domain, row]) => [
          domain,
          {
            ...row,
            deepShare: pct(row.deep, row.total),
            fullGateShare: pct(row.fullGate, row.total),
            officialShare: pct(row.official, row.total),
            weakShare: pct(row.weak, row.total),
          },
        ])
        .sort((a, b) => b[1].total - a[1].total),
    ),
    nextActions: [
      cardsToCompetitive.liveEnrichPath > 0
        ? `Live-enrich ${cardsToCompetitive.liveEnrichPath} more path cards (soft-launch liveSharePath≥70%).`
        : null,
      cardsToCompetitive.liveEnrichCatalog > 0
        ? `Live-enrich ${cardsToCompetitive.liveEnrichCatalog} more catalog cards (public liveShareCatalog≥40%).`
        : null,
      topicMismatch > 0
        ? `Rewrite ${topicMismatch} topic-mismatched cards (library:rewrite:relevance / enrich:relevance).`
        : null,
      templateHits > 0
        ? `Replace ${templateHits} “covers X in domain” template definitions.`
        : null,
      cardsToCompetitive.fullGate > 0
        ? `Enrich ${cardsToCompetitive.fullGate} cards to full teaching gate (def/example/trap/implication/trigger).`
        : null,
      cardsToCompetitive.deep > 0
        ? `Deepen ${cardsToCompetitive.deep} cards to deep pack (def≥280, example≥450).`
        : null,
      cardsToCompetitive.official > 0
        ? `Attach official references on ${cardsToCompetitive.official} cards.`
        : null,
      cardsToCompetitive.weakUpgrade > 0
        ? `Upgrade ${cardsToCompetitive.weakUpgrade} weak-quality cards above 0.78.`
        : null,
      cardsToCompetitive.pathLink > 0
        ? `Link ${cardsToCompetitive.pathLink} more cards into learning paths.`
        : null,
    ].filter(Boolean),
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
