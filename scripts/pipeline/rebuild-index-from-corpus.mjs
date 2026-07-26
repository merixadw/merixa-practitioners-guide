/**
 * One-off recovery: rebuild content/index.json from the per-card mirrors in
 * content/corpus/*.json (source of truth) after the 25/07 lost-update race.
 * Backs up the current index to content/pipeline/index-backup-<ts>.json first.
 */
import { copyFileSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import {
  ENCYCLOPEDIA_SHELVES,
  shelfExistingCount,
  shelfTarget,
} from "../lib/encyclopedia-shelf-targets.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");

function sleepMs(ms) {
  const shared = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(shared), 0, 0, ms);
}

/** Windows rename-over-open-file returns EPERM; retry while readers release. */
function atomicWriteWithRetry(path, contents, attempts = 10) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      atomicWriteFile(path, contents);
      return;
    } catch (error) {
      if (error.code !== "EPERM" || attempt >= attempts) throw error;
      console.error(
        `atomicWriteFile EPERM on ${path} (attempt ${attempt}/${attempts}) — retrying`,
      );
      sleepMs(500 * attempt);
    }
  }
}

function cardTimestamp(card) {
  const candidates = [
    card.enrichedAt,
    card.updated,
    card.updatedAt,
    card.shelfExpandAt,
    card.encyclopediaAt,
    card.publishedAt,
  ];
  let best = 0;
  for (const value of candidates) {
    const ms = Date.parse(value || "");
    if (Number.isFinite(ms) && ms > best) best = ms;
  }
  return best;
}

function shelfReport(cards) {
  return ENCYCLOPEDIA_SHELVES.map((shelf) => ({
    shelf: shelf.id,
    count: shelfExistingCount(cards, shelf),
    target: shelfTarget(shelf),
  }));
}

function main() {
  const before = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const beforeCards = Array.isArray(before.cards) ? before.cards : [];

  const files = readdirSync(CORPUS_DIR).filter((f) => f.endsWith(".json"));
  const byId = new Map();
  const duplicates = [];
  const parseErrors = [];
  for (const file of files) {
    let card;
    try {
      card = JSON.parse(readFileSync(join(CORPUS_DIR, file), "utf8"));
    } catch (error) {
      parseErrors.push({ file, error: String(error.message || error) });
      continue;
    }
    if (!card || typeof card.id !== "string" || !card.id) {
      parseErrors.push({ file, error: "missing card id" });
      continue;
    }
    const existing = byId.get(card.id);
    if (existing) {
      const keepNew = cardTimestamp(card) >= cardTimestamp(existing.card);
      duplicates.push({
        id: card.id,
        kept: keepNew ? file : existing.file,
        dropped: keepNew ? existing.file : file,
      });
      if (keepNew) byId.set(card.id, { card, file });
      continue;
    }
    byId.set(card.id, { card, file });
  }

  const merged = [...byId.values()]
    .map((entry) => entry.card)
    .sort((left, right) => String(left.title).localeCompare(String(right.title)));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(PIPELINE_DIR, `index-backup-${stamp}.json`);
  copyFileSync(INDEX_PATH, backupPath);

  const next = buildIndexFromCards(merged);
  atomicWriteWithRetry(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`);

  const fillerIds = merged
    .filter((card) =>
      JSON.stringify(card).includes("is a practitioner concept in"),
    )
    .map((card) => card.id);

  const enriched = merged.filter((c) => c.enrichedAt).length;
  const report = {
    backupPath,
    corpusFiles: files.length,
    parseErrors,
    duplicates,
    before: {
      cards: beforeCards.length,
      enriched: beforeCards.filter((c) => c.enrichedAt).length,
      shelves: shelfReport(beforeCards),
    },
    after: {
      cards: merged.length,
      enriched,
      enrichedShare: merged.length
        ? Math.round((enriched / merged.length) * 1000) / 1000
        : 0,
      shelves: shelfReport(merged),
    },
    heuristicFillerCardIds: fillerIds,
  };
  console.log(JSON.stringify(report, null, 2));
}

main();
