import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildGuideIndex } from "./index-build";
import { SEED_CARDS } from "./seed-cards";
import type {
  BodyId,
  GuideCard,
  GuideClassification,
  GuideDomain,
  GuideIndex,
  GuideSource,
  GuideSourceKind,
  SourceQuote,
  WorkplaceTask,
} from "./types";

/**
 * Read content/index.json from disk at runtime.
 * Never statically import that file — it is ~150MB and crashes Turbopack/Windows
 * during `next dev` when pulled into the compile graph.
 */
let cachedIngested: unknown | undefined;

function readIngestedPayload(): unknown {
  if (cachedIngested !== undefined) return cachedIngested;
  const indexPath = join(process.cwd(), "content", "index.json");
  if (!existsSync(indexPath)) {
    cachedIngested = { cards: [] };
    return cachedIngested;
  }
  cachedIngested = JSON.parse(readFileSync(indexPath, "utf8")) as unknown;
  return cachedIngested;
}

const GUIDE_DOMAINS: GuideDomain[] = [
  "Financial reporting",
  "Management reporting",
  "Financial management",
  "Risk management",
  "Audit and assurance",
  "Governance and controls",
  "Strategy and performance",
  "Sustainability",
  "Project delivery",
];

const BODY_IDS: BodyId[] = [
  "IFRS",
  "FRC",
  "CFA",
  "FRM",
  "IIA",
  "CRMA",
  "ACCA",
  "CGMA",
  "COSO",
  "GARP",
  "Merixa",
];

/** Historical alias written by COSO shelf fill — normalize on load. */
const DOMAIN_ALIASES: Record<string, GuideDomain> = {
  "Internal control and governance": "Governance and controls",
};

