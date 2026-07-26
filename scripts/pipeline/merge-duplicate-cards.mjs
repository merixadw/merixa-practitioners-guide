import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Merge duplicate library cards (same normalized title).
 * Keeps the best canonical card; remaps path cardIds; removes duplicates.
 *
 * Usage: npm run library:merge-duplicates
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "merge-duplicates-report.json");
const GUIDE_DIR = join(ROOT, "src", "lib", "guide");

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalScore(card) {
  let score = (card.qualityScore ?? 0.5) * 100;
  const id = String(card.id);
  if (/^(fa|ma|frm|crma|coso)-/.test(id)) score += 50;
  if (id.startsWith("enc-")) score += 35;
  if (id.startsWith("ifrs-")) score += 30;
  if (card.formula) score += 15;
  if (card.workedExample && String(card.workedExample).length > 400) score += 10;
  if (String(card.teachingSummary || "").length > 400) score += 10;
  if (id.startsWith("glossary-")) score -= 20;
  if (/\b[a-f0-9]{8,}\b/.test(id)) score -= 25;
  return score;
}

function mergeTags(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}

function mergeBodies(left, right) {
  return [...new Set([...(left || []), ...(right || [])])];
}

function pickCanonical(group) {
  return [...group].sort((a, b) => canonicalScore(b) - canonicalScore(a))[0];
}

function mergeIntoCanonical(canonical, duplicate) {
  return {
    ...canonical,
    bodies: mergeBodies(canonical.bodies, duplicate.bodies),
    tags: mergeTags(canonical.tags, duplicate.tags),
    teachingSummary:
      String(canonical.teachingSummary || "").length >=
      String(duplicate.teachingSummary || "").length
        ? canonical.teachingSummary
        : duplicate.teachingSummary,
    workedExample:
      String(canonical.workedExample || "").length >=
      String(duplicate.workedExample || "").length
        ? canonical.workedExample
        : duplicate.workedExample,
    commonMistake:
      String(canonical.commonMistake || "").length >=
      String(duplicate.commonMistake || "").length
        ? canonical.commonMistake
        : duplicate.commonMistake,
    formula: canonical.formula || duplicate.formula,
    mergedFrom: [
      ...new Set([
        ...(canonical.mergedFrom || []),
        duplicate.id,
        ...(duplicate.mergedFrom || []),
      ]),
    ],
    aliases: [
      ...new Set([
        ...(canonical.aliases || []),
        duplicate.title,
        ...(duplicate.aliases || []),
      ]),
    ],
    mergedAt: new Date().toISOString(),
  };
}

function remapCardIdsInFile(filePath, idMap) {
  if (!existsSync(filePath)) return 0;
  let text = readFileSync(filePath, "utf8");
  let replacements = 0;
  for (const [from, to] of idMap.entries()) {
    const before = text;
    text = text.replaceAll(`"cardId": "${from}"`, `"cardId": "${to}"`);
    text = text.replaceAll(`cardId: "${from}"`, `cardId: "${to}"`);
    if (text !== before) replacements += 1;
  }
  if (replacements > 0) {
    writeFileSync(filePath, text, "utf8");
  }
  return replacements;
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing index.json");

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const byTitle = new Map();

  for (const card of cards) {
    const key = normalizeTitle(card.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(card);
  }

  const idMap = new Map();
  const removed = [];
  const mergedGroups = [];
  const byId = new Map(cards.map((card) => [card.id, card]));

  for (const [title, group] of byTitle.entries()) {
    if (group.length < 2) continue;
    let canonical = pickCanonical(group);
    const duplicates = group.filter((card) => card.id !== canonical.id);

    for (const duplicate of duplicates) {
      canonical = mergeIntoCanonical(canonical, duplicate);
      idMap.set(duplicate.id, canonical.id);
      byId.delete(duplicate.id);
      removed.push(duplicate.id);
      const corpusPath = join(CORPUS_DIR, `${duplicate.id}.json`);
      if (existsSync(corpusPath)) unlinkSync(corpusPath);
    }

    byId.set(canonical.id, canonical);
    mergedGroups.push({
      title,
      kept: canonical.id,
      removed: duplicates.map((card) => card.id),
    });
  }

  const pathFiles = [
    join(GUIDE_DIR, "paths.ts"),
    join(GUIDE_DIR, "ifrs-paths.generated.json"),
    join(GUIDE_DIR, "frm-paths.generated.json"),
    join(GUIDE_DIR, "fa-paths.generated.json"),
  ];
  let pathRemaps = 0;
  for (const file of pathFiles) {
    pathRemaps += remapCardIdsInFile(file, idMap);
  }

  const merged = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(merged), null, 2)}\n`,
    "utf8",
  );

  for (const card of merged) {
    if (card.mergedFrom?.length) {
      writeFileSync(
        join(CORPUS_DIR, `${card.id}.json`),
        `${JSON.stringify(card, null, 2)}\n`,
        "utf8",
      );
    }
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    duplicateGroups: mergedGroups.length,
    cardsRemoved: removed.length,
    cardsRemaining: merged.length,
    pathFilesUpdated: pathRemaps,
    groups: mergedGroups.slice(0, 40),
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `merge-duplicates: groups=${report.duplicateGroups} removed=${report.cardsRemoved} remaining=${report.cardsRemaining} pathUpdates=${pathRemaps}`,
  );
}

main();
