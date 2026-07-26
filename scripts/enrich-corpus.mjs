import { atomicWriteFile } from "./lib/atomic-write.mjs";
/**
 * Local Merixa ML enrichment pass.
 * Rewrites weak Guide cards into teaching units with workplace examples,
 * then quality-gates and promotes into content/index.json.
 *
 * Usage:
 *   npm run enrich
 *   npm run enrich -- --limit=40
 *   npm run library:deepen -- --limit=40
 *
 * --deepen re-enriches thin model-reviewed cards for practitioner depth.
 * Put OPENAI_API_KEY in .env.local (gitignored).
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
import {
  heuristicEnrichDraft,
  validateEnrichmentDraft,
} from "../workers/lib/enrich-validate.mjs";
import { loadEnvFiles } from "./lib/load-env.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFiles(ROOT);
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const DRAFT_DIR = join(CONTENT_DIR, "enrich-drafts");
const REPORT_PATH = join(CONTENT_DIR, "enrich-report.json");

const DEFAULT_LIMIT = 60;

function parseLimit(argv) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return DEFAULT_LIMIT;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_LIMIT;
}

function needsEnrichment(card) {
  return !(
    card.teachingSummary &&
    card.workedExample &&
    card.commonMistake &&
    card.checkQuestion
  );
}

/** Cards that exist but are too short for practitioner teaching depth. */
function needsDeepening(card) {
  return (
    String(card.teachingSummary || "").length < 280 ||
    String(card.workedExample || "").length < 420 ||
    String(card.commonMistake || "").length < 120 ||
    !card.checkQuestion
  );
}

function chunkCard(card) {
  const chunks = [];
  const push = (text, kind, index) => {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    chunks.push({
      id: `${card.id}::${kind}::${index}`,
      cardId: card.id,
      title: card.title,
      text: cleaned,
      bodies: card.bodies,
      tags: card.tags,
      kind,
    });
  };

  const paragraphs = String(card.body || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = paragraphs.length > 0 ? paragraphs : [card.body];
  parts.forEach((text, index) => push(text, "body", index));
  push(card.teachingSummary, "summary", 0);
  push(card.workedExample, "example", 0);
  push(card.commonMistake, "mistake", 0);
  return chunks;
}

function buildIndex(cards) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    cards,
    chunks: cards.flatMap(chunkCard),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryMs(response, attempt) {
  const header = response.headers?.get?.("retry-after");
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(Math.floor(seconds * 1000), 45000);
  }
  // Start gentler — burst limits recover faster than max backoff.
  return Math.min(2000 * (attempt + 1), 20000);
}

async function enrichWithModel(card, env, { attempts = 4 } = {}) {
  if (!env.OPENAI_API_KEY) return { draft: null, error: "no-key" };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const sourcePath = card.sources?.[0]?.path || "unknown";
  const excerpt = String(card.body || "").slice(0, 3200);
  let lastError = "unknown";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: `You are Merixa practitioner guide corpus enrichment.
Rewrite into a substantive practitioner card using ONLY the excerpt.
Return JSON only:
{"title":"...","body":"...","classification":{"domain":"...","topic":"...","contentType":"...","technicalLevel":"practitioner|advanced","confidence":0.9},"teachingSummary":"...","workedExample":"...","commonMistake":"...","checkQuestion":"..."}
Rules:
- teachingSummary: precise definition and technical context (3–5 sentences, up to ~1000 chars).
- body: fuller technical note grounded in the excerpt (up to ~1800 chars).
- workedExample: concrete workplace application with evidence, owner, and decision (4–6 sentences, up to ~1100 chars).
- commonMistake: one real trap with what goes wrong (up to ~500 chars).
- checkQuestion: one practitioner check that forces evidence + ownership.
- Do NOT name professional bodies in prose (chips already show them).
- Never invent IFRS/IAS/FRS numbers absent from the excerpt.
- No exam tips, source quotes, or membership marketing.`,
            },
            {
              role: "user",
              content: `Title: ${card.title}\nSource: ${sourcePath}\nExcerpt:\n${excerpt}`,
            },
          ],
        }),
      });
    } catch (error) {
      lastError = `network:${error?.message || "fetch-failed"}`;
      await sleep(1000 * (attempt + 1));
      continue;
    }

    if (response.status === 429) {
      lastError = "http-429:rate-limit";
      await sleep(parseRetryMs(response, attempt));
      continue;
    }

    if (!response.ok) {
      let detail = `http-${response.status}`;
      try {
        const errBody = await response.json();
        const msg = errBody?.error?.message || errBody?.error?.type;
        if (msg) detail = `${detail}:${String(msg).slice(0, 80)}`;
      } catch {
        // ignore parse errors
      }
      return { draft: null, error: detail };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      lastError = "empty-content";
      continue;
    }

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return { draft: JSON.parse(cleaned), error: null };
    } catch {
      lastError = "invalid-json";
      continue;
    }
  }

  return { draft: null, error: lastError };
}

