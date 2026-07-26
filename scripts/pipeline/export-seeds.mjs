/**
 * Export SEED_CARDS into content/pipeline/seed-cards.json
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const result = spawnSync(
  "npx",
  ["--yes", "tsx", "scripts/pipeline/export-seeds.ts"],
  { cwd: ROOT, encoding: "utf8", shell: true },
);
process.stdout.write(result.stdout || "");
process.stderr.write(result.stderr || "");
process.exit(result.status ?? 1);