function isBodyId(value: unknown): value is BodyId {
  return typeof value === "string" && BODY_IDS.some((body) => body === value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSourceKind(value: unknown): value is GuideSourceKind {
  return (
    value === "merixa" ||
    value === "official-open" ||
    value === "licensed" ||
    value === "web" ||
    value === "unknown"
  );
}

function isGuideSource(value: unknown): value is GuideSource {
  if (typeof value !== "object" || value === null) return false;
  if (!("label" in value) || !("path" in value)) return false;
  if (typeof value.label !== "string" || typeof value.path !== "string") {
    return false;
  }
  if ("kind" in value && value.kind !== undefined && !isSourceKind(value.kind)) {
    return false;
  }
  return true;
}

function isWorkplaceTask(value: unknown): value is WorkplaceTask {
  if (typeof value !== "object" || value === null) return false;
  if (!("id" in value) || !("label" in value)) return false;
  if (typeof value.id !== "string" || typeof value.label !== "string") {
    return false;
  }
  if (
    "href" in value &&
    value.href !== undefined &&
    typeof value.href !== "string"
  ) {
    return false;
  }
  return true;
}

function isSourceQuote(value: unknown): value is SourceQuote {
  if (typeof value !== "object" || value === null) return false;
  if (!("text" in value) || typeof value.text !== "string") return false;
  if (
    "sourcePath" in value &&
    value.sourcePath !== undefined &&
    typeof value.sourcePath !== "string"
  ) {
    return false;
  }
  return true;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function normalizeDomain(domain: string): GuideDomain | null {
  if (GUIDE_DOMAINS.some((item) => item === domain)) {
    return domain as GuideDomain;
  }
  return DOMAIN_ALIASES[domain] ?? null;
}

function isGuideClassification(value: unknown): value is GuideClassification {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("domain" in value) ||
    !("topic" in value) ||
    !("contentType" in value) ||
    !("technicalLevel" in value) ||
    !("confidence" in value)
  ) {
    return false;
  }
  const contentTypes = [
    "definition",
    "requirement",
    "procedure",
    "control",
    "disclosure",
    "analysis",
    "guidance",
    "formula",
  ];
  return (
    typeof value.domain === "string" &&
    normalizeDomain(value.domain) !== null &&
    typeof value.topic === "string" &&
    typeof value.contentType === "string" &&
    contentTypes.some((contentType) => contentType === value.contentType) &&
    (value.technicalLevel === "practitioner" ||
      value.technicalLevel === "advanced") &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence)
  );
}

function isGuideCard(value: unknown): value is GuideCard {
  if (typeof value !== "object" || value === null) return false;
  if (
    !("id" in value) ||
    !("title" in value) ||
    !("body" in value) ||
    !("bodies" in value) ||
    !("tags" in value) ||
    !("workplaceTasks" in value) ||
    !("sources" in value)
  ) {
    return false;
  }

  if (
    !(
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      typeof value.body === "string" &&
      Array.isArray(value.bodies) &&
      value.bodies.every(isBodyId) &&
      isStringArray(value.tags) &&
      Array.isArray(value.workplaceTasks) &&
      value.workplaceTasks.every(isWorkplaceTask) &&
      Array.isArray(value.sources) &&
      value.sources.every(isGuideSource)
    )
  ) {
    return false;
  }

  if ("teachingSummary" in value && !isOptionalString(value.teachingSummary)) {
    return false;
  }
  if ("formula" in value && !isOptionalString(value.formula)) {
    return false;
  }
  if ("workedExample" in value && !isOptionalString(value.workedExample)) {
    return false;
  }
  if (
    "exampleVerification" in value &&
    value.exampleVerification !== undefined
  ) {
    const verification = value.exampleVerification;
    if (
      typeof verification !== "object" ||
      verification === null ||
      !("status" in verification) ||
      !("reason" in verification) ||
      !("verifiedAt" in verification) ||
      !("model" in verification) ||
      (verification.status !== "verified" &&
        verification.status !== "rejected" &&
        verification.status !== "needs-human" &&
        verification.status !== "pending") ||
      typeof verification.reason !== "string" ||
      typeof verification.verifiedAt !== "string" ||
      typeof verification.model !== "string"
    ) {
      return false;
    }
  }
  if ("commonMistake" in value && !isOptionalString(value.commonMistake)) {
    return false;
  }
  if ("checkQuestion" in value && !isOptionalString(value.checkQuestion)) {
    return false;
  }
  if ("enrichedAt" in value && !isOptionalString(value.enrichedAt)) {
    return false;
  }
  if (
    "classification" in value &&
    value.classification !== undefined &&
    !isGuideClassification(value.classification)
  ) {
    return false;
  }
  if (
    "sourceQuotes" in value &&
    value.sourceQuotes !== undefined &&
    !(
      Array.isArray(value.sourceQuotes) &&
      value.sourceQuotes.every(isSourceQuote)
    )
  ) {
    return false;
  }

  return true;
}

function readIngestedCards(value: unknown): GuideCard[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("cards" in value) ||
    !Array.isArray(value.cards)
  ) {
    return [];
  }
  return value.cards.filter(isGuideCard);
}

const EXAM_SOURCE =
  /\b(qbank|q bank|exam|questions?|answers?|mock|revision kit|practice & revision|study session)\b/i;
const EXAM_CONTENT =
  /\b(correct answer|exam technique|marks available|candidate response|practice question|question \d+)\b/i;
