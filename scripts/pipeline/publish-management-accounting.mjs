import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish management accounting terminology into the corpus.
 *
 * Usage: npm run library:ma-encyclopedia
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
import { MANAGEMENT_ACCOUNTING_TERMS } from "../lib/management-accounting-catalog.mjs";
import { MA_FORMULA_BANK } from "../lib/management-accounting-formulas-catalog.mjs";
import { sustainingReferences } from "../lib/professional-bodies.mjs";
import { upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "ma-encyclopedia-report.json");

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

function toCard(entry) {
  const definition = cut(entry.definition, 1100);
  const example = cut(entry.example, 1200);
  const trap = cut(entry.trap, 550);
  const tags = [
    "encyclopedia",
    "management-accounting",
    "ma-encyclopedia",
    "domain-spine",
  ];
  if (entry.formula) {
    tags.push("ma-formulas");
  }

  const bodies = ["CGMA", "ACCA", "Merixa"];
  const officialReferences = sustainingReferences({
    domain: "Management reporting",
    topic: "Management accounting",
    bodies,
  });

  return {
    id: entry.id,
    title: entry.title,
    body: composeUniqueBody({
      definition,
      formula: entry.formula,
    }),
    bodies,
    tags,
    workplaceTasks: [],
    sources: [
      {
        label: "Merixa management accounting encyclopedia",
        path: "seed/management-accounting-encyclopedia",
        kind: "merixa",
        body: "Merixa",
      },
      ...officialReferences.slice(0, 2).map((ref) => ({
        label: ref.label,
        path: ref.url,
        kind: "official-open",
        body: ref.body,
      })),
    ],
    officialReferences: officialReferences.slice(0, 4),
    teachingSummary: definition,
    formula: entry.formula ? cut(entry.formula, 420) : undefined,
    workedExample: example,
    commonMistake: trap,
    checkQuestion: cut(
      `After the worked example on “${entry.title}”, what would you check first if results looked too good to be true?`,
      280,
    ),
    sourceQuotes: [],
    classification: {
      domain: "Management reporting",
      topic: "Management accounting",
      contentType: entry.formula ? "formula" : "definition",
      technicalLevel: "practitioner",
      confidence: 0.93,
    },
    editorialStatus: "editor-approved",
    qualityScore: 0.92,
    maEncyclopediaAt: new Date().toISOString(),
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  const byId = new Map(
    (Array.isArray(index.cards) ? index.cards : []).map((card) => [
      card.id,
      card,
    ]),
  );

  let published = 0;
  let updated = 0;
  let withFormula = 0;
  const entriesById = new Map();
  for (const entry of [...MANAGEMENT_ACCOUNTING_TERMS, ...MA_FORMULA_BANK]) {
    entriesById.set(entry.id, entry);
  }
  for (const entry of entriesById.values()) {
    const card = toCard(entry);
    if (card.formula) withFormula += 1;
    if (byId.has(card.id)) updated += 1;
    else published += 1;
    upsertLibraryCard(byId, card);
    writeFileSync(
      join(CORPUS_DIR, `${card.id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    terms: entriesById.size,
    withFormula,
    published,
    updated,
    totalCards: merged.length,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `ma-encyclopedia: terms=${report.terms} formulas=${withFormula} published=${published} updated=${updated} total=${merged.length}`,
  );
}

main();
