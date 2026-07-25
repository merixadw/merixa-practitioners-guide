/**
 * Path enrich priority tiers (standalone — avoid broken pathCardTiers re-export).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PATH_TIER,
  loadPathCardRemap,
  remapCardId,
} from "./path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(path) {
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8"));
}

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
export function getPathCardTiers(remap = loadPathCardRemap()) {
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

  return tiers;
}
