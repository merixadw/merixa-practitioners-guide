/**
 * Structured visual demonstrations for live AI tutoring (Lite / Premium).
 * Parsed at the API boundary — never trust raw model JSON.
 */

export type TutorChartType = "bar" | "line" | "waterfall" | "compare";

export type TutorTableVisual = {
  kind: "table";
  title: string;
  headers: string[];
  rows: string[][];
  caption?: string;
};

export type TutorChartVisual = {
  kind: "chart";
  title: string;
  chartType: TutorChartType;
  unit?: string;
  points: { label: string; value: number; note?: string }[];
  caption?: string;
};

export type TutorWorksheetVisual = {
  kind: "worksheet";
  title: string;
  lines: { label: string; amount: string; note?: string }[];
  result: string;
  caption?: string;
};

/** One coaching beat in a live spreadsheet walkthrough. */
export type TutorSpreadsheetStep = {
  /** Coach narration for this beat. */
  coach: string;
  /** How many data rows are filled after this step (1..rows.length). */
  revealThrough: number;
  /** 0-based data row to highlight (optional). */
  highlightRow?: number;
  /** Formula bar text, e.g. "=B2+B3-B4". */
  formula?: string;
};

/**
 * Interactive spreadsheet demonstration — step through a working example
 * cell by cell like a live Excel coaching session.
 */
export type TutorSpreadsheetVisual = {
  kind: "spreadsheet";
  title: string;
  columns: string[];
  rows: string[][];
  steps: TutorSpreadsheetStep[];
  caption?: string;
  /** Premium multi-tab: Checks sheet rows (header + data). */
  checks?: string[][];
  /** Premium multi-tab: Watch-fors sheet rows (header + data). */
  watchFors?: string[][];
};

export type TutorVisual =
  | TutorTableVisual
  | TutorChartVisual
  | TutorWorksheetVisual
  | TutorSpreadsheetVisual;

const TITLE_MAX = 80;
const CELL_MAX = 72;
const CAPTION_MAX = 160;
const LABEL_MAX = 48;
const AMOUNT_MAX = 32;
const NOTE_MAX = 100;
const COACH_MAX = 200;
const FORMULA_MAX = 64;
const MAX_HEADERS = 5;
const MAX_ROWS = 8;
const MAX_POINTS = 8;
const MAX_LINES = 10;
const MAX_STEPS = 8;
const MAX_VISUALS = 3;

function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseChartType(value: unknown): TutorChartType {
  if (value === "line" || value === "waterfall" || value === "compare") {
    return value;
  }
  return "bar";
}

function parseTable(raw: Record<string, unknown>): TutorTableVisual | null {
  const title = asTrimmedString(raw.title, TITLE_MAX);
  if (!title) return null;
  const headersRaw = Array.isArray(raw.headers) ? raw.headers : [];
  const headers = headersRaw
    .map((h) => asTrimmedString(h, CELL_MAX))
    .filter((h): h is string => Boolean(h))
    .slice(0, MAX_HEADERS);
  if (headers.length < 2) return null;

  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: string[][] = [];
  for (const row of rowsRaw.slice(0, MAX_ROWS)) {
    if (!Array.isArray(row)) continue;
    const cells = row
      .map((c) => asTrimmedString(c, CELL_MAX) ?? "—")
      .slice(0, headers.length);
    while (cells.length < headers.length) cells.push("—");
    if (cells.some((c) => c !== "—")) rows.push(cells);
  }
  if (rows.length === 0) return null;

  const caption = asTrimmedString(raw.caption, CAPTION_MAX) ?? undefined;
  return { kind: "table", title, headers, rows, caption };
}

