import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Resumable terminology learner.
 *
 * Sources:
 * - cached public professional-body pages
 * - cataloged local books/documents
 *
 * Each term is extracted from one bounded source excerpt. A separate OpenAI
 * call verifies the example against that same excerpt. Only verified terms
 * with an exact evidence quote are published.
 *
 * Usage:
 *   npm run library:terms
 *   npm run library:terms -- --limit=12 --terms=6
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  quarantineReason,
  isFinanceSource,
} from "../lib/finance-corpus-filter.mjs";
import {
  classifyResource,
  taxonomyTags,
} from "../lib/practitioner-taxonomy.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import {
  PROFESSIONAL_BODIES,
  sustainingReferences,
} from "../lib/professional-bodies.mjs";
import { distinctEvidenceQuotes } from "../lib/evidence-quotes.mjs";
import {
  hashId,
  normalizeWhitespace,
  parseCacheFile,
  slugify,
} from "../lib/source-study.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CACHE_DIR = join(CONTENT_DIR, "raw-cache");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const CATALOG_PATH = join(PIPELINE_DIR, "catalog.json");
const STATE_PATH = join(PIPELINE_DIR, "terminology-state.json");
const REPORT_PATH = join(PIPELINE_DIR, "terminology-report.json");

const EXCERPT_CHARS = 5_500;
const MIN_EXCERPT_CHARS = 600;
const DEFAULT_JOB_LIMIT = 8;
const DEFAULT_TERMS_PER_JOB = 6;
const NON_PRACTITIONER_TERM =
  /\b(exam|candidate|student|qualification|certification|learning partner|tuition|approved employer|membership|career|job board|webinar|conference|event|course|enrol|enroll)\b/i;
const NON_TERMINOLOGY_TERM =
  /^(?:associate director|organizational restructuring input|organizational change training seminars)$/i;
