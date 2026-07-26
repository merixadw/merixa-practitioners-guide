import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Expand worked examples and learning-focused common traps via OpenAI.
 * Pedagogy: understand by definition, learn by example, trap highlights what was missed.
 *
 * Usage:
 *   npm run library:examples
 *   npm run library:examples -- --limit=120
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { exampleNeedsRewrite, textOverlapRatio } from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "examples-report.json");

const MIN_EXAMPLE = 450;
const MIN_TRAP = 150;

function parseLimit(argv, fallback = 60) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return fallback;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), 300)
    : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function needsTeachingExpansion(card) {
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  const trap = String(card.commonMistake || "");
  return (
    example.length < MIN_EXAMPLE ||
    trap.length < MIN_TRAP ||
    exampleNeedsRewrite(example, definition)
  );
}

async function expandTeaching(card, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { result: null, error: "no-key" };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const definition = String(card.teachingSummary || card.body || "").slice(
    0,
    1100,
  );
  const formula = card.formula ? `Formula: ${card.formula}` : "";
  const currentExample = String(card.workedExample || "").slice(0, 700);
  const currentTrap = String(card.commonMistake || "").slice(0, 400);

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
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You write practitioner teaching content for an encyclopedia card.
Return JSON only: {"workedExample":"...","commonMistake":"...","ok":true}

Pedagogy
1. Definition (provided) — understand the concept.
2. workedExample — LEARN by example: 4–6 sentences, concrete workplace scenario with numbers, documents, owners, timing, and decision (~500–1200 chars). Do NOT restate the definition.
3. commonMistake — draw attention to what the learner would get wrong if they only skimmed the definition and missed the example: name the specific misconception, what goes wrong in practice, and how it contrasts with the example (~200–550 chars).

Rules
- If a formula is provided, apply it once with simple illustrative numbers in the example.
- No professional body name-dropping. No exam tips. No invented standard paragraph numbers.
- The trap must connect to the example (e.g. "Unlike the example where X was done, teams often…").`,
          },
          {
            role: "user",
            content: `Title: ${card.title}
Definition: ${definition}
${formula}
Domain: ${card.classification?.domain || "practitioner"}
Topic: ${card.classification?.topic || "general"}
Current example (rewrite if weak): ${currentExample || "(none)"}
Current trap (rewrite if weak): ${currentTrap || "(none)"}`,
          },
        ],
      }),
    });
  } catch (error) {
    return { result: null, error: `network:${error?.message || "failed"}` };
  }

  if (response.status === 429) return { result: null, error: "rate-limit" };
  if (!response.ok) {
    const detail = await response.text();
    return {
      result: null,
      error: `http-${response.status}:${detail.slice(0, 120)}`,
    };
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return { result: null, error: "empty" };

  try {
    const parsed = JSON.parse(
      content
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim(),
    );
    const workedExample = String(parsed.workedExample || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1200);
    const commonMistake = String(parsed.commonMistake || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 550);

    if (workedExample.length < 120) {
      return { result: null, error: "example-too-short" };
    }
    if (commonMistake.length < 80) {
      return { result: null, error: "trap-too-short" };
    }
    if (textOverlapRatio(workedExample, definition) >= 0.55) {
      return { result: null, error: "overlaps-definition" };
    }
    if (textOverlapRatio(commonMistake, workedExample) >= 0.72) {
      return { result: null, error: "trap-overlaps-example" };
    }

    return {
      result: { workedExample, commonMistake },
      error: null,
      model,
    };
  } catch {
    return { result: null, error: "bad-json" };
  }
}

async function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }
  const limit = parseLimit(process.argv.slice(2), 60);
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  const candidates = (index.cards ?? [])
    .filter(needsTeachingExpansion)
    .slice(0, limit);
  const byId = new Map((index.cards ?? []).map((card) => [card.id, card]));

  const report = {
    generatedAt: new Date().toISOString(),
    considered: candidates.length,
    updated: 0,
    skipped: 0,
    errors: {},
  };

  console.log(
    `examples start: candidates=${candidates.length} hasKey=${Boolean(process.env.OPENAI_API_KEY)}`,
  );

  for (const [indexCard, card] of candidates.entries()) {
    process.stdout.write(
      `  ${indexCard + 1}/${candidates.length} ${card.title.slice(0, 48)}…\n`,
    );
    const { result, error, model } = await expandTeaching(card, process.env);
    if (!result) {
      report.skipped += 1;
      const reason = error || "unknown";
      report.errors[reason] = (report.errors[reason] ?? 0) + 1;
      await sleep(reason === "rate-limit" ? 8000 : 800);
      continue;
    }

    const next = {
      ...card,
      workedExample: result.workedExample,
      commonMistake: result.commonMistake,
      exampleVerification: {
        status: "verified",
        reason:
          "OpenAI example + trap expansion; example distinct from definition; trap contrasts learning.",
        verifiedAt: new Date().toISOString(),
        model: model || process.env.OPENAI_MODEL || "gpt-4.1-mini",
      },
      enrichedAt: new Date().toISOString(),
    };
    const kept = preferImprovedCard(card, next).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CORPUS_DIR, `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
      "utf8",
    );
    report.updated += 1;
    await sleep(850);
  }

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `examples complete: updated=${report.updated} skipped=${report.skipped}`,
  );
  if (Object.keys(report.errors).length > 0) {
    console.log(`errors: ${JSON.stringify(report.errors)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
