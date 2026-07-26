import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish FRM encyclopedia (concepts + formulas) into the corpus.
 *
 * Usage: npm run library:frm-encyclopedia
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
import { FRM_ENCYCLOPEDIA } from "../lib/frm-encyclopedia-catalog.mjs";
import { upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "frm-encyclopedia-report.json");

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
  const topic = entry.topic || "Risk management";
  const domainSlug = entry.domainSlug || "formula-bank";

  return {
    id: entry.id,
    title: entry.title,
    body: composeUniqueBody({
      definition,
      formula: entry.formula,
    }),
    bodies: ["FRM", "CFA", "Merixa"],
    tags: [
      "encyclopedia",
      "frm-encyclopedia",
      "risk-formulas",
      "domain-spine",
      `frm-${domainSlug}`,
    ],
    workplaceTasks: [],
    sources: [
      {
        label: "Merixa FRM encyclopedia",
        path: `seed/frm-encyclopedia/${domainSlug}`,
        kind: "merixa",
        body: "Merixa",
      },
    ],
    teachingSummary: definition,
    formula: entry.formula ? cut(entry.formula, 420) : undefined,
    workedExample: example,
    commonMistake: trap,
    checkQuestion: cut(
      entry.formula
        ? `Using the formula for “${entry.title}”, what input would you sanity-check first in practice?`
        : `After the worked example on “${entry.title}”, what would you verify before relying on the conclusion?`,
      280,
    ),
    sourceQuotes: [],
    classification: {
      domain: "Risk management",
      topic,
      contentType: entry.formula ? "formula" : "definition",
      technicalLevel: "practitioner",
      confidence: 0.93,
    },
    editorialStatus: "editor-approved",
    qualityScore: entry.formula ? 0.94 : 0.92,
    frmEncyclopediaAt: new Date().toISOString(),
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
  for (const entry of FRM_ENCYCLOPEDIA) {
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
    terms: FRM_ENCYCLOPEDIA.length,
    withFormula,
    published,
    updated,
    totalCards: merged.length,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `frm-encyclopedia: terms=${report.terms} formulas=${withFormula} published=${published} updated=${updated} total=${merged.length}`,
  );
}

main();