const TECHNICAL_OFFICIAL_PAGE =
  /\b(standard|reporting|insight|research|resource|policy|governance|risk|audit|sustainability)\b/i;

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function parsePositiveFlag(argv, name, fallback, ceiling) {
  const flag = argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!flag) return fallback;
  const value = Number(flag.split("=")[1]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.min(Math.floor(value), ceiling);
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function digest(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function normalizeForMatch(value) {
  return normalizeWhitespace(String(value || ""))
    .toLowerCase()
    .replace(/[“”"'’‘]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exactQuoteFound(quote, excerpt) {
  const needle = normalizeForMatch(quote);
  const haystack = normalizeForMatch(excerpt);
  return needle.length >= 28 && haystack.includes(needle);
}

function hasUnsupportedStandard(value, excerpt) {
  const ids =
    String(value || "").match(/\b(?:IFRS|IAS|IFRIC|SIC|FRS)\s*\d+[A-Z]?\b/gi) ??
    [];
  const haystack = normalizeForMatch(excerpt);
  return ids.some((id) => !haystack.includes(normalizeForMatch(id)));
}

function parseMeta(raw) {
  if (!raw.startsWith("@@META::")) return {};
  const end = raw.indexOf("\n\n");
  const metaText = end === -1 ? raw.slice(8).split("\n")[0] : raw.slice(8, end);
  try {
    const value = JSON.parse(metaText);
    return typeof value === "object" && value !== null ? value : {};
  } catch {
    return {};
  }
}

function splitExcerpts(text) {
  const cleaned = normalizeWhitespace(text);
  const excerpts = [];
  for (let start = 0; start < cleaned.length; start += EXCERPT_CHARS) {
    const excerpt = cleaned.slice(start, start + EXCERPT_CHARS).trim();
    if (excerpt.length >= MIN_EXCERPT_CHARS) excerpts.push(excerpt);
  }
  return excerpts;
}

function sourceFromCache(name, catalogEntry) {
  const path = join(CACHE_DIR, name);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const parsed = parseCacheFile(raw);
  const meta = parseMeta(raw);
  const isOfficial =
    name.startsWith("official-") || meta.kind === "official-open";
  const bodyId =
    typeof meta.body === "string" && PROFESSIONAL_BODIES[meta.body]
      ? meta.body
      : null;

  return {
    id: catalogEntry?.id ?? `cache-${digest(name)}`,
    cacheFile: name,
    sourcePath:
      typeof meta.source === "string"
        ? meta.source
        : catalogEntry?.source ?? parsed.source,
    label:
      typeof meta.titleHint === "string"
        ? meta.titleHint
        : catalogEntry?.label ?? parsed.titleHint,
    text: parsed.text,
    kind: isOfficial ? "official-open" : catalogEntry?.kind ?? "unknown",
    bodyId,
    bodies: bodyId
      ? [bodyId]
      : (catalogEntry?.bodies ?? []).filter(
          (id) => id === "Merixa" || Boolean(PROFESSIONAL_BODIES[id]),
        ),
    official: isOfficial,
  };
}

function domainPriority(sourcePath, label) {
  const hay = `${sourcePath} ${label}`.toLowerCase();
  if (/\bcoso\b|\binternal control\b|\bcontrol environment\b/.test(hay)) return 0;
  if (/\baudit\b/.test(hay)) return 0;
  if (/\brisk\b|\bfrm\b|\bgarp\b/.test(hay)) return 1;
  if (/\bifrs\b|\bias\b|\bfrc\b|\bfrs\b/.test(hay)) return 2;
  if (/\bfinancial management\b|\bcfa\b|\bvaluation\b|\btreasury\b/.test(hay)) {
    return 3;
  }
  if (/\bcontrol\b|\bgovernance\b|\binternal audit\b/.test(hay)) return 4;
  if (/\bfinancial reporting\b/.test(hay)) return 5;
  if (/\bmanagement reporting\b/.test(hay)) return 6;
  return 7;
}

function buildJobs({ catalog, processed, priorityOnly = false, frmOnly = false, cfaOnly = false, crmaOnly = false, cosoOnly = false }) {
  const jobs = [];
  const catalogByCache = new Map(
    (catalog?.entries ?? [])
      .filter((entry) => entry.status === "cataloged" && entry.cacheFile)
      .map((entry) => [entry.cacheFile, entry]),
  );

  const cacheNames = readdirSync(CACHE_DIR)
    .filter((name) => name.endsWith(".txt"))
    .filter(
      (name) =>
        name.startsWith("official-") || catalogByCache.has(name),
    );

  for (const name of cacheNames) {
    const source = sourceFromCache(name, catalogByCache.get(name));
    if (!source) continue;
    if (!source.official && !isFinanceSource(source)) continue;
    if (
      source.official &&
      (!TECHNICAL_OFFICIAL_PAGE.test(
        `${source.label} ${source.sourcePath}`,
      ) ||
        NON_PRACTITIONER_TERM.test(`${source.label} ${source.sourcePath}`))
    ) {
      continue;
    }
    const priority = domainPriority(source.sourcePath, source.label);
    if (priorityOnly && priority > 4) continue;
    if (
      frmOnly &&
      !/\bfrm\b|\bgarp\b|\brisk management\b|\bvalue at risk\b|\bvar\b/i.test(
        `${source.sourcePath} ${source.label} ${source.text.slice(0, 2000)}`,
      )
    ) {
      continue;
    }
    if (
      cfaOnly &&
      !/\bcfa\b|\bcfainstitute\b|\bfinancial analysis\b|\bvaluation\b|\bequity research\b|\bportfolio management\b/i.test(
        `${source.sourcePath} ${source.label} ${source.text.slice(0, 2000)}`,
      )
    ) {
      continue;
    }
    if (
      crmaOnly &&
      !/\bcrma\b|\biia\b|\binternal audit\b|\brisk management assurance\b|\bthree lines\b|\bippf\b/i.test(
        `${source.sourcePath} ${source.label} ${source.text.slice(0, 2000)}`,
      )
    ) {
      continue;
    }
    if (
      cosoOnly &&
      !/\bcoso\b|\binternal control\b|\bcontrol environment\b|\brisk assessment\b|\bcontrol activit|\bmonitoring activit|\bentity-level control|\bsox\b|\brcm\b|\brisk and control matrix/i.test(
        `${source.sourcePath} ${source.label} ${source.text.slice(0, 2000)}`,
      )
    ) {
      continue;
    }
    const excerpts = splitExcerpts(source.text);
    for (const [index, excerpt] of excerpts.entries()) {
      const jobId = `${source.id}:${index}:${digest(excerpt)}`;
      if (processed.has(jobId)) continue;
      jobs.push({
        jobId,
        source,
        excerpt,
        excerptIndex: index,
        priority,
      });
    }
  }

  const byPriorityThenChunk = (left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (left.excerptIndex !== right.excerptIndex) {
      return left.excerptIndex - right.excerptIndex;
    }
    return left.source.label.localeCompare(right.source.label);
  };
  const officialJobs = jobs
    .filter((job) => job.source.official)
    .sort(byPriorityThenChunk);
  const bookJobs = jobs
    .filter((job) => !job.source.official)
    .sort(byPriorityThenChunk);
  const interleaved = [];
  const length = Math.max(officialJobs.length, bookJobs.length);
  for (let index = 0; index < length; index += 1) {
    if (officialJobs[index]) interleaved.push(officialJobs[index]);
    if (bookJobs[index]) interleaved.push(bookJobs[index]);
  }
  return interleaved;
}

async function openAiJson({ system, user, attempts = 5 }) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  const baseUrl = (
    process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  let lastError = "unknown";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(60_000),
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
    } catch (error) {
      lastError = `network:${error?.message || "failed"}`;
      await sleep(2_000 * (attempt + 1));
      continue;
    }

    if (response.status === 429) {
      lastError = "rate-limit";
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1_000, 60_000)
          : Math.min(5_000 * (attempt + 1), 30_000),
      );
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI ${response.status}: ${body.slice(0, 160)}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      lastError = "empty-response";
      continue;
    }
    try {
      return { value: JSON.parse(content), model };
    } catch {
      lastError = "invalid-json";
    }
  }

  throw new Error(`OpenAI failed after retries: ${lastError}`);
}

