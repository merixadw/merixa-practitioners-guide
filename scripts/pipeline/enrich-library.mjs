/**
 * Unified OpenAI enrichment: definitions, examples, and traps in one pass.
 * Resumable; processes the full library until depth thresholds are met.
 *
 * Usage:
 *   npm run library:enrich-all
 *   npm run library:enrich -- --path-first --path-only --limit=71
 *   npm run library:enrich:path-first -- --limit=71
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeUniqueBody,
  exampleNeedsRewrite,
  needsTopicRelevanceRewrite,
  textOverlapRatio,
  topicOpeningRelevance,
  topicRelevanceRatio,
} from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { pathCardIds } from "../lib/path-sources.mjs";
import { getPathCardTiers } from "../lib/path-tiers.mjs";
import {
  JOBS,
  canAfford,
  extractUsageTokens,
  formatBudgetLine,
  loadBudgetState,
  maxCallsAllowed,
  recordSpend,
  budgetSnapshot,
} from "../lib/token-budget.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const STATE_PATH = join(PIPELINE_DIR, "enrich-library-state.json");
const REPORT_PATH = join(PIPELINE_DIR, "enrich-library-report.json");
const ENRICH_JOB = JOBS.enrich;

const MIN_DEFINITION = 280;
const MIN_EXAMPLE = 450;
const MIN_TRAP = 150;
const MIN_IMPLICATION = 80;
const MIN_TRIGGER = 40;

function parseLimit(argv, fallback = 200) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return fallback;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), 500)
    : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function needsEnrichment(card) {
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  const trap = String(card.commonMistake || "");
  const implication = String(card.implicationIfIgnored || "");
  const trigger = String(card.realWorldTrigger || "");
  return (
    definition.length < MIN_DEFINITION ||
    example.length < MIN_EXAMPLE ||
    trap.length < MIN_TRAP ||
    implication.length < MIN_IMPLICATION ||
    trigger.length < MIN_TRIGGER ||
    exampleNeedsRewrite(example, definition) ||
    needsTopicRelevanceRewrite(card)
  );
}

/** Live OpenAI stamp (enrichedAt) — required for liveSharePath/Catalog gates. */
export function needsLiveStamp(card) {
  return !card.enrichedAt;
}

/** Queue for enrich: thin/off-topic content OR missing live stamp. */
export function shouldEnrichCard(card, { pathOnly = false, onPath = false } = {}) {
  if (needsEnrichment(card)) return true;
  if (needsLiveStamp(card) && (!pathOnly || onPath)) return true;
  return false;
}

function cardPriority(card, onPath = false, pathTier = 0) {
  let score = 0;
  if (needsTopicRelevanceRewrite(card)) score += 220;
  if (onPath) score += 140;
  score += pathTier;
  if (card.tags?.includes("fa-encyclopedia")) score += 40;
  if (card.tags?.includes("ma-encyclopedia")) score += 55;
  if (card.tags?.includes("tax-encyclopedia")) score += 60;
  if (card.tags?.includes("ifrs-encyclopedia") || String(card.id || "").startsWith("ifrs-enc-")) {
    score += 55;
  }
  if (card.tags?.includes("frm-encyclopedia")) score += 40;
  if (card.tags?.includes("crma-encyclopedia")) score += 45;
  if (card.tags?.includes("coso-encyclopedia")) score += 50;
  if (card.shelfExpandAt && !card.enrichedAt) score += 70;
  if (card.tags?.includes("demoted") || card.tags?.includes("needs-enrichment")) {
    score += 35;
  }
  if (card.editorialStatus === "demoted") score += 25;
  if (card.tags?.includes("ifrs-ias-path")) score += 30;
  if (card.tags?.includes("domain-spine")) score += 48;
  if (card.tags?.includes("encyclopedia")) score += 20;
  if (card.formula) score += 14;
  if (!card.implicationIfIgnored || !card.realWorldTrigger) score += 32;
  // Prefer spine cards that already have At work + Watch for — fill awareness next.
  if (
    card.tags?.includes("domain-spine") &&
    card.workedExample &&
    card.commonMistake &&
    (!card.implicationIfIgnored || !card.realWorldTrigger)
  ) {
    score += 55;
  }
  if (needsEnrichment(card)) score += 5;
  // Prefer path cards that still lack a live OpenAI stamp (soft-launch liveShare).
  if (onPath && needsLiveStamp(card)) score += 90;
  else if (needsLiveStamp(card)) score += 25;
  score += (card.qualityScore ?? 0.5) * 10;
  if (card.enrichedAt || card.deepenedAt) score -= 15;
  return score;
}

