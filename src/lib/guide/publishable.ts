import type { GuideCard } from "./types";

/**
 * Domain quarantine is empty: Project delivery is a first-class strategy /
 * delivery-finance domain. Construction junk is still blocked by title regex.
 */
const QUARANTINE_DOMAINS = new Set<string>();

const SPINE_ID_PREFIXES = [
  "fa-",
  "frm-",
  "ma-",
  "crma-",
  "coso-",
  "enc-",
  "ifrs-",
  "ias-",
  "tax-",
];

const SPINE_TAGS = new Set([
  "fa-encyclopedia",
  "frm-encyclopedia",
  "ma-encyclopedia",
  "crma-encyclopedia",
  "coso-encyclopedia",
  "tax-encyclopedia",
  "ifrs-encyclopedia",
  "ifrs-ias-path",
  "domain-spine",
]);

export const WEAK_QUALITY_THRESHOLD = 0.78;

const NON_FINANCE_TITLE_RE =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|shop drawings|moh approval|detailed construction|detailed design schedule|install ceramic|install demountable|laminar flow|hepa filter|pneumatic conveying|activity id|leveling concrete|working meeting milestones)\b/i;

function isSpineCard(card: GuideCard): boolean {
  if (SPINE_ID_PREFIXES.some((prefix) => card.id.startsWith(prefix))) {
    return true;
  }
  return card.tags.some((tag) => SPINE_TAGS.has(tag));
}

export function isQuarantinedCard(
  card: Pick<GuideCard, "editorialStatus" | "tags" | "title"> & {
    classification?: GuideCard["classification"];
  },
): boolean {
  if (card.editorialStatus === "quarantined") return true;
  if (card.tags.includes("quarantined")) return true;
  const domain = card.classification?.domain ?? "";
  if (QUARANTINE_DOMAINS.has(domain)) return true;
  if (NON_FINANCE_TITLE_RE.test(card.title)) return true;
  return false;
}

export function isDemotedCard(card: GuideCard): boolean {
  return (
    card.editorialStatus === "demoted" || card.tags.includes("demoted")
  );
}

/**
 * Library browse visibility.
 * Hide quarantined / non-finance junk (includes P3 facet-clone quarantine).
 * Weak quality cards stay visible — enrichment improves them.
 */
export function isVisibleInLibraryBrowse(
  card: Pick<GuideCard, "editorialStatus" | "tags" | "title"> & {
    classification?: GuideCard["classification"];
  },
  _options?: { query?: string },
): boolean {
  if (isQuarantinedCard(card)) return false;
  return true;
}

export function isVisibleToTutor(card: GuideCard): boolean {
  return !isQuarantinedCard(card);
}

/** Kept for tooling / ranking that still want spine vs weak distinctions. */
export function isSpineOrStrongCard(card: GuideCard): boolean {
  if (isSpineCard(card)) return true;
  if ((card.qualityScore ?? 0.5) >= WEAK_QUALITY_THRESHOLD) return true;
  const definition = card.teachingSummary ?? card.body ?? "";
  const example = card.workedExample ?? "";
  return definition.length >= 280 && example.length >= 450;
}
