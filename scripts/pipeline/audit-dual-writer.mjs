/**
 * Fail if any script still raw-writes content/index.json outside atomic-write.
 *
 * Allowed:
 *   - scripts/lib/atomic-write.mjs (implements atomicWriteFile via writeFileSync+rename)
 *   - scripts/lib/safe-index-write.mjs (must call atomicWriteFile)
 *   - Comments / strings mentioning writeFileSync without an INDEX write
 *
 * Exit 0 when dualWriterResidual=false; exit 2 when residuals found.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(ROOT, "scripts");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "dual-writer-audit-report.json",
);

const ALLOW_FILES = new Set([
  "scripts/lib/atomic-write.mjs",
  "scripts/pipeline/audit-dual-writer.mjs",
]);

/** Patterns that indicate a direct index write (not via atomicWriteFile). */
const BAD_PATTERNS = [
  /writeFileSync\(\s*INDEX_PATH\b/,
  /writeFileSync\(\s*indexPath\b/,
  /writeJson\(\s*INDEX_PATH\b/,
  /writeFileSync\(\s*join\([^)]*index\.json/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(mjs|js|ts|cjs)$/.test(name)) out.push(full);
  }
  return out;
}

function auditFile(absPath) {
  const rel = relative(ROOT, absPath).replace(/\\/g, "/");
  if (ALLOW_FILES.has(rel)) return [];
  const text = readFileSync(absPath, "utf8");
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) {
      continue;
    }
    for (const re of BAD_PATTERNS) {
      if (re.test(line)) {
        // Allow if same line / previous 3 lines mention atomicWriteFile assignment — still bad.
        // Safe path is atomicWriteFile(INDEX_PATH or safeWriteIndex.
        if (/atomicWriteFile\s*\(\s*INDEX_PATH/.test(line)) continue;
        if (/safeWriteIndex\s*\(/.test(line)) continue;
        hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 160) });
      }
    }
  }
  // Also flag writeFileSync of index when INDEX_PATH is aliased oddly
  if (
    /content["'`]\s*,\s*["'`]index\.json/.test(text) &&
    /writeFileSync\s*\(/.test(text) &&
    !/atomicWriteFile\s*\(/.test(text) &&
    !/safeWriteIndex\s*\(/.test(text) &&
    !ALLOW_FILES.has(rel)
  ) {
    // Heuristic: file touches index path and writeFileSync without atomic helper
    const hasIndexConst =
      /INDEX_PATH\s*=/.test(text) || /indexPath\s*=/.test(text);
    const hasDirect =
      /writeFileSync\(\s*INDEX_PATH/.test(text) ||
      /writeFileSync\(\s*indexPath/.test(text) ||
      /writeJson\(\s*INDEX_PATH/.test(text);
    if (hasIndexConst && hasDirect) {
      // already captured by BAD_PATTERNS
    }
  }
  return hits;
}

function main() {
  const files = walk(SCRIPTS);
  const residuals = [];
  for (const file of files) {
    residuals.push(...auditFile(file));
  }
  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: files.length,
    residualCount: residuals.length,
    dualWriterResidual: residuals.length > 0,
    residuals,
    protocol: {
      lockFile: "content/pipeline/index.lock",
      helper: "scripts/pipeline/index-holder.mjs",
      writePath: "scripts/lib/safe-index-write.mjs → atomicWriteFile + unionMergeWithDiskIndex",
      rule: "One holder at a time; never raw writeFileSync(INDEX_PATH)",
    },
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        dualWriterResidual: report.dualWriterResidual,
        residualCount: report.residualCount,
        report: REPORT_PATH,
        samples: residuals.slice(0, 12),
      },
      null,
      2,
    ),
  );
  if (residuals.length > 0) process.exitCode = 2;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) main();
