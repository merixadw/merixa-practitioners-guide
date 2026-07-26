/**
 * Shared text-study utilities for the backline learning pipeline.
 * Used by every stage: librarian (catalog), scholar (notes),
 * researcher (synthesis), teacher (published corpus).
 */
import { createHash } from "node:crypto";
import { basename } from "node:path";

export const MIN_SECTION_CHARS = 180;
export const MAX_SECTION_CHARS = 2200;

export const EXCLUDED_SOURCE =
  /\b(anna['’]?s?\s*(?:archive|arc)|z-?lib|zlib\.org|libgen|sci-hub|bpp|kaplan|schweser|finquiz|wiley|learning media|workbook|study text|study manual|full[_ -]?book|cia learning system|garp\s*frm|qbank|q bank|exam|mock|revision kit|practice & revision|study session|sample questions?|itemsets?|item sets?|merixa design|article-|articles?-body|home-body|clients-body|inquiries-body|rfp|discussion|assignment|student submission|coursework|earnings update|investor presentation|annual report and accounts|icqrf|icrf|cfa\s*(?:i{1,3}|level|program)|\/cfa(?:\/|\\)|\/frm(?:\/|\\))\b/i;
export const EXCLUDED_CONTENT =
  /\b(correct answer|answer key|module quiz|item set|quiz solution|exam technique|marks available|candidate response|candidate discussion|practice question|question\s*(?:#|id|number|\d+)|which .{0,100} most likely|submit your assignment|discussion post|prepare for the cfa|cfa program curriculum|syllabus learning outcomes|this workbook covers)\b/i;
export const NOISE_LINE =
  /^(?:page\s*)?\d+\s*$|^more informations?$|^legacy code$|^document file creation date$|^(?:domain|topic|subtopic)$|^none$|^table of contents$|^copyright\b|^all rights reserved\b/i;
export const CODE_LINE =
  /^(?:[A-Z]\d{2,}[A-Z0-9]*|\d{3,8}|account n[°o]\s*:?\s*\d+|gl account\b)/i;
export const GENERIC_HEADING =
  /^(?:introduction|overview|scope|definition|general definition|recognition|measurement|presentation|disclosure|application guidance|background|objective|requirements?|procedure|process|examples?|includes|does not include|tips & tricks|counterpart|conclusion)$/i;
export const VAGUE_HEADING =
  /^(?:page|comments?|glossary|date|etc[,.]?|other(?:,.*)?|general|miscellaneous|greater)$/i;
export const BAD_TITLE =
  /^(?:continued|contents?|part \d+|chapter \d+|section \d+|appendix|application guidance|introduction|overview|\d+|[a-z])$/i;
export const DOCUMENT_TITLE =
  /\b(annual report|earnings|slides?|flowcharts?|workbook|manual|quick sheet|answer key|module quiz|item ?sets?|quiz solution|cfa program curriculum|study session|sample questions?|reading \d+|level [ivx]+|ss ?\d+|contents|index|page \d+|pwc \d+|xpu|iabc|template|questionnaire|after roll out|letter to the auditors)\b|^financial reporting council \d+$|^grid analysis examples$/i;
export const ENTITY_SPECIFIC =
  /\b(saint[- ]gobain|papyrus|blackline|geo tool|magnitude|hps entities?|notilus|dtf|csg|group policy ref|web=\d|https?:\/\/|www\.)\b/i;

export function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72) || "concept"
  );
}

export function hashId(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 10);
}

export function normalizeWhitespace(value) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\ufb01/g, "fi")
    .replace(/\ufb02/g, "fl")
    .replace(/\ufb00/g, "ff")
    .replace(/\ufb03/g, "ffi")
    .replace(/\ufb04/g, "ffl")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•]/g, "; ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sentenceComplete(value, maxChars = MAX_SECTION_CHARS) {
  const cleaned = normalizeWhitespace(value).replace(/\n+/g, " ");
  if (cleaned.length <= maxChars) return cleaned;
  const slice = cleaned.slice(0, maxChars);
  const boundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("; "),
  );
  return (boundary >= Math.floor(maxChars * 0.55)
    ? slice.slice(0, boundary + 1)
    : slice
  ).trim();
}

