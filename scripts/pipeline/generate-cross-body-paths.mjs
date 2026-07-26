import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * OpenAI: draft cross-body path + Library cards, publish together.
 *
 * Usage:
 *   npm run library:expand -- --generate=2
 *   node scripts/pipeline/generate-cross-body-paths.mjs --limit=1 --dry-run
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import { auditPathCoverage } from "../lib/path-sources.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const AGENDA_PATH = join(CONTENT_DIR, "pipeline", "expansion-agenda.json");
const PATHS_OUT = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "cross-body-paths.generated.json",
);
const REPORT_PATH = join(
  CONTENT_DIR,
  "pipeline",
  "generate-cross-body-paths-report.json",
);
const MANIFEST_PATH = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "cross-body-path-ids.generated.json",
);

function parseLimit(argv, fallback = 1) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return fallback;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 5) : fallback;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generatePath(topic, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY required for path generation");

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const stepCount = topic.stepCount ?? 5;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You author a cross-body practitioner learning path for Merixa Guide (finance, audit, risk — NOT exam prep).
Return JSON only:
{
  "path": {
    "id": "kebab-case-id",
    "title": "...",
    "summary": "...",
    "bodies": ["IFRS","FRM",...],
    "steps": [
      {
        "id": "s1",
        "title": "...",
        "summary": "one line",
        "card": {
          "id": "unique-kebab-id",
          "title": "...",
          "teachingSummary": "definition 3-5 sentences",
          "workedExample": "workplace example 4-6 sentences with numbers",
          "commonMistake": "trap 2-3 sentences",
          "checkQuestion": "one practitioner check",
          "implicationIfIgnored": "what breaks if ignored",
          "realWorldTrigger": "concrete trigger signal",
          "formula": "optional formula or omit",
          "domain": "Financial reporting | Risk management | ...",
          "topic": "short topic label"
        }
      }
    ]
  },
  "ok": true
}

Rules:
- Exactly ${stepCount} steps; each step gets a NEW card draft (unique card.id).
- card ids: lowercase kebab, prefix with topic slug fragment, no spaces.
- Bodies must be subset of: IFRS, FRC, ACCA, CGMA, CFA, FRM, IIA, CRMA, COSO, Merixa.
- Practitioner depth; no invented standard paragraph numbers; no exam tips.
- Steps should stitch concepts across bodies (breadth differentiator).`,
        },
        {
          role: "user",
          content: `Topic id: ${topic.id}
Title: ${topic.title}
Bodies to weave: ${(topic.bodies || []).join(", ")}
Hint: ${topic.hint || "Cross-body workplace journey."}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI http-${response.status}`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("empty OpenAI response");
  const parsed = JSON.parse(content);
  if (!parsed?.path?.steps?.length) throw new Error("invalid path payload");
  return parsed.path;
}

function toCard(step, pathMeta) {
  const card = step.card;
  const definition = String(card.teachingSummary || "").trim();
  const example = String(card.workedExample || "").trim();
  const trap = String(card.commonMistake || "").trim();
  const id = slugify(card.id || `${pathMeta.id}-${step.id}`);

  return {
    id,
    title: String(card.title || step.title).trim(),
    body: composeUniqueBody({
      definition,
      formula: card.formula,
    }),
    bodies: pathMeta.bodies?.length ? pathMeta.bodies : ["Merixa"],
    tags: [
      "path-generated",
      "domain-spine",
      "cross-body-path",
      `path-${pathMeta.id}`,
    ],
    workplaceTasks: [],
    sources: [
      {
        label: `Merixa cross-body path — ${pathMeta.title}`,
        path: `seed/cross-body-path/${pathMeta.id}/${step.id}`,
        kind: "merixa",
        body: "Merixa",
      },
    ],
    teachingSummary: definition.slice(0, 1100),
    formula: card.formula ? String(card.formula).slice(0, 420) : undefined,
    workedExample: example.slice(0, 1200),
    commonMistake: trap.slice(0, 550),
    checkQuestion: String(card.checkQuestion || "").slice(0, 280),
    implicationIfIgnored: String(card.implicationIfIgnored || "").slice(
      0,
      550,
    ),
    realWorldTrigger: String(card.realWorldTrigger || "").slice(0, 220),
    sourceQuotes: [],
    classification: {
      domain: String(card.domain || "Financial management"),
      topic: String(card.topic || step.title),
      contentType: card.formula ? "formula" : "definition",
      technicalLevel: "practitioner",
      confidence: 0.88,
    },
    editorialStatus: "editor-approved",
    qualityScore: 0.86,
    pathGeneratedAt: new Date().toISOString(),
  };
}

function toLearningPath(path, cardIdByStep) {
  return {
    id: slugify(path.id),
    title: path.title,
    summary: path.summary,
    bodies: path.bodies ?? ["Merixa"],
    steps: path.steps.map((step, index) => ({
      id: step.id || `s${index + 1}`,
      title: step.title,
      summary: String(step.summary || step.card?.title || "").slice(0, 140),
      cardId: cardIdByStep.get(step.id || `s${index + 1}`),
    })),
  };
}

export async function generateCrossBodyPaths({ limit = 1, dryRun = false } = {}) {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }
  const agenda = existsSync(AGENDA_PATH)
    ? JSON.parse(readFileSync(AGENDA_PATH, "utf8"))
    : { topics: [] };
  const topics = (agenda.topics ?? []).slice(0, limit);
  if (topics.length === 0) {
    console.log("generate-cross-body-paths: no topics in expansion-agenda.json");
    return { pathsAdded: 0, cardsAdded: 0 };
  }

  const existingPaths = existsSync(PATHS_OUT)
    ? JSON.parse(readFileSync(PATHS_OUT, "utf8"))
    : [];
  const existingIds = new Set(existingPaths.map((path) => path.id));

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? [...index.cards] : [];
  const byId = new Map(cards.map((card) => [card.id, card]));

  const report = {
    generatedAt: new Date().toISOString(),
    topics: topics.length,
    pathsAdded: 0,
    cardsAdded: 0,
    pathIds: [],
    errors: [],
  };

  const newPaths = [...existingPaths];
  const newFlagshipIds = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : [];

  for (const topic of topics) {
    if (existingIds.has(topic.id)) {
      console.log(`  skip existing path ${topic.id}`);
      continue;
    }
    try {
      console.log(`  generating path: ${topic.title}`);
      const draft = await generatePath(topic, process.env);
      const pathId = slugify(draft.id || topic.id);
      const cardIdByStep = new Map();

      if (!dryRun) {
        mkdirSync(CORPUS_DIR, { recursive: true });
        for (const step of draft.steps) {
          const stepKey = step.id || `s${draft.steps.indexOf(step) + 1}`;
          const card = toCard(step, { ...draft, id: pathId });
          cardIdByStep.set(stepKey, card.id);
          upsertLibraryCard(byId, card);
          writeFileSync(
            join(CORPUS_DIR, `${card.id}.json`),
            `${JSON.stringify(card, null, 2)}\n`,
            "utf8",
          );
          report.cardsAdded += 1;
        }

        const learningPath = toLearningPath(
          { ...draft, id: pathId },
          cardIdByStep,
        );
        newPaths.push(learningPath);
        newFlagshipIds.push(pathId);
        report.pathsAdded += 1;
        report.pathIds.push(pathId);
        existingIds.add(pathId);
      }

      await sleep(1200);
    } catch (error) {
      report.errors.push({
        topic: topic.id,
        message: String(error?.message || error),
      });
      console.error(`  failed ${topic.id}:`, error);
    }
  }

  if (!dryRun && (report.pathsAdded > 0 || report.cardsAdded > 0)) {
    const merged = [...byId.values()].sort((a, b) =>
      String(a.title).localeCompare(String(b.title)),
    );
    atomicWriteFile(
      INDEX_PATH,
      `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
      "utf8",
    );
    writeFileSync(PATHS_OUT, `${JSON.stringify(newPaths, null, 2)}\n`, "utf8");
    writeFileSync(
      MANIFEST_PATH,
      `${JSON.stringify([...new Set(newFlagshipIds)], null, 2)}\n`,
      "utf8",
    );
  }

  report.coverage = auditPathCoverage();
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `generate-cross-body-paths: paths+${report.pathsAdded} cards+${report.cardsAdded} errors=${report.errors.length}`,
  );
  return report;
}

const isMain = process.argv[1]?.includes("generate-cross-body-paths");
if (isMain) {
  const argv = process.argv.slice(2);
  generateCrossBodyPaths({
    limit: parseLimit(argv, 1),
    dryRun: argv.includes("--dry-run"),
  }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