function isTermCandidate(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.term === "string" &&
    typeof value.definition === "string" &&
    typeof value.example === "string" &&
    typeof value.trap === "string" &&
    typeof value.evidenceQuote === "string"
  );
}

function sanitizeCandidates(value, excerpt, maximum) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("terms" in value) ||
    !Array.isArray(value.terms)
  ) {
    return [];
  }

  return value.terms
    .filter(isTermCandidate)
    .map((term) => ({
      term: normalizeWhitespace(term.term).slice(0, 100),
      definition: normalizeWhitespace(term.definition).slice(0, 360),
      example: normalizeWhitespace(term.example).slice(0, 420),
      trap: normalizeWhitespace(term.trap).slice(0, 260),
      evidenceQuote: normalizeWhitespace(term.evidenceQuote).slice(0, 280),
    }))
    .filter(
      (term) =>
        term.term.length >= 3 &&
        term.definition.length >= 35 &&
        term.example.length >= 30 &&
        !NON_PRACTITIONER_TERM.test(
          `${term.term} ${term.definition} ${term.example}`,
        ) &&
        !NON_TERMINOLOGY_TERM.test(term.term) &&
        exactQuoteFound(term.evidenceQuote, excerpt) &&
        !hasUnsupportedStandard(
          `${term.definition} ${term.example} ${term.trap}`,
          excerpt,
        ),
    )
    .slice(0, maximum);
}

async function extractTerms(job, maximum) {
  const sourceLabel = job.source.label;
  const bodyName = job.source.bodyId
    ? PROFESSIONAL_BODIES[job.source.bodyId]?.name
    : null;
  const context = bodyName
    ? `Official body: ${bodyName}`
    : "Local practitioner book/document";

  return openAiJson({
    system: `Extract professional terminology from source text. Return JSON only.
Return {"terms":[{"term":"...","definition":"...","example":"...","trap":"...","evidenceQuote":"..."}]}.
Rules:
- Extract only terms explicitly supported by the excerpt.
- Definition: one plain sentence, at most 35 words.
- Example: one concrete workplace action or decision, at most 45 words.
- Trap: one short misuse, at most 28 words.
- evidenceQuote: exact consecutive words copied from the excerpt, 10-30 words.
- Do not copy long passages. Do not add standard numbers absent from the excerpt.
- No exam language, introductions, body-name promotion, or duplicate wording.
- A term must be an established, transferable professional concept.
- Reject job titles, personal names, source-specific initiatives, generic actions, and phrases invented from nearby sentence wording.
- Prefer technical nouns a practitioner would search for.`,
    user: `${context}
Source: ${sourceLabel}
Maximum terms: ${maximum}

EXCERPT
${job.excerpt}`,
  });
}