export function titleFromHint(value) {
  const cleaned = normalizeWhitespace(value)
    .replace(/\.[a-z0-9]{2,5}$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\d+\s+/, "")
    .trim();
  const parts = cleaned.split(/\s+/);
  const suffix = parts.at(-1) ?? "";
  if (
    suffix.length >= 6 &&
    suffix.length <= 12 &&
    /[a-z]/i.test(suffix) &&
    /\d/.test(suffix)
  ) {
    parts.pop();
  }
  return parts.join(" ").slice(0, 100);
}

export function parseCacheFile(raw) {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("@@META::")) {
    return {
      source: "unknown",
      titleHint: "Untitled resource",
      text: normalizeWhitespace(normalized),
    };
  }

  const endOfMeta = normalized.indexOf("\n\n");
  const metaLine =
    endOfMeta === -1
      ? normalized.slice(8).split("\n")[0]
      : normalized.slice(8, endOfMeta);
  const text =
    endOfMeta === -1 ? "" : normalizeWhitespace(normalized.slice(endOfMeta + 2));

  try {
    const meta = JSON.parse(metaLine);
    return {
      source: typeof meta.source === "string" ? meta.source : "unknown",
      titleHint:
        typeof meta.titleHint === "string"
          ? titleFromHint(meta.titleHint)
          : titleFromHint(basename(meta.source ?? "Untitled resource")),
      text,
    };
  } catch {
    return {
      source: "unknown",
      titleHint: "Untitled resource",
      text,
    };
  }
}

export function looksLikeHeading(line) {
  const value = line.trim().replace(/[:.\-–—]+$/, "");
  if (value.length < 3 || value.length > 100) return false;
  if (NOISE_LINE.test(value) || CODE_LINE.test(value)) return false;
  if (/[.!?]$/.test(line.trim())) return false;
  if (/^(?:and|or|the|a|an|of|to|for|with|when|where|which)\b/i.test(value)) {
    return false;
  }
  if (GENERIC_HEADING.test(value)) return true;
  if (/^\d+(?:\.\d+){0,3}\s+[A-Z]/.test(value)) return true;
  if (/^[A-Z][A-Za-z0-9 '&/(),-]{2,80}$/.test(value)) {
    const words = value.split(/\s+/);
    const initialCaps = words.filter((word) => /^[A-Z0-9]/.test(word)).length;
    return words.length <= 12 && initialCaps / words.length >= 0.55;
  }
  return false;
}

export function cleanLines(text) {
  const seenShort = new Map();
  return text
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => {
      if (!line || NOISE_LINE.test(line) || CODE_LINE.test(line)) return false;
      if (line.length <= 90) {
        const key = line.toLowerCase();
        const count = (seenShort.get(key) ?? 0) + 1;
        seenShort.set(key, count);
        if (count > 2) return false;
      }
      return true;
    });
}

export function splitLongBody(body) {
  const sentences =
    body.match(/[^.!?;]+(?:[.!?;]+|$)/g)?.map((item) => item.trim()) ?? [body];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const next = `${current} ${sentence}`.trim();
    if (next.length > MAX_SECTION_CHARS && current.length >= MIN_SECTION_CHARS) {
      chunks.push(sentenceComplete(current));
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.length >= MIN_SECTION_CHARS) chunks.push(sentenceComplete(current));
  return chunks;
}

export function extractSections({ titleHint, text }) {
  const lines = cleanLines(text);
  const sections = [];
  let heading = titleHint;
  let bodyLines = [];

  function flush() {
    const body = normalizeWhitespace(bodyLines.join(" "));
    bodyLines = [];
    if (body.length < MIN_SECTION_CHARS) return;
    for (const chunk of splitLongBody(body)) {
      sections.push({ heading, body: chunk });
    }
  }

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      flush();
      heading = line
        .replace(/[:.\-–—]+$/, "")
        .replace(/^\d+(?:\.\d+)*\s+/, "")
        .trim();
      continue;
    }
    bodyLines.push(line);
  }
  flush();

  if (sections.length === 0 && text.length >= MIN_SECTION_CHARS) {
    return splitLongBody(text).map((body) => ({ heading: titleHint, body }));
  }
  return sections;
}

