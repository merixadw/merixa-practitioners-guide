import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Reapply the deterministic taxonomy after model enrichment.
 * OpenAI owns prose, never card classification.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyResource } from "../lib/practitioner-taxonomy.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");

if (!existsSync(INDEX_PATH)) {
  throw new Error("content/index.json is missing.");
}

const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
const cards = (index.cards ?? []).map((card) => {
  const sourcePath = card.sources?.[0]?.path ?? "unknown";
  const classification = classifyResource({
    sourcePath,
    title: card.title,
    text: `${card.teachingSummary ?? ""}\n${card.body ?? ""}`,
  });
  return {
    ...card,
    classification: {
      domain: classification.domain,
      topic: classification.topic,
      contentType: classification.contentType,
      technicalLevel: classification.technicalLevel,
      confidence: Number(classification.confidence.toFixed(2)),
    },
  };
});

mkdirSync(CORPUS_DIR, { recursive: true });
for (const card of cards) {
  writeFileSync(
    join(CORPUS_DIR, `${card.id}.json`),
    `${JSON.stringify(card, null, 2)}\n`,
    "utf8",
  );
}
atomicWriteFile(
  INDEX_PATH,
  `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
  "utf8",
);
console.log(`Repaired deterministic classifications: ${cards.length}`);
