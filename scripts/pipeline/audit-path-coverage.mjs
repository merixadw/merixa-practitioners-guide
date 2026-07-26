/**
 * Path coverage audit — uses remap + all path sources.
 * Run: node scripts/pipeline/audit-path-coverage.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditPathCoverage } from "../lib/path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const report = auditPathCoverage(join(ROOT, "content", "index.json"));
console.log(JSON.stringify(report, null, 2));
writeFileSync(
  join(ROOT, "content", "pipeline", "path-coverage-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
