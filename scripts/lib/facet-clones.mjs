/**
 * Facet-clone detection for Library cull (P3).
 * Known suffixes from domain-floor FACETS + offline expand proposeTitles.
 */
import {
  contentWithoutTitleEcho,
  needsTopicRelevanceRewrite,
  textOverlapRatio,
} from "./card-dedupe.mjs";
import { teachingDepthScore } from "./improvement-guardrails.mjs";

/** Domain-floor facets (`Title — facet`). */
export const DOMAIN_FLOOR_FACETS = [
  "workplace evidence",
  "board pack view",
  "control test",
  "close checklist",
  "owner map",
  "judgement call",
  "stress-test trap",
  "KPI bridge",
  "decision memo",
  "assurance lens",
  "risk register link",
  "cash impact",
  "disclosure note",
  "change-control gate",
  "post-implementation review",
];

/** Extra suffixes from offline encyclopedia expand. */
export const EXPAND_OFFLINE_FACETS = [
  "pack view",
  "owner decision",
  "sensitivity",
  "board narrative",
  "reconciliation",
  "cash bridge",
  "escalation path",
  "residual risk",
];

export const KNOWN_FACET_LABELS = [
  ...DOMAIN_FLOOR_FACETS,
  ...EXPAND_OFFLINE_FACETS,
];

const FACET_SET = new Set(
  KNOWN_FACET_LABELS.map((label) => label.toLowerCase()),
);

const TEMPLATE_COVERS =
  /\bcovers\b[\s\S]{0,120}\bin\b[\s\S]{0,80}:\s*what it means,\s*how it is measured/i;

/** Max unique facet lenses kept per base concept (plan P3). */
export const MAX_UNIQUE_FACET_LENSES = 2;

/** Overlap above this ⇒ not a unique lens vs base / kept peers. */
export const FACET_UNIQUE_OVERLAP_MAX = 0.65;

export function normalizeFacetLabel(label) {
  return String(label || "")
    .replace(/\s*·\s*case\s+\d+\s*$/i, "")
    .trim()
    .toLowerCase();
}

export function isKnownFacetLabel(label) {
  const cleaned = normalizeFacetLabel(label);
  if (FACET_SET.has(cleaned)) return true;
  if (/^scenario\s+\d+$/i.test(cleaned)) return true;
  return false;
}

/**
 * Split `Base — facet` / `Base — facet · case N` titles.
 * Only known facet labels count as clones (avoids real “IFRS 9 — ECL” titles).
 */
export function splitFacetTitle(title) {
  const t = String(title || "").replace(/\s+/g, " ").trim();
  if (!t) return { base: "", facet: null, isClone: false };

  const dash = t.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (dash) {
    const base = dash[1].trim();
    const facetRaw = dash[2].trim();
    if (isKnownFacetLabel(facetRaw)) {
      return {
        base,
        facet: normalizeFacetLabel(facetRaw),
        isClone: true,
      };
    }
  }

  return { base: t, facet: null, isClone: false };
}

export function isFacetCloneTitle(title) {
  return splitFacetTitle(title).isClone;
}

export function teachingSubstance(card) {
  const title = String(card?.title || "");
  const def = String(card?.teachingSummary || card?.body || "");
  return contentWithoutTitleEcho(title, def);
}

/** True when lens teaching is distinct from reference cards. */
export function isUniqueFacetLens(candidate, references) {
  if (needsTopicRelevanceRewrite(candidate)) return false;
  const substance = teachingSubstance(candidate);
  if (substance.length < 100) return false;
  if (TEMPLATE_COVERS.test(String(candidate.teachingSummary || ""))) {
    return false;
  }
  for (const ref of references) {
    const refSub = teachingSubstance(ref);
    if (!refSub) continue;
    if (textOverlapRatio(substance, refSub) >= FACET_UNIQUE_OVERLAP_MAX) {
      return false;
    }
  }
  return true;
}

function facetKeepScore(card) {
  return (
    (card.enrichedAt ? 1_000_000 : 0) +
    teachingDepthScore(card) +
    (Number(card.qualityScore) || 0) * 100
  );
}

/**
 * Decide keep vs quarantine for one base family.
 * Always keep non-clone (base) cards. Keep up to MAX_UNIQUE_FACET_LENSES
 * unique facet lenses; quarantine the rest.
 */
export function planFacetFamily(cards) {
  const bases = [];
  const clones = [];
  for (const card of cards) {
    if (isFacetCloneTitle(card.title)) clones.push(card);
    else bases.push(card);
  }

  const keep = [...bases];
  const quarantine = [];
  const refs = [...bases];

  const ranked = [...clones].sort(
    (a, b) => facetKeepScore(b) - facetKeepScore(a),
  );

  for (const clone of ranked) {
    if (
      keep.filter((c) => isFacetCloneTitle(c.title)).length >=
      MAX_UNIQUE_FACET_LENSES
    ) {
      quarantine.push(clone);
      continue;
    }
    if (isUniqueFacetLens(clone, refs)) {
      keep.push(clone);
      refs.push(clone);
    } else {
      quarantine.push(clone);
    }
  }

  return { keep, quarantine, bases, clones };
}

/**
 * Group all cards by base title key; return quarantine list + stats.
 */
export function planFacetCull(cards) {
  const byBase = new Map();
  for (const card of cards) {
    const { base } = splitFacetTitle(card.title);
    const key = base.toLowerCase();
    if (!byBase.has(key)) byBase.set(key, []);
    byBase.get(key).push(card);
  }

  const quarantine = [];
  const keep = [];
  let familiesWithClones = 0;
  let cloneCount = 0;
  let keptLenses = 0;

  for (const family of byBase.values()) {
    const plan = planFacetFamily(family);
    if (plan.clones.length > 0) familiesWithClones += 1;
    cloneCount += plan.clones.length;
    keptLenses += plan.keep.filter((c) => isFacetCloneTitle(c.title)).length;
    keep.push(...plan.keep);
    quarantine.push(...plan.quarantine);
  }

  return {
    keep,
    quarantine,
    stats: {
      families: byBase.size,
      familiesWithClones,
      cloneCount,
      keptLenses,
      quarantineCount: quarantine.length,
      visibleAfter:
        cards.length - quarantine.length,
      cullShareOfClones:
        cloneCount > 0
          ? Math.round((quarantine.length / cloneCount) * 1000) / 1000
          : 0,
    },
  };
}
