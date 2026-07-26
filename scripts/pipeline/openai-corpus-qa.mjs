/**
 * OpenAI cross-check of Library cards for topic fidelity + practitioner quality.
 *
 * Target: drive measured fail rate as close to zero as practical
 * (user bar: ≤0.00001% ≈ zero fails on the catalog).
 *
 * Usage:
 *   npm run library:qa:openai -- --limit=50
 *   npm run library:qa:openai -- --limit=200 --ignore-budget
 *   npm run library:qa:openai -- --until-clean --limit=100 --ignore-budget
 *   npm run library:qa:openai -- --local-only
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { needsTopicRelevanceRewrite } from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import {
  JOBS,
  canAfford,
  extractUsageTokens,
  formatBudgetLine,
  loadBudgetState,
  recordSpend,
  budgetSnapshot,
} from "../lib/token-budget.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(PIPELINE_DIR, "openai-corpus-qa-report.json");
const STATE_PATH = join(PIPELINE_DIR, "openai-corpus-qa-state.json");
const QA_JOB = JOBS.tutor; // reuse tutor allocation; ignore-budget for full sweeps
const TARGET_FAIL_RATE = 0.0000001; // 0.00001%

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArg(argv, name, fallback = "") {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 1);
}

function parseLimit(argv, fallback) {
  const raw = parseArg(argv, "--limit", String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function loadState() {
  if (!existsSync(STATE_PATH)) {
    return { checkedIds: [], failIds: [], passIds: [], rounds: 0 };
  }
  return JSON.parse(readFileSync(STATE_PATH, "utf8"));
}

function saveState(state) {
  mkdirSync(PIPELINE_DIR, { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function judgeCard(card, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, error: "no-key", usageTokens: null };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_QA_MODEL || env.OPENAI_MODEL || "gpt-4.1-mini";

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
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a strict Merixa Library QA judge for finance/audit/risk practitioner cards.
Return JSON only:
{"pass":true|false,"errors":["..."],"severity":0to1,"notes":"..."}

Fail (pass=false) if ANY of:
1. Definition does not teach the exact card TITLE (wrong topic, title-stamp filler, or empty substance).
2. Example merely paraphrases the definition or is off-topic.
3. Invented standard paragraph numbers / fake citations.
4. Trap/implication/trigger clearly about a different concept than the title.
5. Material factual nonsense for a competent practitioner (not pedantic nitpicks).

Pass when the card is on-topic, usable in a board/close pack, and free of the above.
Be harsh on topic fidelity; do not fail for short-but-valid style differences.`,
          },
          {
            role: "user",
            content: `TITLE: ${card.title}
DOMAIN: ${card.classification?.domain || "practitioner"}
DEFINITION:
${String(card.teachingSummary || "").slice(0, 1100)}
EXAMPLE:
${String(card.workedExample || "").slice(0, 900)}
TRAP:
${String(card.commonMistake || "").slice(0, 400)}
IMPLICATION:
${String(card.implicationIfIgnored || "").slice(0, 400)}
TRIGGER:
${String(card.realWorldTrigger || "").slice(0, 280)}`,
          },
        ],
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error: String(error?.message || error),
      usageTokens: null,
    };
  }

  if (response.status === 429) {
    return { ok: false, error: "rate-limit", usageTokens: null };
  }
  if (!response.ok) {
    return { ok: false, error: `http-${response.status}`, usageTokens: null };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "response-json-truncated", usageTokens: null };
  }

  const usageTokens = extractUsageTokens(data);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, error: "empty", usageTokens };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: "invalid-json", usageTokens };
  }

  const pass = Boolean(parsed.pass);
  return {
    ok: true,
    pass,
    errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    severity: Number(parsed.severity) || (pass ? 0 : 0.7),
    notes: String(parsed.notes || "").slice(0, 400),
    usageTokens,
  };
}

async function runRound(argv) {
  const limit = parseLimit(argv, 50);
  const ignoreBudget = argv.includes("--ignore-budget");
  const localOnly = argv.includes("--local-only");
  const recheckFails = argv.includes("--recheck-fails");

  mkdirSync(PIPELINE_DIR, { recursive: true });
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const state = loadState();
  const checked = new Set(state.checkedIds || []);
  const priorFails = new Set(state.failIds || []);

  const localFails = cards.filter((c) => needsTopicRelevanceRewrite(c));
  const localFailRate = cards.length ? localFails.length / cards.length : 0;

  let pool = cards;
  if (recheckFails && priorFails.size > 0) {
    pool = cards.filter((c) => priorFails.has(c.id));
  } else {
    pool = cards.filter((c) => !checked.has(c.id));
    if (pool.length === 0) {
      // Full sweep complete — restart unmarked for continuous audit.
      checked.clear();
      pool = cards;
    }
  }

  // Prioritize not-yet-live and previously failed.
  pool = [...pool].sort((a, b) => {
    const aScore =
      (priorFails.has(a.id) ? 40 : 0) +
      (!a.enrichedAt ? 20 : 0) +
      (needsTopicRelevanceRewrite(a) ? 30 : 0);
    const bScore =
      (priorFails.has(b.id) ? 40 : 0) +
      (!b.enrichedAt ? 20 : 0) +
      (needsTopicRelevanceRewrite(b) ? 30 : 0);
    return bScore - aScore;
  });

  const sample = pool.slice(0, limit);
  const report = {
    generatedAt: new Date().toISOString(),
    targetFailRate: TARGET_FAIL_RATE,
    targetFailRatePct: "0.00001%",
    catalogSize: cards.length,
    localFails: localFails.length,
    localFailRate,
    localTargetMet: localFailRate <= TARGET_FAIL_RATE,
    openai: {
      enabled: !localOnly,
      sampled: 0,
      passed: 0,
      failed: 0,
      errors: {},
      failRate: null,
      targetMet: null,
    },
    fails: [],
    tokenBudget: budgetSnapshot(PIPELINE_DIR),
  };

  console.log(
    `openai-corpus-qa: localFails=${localFails.length}/${cards.length} (${(localFailRate * 100).toFixed(4)}%) sample=${sample.length} localOnly=${localOnly}`,
  );
  console.log(`  ${formatBudgetLine(report.tokenBudget)}`);

  if (localOnly) {
    report.fails = localFails.slice(0, 50).map((c) => ({
      id: c.id,
      title: c.title,
      source: "local",
    }));
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`openai-corpus-qa: wrote ${REPORT_PATH}`);
    return report;
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    report.openai.errors["no-key"] = 1;
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.error("OPENAI_API_KEY required");
    process.exitCode = 1;
    return report;
  }

  const failIds = new Set(state.failIds || []);
  const passIds = new Set(state.passIds || []);

  for (const [i, card] of sample.entries()) {
    if (
      !ignoreBudget &&
      !canAfford(loadBudgetState(PIPELINE_DIR).state, QA_JOB)
    ) {
      report.openai.errors["budget-stop"] =
        (report.openai.errors["budget-stop"] || 0) + 1;
      console.log("openai-corpus-qa: stopping — token budget");
      break;
    }

    process.stdout.write(
      `  ${i + 1}/${sample.length} ${String(card.title).slice(0, 48)}…\n`,
    );

    // Local hard fail first — no need to spend tokens.
    if (needsTopicRelevanceRewrite(card)) {
      report.openai.sampled += 1;
      report.openai.failed += 1;
      failIds.add(card.id);
      passIds.delete(card.id);
      checked.add(card.id);
      report.fails.push({
        id: card.id,
        title: card.title,
        source: "local",
        errors: ["needsTopicRelevanceRewrite"],
      });
      continue;
    }

    const judged = await judgeCard(card, process.env);
    if (judged.usageTokens != null) {
      recordSpend(PIPELINE_DIR, QA_JOB, judged.usageTokens);
    }

    if (!judged.ok) {
      const reason = judged.error || "unknown";
      report.openai.errors[reason] = (report.openai.errors[reason] || 0) + 1;
      if (reason === "rate-limit") await sleep(10000);
      else if (reason === "insufficient_quota") break;
      else await sleep(400);
      continue;
    }

    report.openai.sampled += 1;
    checked.add(card.id);
    if (judged.pass) {
      report.openai.passed += 1;
      passIds.add(card.id);
      failIds.delete(card.id);
    } else {
      report.openai.failed += 1;
      failIds.add(card.id);
      passIds.delete(card.id);
      report.fails.push({
        id: card.id,
        title: card.title,
        source: "openai",
        errors: judged.errors,
        severity: judged.severity,
        notes: judged.notes,
      });
      // Mark for re-enrich by clearing enriched stamp signal via tag.
      const corpusPath = join(CORPUS_DIR, `${card.id}.json`);
      if (existsSync(corpusPath)) {
        try {
          const full = JSON.parse(readFileSync(corpusPath, "utf8"));
          const next = {
            ...full,
            tags: Array.from(
              new Set([...(full.tags || []), "qa-failed", "needs-enrichment"]),
            ),
            qaFailedAt: new Date().toISOString(),
            qaFailNotes: judged.notes || judged.errors?.join("; "),
          };
          writeFileSync(
            corpusPath,
            `${JSON.stringify(next, null, 2)}\n`,
            "utf8",
          );
        } catch {
          // keep going
        }
      }
    }
    await sleep(350);
  }

  report.openai.failRate =
    report.openai.sampled > 0
      ? report.openai.failed / report.openai.sampled
      : null;
  report.openai.targetMet =
    report.openai.failRate != null &&
    report.openai.failRate <= TARGET_FAIL_RATE;

  state.checkedIds = [...checked];
  state.failIds = [...failIds];
  state.passIds = [...passIds];
  state.rounds = (state.rounds || 0) + 1;
  state.lastRunAt = report.generatedAt;
  saveState(state);

  report.tokenBudget = budgetSnapshot(PIPELINE_DIR);
  report.openFailIds = state.failIds.length;
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `openai-corpus-qa done: sampled=${report.openai.sampled} pass=${report.openai.passed} fail=${report.openai.failed} failRate=${report.openai.failRate} openFails=${state.failIds.length}`,
  );
  console.log(`  ${formatBudgetLine(report.tokenBudget)}`);
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  const untilClean = argv.includes("--until-clean");
  const maxRounds = untilClean ? 20 : 1;

  let last = null;
  for (let round = 0; round < maxRounds; round += 1) {
    if (untilClean) console.log(`\nopenai-corpus-qa round ${round + 1}/${maxRounds}`);
    last = await runRound(argv);
    if (!untilClean) break;
    if (
      last.localTargetMet &&
      last.openai.targetMet &&
      (last.openFailIds || 0) === 0
    ) {
      console.log("openai-corpus-qa: target met — zero open fails");
      break;
    }
    // After a fail wave, prefer rechecking fails next.
    if ((last.openFailIds || 0) > 0 && !argv.includes("--recheck-fails")) {
      argv.push("--recheck-fails");
    }
  }
  return last;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
