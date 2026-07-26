import { LEARNING_PATHS } from "./paths";
import type {
  ConceptRelation,
  ConceptRelationKind,
  GuideCard,
  GuideIndex,
} from "./types";

/**
 * High-value curated edges — Merixa differentiator: implications of actions.
 * ids must exist in the published index when possible; missing ids are skipped.
 */
export const CURATED_CONCEPT_EDGES: Array<{
  from: string;
  to: string;
  kind: ConceptRelationKind;
}> = [
  { from: "enc-going-concern", to: "fa-liquidity-ratios", kind: "consequence" },
  { from: "enc-going-concern", to: "frm-liquidity-risk", kind: "consequence" },
  { from: "enc-going-concern", to: "runway", kind: "consequence" },
  { from: "profit-vs-cash", to: "fa-ccc", kind: "consequence" },
  { from: "profit-vs-cash", to: "fa-ocf-vs-ni", kind: "related" },
  { from: "fa-ccc", to: "working-capital", kind: "related" },
  { from: "fa-ccc", to: "runway", kind: "consequence" },
  { from: "ifrs-15-revenue", to: "materiality-practice", kind: "consequence" },
  { from: "ifrs-15-step1", to: "ifrs-15-step2", kind: "consequence" },
  { from: "ifrs-15-step2", to: "ifrs-15-step3", kind: "consequence" },
  { from: "ifrs-15-step3", to: "ifrs-15-step4", kind: "consequence" },
  { from: "ifrs-15-step4", to: "ifrs-15-step5", kind: "consequence" },
  { from: "ifrs-9-classification", to: "enc-ecl", kind: "consequence" },
  { from: "enc-ecl", to: "frm-expected-loss", kind: "related" },
  { from: "frm-risk-appetite", to: "kri-kci", kind: "consequence" },
  { from: "frm-risk-appetite", to: "crma-three-lines-model", kind: "related" },
  { from: "crma-control-environment", to: "coso-rcm-coso", kind: "consequence" },
  { from: "coso-rcm-coso", to: "design-vs-operating", kind: "consequence" },
  { from: "design-vs-operating", to: "control-illusion", kind: "consequence" },
  { from: "fa-wacc", to: "fa-npv", kind: "prerequisite" },
  { from: "fa-npv", to: "fa-dcf-overview", kind: "related" },
  { from: "fa-fcf", to: "fa-dcf-overview", kind: "prerequisite" },
  { from: "ma-contribution-margin", to: "ma-break-even", kind: "consequence" },
  { from: "ma-fixed-variable-cost", to: "ma-contribution-margin", kind: "consequence" },
  { from: "ma-break-even", to: "ma-relevant-cost", kind: "related" },
  { from: "accrual-basis", to: "profit-vs-cash", kind: "consequence" },
  { from: "double-entry", to: "trial-balance", kind: "consequence" },
  { from: "trial-balance", to: "management-pl", kind: "consequence" },
  { from: "management-pl", to: "variance-lens", kind: "consequence" },
  { from: "frm-var-definition", to: "frm-expected-shortfall", kind: "consequence" },
  { from: "frm-liquidity-risk", to: "frm-lcr", kind: "consequence" },
  { from: "ias-1-materiality", to: "materiality-practice", kind: "related" },
  { from: "fa-accruals-ratio", to: "fa-earnings-quality", kind: "prerequisite" },
  { from: "fa-accruals-ratio", to: "fa-pro-forma-eps", kind: "consequence" },
  { from: "fa-total-accruals", to: "fa-accruals-ratio", kind: "consequence" },
  { from: "enc-deferred-tax", to: "ias-12-current", kind: "related" },
];

function pushUnique(
  list: ConceptRelation[],
  relation: ConceptRelation,
): void {
  if (list.some((item) => item.id === relation.id && item.kind === relation.kind)) {
    return;
  }
  list.push(relation);
}

function relationsFromPaths(cardId: string): ConceptRelation[] {
  const relations: ConceptRelation[] = [];
  for (const path of LEARNING_PATHS) {
    const index = path.steps.findIndex((step) => step.cardId === cardId);
    if (index < 0) continue;
    const prev = path.steps[index - 1];
    const next = path.steps[index + 1];
    if (prev?.cardId) {
      pushUnique(relations, {
        id: prev.cardId,
        kind: "prerequisite",
        label: prev.title,
      });
    }
    if (next?.cardId) {
      pushUnique(relations, {
        id: next.cardId,
        kind: "consequence",
        label: next.title,
      });
    }
  }
  return relations;
}