async function main() {
  mkdirSync(DRAFT_DIR, { recursive: true });
  mkdirSync(CORPUS_DIR, { recursive: true });

  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json. Run npm run ingest first.");
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const limit = parseLimit(process.argv.slice(2));
  const useModel = Boolean(process.env.OPENAI_API_KEY);
  const allowHeuristic = process.argv.includes("--allow-heuristic");
  const deepen = process.argv.includes("--deepen");
  const paceMs = Number(
    process.argv.find((arg) => arg.startsWith("--pace="))?.split("=")[1] || 900,
  );
  const candidates = cards
    .filter((card) => {
      if (deepen) return needsDeepening(card) || needsEnrichment(card);
      if (useModel) return card.editorialStatus !== "model-reviewed";
      return needsEnrichment(card);
    })
    .slice(0, limit);

  const report = {
    generatedAt: new Date().toISOString(),
    considered: candidates.length,
    promoted: 0,
    apiHits: 0,
    skipped: 0,
    apiFallbacks: 0,
    apiErrors: {},
    rejected: [],
    mode: process.env.OPENAI_API_KEY ? "api" : "heuristic",
    deepen,
    paceMs,
  };

  const byId = new Map(cards.map((card) => [card.id, card]));

  console.log(
    `Enrich start: mode=${report.mode} deepen=${deepen} candidates=${candidates.length} paceMs=${paceMs} allowHeuristic=${allowHeuristic}`,
  );

  for (const [indexCard, card] of candidates.entries()) {
    process.stdout.write(`  card ${indexCard + 1}/${candidates.length}…\n`);
    const modelResult = await enrichWithModel(card, process.env);
    const modelDraft = modelResult.draft;
    const usedModel = Boolean(modelDraft);

    if (usedModel) {
      report.apiHits += 1;
    } else if (report.mode === "api") {
      const reason = modelResult.error || "unknown";
      report.apiErrors[reason] = (report.apiErrors[reason] ?? 0) + 1;
      if (!allowHeuristic) {
        report.skipped += 1;
        if ((indexCard + 1) % 5 === 0 || indexCard === 0) {
          process.stdout.write(
            `  progress ${indexCard + 1}/${candidates.length} hits=${report.apiHits} skipped=${report.skipped}\n`,
          );
        }
        // Cool down harder after rate limits before the next card.
        if (String(reason).includes("429")) {
          await sleep(Math.max(paceMs * 4, 8000));
        } else {
          await sleep(paceMs);
        }
        continue;
      }
      report.apiFallbacks += 1;
    }

    const draft = modelDraft ?? heuristicEnrichDraft(card);
    writeFileSync(
      join(DRAFT_DIR, `${card.id}.json`),
      `${JSON.stringify({ cardId: card.id, draft, usedModel }, null, 2)}\n`,
      "utf8",
    );

    const result = validateEnrichmentDraft({ card, draft });
    if (!result.ok) {
      report.rejected.push({ id: card.id, reasons: result.reasons });
      await sleep(paceMs);
      continue;
    }

    const promotedCard = usedModel
      ? result.card
      : { ...result.card, editorialStatus: "machine-reviewed" };
    byId.set(card.id, promotedCard);
    writeFileSync(
      join(CORPUS_DIR, `${card.id}.json`),
      `${JSON.stringify(promotedCard, null, 2)}\n`,
      "utf8",
    );
    report.promoted += 1;

    if ((indexCard + 1) % 5 === 0 || indexCard === candidates.length - 1) {
      process.stdout.write(
        `  progress ${indexCard + 1}/${candidates.length} hits=${report.apiHits} promoted=${report.promoted} skipped=${report.skipped}\n`,
      );
      // Checkpoint index so a stop mid-run keeps model-reviewed cards.
      const checkpoint = [...byId.values()].sort((left, right) =>
        String(left.title).localeCompare(String(right.title)),
      );
      atomicWriteFile(
        INDEX_PATH,
        `${JSON.stringify(buildIndex(checkpoint), null, 2)}\n`,
        "utf8",
      );
    }

    await sleep(paceMs);
  }

  // Absorb corpus files, never downgrade model-reviewed cards.
  for (const name of readdirSync(CORPUS_DIR)) {
    if (!name.endsWith(".json")) continue;
    try {
      const card = JSON.parse(readFileSync(join(CORPUS_DIR, name), "utf8"));
      if (!card?.id || needsEnrichment(card)) continue;
      const existing = byId.get(card.id);
      if (existing?.editorialStatus === "model-reviewed") continue;
      if (card.editorialStatus === "model-reviewed") {
        byId.set(card.id, card);
        continue;
      }
      if (!existing) byId.set(card.id, card);
    } catch {
      // skip corrupt corpus entries
    }
  }

  const nextCards = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(buildIndex(nextCards), null, 2)}\n`, "utf8");
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `Enrich complete: mode=${report.mode} apiHits=${report.apiHits} promoted=${report.promoted} skipped=${report.skipped} fallbacks=${report.apiFallbacks} rejected=${report.rejected.length}`,
  );
  if (Object.keys(report.apiErrors).length > 0) {
    console.log(`API errors: ${JSON.stringify(report.apiErrors)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
