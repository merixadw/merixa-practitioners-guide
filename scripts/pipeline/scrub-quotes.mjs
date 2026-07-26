import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Scrub redundant evidence quotes that merely restate definitions,
 * and lift Formula: lines into card.formula when missing.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanFormula } from "../lib/evidence-quotes.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "scrub-quotes-report.json",
);

function liftFormula(card) {
  if (card.formula) return cleanFormula(card.formula);
  const fromBody = String(card.body || "").match(
    /Formula:\s*([^\n]+)/i,
  );
  return fromBody ? cleanFormula(fromBody[1]) : undefined;
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  let quotesRemoved = 0;
  let formulasLifted = 0;
  const cards = (index.cards ?? []).map((card) => {
    const before = (card.sourceQuotes ?? []).length;
    quotesRemoved += before;
    const formula = liftFormula(card);
    if (formula && !card.formula) formulasLifted += 1;
    const next = {
      ...card,
      formula: formula || undefined,
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
    quotesRemoved,
    formulasLifted,
    withFormula: cards.filter((card) => Boolean(card.formula)).length,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `scrub: cards=${cards.length} quotesRemoved=${quotesRemoved} formulasLifted=${formulasLifted} withFormula=${report.withFormula}`,
  );
}

main();
