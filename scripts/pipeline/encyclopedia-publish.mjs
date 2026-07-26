/**
 * Publish Merixa glossary terms as encyclopedia definition cards.
 *
 * Usage:
 *   python scripts/parse-glossary.py
 *   npm run library:encyclopedia
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyResource,
  taxonomyTags,
} from "../lib/practitioner-taxonomy.mjs";
import {
  cleanFormula,
  distinctEvidenceQuotes,
} from "../lib/evidence-quotes.mjs";
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const GLOSSARY_PATH = join(PIPELINE_DIR, "glossary-terms.json");
const REPORT_PATH = join(PIPELINE_DIR, "encyclopedia-report.json");

function hashId(value) {
  return createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function cut(value, max) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const boundary = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("; "),
    slice.lastIndexOf(" "),
  );
  return (
    boundary > Math.floor(max * 0.55) ? slice.slice(0, boundary) : slice
  )
    .replace(/[,:;–—-]+$/, "")
    .trim();
}

function inferBodies(alignment) {
  const text = String(alignment || "").toUpperCase();
  const bodies = ["Merixa"];
  if (/\bACCA\b/.test(text)) bodies.push("ACCA");
  if (/\bCIMA\b|\bCGMA\b/.test(text)) bodies.push("CGMA");
  if (/\bCFA\b/.test(text)) bodies.push("CFA");
  if (/\bIFRS\b/.test(text)) bodies.push("IFRS");
  if (/\bFRC\b/.test(text)) bodies.push("FRC");
  return [...new Set(bodies)];
}

function termToCard(term) {
  const title = String(term.title || "").trim();
  const definition = cut(term.definition, 720);
  const howToUse = cut(term.howToUse, 520);
  const interpretation = cut(term.interpretation, 420);
  const commonError = cut(term.commonError, 420);
  const evidence = cut(term.evidence, 280);
  const formula = cleanFormula(term.formula);
  const related = cut(term.related, 280);

  const body = composeUniqueBody({
    definition,
    formula,
    interpretation,
    related,
  });
  const classification = classifyResource({
    sourcePath: term.source || "",
    title,
    text: `${definition}\n${body}`,
  });
  classification.contentType = "definition";
  if (classification.technicalLevel === "advanced") {
    classification.technicalLevel = "practitioner";
  }

  const id = `glossary-${slugify(title)}-${hashId(`glossary:${title}`)}`;
  // Placeholder — OpenAI examples pass replaces generic how-to copy.
  const workedExample = cut(howToUse, 900);

  const candidateQuotes = [
    interpretation
      ? { text: interpretation, sourcePath: term.source }
      : null,
    evidence && evidence.length > 40
      ? { text: `Evidence typically required: ${evidence}`, sourcePath: term.source }
      : null,
  ].filter(Boolean);

  return {
    id,
    title,
    body,
    bodies: inferBodies(term.alignment),
    tags: [
      ...taxonomyTags(classification, body),
      "encyclopedia",
      "glossary",
      `glossary-${term.number}`,
    ],
    workplaceTasks: [],
    sources: [
      {
        label: "Merixa Management Reporting Practitioner Glossary",
        path: term.source,
        kind: "merixa",
        body: "Merixa",
      },
    ],
    teachingSummary: definition,
    formula,
    workedExample,
    commonMistake:
      commonError ||
      cut(
        `Treating “${title}” as a conclusion instead of an investigation trigger with evidence and ownership.`,
        480,
      ),
    checkQuestion: cut(
      `What evidence would change your conclusion on “${title}”, and who owns the decision if that evidence arrives?`,
      220,
    ),
    sourceQuotes: [],
    classification,
    editorialStatus: "editor-approved",
    qualityScore: 0.92,
    glossaryNumber: term.number,
    encyclopediaAt: new Date().toISOString(),
  };
}

function main() {
  if (!existsSync(GLOSSARY_PATH)) {
    throw new Error(
      "Missing glossary-terms.json — run: python scripts/parse-glossary.py",
    );
  }
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  const glossary = JSON.parse(readFileSync(GLOSSARY_PATH, "utf8"));
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });

  const existing = (Array.isArray(index.cards) ? index.cards : []).filter(
    (card) => !String(card.id || "").startsWith("glossary-"),
  );

  // Drop stale glossary corpus files before rewrite.
  for (const name of readdirSync(CORPUS_DIR)) {
    if (name.startsWith("glossary-") && name.endsWith(".json")) {
      unlinkSync(join(CORPUS_DIR, name));
    }
  }

  const encyclopediaCards = (glossary.terms ?? []).map(termToCard);
  for (const card of encyclopediaCards) {
    writeFileSync(
      join(CORPUS_DIR, `${card.id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }

  const merged = [...existing, ...encyclopediaCards].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );

  safeWriteIndex(INDEX_PATH, merged, { buildIndex: buildIndexFromCards });
  const nextIndex = buildIndexFromCards(merged);

  const basics = [
    "debit",
    "credit",
    "asset",
    "liability",
    "equity",
    "revenue",
    "expense",
    "accrual",
    "depreciation",
    "working capital",
    "trial balance",
    "NPV",
    "IRR",
    "WACC",
    "EBITDA",
    "gross margin",
    "accounts receivable",
    "accounts payable",
    "inventory",
    "materiality",
  ];
  const hay = encyclopediaCards.map((card) => card.title.toLowerCase()).join(" | ");
  const coverage = basics.map((term) => ({
    term,
    inGlossary: hay.includes(term.toLowerCase()),
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    glossaryTerms: glossary.termCount ?? encyclopediaCards.length,
    encyclopediaCards: encyclopediaCards.length,
    retainedPriorCards: existing.length,
    totalCards: merged.length,
    basicCoverage: coverage,
    sample: encyclopediaCards.slice(0, 8).map((card) => ({
      id: card.id,
      title: card.title,
      teachingSummary: card.teachingSummary,
    })),
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `encyclopedia: glossary=${report.glossaryTerms} cards=${encyclopediaCards.length} total=${merged.length}`,
  );
  const missingBasics = coverage.filter((item) => !item.inGlossary).map((item) => item.term);
  if (missingBasics.length > 0) {
    console.log(`basics still outside glossary titles: ${missingBasics.join(", ")}`);
  }
}

main();
