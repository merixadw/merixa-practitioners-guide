/**
 * Merge wave-3 drafts into shelf banks and re-emit.
 * Run: node scripts/lib/agent-banks/_write-banks-wave3.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dedupe } from "./wave3-shared.mjs";
import { FRM_WAVE3 } from "./wave3-frm.mjs";
import { TAX_WAVE3 } from "./wave3-tax.mjs";
import { COSO_WAVE3 } from "./wave3-coso.mjs";
import { CRMA_WAVE3 } from "./wave3-crma.mjs";
import { IIA_WAVE3 } from "./wave3-iia.mjs";

const DIR = dirname(fileURLToPath(import.meta.url));

async function loadExisting(name, exportName) {
  const mod = await import(pathToFileURL(join(DIR, `${name}.mjs`)).href + `?t=${Date.now()}`);
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

const frm = dedupe([...(await loadExisting("frm", "FRM_DRAFTS")), ...FRM_WAVE3]);
const tax = dedupe([...(await loadExisting("tax", "TAX_DRAFTS")), ...TAX_WAVE3]);
const coso = dedupe([...(await loadExisting("coso", "COSO_DRAFTS")), ...COSO_WAVE3]);
const crma = dedupe([...(await loadExisting("crma", "CRMA_DRAFTS")), ...CRMA_WAVE3]);
const iia = dedupe([...(await loadExisting("iia", "IIA_DRAFTS")), ...IIA_WAVE3]);

emit("frm", "FRM_DRAFTS", frm);
emit("tax", "TAX_DRAFTS", tax);
emit("coso", "COSO_DRAFTS", coso);
emit("crma", "CRMA_DRAFTS", crma);
emit("iia", "IIA_DRAFTS", iia);

console.log("wave3 sizes", {
  frmW3: FRM_WAVE3.length,
  taxW3: TAX_WAVE3.length,
  cosoW3: COSO_WAVE3.length,
  crmaW3: CRMA_WAVE3.length,
  iiaW3: IIA_WAVE3.length,
  totalW3:
    FRM_WAVE3.length +
    TAX_WAVE3.length +
    COSO_WAVE3.length +
    CRMA_WAVE3.length +
    IIA_WAVE3.length,
});
