/**
 * Smoke: build a real .xlsx and verify ZIP/OOXML markers.
 * Run: node --experimental-strip-types scripts/smoke-xlsx.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildXlsx } from "../src/lib/guide/xlsx-build.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content", "tmp");
mkdirSync(outDir, { recursive: true });

const bytes = buildXlsx([
  {
    name: "Working",
    rows: [
      ["Line", "Figure", "Note"],
      ["Revenue", 120, "Period total"],
      ["Cost", 80, "Variable"],
      ["Margin", 40, "=B2-B3"],
    ],
  },
  {
    name: "Coach",
    rows: [
      ["Step", "Coach"],
      [1, "Enter revenue"],
      [2, "Enter cost"],
      [3, "Margin is revenue minus cost"],
    ],
  },
]);

const outPath = join(outDir, "smoke-workbook.xlsx");
writeFileSync(outPath, bytes);

const head = Buffer.from(bytes.subarray(0, 4)).toString("hex");
if (head !== "504b0304") {
  throw new Error(`not a zip local header: ${head}`);
}
const asLatin = Buffer.from(bytes).toString("latin1");
if (!asLatin.includes("xl/workbook.xml")) {
  throw new Error("missing xl/workbook.xml");
}
if (!asLatin.includes("sheetData")) {
  throw new Error("missing sheetData");
}

console.log(`OK ${bytes.length} bytes → ${outPath}`);