function parseChart(raw: Record<string, unknown>): TutorChartVisual | null {
  const title = asTrimmedString(raw.title, TITLE_MAX);
  if (!title) return null;
  const chartType = parseChartType(raw.chartType ?? raw.type);
  const unit = asTrimmedString(raw.unit, 24) ?? undefined;
  const pointsRaw = Array.isArray(raw.points)
    ? raw.points
    : Array.isArray(raw.series)
      ? raw.series
      : [];
  const points: TutorChartVisual["points"] = [];
  for (const point of pointsRaw.slice(0, MAX_POINTS)) {
    if (typeof point !== "object" || point === null) continue;
    const rec = point as Record<string, unknown>;
    const label = asTrimmedString(rec.label ?? rec.name, LABEL_MAX);
    const value = asFiniteNumber(rec.value ?? rec.amount);
    if (!label || value === null) continue;
    const note = asTrimmedString(rec.note, NOTE_MAX) ?? undefined;
    points.push({ label, value, note });
  }
  if (points.length < 2) return null;
  const caption = asTrimmedString(raw.caption, CAPTION_MAX) ?? undefined;
  return { kind: "chart", title, chartType, unit, points, caption };
}

function parseWorksheet(
  raw: Record<string, unknown>,
): TutorWorksheetVisual | null {
  const title = asTrimmedString(raw.title, TITLE_MAX);
  if (!title) return null;
  const linesRaw = Array.isArray(raw.lines) ? raw.lines : [];
  const lines: TutorWorksheetVisual["lines"] = [];
  for (const line of linesRaw.slice(0, MAX_LINES)) {
    if (typeof line !== "object" || line === null) continue;
    const rec = line as Record<string, unknown>;
    const label = asTrimmedString(rec.label, LABEL_MAX);
    if (!label) continue;
    const amount =
      asTrimmedString(rec.amount ?? rec.value, AMOUNT_MAX) ?? "—";
    const note = asTrimmedString(rec.note, NOTE_MAX) ?? undefined;
    lines.push({ label, amount, note });
  }
  if (lines.length < 2) return null;
  const result =
    asTrimmedString(raw.result ?? raw.total, CELL_MAX) ??
    "Illustrative working — check against your numbers.";
  const caption = asTrimmedString(raw.caption, CAPTION_MAX) ?? undefined;
  return { kind: "worksheet", title, lines, result, caption };
}

function defaultSpreadsheetSteps(rows: string[][]): TutorSpreadsheetStep[] {
  return rows.map((row, index) => ({
    coach: `Enter ${row[0] ?? `row ${index + 1}`} into the sheet.`,
    revealThrough: index + 1,
    highlightRow: index,
  }));
}

function parseSideSheet(
  raw: unknown,
  maxRows = 6,
): string[][] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: string[][] = [];
  for (const row of raw.slice(0, maxRows)) {
    if (!Array.isArray(row)) continue;
    const cells = row
      .map((c) => asTrimmedString(c, CELL_MAX) ?? "—")
      .slice(0, 4);
    while (cells.length < 2) cells.push("—");
    if (cells.some((c) => c !== "—")) out.push(cells);
  }
  return out.length >= 2 ? out : undefined;
}

function parseSpreadsheet(
  raw: Record<string, unknown>,
): TutorSpreadsheetVisual | null {
  const title = asTrimmedString(raw.title, TITLE_MAX);
  if (!title) return null;

  const columnsRaw = Array.isArray(raw.columns)
    ? raw.columns
    : Array.isArray(raw.headers)
      ? raw.headers
      : [];
  const columns = columnsRaw
    .map((c) => asTrimmedString(c, CELL_MAX))
    .filter((c): c is string => Boolean(c))
    .slice(0, MAX_HEADERS);
  if (columns.length < 2) return null;

  const rowsRaw = Array.isArray(raw.rows) ? raw.rows : [];
  const rows: string[][] = [];
  for (const row of rowsRaw.slice(0, MAX_ROWS)) {
    if (!Array.isArray(row)) continue;
    const cells = row
      .map((c) => asTrimmedString(c, CELL_MAX) ?? "—")
      .slice(0, columns.length);
    while (cells.length < columns.length) cells.push("—");
    if (cells.some((c) => c !== "—")) rows.push(cells);
  }
  if (rows.length < 2) return null;

  const stepsRaw = Array.isArray(raw.steps) ? raw.steps : [];
  const steps: TutorSpreadsheetStep[] = [];
  for (const step of stepsRaw.slice(0, MAX_STEPS)) {
    if (typeof step !== "object" || step === null) continue;
    const rec = step as Record<string, unknown>;
    const coach =
      asTrimmedString(rec.coach ?? rec.narration ?? rec.label, COACH_MAX) ??
      null;
    if (!coach) continue;
    const reveal =
      asFiniteNumber(rec.revealThrough ?? rec.reveal ?? rec.rows) ??
      steps.length + 1;
    const revealThrough = Math.min(
      rows.length,
      Math.max(1, Math.round(reveal)),
    );
    const highlightRaw = asFiniteNumber(rec.highlightRow ?? rec.row);
    const highlightRow =
      highlightRaw === null
        ? revealThrough - 1
        : Math.min(rows.length - 1, Math.max(0, Math.round(highlightRaw)));
    const formula = asTrimmedString(rec.formula, FORMULA_MAX) ?? undefined;
    steps.push({ coach, revealThrough, highlightRow, formula });
  }

  const resolvedSteps =
    steps.length >= 2 ? steps : defaultSpreadsheetSteps(rows);
  const caption = asTrimmedString(raw.caption, CAPTION_MAX) ?? undefined;
  const checks = parseSideSheet(raw.checks ?? raw.checksRows);
  const watchFors = parseSideSheet(raw.watchFors ?? raw.watchForRows);
  return {
    kind: "spreadsheet",
    title,
    columns,
    rows,
    steps: resolvedSteps.slice(0, MAX_STEPS),
    caption,
    ...(checks ? { checks } : {}),
    ...(watchFors ? { watchFors } : {}),
  };
}

