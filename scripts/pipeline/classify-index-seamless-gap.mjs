/**
 * Diff content/index.json vs public/corpus/retrieve-index.json and classify
 * every index-only id. Writes content/pipeline/index-seamless-gap-report.json.
 *
 * Usage: node scripts/pipeline/classify-index-seamless-gap.mjs
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const RETRIEVE_PATH = join(ROOT, "public", "corpus", "retrieve-index.json");
const QUARANTINE_DIR = join(ROOT, "content", "corpus-quarantine");
const OUT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "index-seamless-gap-report.json",
);

const BODY_IDS = new Set([
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
]);

const GUIDE_DOMAINS = new Set([
  "Financial reporting",
  "Management reporting",
  "Financial management",
  "Risk management",
  "Audit and assurance",
  "Governance and controls",
  "Strategy and performance",
  "Sustainability",
  "Project delivery",
]);

const DOMAIN_ALIASES = new Set(["Internal control and governance"]);

const SOURCE_KINDS = new Set([
  "merixa",
  "official-open",
  "licensed",
  "web",
  "unknown",
]);

const CONTENT_TYPES = new Set([
  "definition",
  "requirement",
  "procedure",
  "control",
  "disclosure",
  "analysis",
  "guidance",
  "formula",
]);

const EXAM_SOURCE =
  /\b(qbank|q bank|exam|questions?|answers?|mock|revision kit|practice & revision|study session)\b/i;
const EXAM_CONTENT =
  /\b(correct answer|exam technique|marks available|candidate response|practice question|question \d+)\b/i;
const BLOCKED_SOURCE =
  /\b(anna'?s?\s*archive|z-?lib|zlib\.org|libgen|sci-hub|bpp|kaplan|wiley|cia learning system|garp\s*frm|pirate|torrent)\b/i;
const NON_FINANCE_TITLE_RE =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|shop drawings|moh approval|detailed construction|detailed design schedule|install ceramic|install demountable|laminar flow|hepa filter|pneumatic conveying|activity id|leveling concrete|working meeting milestones)\b/i;

/** Primary bucket for plan successMetric rollup. */
const BUCKETS = [
  "inSeamless",
  "quarantined",
  "publishFilterRejected",
  "corrupt",
];

const PRIMARY_PRIORITY = [
  "corrupt_schema",
  "corrupt",
  "invalid_body_id",
  "invalid_classification",
  "invalid_workplaceTasks",
  "invalid_sources",
  "invalid_source_kind",
  "merixa_design_source",
  "exam_source",
  "blocked_source",
  "exam_content",
  "editorial_quarantined",
  "non_finance_title",
  "merixa_only_bodies",
  "in_corpus_quarantine_dir",
  "unexplained_publish_drop",
];

function sourceKindFromPath(path) {
  if (/merixa/i.test(path) || path === "seed") return "merixa";
  if (
    /\b(ifrs foundation|iasb|ifrs\.org|frc\.org|ias plus|official)\b/i.test(path)
  ) {
    return "official-open";
  }
  return "unknown";
}

function isOptionalString(value) {
  return value === undefined || typeof value === "string";
}

function isWorkplaceTask(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    (value.href === undefined || typeof value.href === "string")
  );
}

function isGuideSource(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.label === "string" &&
    typeof value.path === "string"
  );
}

function schemaFailures(card) {
  const fails = [];
  if (!card || typeof card !== "object") return ["corrupt"];
  if (
    typeof card.id !== "string" ||
    typeof card.title !== "string" ||
    typeof card.body !== "string"
  ) {
    return ["corrupt_schema"];
  }
  if (!Array.isArray(card.bodies) || !card.bodies.every((b) => typeof b === "string")) {
    fails.push("corrupt_schema");
  } else if (card.bodies.some((b) => !BODY_IDS.has(b))) {
    fails.push("invalid_body_id");
  }
  if (!Array.isArray(card.tags) || !card.tags.every((t) => typeof t === "string")) {
    fails.push("corrupt_schema");
  }
  if (!Array.isArray(card.workplaceTasks)) {
    fails.push("invalid_workplaceTasks");
  } else if (!card.workplaceTasks.every(isWorkplaceTask)) {
    fails.push("invalid_workplaceTasks");
  }
  if (!Array.isArray(card.sources)) {
    fails.push("invalid_sources");
  } else if (!card.sources.every(isGuideSource)) {
    fails.push("invalid_sources");
  } else if (
    card.sources.some(
      (s) => s.kind !== undefined && !SOURCE_KINDS.has(s.kind),
    )
  ) {
    fails.push("invalid_source_kind");
  }
  if (!isOptionalString(card.teachingSummary)) fails.push("corrupt_schema");
  if (!isOptionalString(card.formula)) fails.push("corrupt_schema");
  if (!isOptionalString(card.workedExample)) fails.push("corrupt_schema");
  if (!isOptionalString(card.commonMistake)) fails.push("corrupt_schema");
  if (!isOptionalString(card.checkQuestion)) fails.push("corrupt_schema");
  if (!isOptionalString(card.enrichedAt)) fails.push("corrupt_schema");
  if (card.classification !== undefined) {
    const c = card.classification;
    const domainOk =
      typeof c?.domain === "string" &&
      (GUIDE_DOMAINS.has(c.domain) || DOMAIN_ALIASES.has(c.domain));
    const ok =
      typeof c === "object" &&
      c !== null &&
      domainOk &&
      typeof c.topic === "string" &&
      CONTENT_TYPES.has(c.contentType) &&
      (c.technicalLevel === "practitioner" ||
        c.technicalLevel === "advanced") &&
      typeof c.confidence === "number" &&
      Number.isFinite(c.confidence);
    if (!ok) fails.push("invalid_classification");
  }
  if (
    card.sourceQuotes !== undefined &&
    !(
      Array.isArray(card.sourceQuotes) &&
      card.sourceQuotes.every(
        (q) =>
          typeof q === "object" &&
          q !== null &&
          typeof q.text === "string" &&
          (q.sourcePath === undefined || typeof q.sourcePath === "string"),
      )
    )
  ) {
    fails.push("corrupt_schema");
  }
  return fails;
}

