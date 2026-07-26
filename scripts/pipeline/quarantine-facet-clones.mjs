/**
 * Quarantine facet-clone spam (P3).
 * Keeps base concepts + up to 2 unique lenses per base; moves the rest to
 * content/corpus-quarantine/, rebuilds index, remaps path steps to base ids
 * when available.
 *
 * Usage:
 *   npm run library:quarantine:facets
 *   npm run library:quarantine:facets -- --dry-run
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
  isFacetCloneTitle,
  planFacetCull,
  splitFacetTitle,
} from "../lib/facet-clones.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const QUARANTINE_DIR = join(CONTENT_DIR, "corpus-quarantine");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const REPORT_PATH = join(PIPELINE_DIR, "facet-cull-report.json");
const COMPLETE_PATH = join(PIPELINE_DIR, "facet-cull-complete.json");
const GUIDE_DIR = join(ROOT, "src", "lib", "guide");

const PATH_FILES = [
  "ifrs-paths.generated.json",
  "frm-paths.generated.json",
  "fa-paths.generated.json",
  "cross-body-paths.generated.json",
  "priority-domain-paths.generated.json",
  "domain-shelf-paths.generated.json",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function moveCardToQuarantine(card, reason) {
  const quarantinedCard = {
    ...card,
    editorialStatus: "quarantined",
    tags: [
      ...new Set([...(card.tags ?? []), "quarantined", "facet-clone"]),
    ],
    quarantinedAt: new Date().toISOString(),
    quarantineReason: reason,
  };
  const corpusPath = join(CORPUS_DIR, `${card.id}.json`);
  const quarantinePath = join(QUARANTINE_DIR, `${card.id}.json`);
  writeFileSync(
    quarantinePath,
    `${JSON.stringify(quarantinedCard, null, 2)}\n`,
    "utf8",
  );
  if (existsSync(corpusPath)) unlinkSync(corpusPath);
  return quarantinedCard;
}

/** Map base title → preferred base card id (non-clone). */
function buildBaseIdByTitle(keptCards) {
  const map = new Map();
  for (const card of keptCards) {
    if (isFacetCloneTitle(card.title)) continue;
    const key = String(card.title || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (!key) continue;
    if (!map.has(key)) map.set(key, card.id);
  }
  return map;
}

function remapPathFiles(quarantineIds, idToBaseId) {
  const removed = new Set(quarantineIds);
  let filesUpdated = 0;
  let stepsRemapped = 0;
  let stepsDropped = 0;

  for (const name of PATH_FILES) {
    const file = join(GUIDE_DIR, name);
    if (!existsSync(file)) continue;
    const paths = readJson(file);
    if (!Array.isArray(paths)) continue;
    let changed = false;
    for (const learningPath of paths) {
      if (!Array.isArray(learningPath.steps)) continue;
      const nextSteps = [];
      for (const step of learningPath.steps) {
        if (!removed.has(step.cardId)) {
          nextSteps.push(step);
          continue;
        }
        const baseId = idToBaseId.get(step.cardId);
        if (baseId && !removed.has(baseId)) {
          nextSteps.push({ ...step, cardId: baseId });
          stepsRemapped += 1;
          changed = true;
        } else {
          stepsDropped += 1;
          changed = true;
        }
      }
      learningPath.steps = nextSteps;
    }
    if (changed) {
      writeJson(file, paths);
      filesUpdated += 1;
    }
  }
  return { filesUpdated, stepsRemapped, stepsDropped };
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");

  const index = readJson(INDEX_PATH);
  const cards = Array.isArray(index.cards) ? index.cards : [];
  const plan = planFacetCull(cards);

  const idToBaseId = new Map();
  const baseByTitle = buildBaseIdByTitle(plan.keep);
  for (const card of plan.quarantine) {
    const { base } = splitFacetTitle(card.title);
    const baseId = baseByTitle.get(base.toLowerCase());
    if (baseId) idToBaseId.set(card.id, baseId);
  }

  if (dryRun) {
    const report = {
      dryRun: true,
      generatedAt: new Date().toISOString(),
      before: cards.length,
      ...plan.stats,
      wouldQuarantineSample: plan.quarantine.slice(0, 30).map((c) => ({
        id: c.id,
        title: c.title,
      })),
    };
    writeJson(join(PIPELINE_DIR, "facet-cull-dry-run.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  mkdirSync(QUARANTINE_DIR, { recursive: true });
  mkdirSync(PIPELINE_DIR, { recursive: true });

  const quarantined = [];
  for (const card of plan.quarantine) {
    quarantined.push(moveCardToQuarantine(card, "facet-clone-duplicate"));
  }

  // Keep corpus files for kept cards in sync if missing (index is source).
  for (const card of plan.keep) {
    const corpusPath = join(CORPUS_DIR, `${card.id}.json`);
    if (!existsSync(corpusPath)) {
      writeFileSync(corpusPath, `${JSON.stringify(card, null, 2)}\n`, "utf8");
    }
  }

  safeWriteIndex(INDEX_PATH, plan.keep, {
    buildIndex: buildIndexFromCards,
    deletedIds: quarantined.map((c) => c.id),
  });

  const pathStats = remapPathFiles(
    quarantined.map((c) => c.id),
    idToBaseId,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    before: cards.length,
    after: plan.keep.length,
    ...plan.stats,
    pathStats,
    quarantinedSample: quarantined.slice(0, 40).map((c) => ({
      id: c.id,
      title: c.title,
    })),
  };
  writeJson(REPORT_PATH, report);

  const complete = {
    phase: "P3",
    status: "done",
    completedAt: new Date().toISOString(),
    cullShareOfClones: plan.stats.cullShareOfClones,
    quarantineCount: plan.stats.quarantineCount,
    keptLenses: plan.stats.keptLenses,
    cloneCountBefore: plan.stats.cloneCount,
    meetsCullTarget: plan.stats.cullShareOfClones >= 0.5,
    report: "content/pipeline/facet-cull-report.json",
  };
  writeJson(COMPLETE_PATH, complete);

  console.log(JSON.stringify({ report, complete }, null, 2));
}

main();
