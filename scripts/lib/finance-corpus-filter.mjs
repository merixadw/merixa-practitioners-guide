/**
 * Finance-only corpus boundary for P0 quarantine and terminology filtering.
 */

export const QUARANTINE_DOMAINS = new Set([
  // Intentionally empty: Project delivery is a first-class Guide domain
  // (finance/capital-project lens). Construction/PM noise is still blocked by
  // NON_FINANCE_TITLE_RE / NON_FINANCE_SOURCE_RE below.
]);

export const SPINE_ID_PREFIXES = [
  "fa-",
  "frm-",
  "ma-",
  "crma-",
  "coso-",
  "enc-",
  "ifrs-",
  "ias-",
];

export const SPINE_TAGS = new Set([
  "fa-encyclopedia",
  "frm-encyclopedia",
  "ma-encyclopedia",
  "crma-encyclopedia",
  "coso-encyclopedia",
  "ifrs-ias-path",
  "domain-spine",
]);

export const WEAK_QUALITY_THRESHOLD = 0.78;

/** Catalog / cache sources that are not finance practitioner material. */
export const NON_FINANCE_SOURCE_RE =
  /\b(project charter|project management|project planning and control|pmbok|work breakdown|construction schedule|detailed design schedule|detailed construction|formwork|trench excavation|gypsum board|ifc drawings|shop drawings|moh review|laminar flow|bus duct|project definition|project procurement|jones and shephard|discussion2|bill smith|firat kaya|laura ingman|chinwe ukaegbu|bilkent wbs|project management plan|pm steps|assignment-?\d|module-\d-discussion|project procurement class|strategic management|entrepreneur|jeffrey liker|toyota way|mykel kochenderfer|algorithms for|decision making under|merixa\.com\/articles|articles-page)\b/i;

/** Card titles that are construction, PM, or off-domain even if misclassified. */
export const NON_FINANCE_TITLE_RE =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|ifc drawing|shop drawings|moh approval|moh review|laminar flow|busbar duct|install ceramic|install demountable|install gypsum|install suspended|install heat gas|stormwater gutter|hepa filter|pneumatic conveying|activity id|leveling concrete|water proofing|detailed construction|detailed design schedule|work breakdown|critical path|project director|manager,? admin services|functional employee|organizational structure|organizational change announcement|training seminars for organizational|traffic flow analysis design|structural plans|roof plans|floor plans sections|site handover|site infrastructure|concrete works|fire resistant doors|hydrotesting|dilatation profiles|balustrades|glass curtain wall|reverse osmosis|building heating|medical gas system instruments|ddc panels|plcs|ips sections|raceway schedules|grounding earthing|lightning protection|door hardware schedules|plans schedules sections details|utilities sections|electrical distribution system|control panelboards|air handling distribution|cable trays|bus ducts|earthing grounding|isolated power system|lighting fixture schedules|single line diagram|working meeting milestones|project task completion)\b/i;

/** Finance-relevant even when source path looks generic. */
/**
 * Keep every finance / professional-body resource in play.
 * Quarantine only construction/PM/off-domain noise — never IFRS/FRC/ACCA/CIMA/
 * CGMA/CFA/GARP/FRM/IIA/CRMA/COSO encyclopedias or licensed body books.
 */
export const FINANCE_SOURCE_ALLOW_RE =
  /\b(ifrs|ias|frc|frs|acca|cima|cgma|aicpa|cfa|garp|frm|iia|crma|coso|audit|assurance|risk|control|governance|financial reporting|financial analysis|management accounting|management reporting|valuation|treasury|impairment|revenue|lease|consolidat|tax|pension|inventory|credit|liquidity|var\b|wacc|dcf|internal audit|uk gaap|spotlight on material|corporate governance code|flowchart accounting|internal control design|frm exam|cfa institute|reading \d+\b)\b/i;

export function isSpineCard(card) {
  const id = String(card?.id ?? "");
  if (SPINE_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) return true;
  const tags = Array.isArray(card?.tags) ? card.tags : [];
  return tags.some((tag) => SPINE_TAGS.has(tag));
}

export function isFinanceSource(source) {
  if (!source) return false;
  if (source.official) return true;
  const hay = `${source.sourcePath ?? ""} ${source.label ?? ""} ${String(source.text ?? "").slice(0, 2500)}`;
  if (FINANCE_SOURCE_ALLOW_RE.test(hay)) return true;
  if (NON_FINANCE_SOURCE_RE.test(hay)) return false;
  const bodies = source.bodies ?? (source.bodyId ? [source.bodyId] : []);
  const financeBodies = [
    "IFRS",
    "FRC",
    "ACCA",
    "CFA",
    "FRM",
    "IIA",
    "CRMA",
    "CGMA",
    "Merixa",
  ];
  if (bodies.some((body) => financeBodies.includes(body))) return true;
  if (/\b(finance|accounting|audit|risk|control|reporting|ifrs|tax|treasury)\b/i.test(hay)) {
    return true;
  }
  return false;
}

export function quarantineReason(card) {
  if (!card) return null;
  if (card.editorialStatus === "quarantined") return "already-quarantined";
  if (Array.isArray(card.tags) && card.tags.includes("quarantined")) {
    return "tagged-quarantined";
  }

  const domain = card.classification?.domain ?? "";
  if (QUARANTINE_DOMAINS.has(domain) && !isSpineCard(card)) {
    return `domain:${domain}`;
  }

  const title = String(card.title ?? "");
  const body = `${title} ${card.body ?? ""} ${card.teachingSummary ?? ""}`;
  const sources = (card.sources ?? [])
    .map((source) => `${source.label ?? ""} ${source.path ?? ""}`)
    .join(" ");

  if (NON_FINANCE_TITLE_RE.test(title)) return "non-finance-title";
  if (/\/project management\//i.test(sources) && !isSpineCard(card)) {
    return "non-finance-source";
  }
  if (NON_FINANCE_SOURCE_RE.test(sources) && !isSpineCard(card)) {
    return "non-finance-source";
  }

  // Mis-ingested PM / construction terms from terminology pipeline
  if (
    /^(activity id|trench excavation|leveling concrete|water proofing|moh approval|moh review|install |formwork plans|rebar details|roof plans|structural design report|seismic design report|architectural design report)$/i.test(
      title.trim(),
    )
  ) {
    return "terminology-noise";
  }

  return null;
}

export function shouldHideWeakCard(card) {
  if (!card) return true;
  if (quarantineReason(card)) return true;
  if (isSpineCard(card)) return false;
  if ((card.qualityScore ?? 0.5) >= WEAK_QUALITY_THRESHOLD) return false;
  if (card.enrichedAt || card.editorialStatus === "editor-approved") {
    const example = String(card.workedExample ?? "");
    const definition = String(card.teachingSummary ?? card.body ?? "");
    if (example.length >= 450 && definition.length >= 280) return false;
  }
  return true;
}
