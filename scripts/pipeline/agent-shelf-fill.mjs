/**
 * Agent-authored shelf fill — publish hand-drafted encyclopedia cards
 * with zero OpenAI calls and no heuristic template filler.
 *
 * Input draft shape (JSON array or JSONL):
 *   { shelfId, title, topic, definition, example, trap, formula? }
 *
 * Usage:
 *   node scripts/pipeline/agent-shelf-fill.mjs --file=content/pipeline/agent-drafts/frm-wave1.jsonl
 *   node scripts/pipeline/agent-shelf-fill.mjs --file=... --dry-run
 *   node scripts/pipeline/agent-shelf-fill.mjs --bank --shelf=frm
 *   node scripts/pipeline/agent-shelf-fill.mjs --bank --all-priority
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import { needsTopicRelevanceRewrite } from "../lib/card-dedupe.mjs";
import {
  ENCYCLOPEDIA_SHELVES,
  shelfExistingCount,
} from "../lib/encyclopedia-shelf-targets.mjs";
import { buildAgentDrafts } from "../lib/agent-authored-banks.mjs";
import { toCard, loadIndex, persistCards } from "./expand-encyclopedia-shelves.mjs";
import { withIndexHolder } from "./index-holder.mjs";

const OPS_PATH = join(
  resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  "content",
  "pipeline",
  "ops-status.json",
);

function volumeFreezeActive() {
  try {
    if (!existsSync(OPS_PATH)) return false;
    const ops = JSON.parse(readFileSync(OPS_PATH, "utf8"));
    return ops?.shelfFloorExpansion?.mode === "frozen";
  } catch {
    return false;
  }
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const DRAFTS_DIR = join(PIPELINE_DIR, "agent-drafts");
const REPORT_PATH = join(PIPELINE_DIR, "agent-shelf-fill-report.json");

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback = "") {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  return hit.split("=").slice(1).join("=") || fallback;
}

function shelfById(id) {
  return ENCYCLOPEDIA_SHELVES.find((shelf) => shelf.id === id) || null;
}

function parseDrafts(raw, fallbackShelfId = "") {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    const arr = JSON.parse(text);
    return (Array.isArray(arr) ? arr : []).map((d) => ({
      ...d,
      shelfId: d.shelfId || fallbackShelfId,
    }));
  }
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const draft = JSON.parse(trimmed);
    out.push({ ...draft, shelfId: draft.shelfId || fallbackShelfId });
  }
  return out;
}

function loadDraftsFromFile(filePath, fallbackShelfId = "") {
  const abs = resolve(ROOT, filePath);
  if (!existsSync(abs)) throw new Error(`Draft file missing: ${abs}`);
  return parseDrafts(readFileSync(abs, "utf8"), fallbackShelfId);
}

function qualityOk(card) {
  if (needsTopicRelevanceRewrite(card)) return false;
  const def = String(card.teachingSummary || "").trim();
  const ex = String(card.workedExample || "").trim();
  const trap = String(card.commonMistake || "").trim();
  if (def.length < 120) return false;
  if (ex.length < 60) return false;
  if (trap.length < 40) return false;
  if (/is a practitioner concept in/i.test(def)) return false;
  if (/Raise “|Raise "/i.test(ex) && !/\d/.test(ex)) return false;
  return true;
}

function stampAgentCard(card) {
  const now = new Date().toISOString();
  const tags = Array.isArray(card.tags) ? [...card.tags] : [];
  if (!tags.includes("agent-authored")) tags.push("agent-authored");
  // Never set enrichedAt — leave OpenAI enrich queue intact.
  const { enrichedAt: _drop, ...rest } = card;
  return {
    ...rest,
    tags,
    agentAuthoredAt: now,
    locallyDeepenedAt: now,
    sourceProvenance: "agent-authored",
    editorialStatus: "agent-authored",
    qualityScore: Math.max(Number(card.qualityScore) || 0, 0.9),
  };
}

function existingTitleSet(cards) {
  const set = new Set();
  for (const card of cards || []) {
    set.add(String(card.title || "").toLowerCase().trim());
  }
  return set;
}

export async function agentShelfFill({ argv = process.argv.slice(2) } = {}) {
  const dryRun = flag(argv, "--dry-run");
  const useBank = flag(argv, "--bank");
  const allPriority = flag(argv, "--all-priority");
  const file = flagValue(argv, "--file", "");
  const shelfFilter = flagValue(argv, "--shelf", "");
  const limit = Number(flagValue(argv, "--limit", "0")) || 0;
  const forceAfterFreeze = flag(argv, "--force-after-freeze");

  if (volumeFreezeActive() && !forceAfterFreeze && !dryRun) {
    throw new Error(
      "VOLUME_FREEZE: shelfFloorExpansion.mode=frozen — refuse agent-shelf-fill minting. Pass --force-after-freeze only with a distinctness report attached (E6).",
    );
  }

  mkdirSync(PIPELINE_DIR, { recursive: true });
  mkdirSync(DRAFTS_DIR, { recursive: true });

  return withIndexHolder("agent-shelf-fill", async () =>
    agentShelfFillInner({
      dryRun,
      useBank,
      allPriority,
      file,
      shelfFilter,
      limit,
    }),
  );
}

async function agentShelfFillInner({
  dryRun,
  useBank,
  allPriority,
  file,
  shelfFilter,
  limit,
}) {

  let drafts = [];
  if (useBank) {
    const shelfIds = allPriority
      ? ["frm", "tax", "coso", "crma", "iia", "fa"]
      : shelfFilter
        ? [shelfFilter]
        : ["frm", "tax", "coso", "crma", "iia", "fa"];
    drafts = buildAgentDrafts({ shelfIds });
  } else if (file) {
    drafts = loadDraftsFromFile(file, shelfFilter);
  } else {
    throw new Error("Provide --file=... or --bank [--shelf=id|--all-priority]");
  }

  if (shelfFilter) {
    drafts = drafts.filter((d) => d.shelfId === shelfFilter);
  }
  if (limit > 0) drafts = drafts.slice(0, limit);

  const index = loadIndex();
  const titleSet = existingTitleSet(index.cards);
  const before = {};
  for (const shelf of ENCYCLOPEDIA_SHELVES) {
    before[shelf.id] = shelfExistingCount(index.cards, shelf);
  }

  const report = {
    startedAt: new Date().toISOString(),
    mode: "agent-authored",
    dryRun,
    source: useBank ? "bank" : file,
    before,
    after: {},
    published: 0,
    updated: 0,
    skippedDuplicate: 0,
    qualitySkip: 0,
    unknownShelf: 0,
    perShelf: {},
    samples: [],
  };

  const ready = [];
  for (const draft of drafts) {
    const shelf = shelfById(draft.shelfId);
    if (!shelf) {
      report.unknownShelf += 1;
      continue;
    }
    const titleKey = String(draft.title || "")
      .toLowerCase()
      .trim();
    if (!titleKey || titleSet.has(titleKey)) {
      report.skippedDuplicate += 1;
      continue;
    }
    const card = stampAgentCard(toCard(shelf, draft, draft.title));
    if (!qualityOk(card)) {
      report.qualitySkip += 1;
      continue;
    }
    titleSet.add(titleKey);
    ready.push(card);
    const bucket = report.perShelf[shelf.id] || {
      published: 0,
      qualitySkip: 0,
      skippedDuplicate: 0,
    };
    bucket.published += 1;
    report.perShelf[shelf.id] = bucket;
    if (report.samples.length < 6) {
      report.samples.push({
        shelfId: shelf.id,
        id: card.id,
        title: card.title,
        topic: card.classification?.topic,
        definition: String(card.teachingSummary || "").slice(0, 220),
        example: String(card.workedExample || "").slice(0, 180),
        trap: String(card.commonMistake || "").slice(0, 140),
      });
    }
  }

  console.log("\n=== agent-shelf-fill ===");
  console.log(`drafts=${drafts.length} ready=${ready.length} dryRun=${dryRun}`);
  console.log("before:", before);

  if (!dryRun && ready.length > 0) {
    const result = persistCards(index, ready);
    report.published = result.published;
    report.updated = result.updated;
    for (const shelf of ENCYCLOPEDIA_SHELVES) {
      report.after[shelf.id] = shelfExistingCount(result.index.cards, shelf);
    }
  } else {
    report.published = dryRun ? 0 : ready.length;
    for (const shelf of ENCYCLOPEDIA_SHELVES) {
      const add = ready.filter((c) =>
        String(c.id || "").startsWith(shelf.idPrefix),
      ).length;
      report.after[shelf.id] = before[shelf.id] + (dryRun ? add : 0);
    }
  }

  report.finishedAt = new Date().toISOString();
  report.readyCount = ready.length;
  atomicWriteFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  // Snapshot draft batch for audit.
  if (!dryRun && ready.length > 0) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    writeFileSync(
      join(DRAFTS_DIR, `published-${stamp}.jsonl`),
      `${ready.map((c) => JSON.stringify({ id: c.id, title: c.title, shelfTag: c.tags?.[1] })).join("\n")}\n`,
      "utf8",
    );
  }

  console.log("after:", report.after);
  console.log(
    `published=${report.published} updated=${report.updated} dupes=${report.skippedDuplicate} qualitySkip=${report.qualitySkip}`,
  );
  console.log("perShelf:", report.perShelf);
  return report;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  agentShelfFill().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
