/**
 * Quarantine non-finance cards (construction, PM, off-domain noise).
 * Moves corpus files to content/corpus-quarantine/ and rebuilds index.
 *
 * Usage: npm run library:quarantine-non-finance
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
import {
  quarantineReason,
  shouldHideWeakCard,
  WEAK_QUALITY_THRESHOLD,
} from "../lib/finance-corpus-filter.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const QUARANTINE_DIR = join(CONTENT_DIR, "corpus-quarantine");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const REPORT_PATH = join(PIPELINE_DIR, "quarantine-report.json");
const GUIDE_DIR = join(ROOT, "src", "lib", "guide");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function remapPathFiles(removedIds) {
  const removed = new Set(removedIds);
  const pathFiles = [
    join(GUIDE_DIR, "ifrs-paths.generated.json"),
    join(GUIDE_DIR, "frm-paths.generated.json"),
    join(GUIDE_DIR, "fa-paths.generated.json"),
  ];
  let updates = 0;
  for (const file of pathFiles) {
    if (!existsSync(file)) continue;
    const paths = readJson(file);
    if (!Array.isArray(paths)) continue;
    let changed = false;
    for (const learningPath of paths) {
      if (!Array.isArray(learningPath.steps)) continue;
      const before = learningPath.steps.length;
      learningPath.steps = learningPath.steps.filter(
        (step) => !removed.has(step.cardId),
      );
      if (learningPath.steps.length !== before) changed = true;
    }
    if (changed) {
      writeJson(file, paths);
      updates += 1;
    }
  }
  return updates;
}

function moveCardToQuarantine(card, reason, quarantined, reasons) {
  reasons[reason] = (reasons[reason] || 0) + 1;
  const quarantinedCard = {
    ...card,
    editorialStatus: "quarantined",
    tags: [...new Set([...(card.tags ?? []), "quarantined", "non-finance"])],
    quarantinedAt: new Date().toISOString(),
    quarantineReason: reason,
  };
  quarantined.push(quarantinedCard);
  const corpusPath = join(CORPUS_DIR, `${card.id}.json`);
  const quarantinePath = join(QUARANTINE_DIR, `${card.id}.json`);
  if (existsSync(corpusPath)) {
    writeFileSync(
      quarantinePath,
      `${JSON.stringify(quarantinedCard, null, 2)}\n`,
      "utf8",
    );
    unlinkSync(corpusPath);
  } else {
    writeFileSync(
      quarantinePath,
      `${JSON.stringify(quarantinedCard, null, 2)}\n`,
      "utf8",
    );
  }
  return quarantinedCard;
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(QUARANTINE_DIR, { recursive: true });
  const index = readJson(INDEX_PATH);
  const cards = Array.isArray(index.cards) ? index.cards : [];

  const kept = [];
  const quarantined = [];
  const demoted = [];
  const reasons = {};

  for (const card of cards) {
    const reason = quarantineReason(card);
    if (reason) {
      moveCardToQuarantine(card, reason, quarantined, reasons);
      continue;
    }

    if (shouldHideWeakCard(card) && (card.qualityScore ?? 0) < WEAK_QUALITY_THRESHOLD) {
      demoted.push(card.id);
      kept.push({
        ...card,
        editorialStatus: "demoted",
        tags: [...new Set([...(card.tags ?? []), "demoted", "needs-enrichment"])],
        demotedAt: new Date().toISOString(),
      });
      writeFileSync(
        join(CORPUS_DIR, `${card.id}.json`),
        `${JSON.stringify(kept[kept.length - 1], null, 2)}\n`,
        "utf8",
      );
      continue;
    }

    kept.push(card);
  }

  const quarantinedIds = new Set(quarantined.map((card) => card.id));
  let corpusSweep = 0;
  for (const fileName of readdirSync(CORPUS_DIR).filter((name) =>
    name.endsWith(".json"),
  )) {
    const corpusPath = join(CORPUS_DIR, fileName);
    const card = readJson(corpusPath);
    const reason = quarantineReason(card);
    if (!reason) continue;
    if (quarantinedIds.has(card.id)) continue;
    moveCardToQuarantine(card, reason, quarantined, reasons);
    quarantinedIds.add(card.id);
    corpusSweep += 1;
  }

  const keptFiltered = kept.filter((card) => !quarantinedIds.has(card.id));
  safeWriteIndex(INDEX_PATH, keptFiltered, {
    buildIndex: buildIndexFromCards,
    deletedIds: quarantinedIds,
  });

  const removedIds = quarantined.map((card) => card.id);
  const pathUpdates = remapPathFiles(removedIds);

  const enrichStatePath = join(PIPELINE_DIR, "enrich-library-state.json");
  if (existsSync(enrichStatePath) && demoted.length > 0) {
    const enrichState = readJson(enrichStatePath, { processedIds: [] });
    const demotedSet = new Set(demoted);
    enrichState.processedIds = (enrichState.processedIds ?? []).filter(
      (id) => !demotedSet.has(id),
    );
    writeJson(enrichStatePath, enrichState);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    cardsBefore: cards.length,
    cardsKept: keptFiltered.length,
    quarantined: quarantined.length,
    corpusSweep,
    demoted: demoted.length,
    reasons,
    quarantinedIds: quarantined.slice(0, 80).map((card) => ({
      id: card.id,
      title: card.title,
      reason: card.quarantineReason,
    })),
    pathReferenceUpdates: pathUpdates,
  };
  writeJson(REPORT_PATH, report);

  console.log(
    `quarantine: kept=${report.cardsKept} quarantined=${report.quarantined} corpusSweep=${corpusSweep} demoted=${report.demoted} pathUpdates=${pathUpdates}`,
  );
}

main();
