import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish multi-domain encyclopedia spine into the corpus index.
 *
 * Usage: npm run library:domains
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_ENCYCLOPEDIA } from "../lib/domain-encyclopedia.mjs";
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
import { upsertLibraryCard } from "../lib/improvement-guardrails.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "domain-encyclopedia-report.json");

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
  const title = entry.title;
  const definition = cut(entry.definition, 720);
  const example = cut(entry.example, 900);
  const trap = cut(entry.trap, 480);
  const uniqueBody = composeUniqueBody({
    definition,
    formula: entry.formula,
  });

  return {
    id: entry.id,
    title,
    body: uniqueBody,
    bodies: entry.bodies,
    tags: [
      "encyclopedia",
      "domain-spine",
      entry.domain.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      entry.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    ],
    workplaceTasks: [],
    sources: [
      {
        label: "Merixa multi-domain practitioner encyclopedia",
        path: "seed/domain-encyclopedia",
        kind: "merixa",
        body: "Merixa",
      },
    ],
    teachingSummary: definition,
    formula: entry.formula ? cut(entry.formula, 420) : undefined,
    workedExample: example,
    commonMistake: trap,
    checkQuestion: cut(
      `What evidence would change your conclusion on “${title}”, and who owns the decision?`,
      220,
    ),
    sourceQuotes: [],
    classification: {
      domain: entry.domain,
      topic: entry.topic,
      contentType: "definition",
      technicalLevel: "practitioner",
      confidence: 0.92,
    },
    editorialStatus: "editor-approved",
    qualityScore: 0.91,
    encyclopediaAt: new Date().toISOString(),
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
  const cards = DOMAIN_ENCYCLOPEDIA.map(toCard);
  for (const card of cards) {
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

  const byDomain = {};
  for (const card of cards) {
    const domain = card.classification.domain;
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    spineTerms: cards.length,
    published,
    updated,
    totalCards: merged.length,
    byDomain,
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `domain-encyclopedia: spine=${cards.length} published=${published} updated=${updated} total=${merged.length}`,
  );
}

main();