function isVerificationResult(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.term === "string" &&
    (value.status === "verified" || value.status === "rejected") &&
    typeof value.reason === "string"
  );
}

async function verifyExamples(job, candidates) {
  const compactCandidates = candidates.map((candidate) => ({
    term: candidate.term,
    definition: candidate.definition,
    example: candidate.example,
  }));

  const result = await openAiJson({
    system: `Verify practitioner examples against source evidence. Return JSON only.
Return {"results":[{"term":"...","status":"verified|rejected","reason":"..."}]}.
Verify only when the example:
1. follows from the excerpt and definition,
2. is realistic and concrete,
3. adds no unsupported amount, threshold, formula, standard number, or obligation,
4. demonstrates the named term rather than a nearby topic.
5. uses an established professional term, not a job title, generic action, or source-specific label.
Reject on uncertainty. Keep each reason under 20 words.`,
    user: `SOURCE EXCERPT
${job.excerpt}

CANDIDATES
${JSON.stringify(compactCandidates)}`,
  });

  const values =
    typeof result.value === "object" &&
    result.value !== null &&
    "results" in result.value &&
    Array.isArray(result.value.results)
      ? result.value.results.filter(isVerificationResult)
      : [];
  const byTerm = new Map(
    values.map((value) => [normalizeForMatch(value.term), value]),
  );

  return candidates.map((candidate) => {
    const verification = byTerm.get(normalizeForMatch(candidate.term));
    return {
      candidate,
      verification: verification
        ? {
            status: verification.status,
            reason: normalizeWhitespace(verification.reason).slice(0, 180),
            verifiedAt: new Date().toISOString(),
            model: result.model,
          }
        : {
            status: "rejected",
            reason: "Verifier returned no matching result.",
            verifiedAt: new Date().toISOString(),
            model: result.model,
          },
    };
  });
}

