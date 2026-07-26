/**
 * Cite / overlap quality gate for Merixa ML card enrichment.
 * Shared by local `npm run enrich` and Cloudflare learn worker.
 */

const MAX_FIELD = {
  title: 110,
  body: 2000,
  teachingSummary: 1100,
  workedExample: 1200,
  commonMistake: 550,
  checkQuestion: 280,
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

/** Fraction of quote tokens found in the source excerpt. */
export function quoteOverlap(quote, sourceText) {
  const quoteTokens = tokens(quote);
  if (quoteTokens.length === 0) return 0;
  const hay = new Set(tokens(sourceText));
  const hits = quoteTokens.filter((token) => hay.has(token)).length;
  return hits / quoteTokens.length;
}

function inventsStandardIds(fieldText, sourceText) {
  const ids = fieldText.match(/\b(?:IFRS|IAS|IFRIC|SIC)\s?\d+[A-Z]?\b/gi) ?? [];
  if (ids.length === 0) return false;
  const hay = sourceText.toUpperCase().replace(/\s+/g, " ");
  return ids.some((id) => {
    const normalized = id.toUpperCase().replace(/\s+/g, " ");
    return !hay.includes(normalized);
  });
}

/**
 * @returns {{ ok: true, card: object } | { ok: false, reasons: string[] }}
 */
export function validateEnrichmentDraft({ card, draft }) {
  const reasons = [];
  const sourceText = [
    card.body,
    ...(card.sourceQuotes ?? []).map((quote) => quote.text),
    ...(card.sources ?? []).map((source) => `${source.label} ${source.path}`),
  ].join("\n");

  if (!sourceText || sourceText.trim().length < 40) {
    return { ok: false, reasons: ["missing-source-excerpt"] };
  }

  const title = String(draft.title || card.title || "").trim();
  const body = String(draft.body || card.body || "").trim();
  const teachingSummary = String(draft.teachingSummary || "").trim();
  const workedExample = String(draft.workedExample || "").trim();
  const commonMistake = String(draft.commonMistake || "").trim();
  const checkQuestion = String(draft.checkQuestion || "").trim();
  const sourceQuotes = Array.isArray(draft.sourceQuotes)
    ? draft.sourceQuotes
        .map((quote) => ({
          text: String(quote?.text || "").trim().slice(0, 400),
          sourcePath:
            typeof quote?.sourcePath === "string"
              ? quote.sourcePath
              : card.sources?.[0]?.path,
        }))
        .filter((quote) => quote.text.length >= 24)
    : [];

  if (title.length < 8 || title.length > MAX_FIELD.title) {
    reasons.push("invalid-professional-title");
  }
  if (body.length < 160 || body.length > MAX_FIELD.body) {
    reasons.push("invalid-professional-body");
  }
  if (!teachingSummary) reasons.push("missing-teaching-summary");
  if (!workedExample) reasons.push("missing-worked-example");
  if (!commonMistake) reasons.push("missing-common-mistake");

  // Evidence quotes removed from the product — definitions and examples carry the teaching load.

  const combined = `${title}\n${body}\n${teachingSummary}\n${workedExample}\n${commonMistake}\n${checkQuestion}`;
  if (inventsStandardIds(combined, sourceText)) {
    reasons.push("invented-standard-id");
  }

  const summaryTokens = tokens(teachingSummary);
  if (summaryTokens.length > 0) {
    const hay = new Set(tokens(sourceText));
    const overlap =
      summaryTokens.filter((token) => hay.has(token)).length /
      summaryTokens.length;
    if (overlap < 0.18) reasons.push("summary-entailment-low");
  }
  const bodyTokens = tokens(body);
  if (bodyTokens.length > 0) {
    const hay = new Set(tokens(sourceText));
    const overlap =
      bodyTokens.filter((token) => hay.has(token)).length / bodyTokens.length;
    if (overlap < 0.12) reasons.push("body-entailment-low");
  }

  if (reasons.length > 0) return { ok: false, reasons };

  const workplaceTasks = Array.isArray(draft.workplaceTasks)
    ? draft.workplaceTasks
        .map((task, index) => ({
          id: String(task?.id || `task-${index + 1}`).slice(0, 48),
          label: String(task?.label || "").trim().slice(0, 120),
          href:
            typeof task?.href === "string" && task.href.trim()
              ? task.href.trim().slice(0, 200)
              : undefined,
        }))
        .filter((task) => task.label.length > 0)
        .slice(0, 3)
    : card.workplaceTasks ?? [];

  return {
    ok: true,
    card: {
      ...card,
      title: title.slice(0, MAX_FIELD.title),
      body: body.slice(0, MAX_FIELD.body),
      teachingSummary: teachingSummary.slice(0, MAX_FIELD.teachingSummary),
      workedExample: workedExample.slice(0, MAX_FIELD.workedExample),
      commonMistake: commonMistake.slice(0, MAX_FIELD.commonMistake),
      checkQuestion: checkQuestion
        ? checkQuestion.slice(0, MAX_FIELD.checkQuestion)
        : undefined,
      sourceQuotes: [],
      workplaceTasks:
        workplaceTasks.length > 0 ? workplaceTasks : card.workplaceTasks ?? [],
      enrichedAt: new Date().toISOString(),
      // Classification is owned by the deterministic taxonomy pipeline.
      // Model prose may improve; model labels must not bypass enum/domain gates.
      classification: card.classification,
      editorialStatus: "model-reviewed",
      qualityScore: Math.max(Number(card.qualityScore || 0), 0.85),
    },
  };
}

/** Heuristic local enrichment when no API key is available. */
export function heuristicEnrichDraft(card) {
  // Dynamic import avoided — duplicate minimal craft here via shared module
  // is done at call sites; keep this self-contained for the worker bundle.
  const excerpt = String(card.body || "")
    .replace(/\s+/g, " ")
    .replace(
      /^(?:practitioner\s+(?:requirement|guidance|procedure|control|analysis|disclosure)|accounting\s+translation)\s*[:.—–-]\s*/i,
      "",
    )
    .trim();
  const title = String(card.title || "this concept")
    .replace(/:.*/, "")
    .trim()
    .slice(0, 64);
  const quote = excerpt.slice(0, 160);
  const firstSentence =
    excerpt.match(/[^.!?]+[.!?]?/)?.[0]?.trim().slice(0, 520) ||
    excerpt.slice(0, 520);
  const actionSentence =
    excerpt
      .match(/[^.!?]*\b(review|reconcile|prepare|document|assess|calculate|identify|trace|test|record|approve)\b[^.!?]*[.!?]?/i)?.[0]
      ?.trim()
      .slice(0, 480) || null;

  return {
    teachingSummary: firstSentence.slice(0, 720),
    workedExample: (
      actionSentence
        ? `In the next pack, apply “${title}”: ${actionSentence} Record evidence, owner, and the conclusion on the working paper.`
        : `For “${title}”: trace the rule to evidence, name the owner, write the conclusion, and note what evidence would reverse it.`
    ).slice(0, 900),
    commonMistake:
      `Restating “${title}” without the evidence, judgement, ownership, and decision the source requires — leave the counter-evidence that would reverse the conclusion.`.slice(
        0,
        480,
      ),
    checkQuestion: `What evidence would change your conclusion on “${title}”, and who owns the decision if that evidence arrives?`.slice(
      0,
      220,
    ),
    sourceQuotes: [],
    workplaceTasks: [],
  };
}
