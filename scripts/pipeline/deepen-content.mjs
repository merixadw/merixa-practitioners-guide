import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Deepen practitioner definitions and worked examples with OpenAI.
 * Strips evidence quotes — teaching lives in definition + example prose.
 *
 * Usage:
 *   npm run library:deepen-content
 *   npm run library:deepen-content -- --limit=80
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeUniqueBody, textOverlapRatio } from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "deepen-content-report.json");

const MIN_DEFINITION = 280;
const MIN_EXAMPLE = 420;

function parseLimit(argv, fallback = 60) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return fallback;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 300) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsDeepening(card) {
  const def = String(card.teachingSummary || card.body || "");
  const ex = String(card.workedExample || "");
  return def.length < MIN_DEFINITION || ex.length < MIN_EXAMPLE;
}

async function deepenCard(card, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { card: null, error: "no-key" };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const definition = String(card.teachingSummary || card.body || "").slice(0, 900);
  const example = String(card.workedExample || "").slice(0, 700);
  const trap = String(card.commonMistake || "").slice(0, 400);
  const topic = card.classification?.topic || card.title;

  let response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You deepen a practitioner encyclopedia card for finance/audit professionals.
Return JSON only:
{"teachingSummary":"...","technicalDetail":"...","workedExample":"...","commonMistake":"...","checkQuestion":"...","ok":true}

Rules:
- teachingSummary: 3–5 sentences, precise definition and technical context (~400–1000 chars). Practitioner depth, not exam tips.
- technicalDetail: optional second paragraph with measurement, recognition nuance, or judgement hooks (~200–600 chars). Omit if redundant.
- workedExample: 4–6 sentences, concrete workplace scenario with numbers, documents, owners, decisions (~500–1100 chars). Must NOT paraphrase the definition.
- commonMistake: one substantive trap (~200–500 chars).
- checkQuestion: one evidence-based practitioner question.
- No professional body name-dropping. No invented IFRS/IAS/FRS paragraph numbers unless already in the input.
- No evidence quotes or source citations.`,
          },
          {
            role: "user",
            content: `Title: ${card.title}
Topic: ${topic}
Current definition:\n${definition}
Current example:\n${example || "(none)"}
Current trap:\n${trap || "(none)"}`,
          },
        ],
      }),
    });
  } catch (error) {
    return { card: null, error: String(error?.message || error) };
  }

  if (!response.ok) {
    return { card: null, error: `http-${response.status}` };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return { card: null, error: "empty" };

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { card: null, error: "invalid-json" };
  }

  const teachingSummary = String(parsed.teachingSummary || "").trim();
  const technicalDetail = String(parsed.technicalDetail || "").trim();
  const workedExample = String(parsed.workedExample || "").trim();
  const commonMistake = String(parsed.commonMistake || card.commonMistake || "").trim();
  const checkQuestion = String(parsed.checkQuestion || card.checkQuestion || "").trim();

  if (teachingSummary.length < 160 || workedExample.length < 200) {
    return { card: null, error: "too-short" };
  }
  if (textOverlapRatio(workedExample, teachingSummary) >= 0.58) {
    return { card: null, error: "example-overlaps-definition" };
  }

  const body = composeUniqueBody({
    definition: teachingSummary,
    interpretation: technicalDetail,
    extra: card.body,
  });

  return {
    card: {
      ...card,
      teachingSummary: teachingSummary.slice(0, 1100),
      body: body.slice(0, 2000),
      workedExample: workedExample.slice(0, 1200),
      commonMistake: commonMistake.slice(0, 550),
      checkQuestion: checkQuestion.slice(0, 280),
      sourceQuotes: [],
      deepenedAt: new Date().toISOString(),
    },
    error: null,
  };
}

async function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(CORPUS_DIR, { recursive: true });
  const limit = parseLimit(process.argv.slice(2));
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byId = new Map(cards.map((card) => [card.id, card]));

  const candidates = cards.filter(needsDeepening).slice(0, limit);
  const report = {
    generatedAt: new Date().toISOString(),
    candidates: candidates.length,
    updated: 0,
    skipped: 0,
    errors: {},
  };

  console.log(
    `deepen-content: candidates=${candidates.length} hasKey=${Boolean(process.env.OPENAI_API_KEY)}`,
  );

  for (const [index, card] of candidates.entries()) {
    process.stdout.write(`  ${index + 1}/${candidates.length} ${card.title.slice(0, 48)}…\n`);
    const result = await deepenCard(card, process.env);
    if (!result.card) {
      report.skipped += 1;
      const reason = result.error || "unknown";
      report.errors[reason] = (report.errors[reason] || 0) + 1;
      await sleep(600);
      continue;
    }

    const kept = preferImprovedCard(card, result.card).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CORPUS_DIR, `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
      "utf8",
    );
    report.updated += 1;
    await sleep(700);
  }

  const merged = [...byId.values()].sort((a, b) =>
    String(a.title).localeCompare(String(b.title)),
  );
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `deepen-content complete: updated=${report.updated} skipped=${report.skipped}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
