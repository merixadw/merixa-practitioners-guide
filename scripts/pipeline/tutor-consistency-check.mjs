/**
 * Tutor consistency sample checks against Library relevance rules.
 * Spends from the tutor_consistency daily token allocation.
 *
 * Checks:
 * - Specialist answers should not invent Library/Path chrome when coverage is strong
 * - Thin coverage should invite Library without dumping unrelated path context
 * - Path invites only when path is active
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/load-env.mjs";
import {
  JOBS,
  canAfford,
  extractUsageTokens,
  loadBudgetState,
  recordSpend,
} from "../lib/token-budget.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const INDEX_PATH = join(ROOT, "content", "index.json");
const REPORT_PATH = join(PIPELINE_DIR, "tutor-consistency-report.json");
const TUTOR_JOB = JOBS.tutor;

const FIXTURES = [
  {
    id: "strong-ifrs-revenue",
    question: "When does IFRS 15 recognise revenue for a multi-element software contract?",
    coverage: "strong",
    pathActive: false,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: false,
      mustStayOnTopic: true,
    },
  },
  {
    id: "thin-obscure",
    question: "How do we treat a novel crypto staking arrangement under our close pack?",
    coverage: "thin",
    pathActive: false,
    expect: {
      libraryInviteOk: true,
      pathsInviteOk: false,
      mustStayOnTopic: true,
    },
  },
  {
    id: "path-active-variance",
    question: "Walk me through material usage variance for this month's pack.",
    coverage: "strong",
    pathActive: true,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: true,
      mustStayOnTopic: true,
    },
  },
  {
    id: "tax-transfer-pricing",
    question: "What evidence belongs in a transfer pricing pack for an intra-group royalty?",
    coverage: "strong",
    pathActive: false,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: false,
      mustStayOnTopic: true,
    },
  },
  {
    id: "unrelated-path-leak",
    question: "Explain deferred tax on revaluation surplus.",
    coverage: "strong",
    pathActive: false,
    plantedPathLabel: "FRM market risk path",
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: false,
      mustNotMentionPlantedPath: true,
      mustStayOnTopic: true,
    },
  },
  {
    id: "cgma-forecast",
    question: "How should a rolling forecast driver pack be owned month to month?",
    coverage: "strong",
    pathActive: false,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: false,
      mustStayOnTopic: true,
    },
  },
  {
    id: "audit-control-test",
    question: "What makes a manual control test persuasive for year-end?",
    coverage: "strong",
    pathActive: true,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: true,
      mustStayOnTopic: true,
    },
  },
  {
    id: "cfa-liquidity",
    question: "How do we interpret a sudden spike in days sales outstanding?",
    coverage: "strong",
    pathActive: false,
    expect: {
      libraryInviteOk: false,
      pathsInviteOk: false,
      mustStayOnTopic: true,
    },
  },
];

function pickCorpusHints(limit = 6) {
  if (!existsSync(INDEX_PATH)) return [];
  try {
    const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
    const cards = Array.isArray(index.cards) ? index.cards : [];
    return cards
      .slice(0, 400)
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((card) => ({
        id: card.id,
        title: card.title,
        domain: card.classification?.domain,
        topic: card.classification?.topic,
      }));
  } catch {
    return [];
  }
}

async function scoreFixture(fixture, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false, error: "no-key" };

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const hints = pickCorpusHints(5);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Merixa Tutor for workplace finance practitioners.
Rules:
- Answer as a specialist first (definition → example → trap → implication).
- Library invite only when coverage is "thin" or a card is explicitly pinned.
- Paths invite only when pathActive is true.
- Never leak unrelated path labels into the answer.
- Do not invent standard paragraph numbers.
Return JSON:
{"answer":"...","showLibraryInvite":bool,"showPathsInvite":bool,"mentionedPathLabels":["..."],"onTopic":bool}`,
        },
        {
          role: "user",
          content: JSON.stringify({
            question: fixture.question,
            coverage: fixture.coverage,
            pathActive: fixture.pathActive,
            plantedPathLabel: fixture.plantedPathLabel || null,
            sampleLibraryTitles: hints.map((h) => h.title),
          }),
        },
      ],
    }),
  });

  if (response.status === 429) return { ok: false, error: "rate-limit" };
  if (!response.ok) return { ok: false, error: `http-${response.status}` };

  const data = await response.json();
  const usageTokens = extractUsageTokens(data);
  recordSpend(PIPELINE_DIR, TUTOR_JOB, usageTokens);

  let parsed;
  try {
    parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
  } catch {
    return { ok: false, error: "invalid-json", usageTokens };
  }

  const failures = [];
  const showLibrary = Boolean(parsed.showLibraryInvite);
  const showPaths = Boolean(parsed.showPathsInvite);
  if (fixture.expect.libraryInviteOk === false && showLibrary) {
    failures.push("library-invite-when-strong");
  }
  if (fixture.expect.libraryInviteOk === true && !showLibrary) {
    failures.push("missing-library-invite-when-thin");
  }
  if (fixture.expect.pathsInviteOk === false && showPaths) {
    failures.push("paths-invite-when-inactive");
  }
  if (fixture.expect.pathsInviteOk === true && !showPaths) {
    failures.push("missing-paths-invite-when-active");
  }
  if (fixture.expect.mustStayOnTopic && parsed.onTopic === false) {
    failures.push("off-topic");
  }
  if (fixture.expect.mustNotMentionPlantedPath) {
    const mentioned = Array.isArray(parsed.mentionedPathLabels)
      ? parsed.mentionedPathLabels.join(" ").toLowerCase()
      : "";
    const answer = String(parsed.answer || "").toLowerCase();
    const planted = String(fixture.plantedPathLabel || "").toLowerCase();
    if (
      planted &&
      (mentioned.includes("frm") ||
        answer.includes(planted) ||
        answer.includes("frm market risk"))
    ) {
      failures.push("path-context-leak");
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    usageTokens,
    preview: String(parsed.answer || "").slice(0, 180),
  };
}

export async function runTutorConsistencyCheck({ samples = 8 } = {}) {
  mkdirSync(PIPELINE_DIR, { recursive: true });
  const limit = Math.min(samples, FIXTURES.length);
  const fixtures = FIXTURES.slice(0, limit);

  const report = {
    generatedAt: new Date().toISOString(),
    samples: fixtures.length,
    passed: 0,
    failed: 0,
    results: [],
  };

  for (const fixture of fixtures) {
    const live = loadBudgetState(PIPELINE_DIR);
    if (!live.disabled && !canAfford(live.state, TUTOR_JOB)) {
      report.results.push({ id: fixture.id, skipped: "budget" });
      break;
    }
    process.stdout.write(`  tutor-check ${fixture.id}…\n`);
    const result = await scoreFixture(fixture, process.env);
    report.results.push({ id: fixture.id, ...result });
    if (result.ok) report.passed += 1;
    else report.failed += 1;
  }

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `tutor-consistency: passed=${report.passed} failed=${report.failed} → ${REPORT_PATH}`,
  );
  return report;
}

const isMain = process.argv[1]?.includes("tutor-consistency-check");
if (isMain) {
  const samplesFlag = process.argv.find((a) => a.startsWith("--samples="));
  const samples = samplesFlag
    ? Math.max(1, Number(samplesFlag.split("=")[1]) || 8)
    : 8;
  runTutorConsistencyCheck({ samples }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
