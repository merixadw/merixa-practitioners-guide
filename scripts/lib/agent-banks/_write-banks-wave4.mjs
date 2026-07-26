/**
 * Merge wave-4 frm/crma drafts into shelf banks.
 * Run: node scripts/lib/agent-banks/_write-banks-wave4.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dedupe } from "./wave4-shared.mjs";
import { FRM_WAVE4_A } from "./wave4-frm-a.mjs";
import { FRM_WAVE4_B } from "./wave4-frm-b.mjs";
import { FRM_WAVE4_C } from "./wave4-frm-c.mjs";
import { CRMA_WAVE4 } from "./wave4-crma.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));

async function loadExisting(name, exportName) {
  const mod = await import(
    pathToFileURL(join(DIR, `${name}.mjs`)).href + `?t=${Date.now()}`
  );
  return mod[exportName] || [];
}

function emit(name, exportName, drafts) {
  writeFileSync(
    join(DIR, `${name}.mjs`),
    `/** Agent-authored ${name} encyclopedia drafts — workplace only. */\nexport const ${exportName} = ${JSON.stringify(drafts, null, 2)};\n`,
    "utf8",
  );
  console.log(name, drafts.length);
}

const frmWave4 = dedupe([...FRM_WAVE4_A, ...FRM_WAVE4_B, ...FRM_WAVE4_C]);
const crmaWave4 = dedupe([...CRMA_WAVE4]);

const frm = dedupe([...(await loadExisting("frm", "FRM_DRAFTS")), ...frmWave4]);
const crma = dedupe([
  ...(await loadExisting("crma", "CRMA_DRAFTS")),
  ...crmaWave4,
]);

emit("frm", "FRM_DRAFTS", frm);
emit("crma", "CRMA_DRAFTS", crma);

console.log("wave4 sizes", {
  frmW4: frmWave4.length,
  crmaW4: crmaWave4.length,
  frmA: FRM_WAVE4_A.length,
  frmB: FRM_WAVE4_B.length,
  frmC: FRM_WAVE4_C.length,
});
