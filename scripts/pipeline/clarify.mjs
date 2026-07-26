/**
 * Clarify every published card: definition-first summary, one example,
 * one trap — no body-name repetition (chips already carry that).
 *
 * Usage: npm run library:clarify
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { clarifyCardTeaching } from "../lib/teaching-copy.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "clarify-report.json");

async function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("content/index.json missing — run library:rebuild or library:train first.");
  }

  await withIndexHolder("clarify", async () => {
    const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
    mkdirSync(CORPUS_DIR, { recursive: true });

    let clarified = 0;
    let shortened = 0;
    const cards = (index.cards ?? []).map((card) => {
      const before = [
        card.teachingSummary,
        card.workedExample,
        card.commonMistake,
      ]
        .filter(Boolean)
        .join(" ").length;
      const next = clarifyCardTeaching(card);
      const after = [
        next.teachingSummary,
        next.workedExample,
        next.commonMistake,
      ]
        .filter(Boolean)
        .join(" ").length;
      if (after < before) shortened += 1;
      clarified += 1;
      writeFileSync(
        join(CORPUS_DIR, `${next.id}.json`),
        `${JSON.stringify(next, null, 2)}\n`,
        "utf8",
      );
      return next;
    });

    safeWriteIndex(INDEX_PATH, cards, { buildIndex: buildIndexFromCards });

    const sample = cards.slice(0, 3).map((card) => ({
      title: card.title,
      bodies: card.bodies,
      teachingSummary: card.teachingSummary,
      workedExample: card.workedExample,
      commonMistake: card.commonMistake,
    }));

    const report = {
      generatedAt: new Date().toISOString(),
      clarified,
      shortened,
      cards: cards.length,
      sample,
    };
    mkdirSync(dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`clarify: cards=${clarified} shortened=${shortened}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
