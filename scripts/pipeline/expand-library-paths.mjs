/**
 * Expand Library + Paths together — publish cards/paths, then OpenAI enrich path steps.
 *
 * Usage:
 *   npm run library:expand
 *   npm run library:expand -- --generate=2 --enrich-limit=80
 *   npm run library:expand -- --skip-enrich --publish-only
 *   npm run library:expand -- --until-done
 *
 * Requires OPENAI_API_KEY for --generate and enrichment.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { auditPathCoverage } from "../lib/path-sources.mjs";
import { generateCrossBodyPaths } from "./generate-cross-body-paths.mjs";
import { runBatch } from "./enrich-library.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const REPORT_PATH = join(PIPELINE_DIR, "expand-library-paths-report.json");

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback) {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  const value = Number(hit.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function runNode(script, extraArgs = []) {
  const result = spawnSync(
    process.execPath,
    [join(ROOT, script), ...extraArgs],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    throw new Error(`${script} exited ${result.status ?? "unknown"}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const publishOnly = flag(argv, "--publish-only");
  const skipPublish = flag(argv, "--skip-publish");
  const skipEnrich = flag(argv, "--skip-enrich") || publishOnly;
  const generateCount = flagValue(argv, "--generate", 0);
  const enrichLimit = flagValue(argv, "--enrich-limit", 60);
  const untilDone = flag(argv, "--until-done");
  const dryRun = flag(argv, "--dry-run");

  mkdirSync(PIPELINE_DIR, { recursive: true });

  const report = {
    startedAt: new Date().toISOString(),
    steps: [],
    coverageBefore: auditPathCoverage(),
    coverageAfter: null,
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
  };

  console.log("\n=== expand-library-paths ===\n");
  console.log("coverage before:", report.coverageBefore);

  if (!skipPublish) {
    const publishScripts = [
      "scripts/pipeline/publish-tax-encyclopedia.mjs",
      "scripts/pipeline/publish-domain-encyclopedia.mjs",
      "scripts/pipeline/publish-management-accounting.mjs",
      "scripts/pipeline/publish-frm-encyclopedia.mjs",
      "scripts/pipeline/publish-fa-encyclopedia.mjs",
      "scripts/pipeline/publish-crma-encyclopedia.mjs",
      "scripts/pipeline/publish-coso-encyclopedia.mjs",
      "scripts/pipeline/publish-ifrs-paths.mjs",
      "scripts/pipeline/publish-frm-paths.mjs",
      "scripts/pipeline/publish-fa-paths.mjs",
      "scripts/pipeline/publish-priority-domain-paths.mjs",
    ];
    for (const script of publishScripts) {
      console.log(`\n→ ${script}`);
      runNode(script);
      report.steps.push({ step: script, ok: true });
    }
    report.coverageAfterPublish = auditPathCoverage();
    console.log("coverage after publish:", report.coverageAfterPublish);
  }

  if (generateCount > 0) {
    console.log(`\n→ OpenAI cross-body paths (limit=${generateCount})`);
    const gen = await generateCrossBodyPaths({
      limit: generateCount,
      dryRun,
    });
    report.steps.push({ step: "generate-cross-body-paths", ...gen });
    report.coverageAfterGenerate = auditPathCoverage();
    console.log("coverage after generate:", report.coverageAfterGenerate);
  }

  if (!skipEnrich) {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      console.warn(
        "\n⚠ OPENAI_API_KEY not set — skipping enrichment. Set key in .env.local",
      );
    } else {
      const enrichArgv = ["--path-first"];
      const maxRounds = untilDone ? 30 : 1;
      console.log(
        `\n→ OpenAI enrich path-linked cards (limit=${enrichLimit}, rounds=${maxRounds})`,
      );
      let totalUpdated = 0;
      for (let round = 0; round < maxRounds; round += 1) {
        if (round > 0) console.log(`\nenrich round ${round + 1}/${maxRounds}\n`);
        const batch = await runBatch({
          limit: enrichLimit,
          argv: enrichArgv,
        });
        totalUpdated += batch.updated;
        report.steps.push({ step: `enrich-library-r${round + 1}`, ...batch });
        if (batch.updated === 0 || batch.remaining === 0) break;
        if (!untilDone) break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      report.enrichTotalUpdated = totalUpdated;
    }

    if (!dryRun) {
      console.log("\n→ spine-awareness fill (path cards)");
      runNode("scripts/pipeline/fill-spine-awareness.mjs", [
        "--limit=120",
      ]);
      report.steps.push({ step: "fill-spine-awareness", ok: true });
    }
  }

  report.coverageAfter = auditPathCoverage();
  report.finishedAt = new Date().toISOString();
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\n=== done ===");
  console.log("coverage after:", report.coverageAfter);
  console.log(`report: ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
