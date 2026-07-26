/**
 * Merixa ML backline learning pipeline.
 * Runs the four learning stages in order and records what was learned:
 *   1. Librarian  — catalog every source with provenance and doc classification
 *   2. PhD student — deep-read sources into structured study notes
 *   3. Researcher — synthesize notes into corroborated concepts, flag gaps
 *   4. Teacher    — publish teaching cards to content/corpus + index.json
 *
 * Also seeds content/pipeline/agenda.json so the learning circle can
 * continuously upgrade all four stages afterward.
 *
 * Usage: npm run library:rebuild  (or node scripts/pipeline/run.mjs)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLearningAgenda } from "./agenda.mjs";
import { runLibrarian } from "./librarian.mjs";
import { runScholar } from "./scholar.mjs";
import { runResearcher } from "./researcher.mjs";
import { runTeacher } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");

function main() {
  const catalog = runLibrarian({ contentDir: CONTENT_DIR });
  console.log(
    `1/4 librarian: scanned=${catalog.stats.scanned} cataloged=${catalog.stats.cataloged}`,
  );

  const notebook = runScholar({ contentDir: CONTENT_DIR, catalog });
  console.log(
    `2/4 scholar: sources=${notebook.stats.sourcesStudied} sections=${notebook.stats.sectionsRead} notes=${notebook.stats.notesTaken}`,
  );

  const synthesis = runResearcher({ contentDir: CONTENT_DIR, notebook });
  console.log(
    `3/4 researcher: concepts=${synthesis.stats.concepts} corroborated=${synthesis.stats.corroborated} conflicts=${synthesis.stats.conflicts} gaps=${synthesis.stats.gaps}`,
  );

  let previousIndex = null;
  try {
    previousIndex = JSON.parse(
      readFileSync(join(CONTENT_DIR, "index.json"), "utf8"),
    );
  } catch {
    previousIndex = null;
  }

  const published = runTeacher({
    contentDir: CONTENT_DIR,
    synthesis,
    previousIndex,
  });
  console.log(`4/4 teacher: cards=${published.cards}`);

  const index = JSON.parse(readFileSync(join(CONTENT_DIR, "index.json"), "utf8"));
  const agenda = buildLearningAgenda({
    catalog,
    notebook,
    synthesis,
    index,
    enrichReport: null,
    previousAgenda: null,
  });
  writeFileSync(
    join(CONTENT_DIR, "pipeline", "agenda.json"),
    `${JSON.stringify(agenda, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `agenda seeded: librarian=${agenda.summary.librarian} scholar=${agenda.summary.scholar} researcher=${agenda.summary.researcher} teacher=${agenda.summary.teacher}`,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    librarian: catalog.stats,
    scholar: notebook.stats,
    researcher: synthesis.stats,
    teacher: published,
    researchGaps: synthesis.researchGaps,
    conflicts: synthesis.conflicts,
    agenda: agenda.summary,
  };
  writeFileSync(
    join(CONTENT_DIR, "ingest-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );

  const seamless = spawnSync(
    "npx",
    ["--yes", "tsx", "scripts/pipeline/publish-seamless-corpus.ts"],
    { cwd: ROOT, stdio: "inherit", shell: true },
  );
  if (seamless.status !== 0) {
    console.warn("seamless corpus publish failed — run npm run library:seamless");
  }
}

main();
