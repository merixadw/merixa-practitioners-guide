import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish financial analysis domain paths.
 *
 * Usage: npm run library:fa-paths
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FA_DOMAINS } from "../lib/fa-encyclopedia-catalog.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "fa-paths-report.json");
const PATHS_OUT = join(ROOT, "src", "lib", "guide", "fa-paths.generated.json");

function toPath(domain) {
  return {
    id: `fa-path-${domain.slug}`,
    title: domain.title,
    summary: domain.summary,
    bodies: ["CFA", "ACCA", "Merixa"],
    steps: domain.steps.map((step, index) => ({
      id: `${domain.slug}-s${index + 1}`,
      title: step.title,
      summary: step.definition.slice(0, 120).replace(/\s+\S*$/, "…"),
      cardId: step.id,
    })),
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(dirname(PATHS_OUT), { recursive: true });

  const paths = FA_DOMAINS.map(toPath);
  const report = {
    generatedAt: new Date().toISOString(),
    domains: FA_DOMAINS.length,
    paths: paths.length,
    totalSteps: paths.reduce((sum, path) => sum + path.steps.length, 0),
  };

  writeFileSync(PATHS_OUT, `${JSON.stringify(paths, null, 2)}\n`, "utf8");
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];
  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
    "utf8",
  );

  console.log(
    `fa-paths: domains=${report.domains} paths=${report.paths} steps=${report.totalSteps}`,
  );
}

main();