function classifyCard(card, quarantineIds) {
  const reasons = schemaFailures(card);
  if (reasons.includes("corrupt") || reasons.includes("corrupt_schema")) {
    return reasons;
  }

  const sourceText = card.sources
    .map((item) => `${item.label} ${item.path}`)
    .join(" ");
  const nonOfficialSourceText = card.sources
    .filter(
      (item) =>
        (item.kind ?? sourceKindFromPath(item.path)) !== "official-open",
    )
    .map((item) => `${item.label} ${item.path}`)
    .join(" ");

  if (/merixa design/i.test(sourceText)) reasons.push("merixa_design_source");
  if (EXAM_SOURCE.test(sourceText)) reasons.push("exam_source");
  if (BLOCKED_SOURCE.test(nonOfficialSourceText)) {
    reasons.push("blocked_source");
  }
  if (EXAM_CONTENT.test(`${card.title} ${card.body.slice(0, 500)}`)) {
    reasons.push("exam_content");
  }

  const bodies = card.bodies.filter((body) => body !== "Merixa");
  if (bodies.length === 0) reasons.push("merixa_only_bodies");

  if (
    card.editorialStatus === "quarantined" ||
    (card.tags || []).includes("quarantined")
  ) {
    reasons.push("editorial_quarantined");
  }
  if (NON_FINANCE_TITLE_RE.test(card.title || "")) {
    reasons.push("non_finance_title");
  }
  if (quarantineIds.has(card.id)) reasons.push("in_corpus_quarantine_dir");

  if (reasons.length === 0) reasons.push("unexplained_publish_drop");
  return reasons;
}

function primaryReason(reasons) {
  return PRIMARY_PRIORITY.find((p) => reasons.includes(p)) || reasons[0];
}

function bucketFor(primary) {
  if (
    primary === "corrupt" ||
    primary === "corrupt_schema" ||
    primary === "invalid_body_id" ||
    primary === "invalid_classification" ||
    primary === "invalid_workplaceTasks" ||
    primary === "invalid_sources" ||
    primary === "invalid_source_kind"
  ) {
    return "corrupt";
  }
  if (
    primary === "editorial_quarantined" ||
    primary === "non_finance_title" ||
    primary === "in_corpus_quarantine_dir"
  ) {
    return "quarantined";
  }
  return "publishFilterRejected";
}

function loadQuarantineIds() {
  if (!existsSync(QUARANTINE_DIR)) return new Set();
  return new Set(
    readdirSync(QUARANTINE_DIR)
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/i, "")),
  );
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  if (!existsSync(RETRIEVE_PATH)) {
    throw new Error(
      "Missing public/corpus/retrieve-index.json — run npm run library:seamless first",
    );
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const retrieve = JSON.parse(readFileSync(RETRIEVE_PATH, "utf8"));
  const seamlessIds = new Set((retrieve.cards || []).map((c) => c.id));
  const quarantineIds = loadQuarantineIds();

  const byPrimary = {};
  const byBucket = {
    inSeamless: seamlessIds.size,
    quarantined: 0,
    publishFilterRejected: 0,
    corrupt: 0,
  };
  const samplesByPrimary = {};
  const unexplained = [];
  const gapIds = [];

  for (const card of index.cards || []) {
    if (seamlessIds.has(card.id)) continue;
    gapIds.push(card.id);
    const reasons = classifyCard(card, quarantineIds);
    const primary = primaryReason(reasons);
    const bucket = bucketFor(primary);
    byPrimary[primary] = (byPrimary[primary] || 0) + 1;
    byBucket[bucket] += 1;
    if (!samplesByPrimary[primary]) samplesByPrimary[primary] = [];
    if (samplesByPrimary[primary].length < 8) {
      samplesByPrimary[primary].push({
        id: card.id,
        title: card.title,
        bodies: card.bodies,
        reasons,
      });
    }
    if (primary === "unexplained_publish_drop") {
      unexplained.push({
        id: card.id,
        title: card.title,
        bodies: card.bodies,
        tags: (card.tags || []).slice(0, 6),
      });
    }
  }

  const gap = gapIds.length;
  const classifiedSum =
    byBucket.quarantined + byBucket.publishFilterRejected + byBucket.corrupt;
  const fullyClassified =
    gap === classifiedSum && (byPrimary.unexplained_publish_drop || 0) === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    indexCards: (index.cards || []).length,
    seamlessCards: seamlessIds.size,
    indexSeamlessGap: gap,
    buckets: byBucket,
    bucketSumExcludingInSeamless: classifiedSum,
    fullyClassified,
    unexplainedCount: unexplained.length,
    byPrimaryReason: byPrimary,
    samplesByPrimary,
    unexplainedSample: unexplained.slice(0, 40),
    successMetric: {
      gapAtMost50: gap <= 50,
      fullyClassified,
      planBuckets: BUCKETS,
      note: "Success when gap≤50 OR buckets {quarantined,publishFilterRejected,corrupt} sum to gap with unexplained=0",
    },
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: "content/pipeline/index-seamless-gap-report.json",
        indexSeamlessGap: gap,
        fullyClassified,
        buckets: byBucket,
        byPrimaryReason: byPrimary,
        unexplainedCount: unexplained.length,
      },
      null,
      2,
    ),
  );
}

main();