function parseOneVisual(value: unknown): TutorVisual | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const kindRaw = asTrimmedString(raw.kind ?? raw.type, 24)?.toLowerCase();
  switch (kindRaw) {
    case "table":
      return parseTable(raw);
    case "chart":
    case "bar":
    case "line":
    case "waterfall":
    case "compare":
      return parseChart({
        ...raw,
        chartType: kindRaw === "chart" ? raw.chartType : kindRaw,
      });
    case "worksheet":
    case "working":
    case "example":
      return parseWorksheet(raw);
    case "spreadsheet":
    case "sheet":
    case "excel":
    case "workbook":
      return parseSpreadsheet(raw);
    default:
      return null;
  }
}

/** Validate and cap visuals from live AI JSON. */
export function parseTutorVisuals(
  value: unknown,
  max = MAX_VISUALS,
): TutorVisual[] {
  if (!Array.isArray(value)) return [];
  const out: TutorVisual[] = [];
  for (const item of value) {
    if (out.length >= max) break;
    const visual = parseOneVisual(item);
    if (visual) out.push(visual);
  }
  return out;
}

function colLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/** Client safety net when the model returns prose without visuals. */
export function fallbackVisualsFromCard(card: {
  title: string;
  teachingSummary?: string;
  body?: string;
  workedExample?: string;
  commonMistake?: string;
  checkQuestion?: string;
}): TutorVisual[] {
  const summary = (card.teachingSummary || card.body || "").trim().slice(0, 100);
  const atWork = (card.workedExample || "").trim().slice(0, 100);
  const watch = (card.commonMistake || "").trim().slice(0, 80);
  const check = (card.checkQuestion || "").trim().slice(0, 80);

  if (atWork || summary) {
    const rows: string[][] = [
      ["Setup", "—", summary || card.title],
      ["Working", "—", atWork || "Apply the concept to this period’s figures"],
    ];
    if (watch) rows.push(["Watch for", "—", watch]);
    rows.push([
      "Check",
      "—",
      check || "Open the Library card for the paced storyline",
    ]);

    const steps: TutorSpreadsheetStep[] = rows.map((row, index) => ({
      coach:
        index === 0
          ? `Open a blank sheet for “${card.title}”. Label the columns.`
          : index === rows.length - 1
            ? `Finish with a practitioner check on the last row.`
            : `Fill ${colLetter(0)}${index + 2}: ${row[0]}.`,
      revealThrough: index + 1,
      highlightRow: index,
      formula:
        index === rows.length - 1
          ? `=${colLetter(1)}2… review result`
          : undefined,
    }));

    return [
      {
        kind: "spreadsheet",
        title: `Live spreadsheet — ${card.title}`,
        columns: ["Line", "Figure", "Coach note"],
        rows,
        steps,
        caption: "Illustrative walkthrough — adapt cells to your figures.",
      },
    ];
  }

  return [];
}
