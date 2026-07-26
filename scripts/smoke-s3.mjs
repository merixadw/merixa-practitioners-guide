/**
 * S3 smoke: Premium multi-tab contract + professor mode detect.
 * Run: node --experimental-strip-types scripts/smoke-s3.mjs
 *
 * Builds sheets the same way as workbookFromSpreadsheet (Working / Checks /
 * Watch-fors [/ Memo] / Coach) without pulling Next `@/` path aliases.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildXlsx } from "../src/lib/guide/xlsx-build.ts";
import {
  alwaysAttachWorkbook,
  detectProfessorMode,
  detectTutorCostLane,
  tutorMaxTokens,
  wantsBoardMemo,
  wantsMultiTabWorkbook,
} from "../src/lib/guide/professor-mode.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "content", "tmp");
mkdirSync(outDir, { recursive: true });

if (detectProfessorMode("Make the judgement call on CCC") !== "judgement") {
  throw new Error("mode detect failed for judgement");
}
if (detectProfessorMode("Show as a board-pack spreadsheet working") !== "board") {
  throw new Error("mode detect failed for board");
}
if (!wantsMultiTabWorkbook("harder") || !alwaysAttachWorkbook("implication")) {
  throw new Error("attach / multi-tab flags wrong");
}
if (!wantsBoardMemo("board") || wantsBoardMemo("demo")) {
  throw new Error("board memo flag wrong");
}
if (wantsMultiTabWorkbook("demo")) {
  throw new Error("demo must stay single-tab");
}
if (detectTutorCostLane("Quiz me on accruals ratio") !== "light") {
  throw new Error("quiz should be light lane");
}
if (detectTutorCostLane("Go one level deeper on CCC") !== "light") {
  throw new Error("go deeper should be light lane");
}
if (detectTutorCostLane("What is working capital?") !== "light") {
  throw new Error("plain ask should be light lane");
}
if (
  detectTutorCostLane(
    "Give a senior live spreadsheet demonstration of CCC",
  ) !== "coach"
) {
  throw new Error("spreadsheet demo should be coach lane");
}
if (
  detectTutorCostLane("Make the judgement call on CCC") !== "coach" ||
  tutorMaxTokens("coach", "judgement") < 2000
) {
  throw new Error("judgement coach max_tokens too low");
}
if (tutorMaxTokens("light", "demo") > 1300) {
  throw new Error("light max_tokens too high");
}

function professorSheets(mode, boardMemo) {
  const working = {
    name: "Working",
    rows: [
      ["Option", "CCC", "Note"],
      ["Tighten DSO", "48", "Collections push"],
      ["Base", "53", "As-is"],
    ],
  };
  const checks = {
    name: "Checks",
    rows: [
      ["Check", "Test", "Pass if"],
      ["Sign", "Expected vs actual", "No flips"],
    ],
  };
  const watch = {
    name: "Watch-fors",
    rows: [
      ["Watch for", "Why", "Do"],
      ["Comfort wording", "Board hears slogan", "Keep Working sheet"],
    ],
  };
  const coach = {
    name: "Coach",
    rows: [
      ["Step", "Coach"],
      [1, "Enter base CCC"],
    ],
  };
  const sheets = [working];
  if (wantsMultiTabWorkbook(mode)) {
    sheets.push(checks, watch);
    if (mode === "board") {
      sheets.push({
        name: "Memo",
        rows: [["Board memo"], [boardMemo || "placeholder"]],
      });
    }
  }
  sheets.push(coach);
  return sheets;
}

const lite = professorSheets("demo");
if (lite.map((s) => s.name).join(",") !== "Working,Coach") {
  throw new Error(`lite sheets: ${lite.map((s) => s.name).join(",")}`);
}

const premium = professorSheets("judgement");
if (
  premium.map((s) => s.name).join(",") !== "Working,Checks,Watch-fors,Coach"
) {
  throw new Error(`premium sheets: ${premium.map((s) => s.name).join(",")}`);
}

const board = professorSheets(
  "board",
  "Owner: FP&A. Evidence: AR ageing. Decision: tighten DSO.",
);
if (
  board.map((s) => s.name).join(",") !==
  "Working,Checks,Watch-fors,Memo,Coach"
) {
  throw new Error(`board sheets: ${board.map((s) => s.name).join(",")}`);
}

const bytes = buildXlsx(premium);
writeFileSync(join(outDir, "smoke-professor.xlsx"), bytes);
const head = Buffer.from(bytes.subarray(0, 4)).toString("hex");
if (head !== "504b0304") throw new Error("not zip");

console.log("OK S3 multi-tab", {
  lite: lite.map((s) => s.name),
  premium: premium.map((s) => s.name),
  board: board.map((s) => s.name),
  bytes: bytes.length,
});
