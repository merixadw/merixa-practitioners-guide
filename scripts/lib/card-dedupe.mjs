/**
 * Keep card sections from repeating each other (Node publishers).
 */

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

export function textOverlapRatio(left, right) {
  const leftTokens = tokens(left);
  if (leftTokens.length === 0) return 0;
  const hay = new Set(tokens(right));
  if (hay.size === 0) return 0;
  const hits = leftTokens.filter((token) => hay.has(token)).length;
  return hits / leftTokens.length;
}

export function residualTechnicalDetail({ body, teachingSummary, formula }) {
  let text = String(body || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";

  const definition = String(teachingSummary || "").trim();
  if (definition && text.startsWith(definition)) {
    text = text.slice(definition.length).trim();
  }

  text = text
    .replace(/\bFormula:\s*[^.]*(?:\.[^A-Z]*)?/gi, " ")
    .replace(/\bTrap:\s*/gi, " ")
    .replace(/\bExample:\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (formula) {
    const escaped = String(formula).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text
      .replace(new RegExp(escaped, "gi"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  text = text
    .replace(/^(?:Interpretation|Related|Evidence)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text || text.length < 48) return "";
  if (definition && textOverlapRatio(text, definition) >= 0.72) return "";
  return text;
}

export function exampleNeedsRewrite(example, definition) {
  const ex = String(example || "").trim();
  const def = String(definition || "").trim();
  if (!ex) return true;
  if (def && textOverlapRatio(ex, def) >= 0.55) return true;
  if (
    /^(use it|apply it|use this|track|document|consider|ensure)\b/i.test(ex) &&
    !/\d/.test(ex)
  ) {
    return true;
  }
  return false;
}

const TITLE_STOP = new Set([
  "with",
  "from",
  "into",
  "that",
  "this",
  "when",
  "than",
  "their",
  "about",
  "under",
  "over",
  "management",
  "concept",
  "practice",
  "overview",
  "introduction",
  "using",
  "based",
  "after",
  "before",
  "between",
  "through",
  "against",
  "within",
  "without",
  "other",
  "such",
  "also",
  "into",
  "onto",
  "note",
  "view",
  "lens",
  "gate",
  "pack",
  "test",
  "call",
  "map",
  "bridge",
  "checklist",
  "memo",
]);

/** Salient title tokens for topic-fit checks. */
export function titleTopicTokens(title) {
  return tokens(title).filter(
    (token) => token.length >= 4 && !TITLE_STOP.has(token),
  );
}

/** Share of title topic tokens present in text (0–1). */
export function topicRelevanceRatio(title, text) {
  const topic = titleTopicTokens(title);
  if (topic.length === 0) return 1;
  const hay = new Set(tokens(text));
  const hits = topic.filter((token) => hay.has(token)).length;
  return hits / topic.length;
}

function openingClause(text) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^.{12,240}?[.!?](?:\s|$)/);
  return (match ? match[0] : cleaned.slice(0, 240)).trim();
}

/** Relevance of the opening clause only — ignores title pasted into later padding. */
export function topicOpeningRelevance(title, text) {
  return topicRelevanceRatio(title, openingClause(text));
}

/** Strip a leading title echo so relevance is judged on substance, not the label. */
export function contentWithoutTitleEcho(title, text) {
  let cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  const base = String(title || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!base || !cleaned) return cleaned;
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  cleaned = cleaned
    .replace(new RegExp(`^${escaped}\\s*[:—\\-]\\s*`, "i"), "")
    .replace(new RegExp(`^${escaped}\\s+is\\b`, "i"), "is")
    .trim();
  return cleaned;
}

/**
 * True when definition/body do not teach the card title
 * (wrong-topic seed, or title-stamped heuristic filler).
 */
export function needsTopicRelevanceRewrite(card) {
  const title = String(card?.title || "");
  const def = String(card?.teachingSummary || "").trim();
  const body = String(card?.body || "").trim();
  if (!title) return false;
  if (!def) return true;

  const openScore = topicOpeningRelevance(title, def);
  const substance = contentWithoutTitleEcho(title, def);
  const substanceScore = topicRelevanceRatio(title, substance);
  const bodyOpenScore = body ? topicOpeningRelevance(title, body) : 1;

  const heuristicPad =
    /A senior treats|practitioner concept in|It is used to produce decision-useful evidence/i.test(
      def,
    );
  if (heuristicPad && openScore < 0.45) return true;
  if (/^[^.]{0,100}is a practitioner concept in/i.test(def)) return true;
  if (/\bis the practitioner treatment of\b/i.test(def)) return true;
  // Title-stamped “covers X in domain: what it means…” filler.
  if (
    /\bcovers\b[\s\S]{0,120}\bin\b[\s\S]{0,80}:\s*what it means,\s*how it is measured/i.test(
      def,
    )
  ) {
    return true;
  }
  // Broken generic stubs that truncate the topic ("treatment of Anti", "of By").
  if (
    /practitioner treatment of [A-Za-z]{1,3}\b/i.test(def) &&
    !/practitioner treatment of [A-Za-z]{4,}/i.test(def)
  ) {
    return true;
  }
  if (openScore < 0.35) return true;
  // Title echo alone is not enough when leftover substance is clearly empty/generic.
  if (
    substance.length > 80 &&
    substanceScore < 0.12 &&
    /practitioner treatment of|is a practitioner concept/i.test(def)
  ) {
    return true;
  }
  // Wrong-family grafts: equity-option payoff language on real-option / project titles.
  if (
    /abandonment|real option|project delivery/i.test(title) &&
    /max\s*\(\s*s\s*[−\-]\s*k|out-of-the-money|black-?scholes/i.test(def)
  ) {
    return true;
  }
  // IT change-control language on non-IT titles.
  if (
    /abandonment|impairment|working capital|liquidity|revenue|lease/i.test(
      title,
    ) &&
    /system and process changes are requested, approved, tested, and migrated/i.test(
      def,
    )
  ) {
    return true;
  }
  // Foreign IFRS impairment seed on non-impairment titles (the working-capital bug class).
  if (
    !/impairment|goodwill|recoverable|cgU|cgu|cash-generating/i.test(title) &&
    /impairment reversal concerning a CGU|carrying amount \(CA\) of a CGU/i.test(
      def,
    )
  ) {
    return true;
  }
  // Inventory costing (IAS 2) grafted onto unrelated “inventory” mentions (e.g. GHG inventory).
  if (
    /ghg|emissions|carbon|scope\s*[123]/i.test(title) &&
    /IAS\s*2|abnormal amounts of scrap and waste|net realisable value/i.test(def)
  ) {
    return true;
  }
  if (body.length > 160 && bodyOpenScore < 0.25 && openScore < 0.45) return true;
  return false;
}

/** Body should hold only additive technical note — not definition/formula again. */
export function composeUniqueBody({
  definition,
  formula,
  interpretation,
  related,
  extra,
}) {
  const parts = [];
  if (interpretation && textOverlapRatio(interpretation, definition) < 0.72) {
    parts.push(interpretation.trim());
  }
  if (related && textOverlapRatio(related, definition) < 0.65) {
    parts.push(`Related: ${related.trim()}`);
  }
  if (extra && textOverlapRatio(extra, definition) < 0.65) {
    parts.push(extra.trim());
  }
  // Keep a short body even when only definition exists — UI uses teachingSummary first.
  if (parts.length === 0 && definition) return String(definition).slice(0, 720);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 1600);
}
