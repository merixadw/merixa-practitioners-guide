import type { TutorSpreadsheetVisual } from "./tutor-visuals";
import type { ProfessorArtefactMode } from "./professor-mode";
import { wantsMultiTabWorkbook } from "./professor-mode";
import {
  buildXlsx,
  uint8ToBase64,
  xlsxMimeType,
  type XlsxSheet,
} from "./xlsx-build";

export type BuiltWorkbook = {
  filename: string;
  title: string;
  mimeType: string;
  bytes: Uint8Array;
  base64: string;
  sheetNames: string[];
};

export type WorkbookBuildOptions = {
  filename?: string;
  when?: Date;
  /** Premium professor multi-tab when set and mode wants it. */
  professorMode?: ProfessorArtefactMode;
  /** Allow professor tabs (Premium only — caller gates). */
  professor?: boolean;
  boardMemo?: string;
};

function slugFilename(title: string, when = new Date()): string {
  const date = when.toISOString().slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${slug || "merixa-workbook"}-${date}.xlsx`;
}

function defaultChecks(visual: TutorSpreadsheetVisual): string[][] {
  if (visual.checks && visual.checks.length >= 2) return visual.checks;
  const formulaSteps = visual.steps.filter((step) => step.formula);
  const rows: string[][] = [["Check", "Figure / test", "Pass if"]];
  if (formulaSteps.length > 0) {
    for (const step of formulaSteps.slice(0, 4)) {
      rows.push([
        step.coach.slice(0, 40),
        step.formula ?? "—",
        "Reconciles to Working",
      ]);
    }
  } else {
    rows.push(["Row total", "Sum key column", "Matches pack / TB"]);
    rows.push(["Sign / direction", "Expected vs actual", "No silent flips"]);
  }
  rows.push(["Owner sign-off", "Named owner", "Evidence attached"]);
  return rows;
}

function defaultWatchFors(visual: TutorSpreadsheetVisual): string[][] {
  if (visual.watchFors && visual.watchFors.length >= 2) return visual.watchFors;
  return [
    ["Watch for", "Why it bites", "What to do"],
    [
      visual.caption?.slice(0, 40) || "Illustrative figures",
      "Copied as if they were the entity’s",
      "Replace with period actuals",
    ],
    [
      "Missing owner",
      "Nobody owns the next move",
      "Name owner + due date on Checks",
    ],
    [
      "One-line comfort",
      "Board gets a slogan, not evidence",
      "Keep Working sheet in the pack",
    ],
  ];
}

/** Turn a Tutor spreadsheet visual into a real .xlsx. */
export function workbookFromSpreadsheet(
  visual: TutorSpreadsheetVisual,
  options?: WorkbookBuildOptions,
): BuiltWorkbook {
  const when = options?.when ?? new Date();
  const workingRows: XlsxSheet["rows"] = [visual.columns, ...visual.rows];

  const coachRows: XlsxSheet["rows"] = [
    ["Step", "Reveal through", "Highlight row", "Formula", "Coach"],
    ...visual.steps.map((step, index) => [
      index + 1,
      step.revealThrough,
      step.highlightRow !== undefined ? step.highlightRow + 2 : "",
      step.formula ?? "",
      step.coach,
    ]),
  ];

  if (visual.caption) {
    coachRows.push([]);
    coachRows.push(["Caption", visual.caption]);
  }

  const sheets: XlsxSheet[] = [
    { name: "Working", rows: workingRows },
  ];

  const mode = options?.professorMode;
  const professor =
    Boolean(options?.professor) &&
    mode !== undefined &&
    wantsMultiTabWorkbook(mode);

  if (professor) {
    sheets.push({ name: "Checks", rows: defaultChecks(visual) });
    sheets.push({ name: "Watch-fors", rows: defaultWatchFors(visual) });
    if (mode === "board") {
      sheets.push({
        name: "Memo",
        rows: [
          ["Board memo"],
          [
            options?.boardMemo?.trim().slice(0, 1200) ||
              "Owner / evidence / decision — replace with chat board memo.",
          ],
        ],
      });
    }
  }

  sheets.push({ name: "Coach", rows: coachRows });

  const bytes = buildXlsx(sheets);
  const filename = options?.filename ?? slugFilename(visual.title, when);

  return {
    filename,
    title: visual.title,
    mimeType: xlsxMimeType(),
    bytes,
    base64: uint8ToBase64(bytes),
    sheetNames: sheets.map((sheet) => sheet.name),
  };
}
