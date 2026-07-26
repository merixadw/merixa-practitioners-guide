/**
 * Keep card sections from repeating each other.
 */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

export function textOverlapRatio(left: string, right: string): number {
  const leftTokens = tokens(left);
  if (leftTokens.length === 0) return 0;
  const hay = new Set(tokens(right));
  if (hay.size === 0) return 0;
  const hits = leftTokens.filter((token) => hay.has(token)).length;
  return hits / leftTokens.length;
}

/** Strip labelled blocks already shown as their own UI sections. */
export function residualTechnicalDetail(input: {
  body: string;
  teachingSummary?: string;
  formula?: string;
}): string {
  let text = String(input.body || "").replace(/\s+/g, " ").trim();
  if (!text) return "";

  const definition = String(input.teachingSummary || "").trim();
  if (definition && text.startsWith(definition)) {
    text = text.slice(definition.length).trim();
  }

  text = text
    .replace(/\bFormula:\s*[^.]*(?:\.[^A-Z]*)?/gi, " ")
    .replace(/\bTrap:\s*/gi, " ")
    .replace(/\bExample:\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (input.formula) {
    const formulaNorm = normalize(input.formula);
    if (formulaNorm && normalize(text).includes(formulaNorm)) {
      text = text
        .replace(new RegExp(input.formula.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // Drop Interpretation/Related labels but keep the useful prose if distinct.
  text = text
    .replace(/^(?:Interpretation|Related|Evidence)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 48) return "";
  if (definition && textOverlapRatio(text, definition) >= 0.72) return "";
  return text;
}

export function exampleIsDistinct(
  example: string | undefined,
  definition: string | undefined,
): boolean {
  const ex = String(example || "").trim();
  const def = String(definition || "").trim();
  if (!ex) return false;
  if (!def) return true;
  if (textOverlapRatio(ex, def) >= 0.55) return false;
  // Generic how-to that isn't a worked example.
  if (
    /^(use it|apply it|use this|track|document|consider|ensure)\b/i.test(ex) &&
    !/\d/.test(ex)
  ) {
    return false;
  }
  return true;
}