function cardFromVerified({ job, candidate, verification }) {
  const source = job.source;
  const classification = classifyResource({
    sourcePath: source.sourcePath,
    title: candidate.term,
    text: `${candidate.definition}\n${job.excerpt.slice(0, 2_000)}`,
  });
  const bodies = [
    ...new Set([
      ...source.bodies,
      ...classification.bodies.filter((id) => Boolean(PROFESSIONAL_BODIES[id])),
    ]),
  ].slice(0, 5);
  const sourceKind = source.official
    ? "official-open"
    : source.kind === "merixa"
      ? "merixa"
      : "licensed";
  const officialReferences = sustainingReferences({
    domain: classification.domain,
    topic: classification.topic,
    bodies,
  });
  const id = `${slugify(candidate.term)}-${hashId([
    source.sourcePath,
    candidate.term,
    candidate.evidenceQuote,
  ])}`;

  return {
    id,
    title: candidate.term,
    body: candidate.definition,
    bodies: bodies.length > 0 ? bodies : ["Merixa"],
    tags: taxonomyTags(
      classification,
      `${candidate.term} ${candidate.definition}`,
    ),
    classification: {
      domain: classification.domain,
      topic: classification.topic,
      contentType: "definition",
      technicalLevel: classification.technicalLevel,
      confidence: Number(Math.max(0.82, classification.confidence).toFixed(2)),
    },
    workplaceTasks: [],
    sources: [
      {
        label: source.label,
        path: source.sourcePath,
        kind: sourceKind,
        ...(source.bodyId ? { body: source.bodyId } : {}),
      },
      ...officialReferences.map((reference) => ({
        label: reference.label,
        path: reference.url,
        kind: "official-open",
        body: reference.body,
      })),
    ].slice(0, 6),
    officialReferences,
    teachingSummary: candidate.definition,
    workedExample: candidate.example,
    exampleVerification: verification,
    commonMistake: candidate.trap,
    checkQuestion: `Where would “${candidate.term.slice(0, 65)}” change your decision?`,
    sourceQuotes: [],
    editorialStatus: "model-reviewed",
    qualityScore: 0.9,
    enrichedAt: new Date().toISOString(),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const jobLimit = parsePositiveFlag(
    argv,
    "limit",
    DEFAULT_JOB_LIMIT,
    100,
  );
  const termsPerJob = parsePositiveFlag(
    argv,
    "terms",
    DEFAULT_TERMS_PER_JOB,
    12,
  );
  const priorityOnly = argv.includes("--priority-domains");
  const frmOnly = argv.includes("--frm-only");
  const cfaOnly = argv.includes("--cfa-only");
  const crmaOnly = argv.includes("--crma-only");
  const cosoOnly = argv.includes("--coso-only");
  const catalog = readJson(CATALOG_PATH, { entries: [] });
  const index = readJson(INDEX_PATH, { version: 1, cards: [], chunks: [] });
  const state = readJson(STATE_PATH, {
    version: 1,
    processedJobs: [],
    discoveredTerms: 0,
    publishedTerms: 0,
  });
  const processed = new Set(state.processedJobs ?? []);
  const jobs = buildJobs({ catalog, processed, priorityOnly, frmOnly, cfaOnly, crmaOnly, cosoOnly }).slice(
    0,
    jobLimit,
  );
  const retainedCards = (index.cards ?? []).filter(
    (card) =>
      !(
        card.exampleVerification &&
        (NON_PRACTITIONER_TERM.test(
          `${card.title} ${card.teachingSummary ?? ""} ${card.workedExample ?? ""}`,
        ) ||
          NON_TERMINOLOGY_TERM.test(card.title))
      ),
  );
  const existingTitles = new Set(
    retainedCards.map((card) => normalizeForMatch(card.title)),
  );
  const byId = new Map(retainedCards.map((card) => [card.id, card]));
  const report = {
    generatedAt: new Date().toISOString(),
    jobsConsidered: jobs.length,
    jobsCompleted: 0,
    officialJobs: 0,
    bookJobs: 0,
    extracted: 0,
    verified: 0,
    rejected: 0,
    duplicates: 0,
    removedNonPractitioner: (index.cards?.length ?? 0) - retainedCards.length,
    errors: [],
    addedCardIds: [],
  };

  mkdirSync(CORPUS_DIR, { recursive: true });
  mkdirSync(PIPELINE_DIR, { recursive: true });

  for (const [jobIndex, job] of jobs.entries()) {
    process.stdout.write(
      `terms ${jobIndex + 1}/${jobs.length}: ${job.source.label.slice(0, 60)}\n`,
    );
    try {
      const extracted = await extractTerms(job, termsPerJob);
      const candidates = sanitizeCandidates(
        extracted.value,
        job.excerpt,
        termsPerJob,
      ).filter((candidate) => {
        const key = normalizeForMatch(candidate.term);
        if (existingTitles.has(key)) {
          report.duplicates += 1;
          return false;
        }
        return true;
      });
      report.extracted += candidates.length;

      const verified = await verifyExamples(job, candidates);
      for (const item of verified) {
        if (item.verification.status !== "verified") {
          report.rejected += 1;
          continue;
        }
        const card = cardFromVerified({
          job,
          candidate: item.candidate,
          verification: item.verification,
        });
        if (quarantineReason(card)) {
          report.rejected += 1;
          continue;
        }
        existingTitles.add(normalizeForMatch(card.title));
        upsertLibraryCard(byId, card);
        writeFileSync(
          join(CORPUS_DIR, `${card.id}.json`),
          `${JSON.stringify(card, null, 2)}\n`,
          "utf8",
        );
        report.verified += 1;
        report.addedCardIds.push(card.id);
      }

      processed.add(job.jobId);
      report.jobsCompleted += 1;
      if (job.source.official) report.officialJobs += 1;
      else report.bookJobs += 1;
    } catch (error) {
      report.errors.push({
        jobId: job.jobId,
        source: job.source.label,
        reason: String(error?.message || error).slice(0, 240),
      });
    }

    const cards = [...byId.values()].sort((left, right) =>
      String(left.title).localeCompare(String(right.title)),
    );
    atomicWriteFile(
      INDEX_PATH,
      `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
      "utf8",
    );
    writeFileSync(
      STATE_PATH,
      `${JSON.stringify(
        {
          version: 1,
          updatedAt: new Date().toISOString(),
          processedJobs: [...processed],
          discoveredTerms:
            Number(state.discoveredTerms || 0) + report.extracted,
          publishedTerms:
            Number(state.publishedTerms || 0) + report.verified,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `Terminology complete: jobs=${report.jobsCompleted}/${jobs.length} extracted=${report.extracted} verified=${report.verified} rejected=${report.rejected} duplicates=${report.duplicates} errors=${report.errors.length}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