export function professionalTitle(titleHint, heading, classification) {
  const cleanHeading = titleFromHint(heading)
    .replace(/\bcontinued\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const cleanHint = titleFromHint(titleHint);
  const headingWords = cleanHeading.split(/\s+/);
  const sentenceLike =
    headingWords.length > 10 ||
    /\b(should|shall|must|would|could|is|are|was|were|has|have)\b/i.test(
      cleanHeading,
    );
  if (VAGUE_HEADING.test(cleanHeading) && cleanHint) {
    return `${cleanHint}: ${classification.topic}`.slice(0, 110);
  }

  if (
    !cleanHeading ||
    BAD_TITLE.test(cleanHeading) ||
    sentenceLike ||
    /\b(?:and|or|of|to|from|the)$/i.test(cleanHeading) ||
    GENERIC_HEADING.test(cleanHeading) ||
    cleanHeading.toLowerCase() === cleanHint.toLowerCase()
  ) {
    if (
      (sentenceLike || /\b(?:and|or|of|to|from|the)$/i.test(cleanHeading)) &&
      cleanHint
    ) {
      return `${cleanHint}: ${classification.topic}`.slice(0, 110);
    }
    if (GENERIC_HEADING.test(cleanHeading) && cleanHint) {
      return `${cleanHint}: ${cleanHeading}`.slice(0, 110);
    }
    return cleanHint || classification.topic;
  }

  if (cleanHeading.length < 18 && cleanHint && !cleanHint.includes(cleanHeading)) {
    return `${cleanHint}: ${cleanHeading}`.slice(0, 110);
  }
  return cleanHeading.slice(0, 110);
}

export function relevanceScore({ title, body, classification }) {
  let score = 0;
  score += Math.min(body.length / 300, 6);
  score += classification.confidence * 5;
  if (classification.contentType !== "guidance") score += 1;
  if (
    /\b(shall|must|required|recognition|measurement|control|evidence|judgement|estimate|review|reconcile|calculate)\b/i.test(
      body,
    )
  ) {
    score += 2;
  }
  if (
    /\b(example|practical|procedure|application|interpretation|warning)\b/i.test(
      body,
    )
  ) {
    score += 1.5;
  }
  if (BAD_TITLE.test(title) || title.length < 8) score -= 5;
  if (DOCUMENT_TITLE.test(title)) score -= 6;
  if (ENTITY_SPECIFIC.test(`${title} ${body}`)) score -= 8;
  if (/^\p{Ll}/u.test(title)) score -= 6;
  if (
    /\b(company name|saint-gobain|copyright|website|contact us|cookie)\b/i.test(
      body,
    )
  ) {
    score -= 3;
  }
  return score;
}

export function isLowQualityText(value) {
  const text = normalizeWhitespace(value);
  if (text.length < MIN_SECTION_CHARS) return true;
  const symbolHits = text.match(/[•_|�]/g)?.length ?? 0;
  const words = text.split(/\s+/).filter(Boolean);
  const singleLetter = words.filter((word) => /^[a-z]$/i.test(word)).length;
  const sentenceCount = text.match(/[.!?](?:\s|$)/g)?.length ?? 0;
  const suspiciousSpacing = text.match(/\b[a-z]\s+-\s+[a-z]/gi)?.length ?? 0;
  const joinedWords = text.match(/[a-z][A-Z][a-z]/g)?.length ?? 0;
  const tableSeparators = text.match(/\s[|/]\s/g)?.length ?? 0;
  return (
    symbolHits / text.length > 0.012 ||
    (words.length > 30 && singleLetter / words.length > 0.08) ||
    sentenceCount === 0 ||
    suspiciousSpacing >= 3 ||
    joinedWords >= 4 ||
    tableSeparators >= 12
  );
}

export function selectProfessionalSentences(body, classification) {
  const cleanedBody = normalizeWhitespace(body)
    .replace(/\bFRC\s*\|\s*[^.!?]{0,90}\s+\d+\b/g, " ")
    .replace(/\.\s*;\s*/g, ". ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s{2,}/g, " ");
  const sentences =
    cleanedBody
      .replace(/\s+/g, " ")
      .match(/[^.!?;]+(?:[.!?;]+|$)/g)
      ?.map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 35 && sentence.length <= 420) ??
    [];

  if (sentences.length === 0) return sentenceComplete(cleanedBody, 900);

  const scored = sentences.map((sentence, index) => {
    let score = Math.max(0, 4 - index * 0.2);
    if (
      /\b(is|are|means|refers to|shall|must|required|recognised|recognized|measured|included|excluded)\b/i.test(
        sentence,
      )
    ) {
      score += 3;
    }
    if (
      /\b(practitioner|review|evidence|judgement|estimate|control|reconcile|assess|document)\b/i.test(
        sentence,
      )
    ) {
      score += 2;
    }
    if (sentence.length >= 80 && sentence.length <= 260) score += 1;
    return { sentence, index, score };
  });

  const selected = scored
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .sort((left, right) => left.index - right.index)
    .map((entry) => entry.sentence);

  const prefix =
    classification.contentType === "requirement"
      ? "Practitioner requirement: "
      : classification.contentType === "procedure"
        ? "Practitioner procedure: "
        : "";
  return sentenceComplete(`${prefix}${selected.join(" ")}`, 1050);
}

export function sourceKind(sourcePath) {
  if (/merixa_management_reporting_practitioner_glossary/i.test(sourcePath)) {
    return "merixa";
  }
  if (
    /\b(ifrs foundation|iasb|ifrs\.org|frc|frs[_ -]?\d+|financial reporting council|official|accaglobal\.com|aicpa-cima\.com|cimaglobal\.com|cfainstitute\.org|garp\.org|theiia\.org)\b/i.test(
      sourcePath,
    )
  ) {
    return "official-open";
  }
  return "unknown";
}

export function sourceLabel(sourcePath, titleHint) {
  if (/ifrs foundation|ifrs\.org/i.test(sourcePath)) return "IFRS Foundation";
  if (/financial reporting council|\bfrc\b/i.test(sourcePath)) {
    return "Financial Reporting Council";
  }
  if (/merixa_management_reporting_practitioner_glossary/i.test(sourcePath)) {
    return "Merixa Management Reporting Practitioner Glossary";
  }
  return titleHint.slice(0, 100);
}

/** Standards explicitly cited in a text, e.g. ["IFRS 15", "IAS 2"]. */
export function citedStandards(text) {
  const matches =
    text.match(/\b(?:IFRS|IAS|IFRIC|SIC|FRS|ISA)\s*\d{1,3}\b/gi) ?? [];
  const seen = new Set();
  for (const match of matches) {
    const normalized = match
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/^([A-Z]+)(\d+)$/, "$1 $2");
    seen.add(normalized);
  }
  return [...seen].slice(0, 12);
}

/** Defined terms in a text, e.g. "goodwill" from "Goodwill is defined as ...". */
export function definedTerms(text) {
  const terms = new Set();
  const patterns = [
    /\b([A-Z][A-Za-z' -]{2,48}?)\s+(?:is|are)\s+defined\s+as\b/g,
    /\b([A-Z][A-Za-z' -]{2,48}?)\s+means\b/g,
    /\b([A-Z][A-Za-z' -]{2,48}?)\s+refers\s+to\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const term = match[1].trim();
      if (term.split(/\s+/).length <= 6 && !/\b(this|these|it|they)\b/i.test(term)) {
        terms.add(term);
      }
    }
  }
  return [...terms].slice(0, 8);
}
