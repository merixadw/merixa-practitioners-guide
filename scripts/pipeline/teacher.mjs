/**
 * Stage 4 — Teacher.
 * Turns the researcher's synthesized concepts into teaching cards: a
 * clear definition, one workplace demonstration, one trap to avoid, a
 * check question, and cited evidence. Body chips already name the
 * professional bodies — prose does not repeat them.
 *
 * Input:  content/pipeline/synthesis.json
 * Output: content/corpus/*.json + content/index.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backupCorpus } from "../lib/corpus-backup.mjs";
import {
  assertLibraryImproved,
  preferImprovedCard,
  readLibraryHealth,
  teachingDepthScore,
} from "../lib/improvement-guardrails.mjs";
import { taxonomyTags } from "../lib/practitioner-taxonomy.mjs";
import { sustainingReferences } from "../lib/professional-bodies.mjs";
import { hashId, slugify } from "../lib/source-study.mjs";
import {
  craftCheckQuestion,
  craftCommonMistake,
  craftTeachingSummary,
  craftWorkedExample,
  craftWorkplaceTask,
  stripLeadNoise,
} from "../lib/teaching-copy.mjs";

const MAX_TOTAL_CARDS = 1800;

function teachCard(concept) {
  const { classification } = concept;
  const body = stripLeadNoise(concept.keyPoints).slice(0, 1100);
  const id = `${slugify(concept.title)}-${hashId([
    concept.sources[0]?.path ?? "unknown",
    concept.title,
    body.slice(0, 120),
  ])}`;
  const sourceQuotes = [];
  if (concept.primaryQuote) sourceQuotes.push(concept.primaryQuote);
  sourceQuotes.push(...concept.supportingQuotes);

  const officialReferences = sustainingReferences({
    domain: classification.domain,
    topic: classification.topic,
    bodies: concept.bodies,
  });
  const officialSources = officialReferences.map((ref) => ({
    label: ref.label,
    path: ref.url,
    kind: "official-open",
    body: ref.body,
  }));

  const teachingSummary = craftTeachingSummary({
    body,
    standards: concept.standards,
  });
  const workedExample = craftWorkedExample({
    title: concept.title,
    body,
    classification,
  });
  const commonMistake = craftCommonMistake({
    title: concept.title,
    body,
    classification,
  });

  return {
    id,
    title: concept.title,
    body,
    bodies: concept.bodies,
    tags: taxonomyTags(classification, `${concept.title} ${body}`),
    classification,
    workplaceTasks: [
      craftWorkplaceTask({ title: concept.title, classification }),
    ],
    sources: [...concept.sources, ...officialSources]
      .filter(
        (source, index, all) =>
          all.findIndex((item) => item.path === source.path) === index,
      )
      .slice(0, 6),
    officialReferences,
    teachingSummary,
    workedExample,
    commonMistake,
    checkQuestion: craftCheckQuestion({
      title: concept.title,
      classification,
    }),
    sourceQuotes: sourceQuotes.slice(0, 3),
    editorialStatus: "machine-reviewed",
    qualityScore: Number(
      Math.min(
        1,
        concept.studyScore / 15 + (concept.corroboration - 1) * 0.05,
      ).toFixed(2),
    ),
  };
}

function chunkCard(card) {
  const entries = [
    ["body", card.body],
    ["summary", card.teachingSummary],
    ["example", card.workedExample],
    ["mistake", card.commonMistake],
    ["implication", card.implicationIfIgnored],
    ["trigger", card.realWorldTrigger],
  ];
  return entries
    .filter(([, text]) => typeof text === "string" && text.trim())
    .map(([kind, text], index) => ({
      id: `${card.id}::${kind}::${index}`,
      cardId: card.id,
      title: card.title,
      text,
      bodies: card.bodies,
      tags: card.tags,
      kind,
    }));
}

export function runTeacher({ contentDir, synthesis, previousIndex }) {
  const corpusDir = join(contentDir, "corpus");
  mkdirSync(corpusDir, { recursive: true });

  const healthBefore = readLibraryHealth(contentDir);
  const backup = backupCorpus(contentDir, "before-teacher");
  if (backup.ok) {
    console.log(
      `teacher backup: cards=${backup.cardCount} enriched=${backup.enrichedCount} → ${backup.dir}`,
    );
  }

  const previousByTitle = new Map(
    (previousIndex?.cards ?? []).map((card) => [
      slugify(card.title),
      card,
    ]),
  );
  const previousById = new Map(
    (previousIndex?.cards ?? []).map((card) => [card.id, card]),
  );

  const taught = synthesis.concepts
    .slice()
    .sort((left, right) => right.studyScore - left.studyScore)
    .slice(0, MAX_TOTAL_CARDS)
    .map((concept) => {
      const card = teachCard(concept);
      const previous = previousByTitle.get(slugify(concept.title));
      return preferImprovedCard(previous, card).card;
    });

  // MERGE — never wipe encyclopedia / published shelves when synthesis is thin.
  const byId = new Map(previousById);
  for (const card of taught) {
    const existing = byId.get(card.id);
    byId.set(card.id, preferImprovedCard(existing, card).card);
  }

  const cards = [...byId.values()].sort((left, right) => {
    const leftDomain = left.classification?.domain ?? "";
    const rightDomain = right.classification?.domain ?? "";
    const domain = leftDomain.localeCompare(rightDomain);
    if (domain !== 0) return domain;
    const leftTopic = left.classification?.topic ?? "";
    const rightTopic = right.classification?.topic ?? "";
    const topic = leftTopic.localeCompare(rightTopic);
    return topic !== 0 ? topic : left.title.localeCompare(right.title);
  });

  const healthAfter = {
    cardCount: cards.length,
    enrichedCount: cards.filter((card) => card.enrichedAt).length,
    deepCount: cards.filter((card) => {
      const definition = String(card.teachingSummary || card.body || "");
      const example = String(card.workedExample || "");
      return definition.length >= 280 && example.length >= 450;
    }).length,
    depthSum: cards.reduce(
      (sum, card) => sum + teachingDepthScore(card),
      0,
    ),
    averageDepth: 0,
    generatedAt: new Date().toISOString(),
  };
  assertLibraryImproved({
    before: healthBefore,
    after: healthAfter,
    context: "teacher",
  });

  for (const card of cards) {
    writeFileSync(
      join(corpusDir, `${card.id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }

  const index = {
    version: 1,
    generatedAt: healthAfter.generatedAt,
    cards,
    chunks: cards.flatMap(chunkCard),
  };
  writeFileSync(
    join(contentDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );
  return { cards: cards.length, index };
}

export function buildIndexFromCards(cards) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    cards,
    chunks: cards.flatMap(chunkCard),
  };
}

export { chunkCard, teachCard };
