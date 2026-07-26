/**
 * Shared path + Library card linkage for expansion pipelines.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Parse PATH_CARD_REMAP from path-card-remap.ts (single source in app). */
export function loadPathCardRemap() {
  const src = readFileSync(
    join(ROOT, "src", "lib", "guide", "path-card-remap.ts"),
    "utf8",
  );
  const remap = {};
  for (const match of src.matchAll(/"([^"]+)":\s*"([^"]+)"/g)) {
    remap[match[1]] = match[2];
  }
  return remap;
}

export function remapCardId(cardId, remap = loadPathCardRemap()) {
  if (!cardId) return undefined;
  return remap[cardId] ?? cardId;
}

function readJson(path) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Soft-launch enrich priority (higher = sooner):
 *   flagship/core (paths.ts) → FA/FRM/IFRS → priority domains → cross-body → domain shelves
 */
export const PATH_TIER = {
  flagship: 400,
  faFrmIfrs: 300,
  priority: 200,
  crossBody: 150,
  domainShelf: 100,
};

function collectIds(paths, remap) {
  const ids = new Set();
  for (const path of paths) {
    for (const step of path.steps ?? []) {
      const id = remapCardId(step.cardId, remap);
      if (id) ids.add(id);
    }
  }
  return ids;
}

function loadCorePathsFromTs() {
  const coreSrc = readFileSync(
    join(ROOT, "src", "lib", "guide", "paths.ts"),
    "utf8",
  );
  const corePaths = [];
  for (const match of coreSrc.matchAll(
    /id:\s*"([^"]+)"[\s\S]*?steps:\s*\[([\s\S]*?)\],\s*\n\s*\}/g,
  )) {
    const stepsBlock = match[2];
    const steps = [];
    for (const stepMatch of stepsBlock.matchAll(/cardId:\s*"([^"]+)"/g)) {
      steps.push({ cardId: stepMatch[1] });
    }
    if (steps.length > 0) {
      corePaths.push({ id: match[1], steps });
    }
  }
  return corePaths;
}

/** Best path tier score per card id (0 if not on any path). */
export function pathCardTier(remap = loadPathCardRemap()) {
  const tiers = new Map();
  const bump = (ids, score) => {
    for (const id of ids) {
      const prev = tiers.get(id) || 0;
      if (score > prev) tiers.set(id, score);
    }
  };

  bump(collectIds(loadCorePathsFromTs(), remap), PATH_TIER.flagship);
  bump(
    collectIds(
      [
        ...readJson(join(ROOT, "src", "lib", "guide", "ifrs-paths.generated.json")),
        ...readJson(join(ROOT, "src", "lib", "guide", "frm-paths.generated.json")),
        ...readJson(join(ROOT, "src", "lib", "guide", "fa-paths.generated.json")),
      ],
      remap,
    ),
    PATH_TIER.faFrmIfrs,
  );
  bump(
    collectIds(
      readJson(
        join(ROOT, "src", "lib", "guide", "priority-domain-paths.generated.json"),
      ),
      remap,
    ),
    PATH_TIER.priority,
  );
  bump(
    collectIds(
      readJson(
        join(ROOT, "src", "lib", "guide", "cross-body-paths.generated.json"),
      ),
      remap,
    ),
    PATH_TIER.crossBody,
  );
  bump(
    collectIds(
      readJson(
        join(ROOT, "src", "lib", "guide", "domain-shelf-paths.generated.json"),
      ),
      remap,
    ),
    PATH_TIER.domainShelf,
  );
  bump(
    collectIds(
      readJson(
        join(ROOT, "src", "lib", "guide", "orphan-family-paths.generated.json"),
      ),
      remap,
    ),
    PATH_TIER.domainShelf,
  );

  return tiers;
}

/** All learning paths: generated JSON + cardId refs from paths.ts core routes. */
export function loadAllPaths() {
  const generated = [
    ...readJson(
      join(ROOT, "src", "lib", "guide", "ifrs-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "frm-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "fa-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "cross-body-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "priority-domain-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "domain-shelf-paths.generated.json"),
    ),
    ...readJson(
      join(ROOT, "src", "lib", "guide", "orphan-family-paths.generated.json"),
    ),
  ];
  return [...generated, ...loadCorePathsFromTs()];
}

/** Unique remapped card ids referenced by any path step. */
export function pathCardIds(remap = loadPathCardRemap()) {
  const ids = new Set();
  for (const path of loadAllPaths()) {
    for (const step of path.steps ?? []) {
      const id = remapCardId(step.cardId, remap);
      if (id) ids.add(id);
    }
  }
  return ids;
}

export function auditPathCoverage(indexPath = join(ROOT, "content", "index.json")) {
  const remap = loadPathCardRemap();
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const cardIds = new Set((index.cards ?? []).map((card) => card.id));
  const refs = pathCardIds(remap);
  const missing = [...refs].filter((id) => !cardIds.has(id)).sort();
  const onPath = [...refs].filter((id) => cardIds.has(id));
  const thinOnPath = onPath.filter((id) => {
    const card = (index.cards ?? []).find((item) => item.id === id);
    if (!card) return false;
    const def = String(card.teachingSummary || card.body || "");
    const ex = String(card.workedExample || "");
    return def.length < 280 || ex.length < 450;
  });
  return {
    pathCardRefs: refs.size,
    inIndex: onPath.length,
    missing: missing.length,
    missingIds: missing,
    thinOnPath: thinOnPath.length,
    thinOnPathIds: thinOnPath.slice(0, 40),
  };
}
