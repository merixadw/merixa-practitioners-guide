/**
 * Drop evidence quotes that merely restate the definition / teaching summary.
 */

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 2);
}

function overlapRatio(quote: string, reference: string): number {
  const quoteTokens = tokens(quote);
  if (quoteTokens.length === 0) return 1;
  const hay = new Set(tokens(reference));
  if (hay.size === 0) return 0;
  const hits = quoteTokens.filter((token) => hay.has(token)).length;
  return hits / quoteTokens.length;
}

export type QuoteLike = {
  text: string;
  sourcePath?: string;
};

export function distinctEvidenceQuotes(
  quotes: QuoteLike[] | undefined,
  card: {
    teachingSummary?: string;
    body?: string;
  },
): QuoteLike[] {
  if (!quotes || quotes.length === 0) return [];
  const definition = [
    card.teachingSummary,
    String(card.body || "").slice(0, 280),
  ]
    .filter(Boolean)
    .join(" ");

  return quotes
    .map((quote) => ({
      text: quote.text.replace(/\s+/g, " ").trim(),
      sourcePath: quote.sourcePath,
    }))
    .filter((quote) => quote.text.length >= 28)
    .filter((quote) => overlapRatio(quote.text, definition) < 0.72)
    .slice(0, 3);
}
