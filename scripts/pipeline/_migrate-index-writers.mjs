/**
 * One-shot codemod: replace raw writeFileSync(INDEX_PATH|indexPath) with
 * atomicWriteFile, and inject atomic-write import when missing.
 * Run once then delete if desired.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPTS = join(ROOT, "scripts");

const SKIP = new Set([
  "scripts/lib/atomic-write.mjs",
  "scripts/lib/safe-index-write.mjs",
  "scripts/pipeline/audit-dual-writer.mjs",
  "scripts/pipeline/_migrate-index-writers.mjs",
  "scripts/pipeline/index-holder.mjs",
]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "agent-banks") continue;
      walk(full, out);
    } else if (/\.(mjs|js|ts)$/.test(name)) out.push(full);
  }
  return out;
}

function importPathFor(rel) {
  // scripts/pipeline/foo.mjs → ../lib/atomic-write.mjs
  // scripts/enrich-corpus.mjs → ./lib/atomic-write.mjs
  if (rel.startsWith("scripts/pipeline/")) return "../lib/atomic-write.mjs";
  if (rel.startsWith("scripts/lib/")) return "./atomic-write.mjs";
  if (rel.startsWith("scripts/")) return "./lib/atomic-write.mjs";
  return "../lib/atomic-write.mjs";
}

function migrate(abs) {
  const rel = relative(ROOT, abs).replace(/\\/g, "/");
  if (SKIP.has(rel)) return null;
  let text = readFileSync(abs, "utf8");
  const before = text;

  const hasDirect =
    /writeFileSync\(\s*INDEX_PATH/.test(text) ||
    /writeFileSync\(\s*indexPath/.test(text) ||
    /writeJson\(\s*INDEX_PATH/.test(text);

  if (!hasDirect) return null;

  // Multiline writeFileSync( INDEX_PATH, ... )
  text = text.replace(
    /writeFileSync\(\s*\n(\s*)INDEX_PATH,/g,
    "atomicWriteFile(\n$1INDEX_PATH,",
  );
  text = text.replace(
    /writeFileSync\(\s*\n(\s*)indexPath,/g,
    "atomicWriteFile(\n$1indexPath,",
  );
  // Single-line
  text = text.replace(/writeFileSync\(\s*INDEX_PATH,/g, "atomicWriteFile(INDEX_PATH,");
  text = text.replace(/writeFileSync\(\s*indexPath,/g, "atomicWriteFile(indexPath,");
  // writeJson(INDEX_PATH, ...) — convert to atomicWriteFile with stringify if helper is local
  // Only rewrite writeJson(INDEX_PATH when writeJson is the local helper that uses writeFileSync
  text = text.replace(
    /writeJson\(\s*INDEX_PATH,\s*([^)]+)\)/g,
    "atomicWriteFile(INDEX_PATH, `${JSON.stringify($1, null, 2)}\\n`)",
  );

  if (text === before) return null;

  if (!/from\s+["'][^"']*atomic-write\.mjs["']/.test(text)) {
    const imp = `import { atomicWriteFile } from "${importPathFor(rel)}";\n`;
    // Insert after last import block start — after first import line cluster
    const importBlock = text.match(/^(?:import[\s\S]*?from\s+["'][^"']+["'];\r?\n)+/);
    if (importBlock) {
      const end = importBlock[0].length;
      text = text.slice(0, end) + imp + text.slice(end);
    } else {
      text = imp + text;
    }
  }

  writeFileSync(abs, text, "utf8");
  return rel;
}

const changed = [];
for (const file of walk(SCRIPTS)) {
  const rel = migrate(file);
  if (rel) changed.push(rel);
}
console.log(JSON.stringify({ changed: changed.length, files: changed }, null, 2));