const BLOCKED_SOURCE =
  /\b(anna'?s?\s*archive|z-?lib|zlib\.org|libgen|sci-hub|bpp|kaplan|wiley|cia learning system|garp\s*frm|pirate|torrent)\b/i;

function sourceKindFromPath(path: string): GuideSourceKind {
  if (/merixa/i.test(path) || path === "seed") return "merixa";
  if (
    /\b(ifrs foundation|iasb|ifrs\.org|frc\.org|ias plus|official)\b/i.test(path)
  ) {
    return "official-open";
  }
  return "unknown";
}

function normalizeSources(sources: GuideSource[]): GuideSource[] {
  return sources
    .filter((source) => source.label.trim() && source.path.trim())
    .map((source) => ({
      label: source.label.trim(),
      path: source.path.trim(),
      kind: source.kind ?? sourceKindFromPath(source.path),
    }));
}

function prepareCard({
  card,
  source,
}: {
  card: GuideCard;
  source: "ingested" | "seed";
}): GuideCard | null {
  const sourceText = card.sources
    .map((item) => `${item.label} ${item.path}`)
    .join(" ");
  // Official professional-body references (e.g. garp.org/frm) must not trip
  // the pirated-material blocklist — scan only non-official sources.
  const nonOfficialSourceText = card.sources
    .filter(
      (item) => (item.kind ?? sourceKindFromPath(item.path)) !== "official-open",
    )
    .map((item) => `${item.label} ${item.path}`)
    .join(" ");

  if (source === "ingested" && /merixa design/i.test(sourceText)) return null;
  if (
    EXAM_SOURCE.test(sourceText) ||
    BLOCKED_SOURCE.test(nonOfficialSourceText)
  ) {
    return null;
  }
  if (EXAM_CONTENT.test(`${card.title} ${card.body.slice(0, 500)}`)) {
    return null;
  }

  const bodies =
    source === "seed"
      ? card.bodies
      : card.bodies.filter((body) => body !== "Merixa");
  if (bodies.length === 0) return null;

  const sources = normalizeSources(card.sources);
  if (sources.length === 0) {
    sources.push({
      label: bodies[0] ?? "Guide",
      path: source === "seed" ? "seed" : "unknown",
      kind: source === "seed" ? "merixa" : "unknown",
    });
  }

  let classification = card.classification;
  if (classification && typeof classification.domain === "string") {
    const domain = normalizeDomain(classification.domain);
    if (domain) {
      classification = { ...classification, domain };
    }
  }

  return withTeachingDefaults({
    ...card,
    bodies,
    workplaceTasks: card.workplaceTasks,
    sources,
    classification,
  });
}

/** Deterministic offline teaching fill so Tutor can demonstrate before cron enrich. */
function withTeachingDefaults(card: GuideCard): GuideCard {
  if (card.teachingSummary && card.workedExample && card.commonMistake) {
    return card;
  }

  const excerpt = card.body.replace(/\s+/g, " ").trim();
  const title = card.title.trim();
  const firstSentence =
    excerpt.match(/[^.!?]+[.!?]?/)?.[0]?.trim().slice(0, 220) ||
    excerpt.slice(0, 220);

  return {
    ...card,
    teachingSummary: card.teachingSummary ?? firstSentence,
    workedExample:
      card.workedExample ??
      `Trace “${title}” to evidence, name the owner, and write the conclusion that would reverse if the evidence changed.`,
    commonMistake:
      card.commonMistake ??
      `Common mistake: naming “${title}” without checking the evidence the source requires.`,
    checkQuestion:
      card.checkQuestion ??
      `Where would “${title}” change a recommendation in your next review?`,
    sourceQuotes: card.sourceQuotes ?? [],
    workplaceTasks: card.workplaceTasks ?? [],
  };
}

export function loadGuideIndex(): GuideIndex {
  const byId = new Map<string, GuideCard>();
  for (const card of readIngestedCards(readIngestedPayload())) {
    const prepared = prepareCard({ card, source: "ingested" });
    if (prepared) byId.set(prepared.id, prepared);
  }
  for (const card of SEED_CARDS) {
    const prepared = prepareCard({ card, source: "seed" });
    if (prepared && !byId.has(prepared.id)) byId.set(prepared.id, prepared);
  }

  return buildGuideIndex(
    [...byId.values()].sort((left, right) =>
      left.title.localeCompare(right.title),
    ),
  );
}

export function getCard({
  index,
  id,
}: {
  index: GuideIndex;
  id: string;
}): GuideCard | undefined {
  return index.cards.find((card) => card.id === id);
}
