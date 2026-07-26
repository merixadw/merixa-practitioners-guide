/**
 * Snapshot Library index before bulk pipeline writes.
 * Keeps the last N dated backups under content/pipeline/backups/.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const MAX_BACKUPS = 8;

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function backupCorpus(contentDir, reason = "pipeline") {
  const indexPath = join(contentDir, "index.json");
  if (!existsSync(indexPath)) {
    return { ok: false, reason: "no-index" };
  }

  const backupRoot = join(contentDir, "pipeline", "backups");
  const dir = join(backupRoot, `${stamp()}-${reason}`);
  mkdirSync(dir, { recursive: true });

  copyFileSync(indexPath, join(dir, "index.json"));

  let cardCount = 0;
  let enrichedCount = 0;
  try {
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    const cards = Array.isArray(index.cards) ? index.cards : [];
    cardCount = cards.length;
    enrichedCount = cards.filter((card) => card.enrichedAt).length;
  } catch {
    // Manifest still written even if parse fails.
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    reason,
    cardCount,
    enrichedCount,
    indexBytes: statSync(indexPath).size,
    note: "index.json snapshot for restore. Replace content/index.json from this folder if a pipeline regresses counts.",
  };
  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  pruneOldBackups(backupRoot);
  return { ok: true, dir, ...manifest };
}

function pruneOldBackups(backupRoot) {
  if (!existsSync(backupRoot)) return;
  const dirs = readdirSync(backupRoot)
    .map((name) => join(backupRoot, name))
    .filter((path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    })
    .sort(
      (left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs,
    );
  for (const path of dirs.slice(MAX_BACKUPS)) {
    rmSync(path, { recursive: true, force: true });
  }
}
