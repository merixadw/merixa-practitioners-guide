import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish priority domain paths (tax, sustainability, project delivery, etc.).
 *
 * Usage: npm run library:priority-paths
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRIORITY_DOMAIN_PATHS } from "../lib/priority-domain-paths-catalog.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const REPORT_PATH = join(CONTENT_DIR, "pipeline", "priority-paths-report.json");
const PATHS_OUT = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "priority-domain-paths.generated.json",
);

function toPath(domain) {
  return {
    id: `priority-path-${domain.slug}`,
    title: domain.title,
    summary: domain.summary,
    bodies: domain.bodies,
    steps: domain.steps.map((step) => ({
      id: step.id,
      title: step.title,
      summary: step.title,
      cardId: step.cardId,
    })),
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  mkdirSync(dirname(PATHS_OUT), { recursive: true });

  const paths = PRIORITY_DOMAIN_PATHS.map(toPath);
  const report = {
    generatedAt: new Date().toISOString(),
    paths: paths.length,
    totalSteps: paths.reduce((sum, path) => sum + path.steps.length, 0),
    slugs: paths.map((path) => path.id),
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
    `priority-paths: paths=${report.paths} steps=${report.totalSteps}`,
  );
}

main();
