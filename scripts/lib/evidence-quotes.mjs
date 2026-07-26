/**
 * Drop evidence quotes that merely restate the definition / teaching summary.
 */

function tokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 2);
}

function overlapRatio(quote, reference) {
  const quoteTokens = tokens(quote);
  if (quoteTokens.length === 0) return 1;
  const hay = new Set(tokens(reference));
  if (hay.size === 0) return 0;
  const hits = quoteTokens.filter((token) => hay.has(token)).length;
  return hits / quoteTokens.length;
}

/**
 * Keep quotes that add evidence beyond the definition itself.
 * @param {Array<{ text?: string, sourcePath?: string }>} quotes
 * @param {{ definition?: string, teachingSummary?: string, body?: string }} card
 */
export function distinctEvidenceQuotes(quotes, card) {
  if (!Array.isArray(quotes) || quotes.length === 0) return [];
  const definition = [
    card.teachingSummary,
    card.definition,
    // First sentence of body is often the definition — use a short head only.
    String(card.body || "").slice(0, 280),
  ]
    .filter(Boolean)
    .join(" ");

  return quotes
    .map((quote) => ({
      text: String(quote?.text || "")
        .replace(/\s+/g, " ")
        .trim(),
      sourcePath:
        typeof quote?.sourcePath === "string" ? quote.sourcePath : undefined,
    }))
    .filter((quote) => quote.text.length >= 28)
    .filter((quote) => overlapRatio(quote.text, definition) < 0.72)
    .slice(0, 3);
}

export function cleanFormula(value) {
  const text = String(value || "")
    .replace(/\r/g, "")
    .replace(/^Formula\s*\/\s*calculation:\s*/i, "")
    .trim();
  if (!text) return undefined;
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return undefined;
  // Drop trailing "Components…" prose if it leaked onto the same line.
  return firstLine
    .replace(/\s*;?\s*(Actual value|Components|Deduct|Ratio):.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}
