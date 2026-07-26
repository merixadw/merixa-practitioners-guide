export type BodyId =
  | "IFRS"
  | "FRC"
  | "CFA"
  | "FRM"
  | "IIA"
  | "CRMA"
  | "ACCA"
  | "CGMA"
  | "COSO"
  | "GARP"
  | "Merixa";

export type WorkplaceTask = {
  id: string;
  label: string;
  /** Deep link or external URL when available */
  href?: string;
};

export type GuideSourceKind =
  | "merixa"
  | "official-open"
  | "licensed"
  | "web"
  | "unknown";

export type GuideSource = {
  label: string;
  path: string;
  kind?: GuideSourceKind;
  body?: BodyId | string;
};

export type OfficialReference = {
  body: string;
  label: string;
  url: string;
  kind: "official-open";
};

export type SourceQuote = {
  text: string;
  sourcePath?: string;
};

export type ExampleVerification = {
  status: "verified" | "rejected" | "needs-human" | "pending";
  reason: string;
  verifiedAt: string;
  model: string;
};

export type GuideDomain =
  | "Financial reporting"
  | "Management reporting"
  | "Financial management"
  | "Risk management"
  | "Audit and assurance"
  | "Governance and controls"
  | "Strategy and performance"
  | "Sustainability"
  | "Project delivery";

export type GuideClassification = {
  domain: GuideDomain;
  topic: string;
  contentType:
    | "definition"
    | "requirement"
    | "procedure"
    | "control"
    | "disclosure"
    | "analysis"
    | "guidance"
    | "formula";
  technicalLevel: "practitioner" | "advanced";
  confidence: number;
};

export type GuideCard = {
  id: string;
  title: string;
  body: string;
  bodies: BodyId[];
  tags: string[];
  workplaceTasks: WorkplaceTask[];
  sources: GuideSource[];
  /** Living professional-body website references that sustain the concept */
  officialReferences?: OfficialReference[];
  sustainedAt?: string;
  /** Merixa ML teaching rewrite grounded in sources */
  teachingSummary?: string;
  workedExample?: string;
  /** Practitioner formula / calculation when the concept is quantitative */
  formula?: string;
  exampleVerification?: ExampleVerification;
  commonMistake?: string;
  checkQuestion?: string;
  /** What breaks in the real world if this concept is ignored or mishandled */
  implicationIfIgnored?: string;
  /** Concrete workplace signal that this concept is now in play */
  realWorldTrigger?: string;
  /** Typed links to related Guide cards */
  relatedConcepts?: ConceptRelation[];
  sourceQuotes?: SourceQuote[];
  /** OpenAI live enrich stamp only — never set by offline/agent/codex writers */
  enrichedAt?: string;
  /** Offline deepen stamp (codex-local / formula / spine fill) */
  locallyDeepenedAt?: string;
  /** Agent-authored shelf-fill stamp */
  agentAuthoredAt?: string;
  /** Codex deepen stamp when distinct from locallyDeepenedAt */
  codexDeepenedAt?: string;
  /** Formula-pack matcher stamp */
  formulaPackAt?: string;
  /**
   * Provenance bucket for UI + diagnostics.
   * openai-live | agent-authored | codex-local | formula-pack | registry | unknown
   */
  sourceProvenance?:
    | "openai-live"
    | "agent-authored"
    | "codex-local"
    | "formula-pack"
    | "registry"
    | "unknown";
  classification?: GuideClassification;
  editorialStatus?:
    | "machine-reviewed"
    | "model-reviewed"
    | "editor-approved"
    | "demoted"
    | "quarantined";
  qualityScore?: number;
  /** Alternate titles merged into this canonical card */
  aliases?: string[];
  /** Card IDs merged into this canonical card */
  mergedFrom?: string[];
  mergedAt?: string;
};

export type ConceptRelationKind =
  | "prerequisite"
  | "consequence"
  | "related";

export type ConceptRelation = {
  id: string;
  kind: ConceptRelationKind;
  label?: string;
};

export type GuideChunk = {
  id: string;
  cardId: string;
  title: string;
  text: string;
  bodies: BodyId[];
  tags: string[];
  kind?:
    | "body"
    | "example"
    | "mistake"
    | "summary"
    | "implication"
    | "trigger";
};

export type GuideIndex = {
  version: 1;
  generatedAt: string;
  cards: GuideCard[];
  chunks: GuideChunk[];
};

/** Lightweight Library row — browse / Show more without full bodies. */
export type CatalogCard = {
  id: string;
  title: string;
  bodies: BodyId[];
  tags: string[];
  teaser: string;
  classification?: GuideClassification;
  qualityScore?: number;
  editorialStatus?: GuideCard["editorialStatus"];
  teachingSummary?: string;
  /** Alternate titles merged into this canonical card — search-matchable */
  aliases?: string[];
};

export type CatalogIndex = {
  version: 1;
  generatedAt: string;
  cards: CatalogCard[];
};

/** List surfaces accept catalog or full cards. */
export type LibraryListCard = CatalogCard | GuideCard;

export type LearningPathStep = {
  id: string;
  title: string;
  summary: string;
  cardId?: string;
  taskLabel?: string;
  href?: string;
  /** E4 orphan-family paths: live (enrichedAt) vs offline deepened. */
  qualityTier?: "live" | "deepened";
};

export type LearningPath = {
  id: string;
  title: string;
  summary: string;
  bodies: BodyId[];
  steps: LearningPathStep[];
  /** E4: path-level tier when all steps share one quality class. */
  qualityTier?: "live" | "deepened" | "mixed";
};

export const BODY_LABELS: Record<BodyId, string> = {
  IFRS: "IFRS",
  FRC: "FRC",
  CFA: "CFA",
  FRM: "FRM",
  IIA: "IIA",
  CRMA: "CRMA",
  ACCA: "ACCA",
  CGMA: "CGMA",
  COSO: "COSO",
  GARP: "GARP",
  Merixa: "Merixa",
};

export const ALL_BODIES: BodyId[] = [
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
];