export async function enrichCard(card, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { card: null, error: "no-key", usageTokens: null };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const offTopic = needsTopicRelevanceRewrite(card);
  const definition = offTopic
    ? "(discarded — previous definition was off-topic for this title; rewrite from the title only)"
    : String(card.teachingSummary || card.body || "").slice(0, 1100);
  const formula = card.formula ? `Formula: ${card.formula}` : "";
  const example = offTopic
    ? "(discarded — rewrite a new on-topic example)"
    : String(card.workedExample || "").slice(0, 700);
  const trap = offTopic
    ? "(discarded)"
    : String(card.commonMistake || "").slice(0, 400);
  const topic = card.classification?.topic || card.title;
  const domain = card.classification?.domain || "practitioner";

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model,
        temperature: 0.32,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You expand a practitioner encyclopedia card for finance, audit, and risk professionals across IFRS, FRC, ACCA, CGMA/CIMA, CFA, GARP/FRM, IIA, CRMA, and COSO.
Return JSON only:
{"teachingSummary":"...","technicalDetail":"...","workedExample":"...","commonMistake":"...","checkQuestion":"...","implicationIfIgnored":"...","realWorldTrigger":"...","relatedConceptTitles":["..."],"ok":true}

Pedagogy — Merixa storyline (required on every card)
1. teachingSummary — Definition: 3–5 sentences, precise definition and measurement context (~400–1100 chars). Practitioner depth, not exam tips. MUST define the titled concept only.
2. technicalDetail — optional nuance paragraph (~150–550 chars) on judgement, recognition, measurement, or limits for THIS title. Omit if redundant. MUST stay on the same topic as the title (never paste unrelated IFRS topics).
3. workedExample — Example: 4–7 sentences, concrete workplace scenario with numbers, documents, owners, timing (~500–1200 chars). Must NOT paraphrase the definition.
4. commonMistake — Trap: what teams get wrong if they skimmed the definition (~200–550 chars); contrast with the example.
5. checkQuestion — Check: one practitioner verification question.
6. implicationIfIgnored — Awareness: 2–4 sentences on what breaks in cash, covenants, controls, reporting, or decisions if this is ignored (~120–550 chars).
7. realWorldTrigger — Workplace trigger: one concrete signal that this concept is now in play (document, event, metric, conversation) (~60–220 chars).
8. relatedConceptTitles — optional 0–3 short titles of prerequisite or consequence concepts (no IDs).

Topic fidelity (critical)
- The card TITLE is the source of truth. Every field must be about that exact concept.
- If prior definition/example text is marked discarded or contradicts the title, ignore it completely.
- Do not reuse impairment, goodwill, CGU, deferred tax, leases, revenue, or other foreign topics unless the title itself is about them.
- Example: title "Cash and liquidity management: working-capital" must teach working capital / cash conversion / liquidity — never impairment reversals.

Rules
- Draw on the card’s professional bodies and sources; do not invent standards text.
- If a formula is provided, apply it once with simple numbers in the example.
- No professional body name-dropping. No invented standard paragraph numbers.
- No evidence quotes or source citations.
- implicationIfIgnored must be operational consequences, not exam advice.`,
          },
          {
            role: "user",
            content: `Title: ${card.title}
Domain: ${domain}
Topic: ${topic}
${formula}
Current definition:\n${definition}
Current example:\n${example || "(none)"}
Current trap:\n${trap || "(none)"}
Current implication:\n${offTopic ? "(discarded)" : String(card.implicationIfIgnored || "(none)")}
Current trigger:\n${offTopic ? "(discarded)" : String(card.realWorldTrigger || "(none)")}`,
          },
        ],
      }),
    });
  } catch (error) {
    return { card: null, error: String(error?.message || error), usageTokens: null };
  }

  if (response.status === 429) {
    let detail = "rate-limit";
    try {
      const errBody = await response.json();
      const code = errBody?.error?.code || errBody?.error?.type || "";
      if (
        String(code).includes("insufficient_quota") ||
        String(errBody?.error?.message || "").includes("exceeded your current quota")
      ) {
        detail = "insufficient_quota";
      }
    } catch {
      // keep rate-limit
    }
    return { card: null, error: detail, usageTokens: null };
  }
  if (!response.ok) return { card: null, error: `http-${response.status}`, usageTokens: null };

  let data;
  try {
    data = await response.json();
  } catch {
    return { card: null, error: "response-json-truncated", usageTokens: null };
  }
  const usageTokens = extractUsageTokens(data);
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return { card: null, error: "empty", usageTokens };

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { card: null, error: "invalid-json", usageTokens };
  }

  const teachingSummary = String(parsed.teachingSummary || "").trim();
  const technicalDetail = String(parsed.technicalDetail || "").trim();
  const workedExample = String(parsed.workedExample || "").trim();
  const commonMistake = String(parsed.commonMistake || "").trim();
  const checkQuestion = String(parsed.checkQuestion || card.checkQuestion || "").trim();
  const implicationIfIgnored = String(
    parsed.implicationIfIgnored || card.implicationIfIgnored || "",
  ).trim();
  const realWorldTrigger = String(
    parsed.realWorldTrigger || card.realWorldTrigger || "",
  ).trim();

  if (teachingSummary.length < 200 || workedExample.length < 200) {
    return { card: null, error: "too-short", usageTokens };
  }
  if (topicOpeningRelevance(card.title, teachingSummary) < 0.35) {
    return { card: null, error: "off-topic-definition", usageTokens };
  }
  if (
    technicalDetail &&
    topicOpeningRelevance(card.title, technicalDetail) < 0.25
  ) {
    return { card: null, error: "off-topic-technical", usageTokens };
  }
  if (textOverlapRatio(workedExample, teachingSummary) >= 0.58) {
    return { card: null, error: "example-overlaps-definition", usageTokens };
  }
  if (commonMistake.length < 80) {
    return { card: null, error: "trap-too-short", usageTokens };
  }
  if (implicationIfIgnored.length < MIN_IMPLICATION) {
    return { card: null, error: "implication-too-short", usageTokens };
  }
  if (realWorldTrigger.length < MIN_TRIGGER) {
    return { card: null, error: "trigger-too-short", usageTokens };
  }

  const body = composeUniqueBody({
    definition: teachingSummary,
    formula: card.formula,
    interpretation: technicalDetail,
  });

  const needsHuman = Math.random() < 0.02;
  const exampleVerification = {
    status: needsHuman ? "needs-human" : "verified",
    reason: needsHuman
      ? "Random 2% enrich sample queued for human At-work QA."
      : "Unified library enrichment — definition, example, trap, implication, and trigger.",
    verifiedAt: new Date().toISOString(),
    model,
  };

  if (needsHuman) {
    appendQaQueue({
      cardId: card.id,
      title: card.title,
      workedExample: workedExample.slice(0, 400),
      teachingSummary: teachingSummary.slice(0, 280),
      queuedAt: exampleVerification.verifiedAt,
      model,
    });
  }

  return {
    card: {
      ...card,
      teachingSummary: teachingSummary.slice(0, 1100),
      body: body.slice(0, 2000),
      workedExample: workedExample.slice(0, 1200),
      commonMistake: commonMistake.slice(0, 550),
      checkQuestion: checkQuestion.slice(0, 280),
      implicationIfIgnored: implicationIfIgnored.slice(0, 550),
      realWorldTrigger: realWorldTrigger.slice(0, 220),
      sourceQuotes: [],
      exampleVerification,
      enrichedAt: new Date().toISOString(),
      deepenedAt: new Date().toISOString(),
    },
    error: null,
    usageTokens,
  };
}

function appendQaQueue(entry) {
  const qaPath = join(PIPELINE_DIR, "qa-queue.json");
  let queue = [];
  if (existsSync(qaPath)) {
    try {
      const raw = JSON.parse(readFileSync(qaPath, "utf8"));
      queue = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
    } catch {
      queue = [];
    }
  }
  queue.unshift(entry);
  writeFileSync(
    qaPath,
    `${JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        items: queue.slice(0, 500),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export async function runBatch({ limit, argv }) {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(CORPUS_DIR, { recursive: true });
  mkdirSync(PIPELINE_DIR, { recursive: true });

  const pathFirst = argv?.includes("--path-first");
  const pathOnly = argv?.includes("--path-only");
  const relevanceFirst = argv?.includes("--relevance-first");
  const ignoreBudget = argv?.includes("--ignore-budget");
  const onPathIds = pathCardIds();
  const tiers = getPathCardTiers();

  const { state: budgetState, disabled: budgetDisabled } = loadBudgetState(
    PIPELINE_DIR,
  );
  const budgetOk = ignoreBudget || budgetDisabled;
  let affordable = budgetOk
    ? limit
    : Math.min(limit, maxCallsAllowed(budgetState, ENRICH_JOB));
  if (!budgetOk && affordable <= 0) {
    const snap = budgetSnapshot(PIPELINE_DIR);
    console.log(`enrich-library: budget exhausted — ${formatBudgetLine(snap)}`);
    return {
      generatedAt: new Date().toISOString(),
      batchSize: 0,
      pathFirst,
      pathOnly,
      pathLinkedInBatch: 0,
      updated: 0,
      skipped: 0,
      remaining: 0,
      errors: { "budget-exhausted": 1 },
      budgetStopped: true,
      tokenBudget: snap,
    };
  }

  const state = existsSync(STATE_PATH)
    ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
    : { processedIds: [], totalUpdated: 0, totalSkipped: 0 };
  state.failCounts = state.failCounts || {};

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byId = new Map(cards.map((card) => [card.id, card]));
  const processed = new Set(state.processedIds ?? []);
  // Re-queue cards that still need depth, topic relevance, OR a live stamp.
  for (const card of cards) {
    if (
      shouldEnrichCard(card, {
        pathOnly,
        onPath: onPathIds.has(card.id),
      })
    ) {
      processed.delete(card.id);
    }
  }

  // Cards that repeatedly fail validation (esp. off-topic) monopolize the queue.
  // After FAIL_COOLDOWN attempts, park them so other cards can advance liveShare.
  const FAIL_COOLDOWN = 3;
  const parkedIds = new Set(
    Object.entries(state.failCounts)
      .filter(([, n]) => Number(n) >= FAIL_COOLDOWN)
      .map(([id]) => id),
  );
  if (parkedIds.size > 0) {
    console.log(
      `enrich-library: parking ${parkedIds.size} cards with ≥${FAIL_COOLDOWN} consecutive fails`,
    );
  }

  const allCandidates = cards
    .filter((card) =>
      shouldEnrichCard(card, {
        pathOnly,
        onPath: onPathIds.has(card.id),
      }),
    )
    .filter((card) => !(pathOnly && !onPathIds.has(card.id)))
    .filter((card) => !parkedIds.has(card.id))
    .sort(
      (left, right) =>
        cardPriority(
          right,
          onPathIds.has(right.id),
          tiers.get(right.id) || 0,
        ) -
        cardPriority(
          left,
          onPathIds.has(left.id),
          tiers.get(left.id) || 0,
        ),
    );

  let candidates = allCandidates;
  if (relevanceFirst) {
    const offTopic = allCandidates.filter((card) =>
      needsTopicRelevanceRewrite(card),
    );
    const rest = allCandidates.filter(
      (card) => !needsTopicRelevanceRewrite(card),
    );
    candidates = [...offTopic, ...rest].slice(0, affordable);
  } else if (pathFirst || pathOnly) {
    const pathLinked = allCandidates.filter((card) => onPathIds.has(card.id));
    const rest = pathOnly
      ? []
      : allCandidates.filter((card) => !onPathIds.has(card.id));
    candidates = [...pathLinked, ...rest].slice(0, affordable);
  } else {
    candidates = allCandidates.slice(0, affordable);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    batchSize: candidates.length,
    pathFirst,
    pathOnly,
    relevanceFirst,
    pathLinkedInBatch: candidates.filter((c) => onPathIds.has(c.id)).length,
    relevanceBatch: candidates.filter((c) => needsTopicRelevanceRewrite(c))
      .length,
    updated: 0,
    skipped: 0,
    remaining: cards.filter((c) =>
      shouldEnrichCard(c, { pathOnly, onPath: onPathIds.has(c.id) }),
    ).length,
    pathRemaining: cards.filter(
      (c) =>
        onPathIds.has(c.id) &&
        shouldEnrichCard(c, { pathOnly: true, onPath: true }),
    ).length,
    errors: {},
    budgetCapped: affordable < limit,
    tokensRecorded: 0,
  };

  console.log(
    `enrich-library: batch=${candidates.length} remaining~=${report.remaining} hasKey=${Boolean(process.env.OPENAI_API_KEY)}`,
  );
  console.log(`  ${formatBudgetLine(budgetSnapshot(PIPELINE_DIR))}`);

  for (const [index, card] of candidates.entries()) {
    if (
      !ignoreBudget &&
      !budgetDisabled &&
      !canAfford(loadBudgetState(PIPELINE_DIR).state, ENRICH_JOB)
    ) {
      report.errors["budget-stop"] = (report.errors["budget-stop"] || 0) + 1;
      console.log("enrich-library: stopping — daily token budget reached");
      break;
    }

    process.stdout.write(
      `  ${index + 1}/${candidates.length} ${card.title.slice(0, 50)}…\n`,
    );
    const result = await enrichCard(card, process.env);

    if (result.usageTokens != null || result.card) {
      const recorded = recordSpend(
        PIPELINE_DIR,
        ENRICH_JOB,
        result.usageTokens,
      );
      report.tokensRecorded += recorded.recorded;
    }

    if (!result.card) {
      report.skipped += 1;
      state.totalSkipped += 1;
      const reason = result.error || "unknown";
      report.errors[reason] = (report.errors[reason] || 0) + 1;
      if (
        reason === "off-topic-definition" ||
        reason === "off-topic-technical" ||
        reason === "example-overlaps-definition" ||
        reason === "too-short" ||
        reason === "invalid-json" ||
        reason === "empty"
      ) {
        state.failCounts[card.id] = (state.failCounts[card.id] || 0) + 1;
      }
      await sleep(
        reason === "rate-limit"
          ? 10000
          : reason === "insufficient_quota"
            ? 0
            : 600,
      );
      if (reason === "insufficient_quota") {
        console.error(
          "enrich-library: OpenAI insufficient_quota — stop batch. Top up billing, then re-run npm run library:daily-spend -- --enrich-only",
        );
        break;
      }
      continue;
    }

    delete state.failCounts[card.id];
    processed.add(card.id);

    const kept = preferImprovedCard(card, result.card).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CORPUS_DIR, `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
      "utf8",
    );
    report.updated += 1;
    state.totalUpdated += 1;
    await sleep(650);
  }

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  writeFileSync(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );

  state.processedIds = [...processed];
  state.lastRunAt = new Date().toISOString();
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  report.remaining = merged.filter((c) =>
    shouldEnrichCard(c, { pathOnly, onPath: onPathIds.has(c.id) }),
  ).length;
  report.tokenBudget = budgetSnapshot(PIPELINE_DIR);
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `enrich-library batch done: updated=${report.updated} skipped=${report.skipped} remaining=${report.remaining} tokens=${report.tokensRecorded}`,
  );
  console.log(`  ${formatBudgetLine(report.tokenBudget)}`);
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  const limit = parseLimit(argv, 200);
  const untilDone = argv.includes("--until-done");
  const maxRounds = untilDone ? 50 : 1;

  for (let round = 0; round < maxRounds; round += 1) {
    if (round > 0) {
      console.log(`\nenrich-library round ${round + 1}/${maxRounds}\n`);
    }
    const report = await runBatch({ limit, argv });
    if (report.updated === 0 || report.remaining === 0) break;
    if (!untilDone) break;
    await sleep(2000);
  }
}

const isMain = process.argv[1]?.includes("enrich-library");
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
