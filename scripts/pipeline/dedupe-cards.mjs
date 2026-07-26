import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Rewrite card bodies so they do not repeat definition + formula.
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
  residualTechnicalDetail,
  textOverlapRatio,
} from "../lib/card-dedupe.mjs";
import { cleanFormula, distinctEvidenceQuotes } from "../lib/evidence-quotes.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(ROOT, "content", "pipeline", "dedupe-report.json");

function extractInterpretation(body, definition) {
  const text = String(body || "");
  const match = text.match(/Interpretation:\s*([^]+?)(?=\s(?:Related|Evidence|Trap|Example):|$)/i);
  if (match?.[1]) return match[1].replace(/\s+/g, " ").trim();
  const residual = residualTechnicalDetail({
    body: text,
    teachingSummary: definition,
  });
  return residual || "";
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  let bodiesRewritten = 0;
  let quotesRemoved = 0;
  let examplesCleared = 0;

  const cards = (index.cards ?? []).map((card) => {
    const definition = String(card.teachingSummary || "").trim();
    const formula = cleanFormula(card.formula) || cleanFormula(
      String(card.body || "").match(/Formula:\s*([^\n]+)/i)?.[1],
    );
    const interpretation = extractInterpretation(card.body, definition);
    const relatedMatch = String(card.body || "").match(
      /Related:\s*([^]+?)(?=\s(?:Evidence|Trap):|$)/i,
    );
    const related = relatedMatch?.[1]?.replace(/\s+/g, " ").trim();

    const body = composeUniqueBody({
      definition,
      formula,
      interpretation,
      related,
    });
    if (body !== card.body) bodiesRewritten += 1;

    const beforeQuotes = (card.sourceQuotes ?? []).length;
    quotesRemoved += beforeQuotes;

    let workedExample = card.workedExample;
    if (
      workedExample &&
      definition &&
      textOverlapRatio(workedExample, definition) >= 0.55
    ) {
      workedExample = undefined;
      examplesCleared += 1;
    }

    const next = {
      ...card,
      body,
      formula: formula || card.formula,
      teachingSummary: definition || card.teachingSummary,
      workedExample,
      sourceQuotes: [],
    };
    writeFileSync(
      join(CORPUS_DIR, `${next.id}.json`),
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    return next;
  });

  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
    "utf8",
  );
  const report = {
    generatedAt: new Date().toISOString(),
    cards: cards.length,
    bodiesRewritten,
    quotesRemoved,
    examplesCleared,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `dedupe: cards=${cards.length} bodies=${bodiesRewritten} quotesRemoved=${quotesRemoved} examplesCleared=${examplesCleared}`,
  );
}

main();
