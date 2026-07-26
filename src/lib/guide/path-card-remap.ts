import type { LearningPath } from "./types";
import canonicalRegistryGenerated from "./canonical-registry.generated.json";

type GeneratedRegistry = {
  idToCanonical?: Record<string, string>;
};

const REGISTRY_IDS =
  (canonicalRegistryGenerated as GeneratedRegistry).idToCanonical ?? {};

/**
 * Broken / renamed path step cardIds → live Library cards.
 * Keeps flagship, IFRS, FRM, and FA shelves continueable after corpus renames.
 * Registry aliases (canonical-registry.generated.json) resolve after this map.
 */
export const PATH_CARD_REMAP: Record<string, string> = {
  "cash-conversion-cycle": "fa-ccc",
  "coso-rcm-coso": "enc-rcm",
  "crma-control-environment": "enc-control-environment",
  "crma-key-risk-indicators": "frm-kri-op-risk",
  "crma-monitoring-activities": "enc-monitoring-controls",
  "crma-segregation-of-duties": "enc-sod",
  "crma-three-lines-model": "frm-three-lines",
  "fa-convexity": "frm-convexity",
  "fa-deriv-put-call-parity": "frm-put-call-parity",
  "fa-information-ratio": "frm-information-ratio",
  "fa-sharpe-ratio": "frm-sharpe-ratio",
  "fa-tracking-error": "frm-tracking-error",
  "fa-treynor-ratio": "frm-treynor-ratio",
  "fa-cost-of-equity": "fa-build-up-method",
  "fa-free-cash-flow": "fa-fcf",
  "fa-wacc-overview": "fa-wacc",
  "frm-credit-var": "fa-credit-var",
  "frm-dv01": "frm-dv01-detail",
  "frm-monte-carlo": "fa-monte-carlo-npv",
  "ias-10-adjusting": "ifrs-enc-ias-10-adjusting-vs-non-adjusting",
  "ias-10-non-adjusting": "ifrs-enc-ias-10-events-after-the-reporting-period-awfzidewic",
  "ias-19-short-term":
    "ifrs-enc-employee-benefits-accounting-for-short-term-and-long-ter-zw1wbg95zw",
  "ias-19-termination":
    "ifrs-enc-employee-benefits-accounting-for-termination-benefits-zw1wbg95zw",
  "ias-28-equity-method":
    "ifrs-enc-consolidation-accounting-for-associates-and-joint-ventur-y29uc29saw",
  "ias-36-recoverable": "ifrs-enc-recoverable-amount-cmvjb3zlcm",
  "ias-36-reversal":
    "ifrs-enc-financial-reporting-impairment-reversal-of-impairment-lo-zmluyw5jaw-334214",
  "ifrs-10-nci": "ifrs-enc-non-controlling-interest-in-equity-bm9ulwnvbn",
  "ifrs-15-contract-costs": "ifrs-enc-contract-cost-amortisation-y29udhjhy3",
  "ifrs-16-discount": "ifrs-enc-ifrs-16-discount-rate-determination",
  "ifrs-16-liability": "ifrs-enc-initial-lease-liability-aw5pdglhbc",
  "ifrs-16-rou": "ifrs-enc-right-of-use-asset-movement-cmlnahqtb2",
  "ifrs-5-discontinued": "ifrs-enc-discontinued-operation-result-zglzy29udg",
};

export function remapPathCardId(
  cardId: string | undefined,
): string | undefined {
  if (!cardId) return undefined;

  // Explicit path remaps win. A stale registry may still list filtered-out
  // crma-* ids as canonical and would otherwise reverse enc-/frm- targets.
  const explicit = PATH_CARD_REMAP[cardId];
  if (explicit) return explicit;

  const viaRegistry = REGISTRY_IDS[cardId];
  if (!viaRegistry) return cardId;

  // If registry lands on a known-dead alias, follow the explicit live target.
  return PATH_CARD_REMAP[viaRegistry] ?? viaRegistry;
}

export function withRemappedPathCards(paths: LearningPath[]): LearningPath[] {
  return paths.map((path) => ({
    ...path,
    steps: path.steps.map((step) => {
      const nextId = remapPathCardId(step.cardId);
      if (!nextId || nextId === step.cardId) return step;
      return { ...step, cardId: nextId };
    }),
  }));
}
