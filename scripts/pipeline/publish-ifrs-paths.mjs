import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish IFRS/IAS topic cards and generate step-by-step learning paths.
 *
 * Usage:
 *   npm run library:ifrs-paths
 *   npm run library:ifrs-paths -- --rebuild-index
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
import { IFRS_IAS_STANDARDS } from "../lib/ifrs-ias-catalog.mjs";
import { preferImprovedCard, upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "ifrs-paths-report.json");
const PATHS_OUT = join(ROOT, "src", "lib", "guide", "ifrs-paths.generated.json");

function cut(value, max) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const boundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("; "),
    slice.lastIndexOf(" "),
  );
  return (
    boundary > Math.floor(max * 0.55) ? slice.slice(0, boundary) : slice
  )
    .replace(/[,:;–—-]+$/, "")
    .trim();
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function standardToken(code) {
  const match = String(code).match(/(IFRS|IAS)\s*(\d+[A-Z]?)/i);
  if (!match) return "";
  return `${match[1].toLowerCase()}-${match[2]}`;
}

function stepCardId(standard, step) {
  const prefix = standard.slug;
  return `${prefix}-${step.slug}`;
}

function findBestCard(cards, standard, step) {
  const stepHay = normalizeTitle(step.title);
  let best = null;
  let bestScore = 0;
  for (const card of cards) {
    const titleHay = normalizeTitle(card.title);
    let score = 0;
    if (titleHay === stepHay) score += 90;
    else if (titleHay.includes(stepHay) || stepHay.includes(titleHay)) score += 35;
    else continue;

    score += textOverlapRatio(step.title, card.title) * 20;
    if (!card.tags?.includes(`ifrs-ias-${standard.slug}`)) score -= 40;
    if (!card.bodies?.includes("IFRS")) score -= 30;
    if (card.id.startsWith(`${standard.slug}-`)) score += 50;

    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return bestScore >= 70 ? best : null;
}

function toStepCard(standard, step) {
  const id = stepCardId(standard, step);
  const definition = cut(step.definition, 1000);
  const example = cut(step.example, 1100);
  const trap = cut(step.trap, 520);
  const stdTag = `ifrs-ias-${standard.slug}`;

  return {
    id,
    title: step.title,
    body: composeUniqueBody({ definition, formula: step.formula }),
    bodies: ["IFRS", "ACCA", "Merixa"],
    tags: [
      "ifrs-ias-path",
      stdTag,
      standard.kind,
      standard.slug,
      `standard-${standard.code.toLowerCase().replace(/\s+/g, "-")}`,
      step.slug,
    ],
    workplaceTasks: [],
    sources: [
      {
        label: `Merixa IFRS/IAS path — ${standard.code}`,
        path: `seed/ifrs-ias-path/${standard.slug}/${step.slug}`,
        kind: "merixa",
        body: "Merixa",
      },
    ],
    teachingSummary: definition,
    formula: step.formula ? cut(step.formula, 420) : undefined,
    workedExample: example,
    commonMistake: trap,
    checkQuestion: cut(
      `For ${standard.code}, what evidence would change your conclusion on “${step.title}”?`,
      220,
    ),
    sourceQuotes: [],
    classification: {
      domain: "Financial reporting",
      topic: standard.title,
      contentType: "requirement",
      technicalLevel: "practitioner",
      confidence: 0.9,
    },
    editorialStatus: "editor-approved",
    qualityScore: 0.9,
    ifrsPathAt: new Date().toISOString(),
    standardCode: standard.code,
    standardSlug: standard.slug,
    stepSlug: step.slug,
  };
}

function toPath(standard, steps) {
  return {
    id: `ifrs-path-${standard.slug}`,
    title: `${standard.code}: ${standard.title}`,
    summary: standard.summary,
    bodies: ["IFRS", "ACCA"],
    steps: steps.map((item, index) => ({
      id: `${standard.slug}-s${index + 1}`,
      title: item.step.title,
      summary: item.step.summary,
      cardId: item.cardId,
    })),
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(CORPUS_DIR, { recursive: true });
  mkdirSync(dirname(PATHS_OUT), { recursive: true });

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byId = new Map(cards.map((card) => [card.id, card]));

  const report = {
    generatedAt: new Date().toISOString(),
    standards: IFRS_IAS_STANDARDS.length,
    paths: 0,
    stepCardsPublished: 0,
    stepCardsUpdated: 0,
    stepCardsMatched: 0,
    totalSteps: 0,
    byStandard: [],
  };

  const paths = [];

  for (const standard of IFRS_IAS_STANDARDS) {
    const pathSteps = [];
    const standardReport = {
      code: standard.code,
      slug: standard.slug,
      steps: standard.steps.length,
      matched: 0,
      published: 0,
      updated: 0,
    };

    for (const step of standard.steps) {
      report.totalSteps += 1;
      const targetId = stepCardId(standard, step);
      const existingDedicated = byId.get(targetId);
      const exactMatch = findBestCard(cards, standard, step);

      let card;
      if (exactMatch && exactMatch.id !== targetId) {
        card = exactMatch;
        if (!card.tags?.includes(`ifrs-ias-${standard.slug}`)) {
          card.tags = [...(card.tags || []), `ifrs-ias-${standard.slug}`, "ifrs-ias-path"];
          upsertLibraryCard(byId, card);
          writeFileSync(
            join(CORPUS_DIR, `${card.id}.json`),
            `${JSON.stringify(card, null, 2)}\n`,
            "utf8",
          );
        }
        report.stepCardsMatched += 1;
        standardReport.matched += 1;
      } else {
        const fresh = toStepCard(standard, step);
        const isUpdate = Boolean(existingDedicated);
        const kept = preferImprovedCard(existingDedicated, fresh).card;
        byId.set(kept.id, kept);
        writeFileSync(
          join(CORPUS_DIR, `${kept.id}.json`),
          `${JSON.stringify(kept, null, 2)}\n`,
          "utf8",
        );
        if (isUpdate) {
          report.stepCardsUpdated += 1;
          standardReport.updated += 1;
        } else {
          report.stepCardsPublished += 1;
          standardReport.published += 1;
        }
        card = kept;
      }

      pathSteps.push({ step, cardId: card.id });
    }

    paths.push(toPath(standard, pathSteps));
    report.byStandard.push(standardReport);
  }

  report.paths = paths.length;

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );
  writeFileSync(PATHS_OUT, `${JSON.stringify(paths, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(
    `ifrs-paths: standards=${report.standards} paths=${report.paths} steps=${report.totalSteps} published=${report.stepCardsPublished} updated=${report.stepCardsUpdated} matched=${report.stepCardsMatched} totalCards=${merged.length}`,
  );
}

main();
