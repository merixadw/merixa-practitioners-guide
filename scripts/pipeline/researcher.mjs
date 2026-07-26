/**
 * Stage 3 — Researcher.
 * Reads the scholar's notebook across all sources at once and synthesizes
 * it into concepts: notes about the same idea are merged, corroboration
 * across independent sources raises confidence, classification conflicts
 * are flagged, and topic coverage gaps are reported so the background
 * learning regime knows what to study next.
 *
 * Input:  content/pipeline/notes.json
 * Output: content/pipeline/synthesis.json
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashId } from "../lib/source-study.mjs";

const MIN_TOPIC_COVERAGE = 3;

function conceptKey(note) {
  return note.titleKey;
}

export function runResearcher({
  contentDir,
  notebook,
  conflictResolutions,
  gapTopicKeys,
}) {
  const pipelineDir = join(contentDir, "pipeline");
  const byConcept = new Map();
  const resolutions =
    conflictResolutions instanceof Map ? conflictResolutions : new Map();
  const gapsFocus = gapTopicKeys instanceof Set ? gapTopicKeys : new Set();

  for (const note of notebook.notes) {
    const key = conceptKey(note);
    if (!byConcept.has(key)) byConcept.set(key, []);
    byConcept.get(key).push(note);
  }

  const concepts = [];
  const conflicts = [];
  let resolvedConflicts = 0;

  for (const [key, group] of byConcept) {
    group.sort((left, right) => right.studyScore - left.studyScore);
    const best = group[0];
    const sourceIds = [...new Set(group.map((note) => note.sourceId))];
    const domains = [...new Set(group.map((note) => note.classification.domain))];
    const topics = [...new Set(group.map((note) => note.classification.topic))];

    let classification = best.classification;
    const forced = resolutions.get(String(best.title).toLowerCase());
    if (forced && typeof forced === "string" && forced.includes(" | ")) {
      const [domain, topic] = forced.split(" | ");
      classification = {
        ...classification,
        domain: domain.trim(),
        topic: topic.trim(),
        confidence: Math.min(0.99, classification.confidence + 0.05),
      };
      resolvedConflicts += 1;
    } else if (domains.length > 1 || topics.length > 1) {
      // Prefer the majority classification among the note group.
      const votes = new Map();
      for (const note of group) {
        const vote = `${note.classification.domain} | ${note.classification.topic}`;
        votes.set(vote, (votes.get(vote) ?? 0) + 1);
      }
      const [winner] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
      const [domain, topic] = winner.split(" | ");
      classification = {
        ...classification,
        domain: domain.trim(),
        topic: topic.trim(),
      };
      conflicts.push({
        concept: best.title,
        domains,
        topics,
        resolution: winner,
      });
    }

    const corroboration = sourceIds.length;
    const supportingQuotes = [];
    const seenSources = new Set([best.sourcePath]);
    for (const note of group.slice(1)) {
      if (seenSources.has(note.sourcePath)) continue;
      seenSources.add(note.sourcePath);
      if (note.quote) {
        supportingQuotes.push({ text: note.quote, sourcePath: note.sourcePath });
      }
      if (supportingQuotes.length >= 2) break;
    }

    const topicKey = `${classification.domain} | ${classification.topic}`;
    const gapBoost = gapsFocus.has(topicKey) ? 0.4 : 0;

    concepts.push({
      id: `concept-${hashId([key, best.sourcePath])}`,
      key,
      title: best.title,
      classification,
      bodies: [...new Set(group.flatMap((note) => note.bodies))].slice(0, 5),
      standards: [...new Set(group.flatMap((note) => note.standards))].slice(0, 8),
      terms: [...new Set(group.flatMap((note) => note.terms))].slice(0, 8),
      bestNoteId: best.id,
      keyPoints: best.keyPoints,
      primaryQuote: best.quote
        ? { text: best.quote, sourcePath: best.sourcePath }
        : null,
      supportingQuotes,
      sources: group
        .reduce(
          (result, note) => {
            if (
              !result.some(
                (source) =>
                  source.path === note.sourcePath ||
                  source.label === note.sourceLabel,
              )
            ) {
              result.push({
                label: note.sourceLabel,
                path: note.sourcePath,
                kind: note.sourceKind,
              });
            }
            return result;
          },
          [
            {
              label: best.sourceLabel,
              path: best.sourcePath,
              kind: best.sourceKind,
            },
          ],
        )
        .slice(0, 3),
      corroboration,
      confidence: Number(
        Math.min(
          0.99,
          classification.confidence + (corroboration - 1) * 0.05,
        ).toFixed(2),
      ),
      studyScore: best.studyScore + gapBoost,
      fillsGap: gapsFocus.has(topicKey),
    });
  }

  const topicCoverage = {};
  for (const concept of concepts) {
    const key = `${concept.classification.domain} | ${concept.classification.topic}`;
    topicCoverage[key] = (topicCoverage[key] ?? 0) + 1;
  }
  const gaps = Object.entries(topicCoverage)
    .filter(([, count]) => count < MIN_TOPIC_COVERAGE)
    .map(([topic, count]) => ({ topic, concepts: count }))
    .sort((left, right) => left.concepts - right.concepts);

  const synthesis = {
    generatedAt: new Date().toISOString(),
    stats: {
      notesRead: notebook.notes.length,
      concepts: concepts.length,
      corroborated: concepts.filter((concept) => concept.corroboration > 1).length,
      conflicts: conflicts.length,
      resolvedConflicts,
      gaps: gaps.length,
    },
    concepts,
    conflicts,
    topicCoverage,
    researchGaps: gaps,
  };
  writeFileSync(
    join(pipelineDir, "synthesis.json"),
    `${JSON.stringify(synthesis, null, 2)}\n`,
    "utf8",
  );
  return synthesis;
}
