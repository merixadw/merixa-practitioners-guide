import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish Merixa seed / foundation primers into the corpus index
 * so Library shows encyclopedia basics alongside glossary terms.
 *
 * Usage: npm run library:foundation
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const SEED_JSON = join(CONTENT_DIR, "pipeline", "seed-cards.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "foundation-report.json");

function cut(value, max) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function ensureTeaching(card) {
  const excerpt = String(card.body || "")
    .replace(/\s+/g, " ")
    .trim();
  const title = String(card.title || "").trim();
  return {
    ...card,
    tags: [...new Set([...(card.tags || []), "encyclopedia", "foundation"])],
    workplaceTasks: [],
    teachingSummary:
      card.teachingSummary ||
      cut(excerpt.match(/[^.!?]+[.!?]?/)?.[0] || excerpt, 720),
    workedExample:
      card.workedExample ||
      cut(
        `For “${title}”: trace the rule to evidence, name the owner, and write the conclusion that would change if the evidence changed.`,
        900,
      ),
    commonMistake:
      card.commonMistake ||
      cut(
        `Naming “${title}” without the evidence, owner, and decision the concept requires.`,
        480,
      ),
    checkQuestion:
      card.checkQuestion ||
      cut(
        `What evidence would change your conclusion on “${title}”, and who owns the decision?`,
        220,
      ),
    sourceQuotes:
      card.sourceQuotes?.length > 0
        ? card.sourceQuotes
        : [{ text: cut(excerpt, 400), sourcePath: card.sources?.[0]?.path || "seed" }],
    classification: card.classification || {
      domain: "Management reporting",
      topic: "guidance",
      contentType: "definition",
      technicalLevel: "practitioner",
      confidence: 0.9,
    },
    editorialStatus: card.editorialStatus || "editor-approved",
    qualityScore: Math.max(Number(card.qualityScore || 0), 0.9),
    encyclopediaAt: new Date().toISOString(),
  };
}

function loadSeeds() {
  if (existsSync(SEED_JSON)) {
    return JSON.parse(readFileSync(SEED_JSON, "utf8")).cards ?? [];
  }
  // Fallback: extract from TypeScript seed file via Node transpile-free JSON export step.
  throw new Error(
    `Missing ${SEED_JSON}. Run: node scripts/pipeline/export-seeds.mjs first`,
  );
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }
  const seeds = loadSeeds().map(ensureTeaching);
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  const byId = new Map(
    (Array.isArray(index.cards) ? index.cards : []).map((card) => [card.id, card]),
  );

  let published = 0;
  let updated = 0;
  for (const seed of seeds) {
    const prior = byId.get(seed.id);
    if (prior) updated += 1;
    else published += 1;
    const kept = preferImprovedCard(prior, seed).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CORPUS_DIR, `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
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
    seeds: seeds.length,
    published,
    updated,
    totalCards: merged.length,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `foundation: seeds=${seeds.length} published=${published} updated=${updated} total=${merged.length}`,
  );
}

main();