function relationsFromCurated(cardId: string): ConceptRelation[] {
  const relations: ConceptRelation[] = [];
  for (const edge of CURATED_CONCEPT_EDGES) {
    if (edge.from === cardId) {
      pushUnique(relations, { id: edge.to, kind: edge.kind });
    } else if (edge.to === cardId) {
      const reverse: ConceptRelationKind =
        edge.kind === "prerequisite"
          ? "consequence"
          : edge.kind === "consequence"
            ? "prerequisite"
            : "related";
      pushUnique(relations, { id: edge.from, kind: reverse });
    }
  }
  return relations;
}

function tagSet(card: GuideCard): Set<string> {
  return new Set(
    [
      ...(card.tags ?? []),
      card.classification?.topic ?? "",
      card.classification?.domain ?? "",
      ...card.bodies.map(String),
    ]
      .map((value) => String(value).toLowerCase().trim())
      .filter(Boolean),
  );
}

/**
 * When a card is off-path and has no curated edges, still offer Before this /
 * Leads to / Related from same-domain / shared-tag peers so every detail page
 * can close the Accruals-style learning loop.
 */
function relationsFromAffinity(
  card: GuideCard,
  index: GuideIndex,
  limit = 4,
): ConceptRelation[] {
  const own = tagSet(card);
  if (own.size === 0) return [];

  const domain = card.classification?.domain;
  const scored: Array<{ id: string; score: number }> = [];
  for (const other of index.cards) {
    if (other.id === card.id) continue;
    const theirs = tagSet(other);
    let score = 0;
    for (const tag of own) {
      if (theirs.has(tag)) score += 1;
    }
    if (domain && other.classification?.domain === domain) score += 2;
    if (score < 2) continue;
    scored.push({ id: other.id, score });
  }

  scored.sort((left, right) => right.score - left.score);
  const top = scored.slice(0, limit);
  if (top.length === 0) return [];

  const relations: ConceptRelation[] = [];
  // Strongest peer = related; bookend with prerequisite / consequence when we have 2+.
  if (top[0]) {
    pushUnique(relations, { id: top[0].id, kind: "related" });
  }
  if (top[1]) {
    pushUnique(relations, { id: top[1].id, kind: "prerequisite" });
  }
  if (top[2]) {
    pushUnique(relations, { id: top[2].id, kind: "consequence" });
  }
  return relations;
}

export type ResolvedRelation = {
  kind: ConceptRelationKind;
  card: GuideCard;
  label: string;
};

/** Merge curated edges, path neighbours, affinity peers, and card-stored links. */
export function resolveConceptRelations(
  card: GuideCard,
  index: GuideIndex,
  limit = 8,
): ResolvedRelation[] {
  const byId = new Map(index.cards.map((item) => [item.id, item]));
  const merged: ConceptRelation[] = [];

  for (const relation of card.relatedConcepts ?? []) {
    pushUnique(merged, relation);
  }
  for (const relation of relationsFromCurated(card.id)) {
    pushUnique(merged, relation);
  }
  for (const relation of relationsFromPaths(card.id)) {
    pushUnique(merged, relation);
  }

  // Affinity only when the graph is still thin — never drown curated/path edges.
  if (merged.length < 2) {
    for (const relation of relationsFromAffinity(card, index)) {
      pushUnique(merged, relation);
    }
  }

  const kindOrder: Record<ConceptRelationKind, number> = {
    prerequisite: 0,
    consequence: 1,
    related: 2,
  };

  return merged
    .map((relation) => {
      const related = byId.get(relation.id);
      if (!related || related.id === card.id) return null;
      return {
        kind: relation.kind,
        card: related,
        label: relation.label || related.title,
      };
    })
    .filter((value): value is ResolvedRelation => value !== null)
    .sort((left, right) => kindOrder[left.kind] - kindOrder[right.kind])
    .slice(0, limit);
}

/**
 * Watch for = trap a practitioner should catch (Accruals-ratio pattern).
 * Implication / trigger stay separate when authored.
 */
export function awarenessCopy(card: GuideCard): {
  watchFor: string;
  trigger: string | null;
  implication: string | null;
} {
  const implication = card.implicationIfIgnored?.trim() || null;
  const trigger = card.realWorldTrigger?.trim() || null;
  const watchFor =
    card.commonMistake?.trim() ||
    implication ||
    `Misreading “${card.title}” can distort the next pack, covenant test, or control conclusion.`;
  return { watchFor, trigger, implication };
}
