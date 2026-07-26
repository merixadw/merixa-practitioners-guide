"use client";

import { useState, type ReactNode } from "react";
import type {
  TutorChartVisual,
  TutorSpreadsheetVisual,
  TutorTableVisual,
  TutorVisual,
  TutorWorksheetVisual,
} from "@/lib/guide/tutor-visuals";
import {
  saveWorkbookFromVisual,
  shareWorkbookFromVisual,
} from "@/lib/guide/workbook-store";

function formatChartValue(value: number, unit?: string): string {
  const abs = Math.abs(value);
  const formatted =
    abs >= 1000
      ? value.toLocaleString(undefined, { maximumFractionDigits: 1 })
      : Number.isInteger(value)
        ? String(value)
        : value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

function colLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function SpreadsheetVisual({
  visual,
  professor = false,
  professorMode = "demo",
  boardMemo,
  emphasizeAttach = false,
}: {
  visual: TutorSpreadsheetVisual;
  professor?: boolean;
  professorMode?:
    | "judgement"
    | "board"
    | "stress"
    | "harder"
    | "implication"
    | "demo";
  boardMemo?: string;
  emphasizeAttach?: boolean;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sheetTab, setSheetTab] = useState<"working" | "checks" | "watch">(
    "working",
  );
  const step = visual.steps[stepIndex] ?? visual.steps[0];
  const revealThrough = step?.revealThrough ?? 1;
  const highlightRow = step?.highlightRow;
  const atStart = stepIndex <= 0;
  const atEnd = stepIndex >= visual.steps.length - 1;
  const multiTab = professor && professorMode !== "demo";
  const buildOptions = {
    professor,
    professorMode,
    boardMemo,
  };

  function advanceStep() {
    setStepIndex((i) => Math.min(visual.steps.length - 1, i + 1));
  }

  function rewindStep() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function onSave() {
    setBusy("save");
    setStatus(null);
    const result = await saveWorkbookFromVisual(visual, buildOptions);
    setBusy(null);
    switch (result.kind) {
      case "saved":
        setStatus(
          multiTab
            ? `Saved multi-tab ${result.meta.filename}`
            : `Saved ${result.meta.filename}`,
        );
        break;
      case "downloaded":
        setStatus(
          multiTab
            ? `Downloaded multi-tab ${result.meta.filename}`
            : `Downloaded ${result.meta.filename}`,
        );
        break;
      case "unavailable":
        setStatus(result.message);
        break;
      case "shared":
      case "cancelled":
        break;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  async function onShare() {
    setBusy("share");
    setStatus(null);
    const result = await shareWorkbookFromVisual(visual, buildOptions);
    setBusy(null);
    switch (result.kind) {
      case "shared":
        setStatus(`Shared ${result.meta.filename}`);
        break;
      case "downloaded":
        setStatus(`Downloaded ${result.meta.filename}`);
        break;
      case "saved":
        setStatus(`Saved ${result.meta.filename}`);
        break;
      case "cancelled":
        break;
      case "unavailable":
        setStatus(result.message);
        break;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  const previewRows =
    sheetTab === "checks" && visual.checks
      ? visual.checks
      : sheetTab === "watch" && visual.watchFors
        ? visual.watchFors
        : null;

  return (
    <figure className="tutor-visual spreadsheet motion-sheet">
      <figcaption className="tutor-visual-title">{visual.title}</figcaption>

      {emphasizeAttach ? (
        <p className="tutor-sheet-attach" role="status">
          Workbook artefact ready — Save or Share the .xlsx without leaving Tutor.
        </p>
      ) : null}

      {boardMemo && professorMode === "board" ? (
        <div className="tutor-board-memo">
          <p className="tutor-board-memo-label">Board memo</p>
          <p>{boardMemo}</p>
        </div>
      ) : null}

      <div className="tutor-sheet-chrome">
        <div
          className="tutor-sheet-tabs"
          role={multiTab ? "tablist" : undefined}
          aria-label={multiTab ? "Workbook sheets" : undefined}
        >
          <button
            type="button"
            className={
              sheetTab === "working" ? "tutor-sheet-tab active" : "tutor-sheet-tab"
            }
            role={multiTab ? "tab" : undefined}
            aria-selected={multiTab ? sheetTab === "working" : undefined}
            disabled={!multiTab}
            onClick={() => setSheetTab("working")}
          >
            Working
          </button>
          {multiTab ? (
            <>
              <button
                type="button"
                className={
                  sheetTab === "checks"
                    ? "tutor-sheet-tab active"
                    : "tutor-sheet-tab"
                }
                role="tab"
                aria-selected={sheetTab === "checks"}
                onClick={() => setSheetTab("checks")}
              >
                Checks
              </button>
              <button
                type="button"
                className={
                  sheetTab === "watch"
                    ? "tutor-sheet-tab active"
                    : "tutor-sheet-tab"
                }
                role="tab"
                aria-selected={sheetTab === "watch"}
                onClick={() => setSheetTab("watch")}
              >
                Watch-fors
              </button>
            </>
          ) : null}
        </div>
        <div className="tutor-sheet-export">
          <button
            type="button"
            className="tutor-sheet-btn ghost"
            disabled={busy !== null}
            onClick={() => void onSave()}
          >
            {busy === "save" ? "Saving…" : multiTab ? "Save multi-tab" : "Save .xlsx"}
          </button>
          <button
            type="button"
            className="tutor-sheet-btn primary"
            disabled={busy !== null}
            onClick={() => void onShare()}
          >
            {busy === "share" ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>

      <div className="tutor-sheet-formula motion-flip-up-subtle" aria-live="polite" key={`fx-${sheetTab}-${stepIndex}`}>
        <span className="tutor-sheet-fx">fx</span>
        <span>
          {sheetTab !== "working"
            ? sheetTab === "checks"
              ? "Checks tab — included in Save multi-tab"
              : "Watch-fors tab — included in Save multi-tab"
            : step?.formula
              ? step.formula
              : highlightRow !== undefined
                ? `${colLetter(0)}${highlightRow + 2}`
                : "Ready"}
        </span>
      </div>

      <div className="tutor-sheet-wrap">
        {previewRows ? (
          <table className="tutor-sheet-grid">
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr
                  key={`side-${rowIndex}`}
                  className={
                    rowIndex === 0 ? "tutor-sheet-headers" : "tutor-sheet-row"
                  }
                >
                  <th scope="row">{rowIndex + 1}</th>
                  {row.map((cell, cellIndex) =>
                    rowIndex === 0 ? (
                      <th key={`${rowIndex}-${cellIndex}`} scope="col">
                        {cell}
                      </th>
                    ) : (
                      <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="tutor-sheet-grid">
            <thead>
              <tr>
                <th className="tutor-sheet-corner" scope="col">
                  {" "}
                </th>
                {visual.columns.map((_, colIndex) => (
                  <th key={colLetter(colIndex)} scope="col">
                    {colLetter(colIndex)}
                  </th>
                ))}
              </tr>
              <tr className="tutor-sheet-headers">
                <th scope="row">1</th>
                {visual.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, rowIndex) => {
                const visible = rowIndex < revealThrough;
                const active = highlightRow === rowIndex && visible;
                const justRevealed = visible && rowIndex === revealThrough - 1;
                return (
                  <tr
                    key={`${row[0]}-${rowIndex}`}
                    className={[
                      active
                        ? "tutor-sheet-row active"
                        : visible
                          ? "tutor-sheet-row"
                          : "tutor-sheet-row pending",
                      justRevealed ? "motion-row-reveal" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <th scope="row">{rowIndex + 2}</th>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className={
                          active && cellIndex === 1
                            ? "tutor-sheet-cell focus"
                            : undefined
                        }
                      >
                        {visible ? cell : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {sheetTab === "working" ? (
      <div
        className="tutor-sheet-coach motion-flip-up"
        aria-live="polite"
        key={`coach-${stepIndex}`}
      >
        <p className="tutor-sheet-step-meta">
          Step {stepIndex + 1} of {visual.steps.length}
        </p>
        <p className="tutor-sheet-coach-copy">{step?.coach}</p>
        <div className="tutor-sheet-controls">
          <button
            type="button"
            className="tutor-sheet-btn"
            disabled={atStart}
            onClick={rewindStep}
          >
            Back
          </button>
          <button
            type="button"
            className="tutor-sheet-btn primary"
            disabled={atEnd}
            onClick={advanceStep}
          >
            {atEnd ? "Done" : "Next cell →"}
          </button>
          {!atStart ? (
            <button
              type="button"
              className="tutor-sheet-btn ghost"
              onClick={() => setStepIndex(0)}
            >
              Replay
            </button>
          ) : null}
        </div>
      </div>
      ) : (
        <p className="tutor-sheet-coach-copy">
          Preview only — full Checks and Watch-fors land in the saved .xlsx.
        </p>
      )}

      {status ? (
        <p className="tutor-sheet-export-status" role="status">
          {status}
        </p>
      ) : null}

      {visual.caption ? (
        <p className="tutor-visual-caption">{visual.caption}</p>
      ) : null}
    </figure>
  );
}

function ChartVisual({ visual }: { visual: TutorChartVisual }) {
  const width = 280;
  const height = 128;
  const padX = 8;
  const padTop = 12;
  const padBottom = 28;
  const values = visual.points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, min + 1);
  const span = max - min || 1;
  const plotH = height - padTop - padBottom;
  const plotW = width - padX * 2;
  const n = visual.points.length;

  const yFor = (v: number) => padTop + ((max - v) / span) * plotH;

  let plot: ReactNode;
  switch (visual.chartType) {
    case "line": {
      const coords = visual.points.map((point, i) => {
        const x = padX + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
        const y = yFor(point.value);
        return { x, y, point };
      });
      const d = coords
        .map(
          (c, i) =>
            `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`,
        )
        .join(" ");
      plot = (
        <>
          <line
            x1={padX}
            y1={yFor(0)}
            x2={width - padX}
            y2={yFor(0)}
            className="tutor-chart-axis"
          />
          <path d={d} className="tutor-chart-line" fill="none" />
          {coords.map((c) => (
            <circle
              key={c.point.label}
              cx={c.x}
              cy={c.y}
              r={3.5}
              className="tutor-chart-dot"
            />
          ))}
        </>
      );
      break;
    }
    case "waterfall": {
      let running = 0;
      const bars = visual.points.map((point, i) => {
        const start = running;
        running += point.value;
        const end = running;
        const top = yFor(Math.max(start, end));
        const bottom = yFor(Math.min(start, end));
        const barW = Math.max(10, plotW / n - 6);
        const x = padX + i * (plotW / n) + (plotW / n - barW) / 2;
        return {
          key: point.label,
          x,
          y: top,
          height: Math.max(2, bottom - top),
          up: point.value >= 0,
          barW,
        };
      });
      plot = (
        <>
          <line
            x1={padX}
            y1={yFor(0)}
            x2={width - padX}
            y2={yFor(0)}
            className="tutor-chart-axis"
          />
          {bars.map((bar) => (
            <rect
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={bar.barW}
              height={bar.height}
              className={
                bar.up ? "tutor-chart-bar up" : "tutor-chart-bar down"
              }
              rx={2}
            />
          ))}
        </>
      );
      break;
    }
    case "compare":
    case "bar": {
      const barW = Math.max(10, plotW / n - 6);
      plot = (
        <>
          <line
            x1={padX}
            y1={yFor(0)}
            x2={width - padX}
            y2={yFor(0)}
            className="tutor-chart-axis"
          />
          {visual.points.map((point, i) => {
            const x = padX + i * (plotW / n) + (plotW / n - barW) / 2;
            const y0 = yFor(0);
            const y1 = yFor(point.value);
            const top = Math.min(y0, y1);
            const h = Math.max(2, Math.abs(y1 - y0));
            return (
              <rect
                key={point.label}
                x={x}
                y={top}
                width={barW}
                height={h}
                className={
                  point.value >= 0
                    ? "tutor-chart-bar up"
                    : "tutor-chart-bar down"
                }
                rx={2}
              />
            );
          })}
        </>
      );
      break;
    }
    default: {
      const _exhaustive: never = visual.chartType;
      return _exhaustive;
    }
  }

  return (
    <figure className="tutor-visual chart">
      <figcaption className="tutor-visual-title">{visual.title}</figcaption>
      <svg
        className="tutor-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={visual.title}
      >
        {plot}
        {visual.points.map((point, i) => {
          const x =
            padX + (n === 1 ? plotW / 2 : (i / Math.max(1, n - 1)) * plotW);
          const labelX =
            visual.chartType === "line"
              ? x
              : padX + i * (plotW / n) + plotW / n / 2;
          return (
            <text
              key={`lbl-${point.label}`}
              x={labelX}
              y={height - 8}
              textAnchor="middle"
              className="tutor-chart-label"
            >
              {point.label.length > 8
                ? `${point.label.slice(0, 7)}…`
                : point.label}
            </text>
          );
        })}
      </svg>
      <ul className="tutor-chart-legend">
        {visual.points.map((point) => (
          <li key={point.label}>
            <strong>{point.label}</strong>
            <span>{formatChartValue(point.value, visual.unit)}</span>
            {point.note ? <em>{point.note}</em> : null}
          </li>
        ))}
      </ul>
      {visual.caption ? (
        <p className="tutor-visual-caption">{visual.caption}</p>
      ) : null}
    </figure>
  );
}

function TableVisual({ visual }: { visual: TutorTableVisual }) {
  return (
    <figure className="tutor-visual table">
      <figcaption className="tutor-visual-title">{visual.title}</figcaption>
      <div className="tutor-table-wrap">
        <table>
          <thead>
            <tr>
              {visual.headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visual.caption ? (
        <p className="tutor-visual-caption">{visual.caption}</p>
      ) : null}
    </figure>
  );
}

function WorksheetVisual({ visual }: { visual: TutorWorksheetVisual }) {
  return (
    <figure className="tutor-visual worksheet">
      <figcaption className="tutor-visual-title">{visual.title}</figcaption>
      <ol className="tutor-worksheet-lines">
        {visual.lines.map((line) => (
          <li key={line.label}>
            <div className="tutor-worksheet-row">
              <span className="tutor-worksheet-label">{line.label}</span>
              <span className="tutor-worksheet-amount">{line.amount}</span>
            </div>
            {line.note ? (
              <p className="tutor-worksheet-note">{line.note}</p>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="tutor-worksheet-result">
        <span>Result</span>
        <strong>{visual.result}</strong>
      </p>
      {visual.caption ? (
        <p className="tutor-visual-caption">{visual.caption}</p>
      ) : null}
    </figure>
  );
}

export function TutorVisuals({
  visuals,
  professor = false,
  professorMode = "demo",
  boardMemo,
}: {
  visuals: TutorVisual[];
  professor?: boolean;
  professorMode?:
    | "judgement"
    | "board"
    | "stress"
    | "harder"
    | "implication"
    | "demo";
  boardMemo?: string;
}) {
  if (visuals.length === 0) return null;
  const emphasizeAttach =
    professor &&
    (professorMode === "harder" || professorMode === "implication");
  return (
    <div className="tutor-visuals" aria-label="Visual demonstration">
      {visuals.map((visual, index) => {
        switch (visual.kind) {
          case "table":
            return (
              <TableVisual
                key={`table-${visual.title}-${index}`}
                visual={visual}
              />
            );
          case "chart":
            return (
              <ChartVisual
                key={`chart-${visual.title}-${index}`}
                visual={visual}
              />
            );
          case "worksheet":
            return (
              <WorksheetVisual
                key={`ws-${visual.title}-${index}`}
                visual={visual}
              />
            );
          case "spreadsheet":
            return (
              <SpreadsheetVisual
                key={`sheet-${visual.title}-${index}`}
                visual={visual}
                professor={professor}
                professorMode={professorMode}
                boardMemo={boardMemo}
                emphasizeAttach={emphasizeAttach}
              />
            );
          default: {
            const _exhaustive: never = visual;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}
