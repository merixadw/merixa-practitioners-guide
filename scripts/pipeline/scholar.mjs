/**
 * Stage 2 — PhD student.
 * Deep-reads every cataloged source and takes structured study notes:
 * one note per meaningful section, with the classification, the standards
 * it cites, the terms it defines, the key sentences worth teaching, and a
 * verbatim evidence quote. Weak or garbled sections are graded out here.
 *
 * Input:  content/pipeline/catalog.json + content/raw-cache/*.txt
 * Output: content/pipeline/notes.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classifyResource } from "../lib/practitioner-taxonomy.mjs";
import {
  BAD_TITLE,
  DOCUMENT_TITLE,
  ENTITY_SPECIFIC,
  EXCLUDED_CONTENT,
  MIN_SECTION_CHARS,
  citedStandards,
  definedTerms,
  extractSections,
  hashId,
  isLowQualityText,
  parseCacheFile,
  professionalTitle,
  relevanceScore,
  selectProfessionalSentences,
  sentenceComplete,
  slugify,
} from "../lib/source-study.mjs";

const MAX_NOTES_PER_SOURCE = 8;
const MAX_NOTES_DEEPEN = 14;
const MIN_STUDY_SCORE = 9.25;
const MIN_STUDY_SCORE_DEEPEN = 8.4;

function acceptableNote(note) {
  if (note.keyPoints.length < MIN_SECTION_CHARS) return false;
  if (isLowQualityText(note.keyPoints)) return false;
  if (
    /\b(bpp|workbook|study manual|candidate|syllabus|exam prep|wcm|iabc)\b/i.test(
      `${note.title} ${note.keyPoints.slice(0, 500)}`,
    )
  ) {
    return false;
  }
  if (EXCLUDED_CONTENT.test(note.keyPoints)) return false;
  if (BAD_TITLE.test(note.title) || DOCUMENT_TITLE.test(note.title)) return false;
  if (ENTITY_SPECIFIC.test(`${note.title} ${note.keyPoints}`)) return false;
  if ((note.title.match(/\d+/g)?.length ?? 0) >= 3) return false;
  // Journal-entry lines and chart-of-account codes are not concepts.
  if (/^(?:cr|dr|debit|credit)\b/i.test(note.title)) return false;
  if (/^[A-Z]{1,3}\d{1,4}\b/.test(note.title)) return false;
  // OCR-garbled words such as "pRICHeth" and truncated parenthetical titles.
  if (/\b[a-z]+[A-Z]{2,}[a-z]+/.test(note.title)) return false;
  if (
    (note.title.match(/\(/g)?.length ?? 0) !==
    (note.title.match(/\)/g)?.length ?? 0)
  ) {
    return false;
  }
  return true;
}

function studySource({ entry, resource, deepen }) {
  const sections = extractSections(resource);
  const perSource = [];
  const minScore = deepen ? MIN_STUDY_SCORE_DEEPEN : MIN_STUDY_SCORE;
  const maxNotes = deepen ? MAX_NOTES_DEEPEN : MAX_NOTES_PER_SOURCE;

  for (const section of sections) {
    const provisional = classifyResource({
      sourcePath: resource.source,
      title: section.heading,
      text: section.body,
    });
    const title = professionalTitle(resource.titleHint, section.heading, provisional);
    const classification = classifyResource({
      sourcePath: resource.source,
      title,
      text: section.body,
    });
    const keyPoints = selectProfessionalSentences(section.body, classification);
    const note = {
      id: `note-${hashId([entry.id, title, section.body.slice(0, 120)])}`,
      sourceId: entry.id,
      sourcePath: resource.source,
      sourceKind: entry.kind,
      sourceLabel: entry.label,
      heading: section.heading,
      title,
      titleKey: slugify(title),
      keyPoints,
      classification: {
        domain: classification.domain,
        topic: classification.topic,
        contentType: classification.contentType,
        technicalLevel: classification.technicalLevel,
        confidence: Number(classification.confidence.toFixed(2)),
      },
      bodies: classification.bodies,
      standards: citedStandards(section.body),
      terms: definedTerms(section.body),
      quote: sentenceComplete(section.body, 360),
      studyScore: relevanceScore({ title, body: keyPoints, classification }),
      deepen: Boolean(deepen),
    };
    if (acceptableNote(note) && note.studyScore >= minScore) {
      perSource.push(note);
    }
  }

  perSource.sort((left, right) => right.studyScore - left.studyScore);
  return {
    sections: sections.length,
    notes: perSource.slice(0, maxNotes),
  };
}

export function runScholar({ contentDir, catalog, focusSourceIds }) {
  const cacheDir = join(contentDir, "raw-cache");
  const pipelineDir = join(contentDir, "pipeline");
  const notes = [];
  const focus = focusSourceIds instanceof Set ? focusSourceIds : null;
  const stats = {
    sourcesStudied: 0,
    sectionsRead: 0,
    notesTaken: 0,
    deepened: 0,
  };

  for (const entry of catalog.entries) {
    if (entry.status !== "cataloged") continue;
    const deepen = Boolean(focus?.has(entry.id));
    const resource = parseCacheFile(
      readFileSync(join(cacheDir, entry.cacheFile), "utf8"),
    );
    const result = studySource({ entry, resource, deepen });
    stats.sourcesStudied += 1;
    stats.sectionsRead += result.sections;
    if (deepen) stats.deepened += 1;
    notes.push(...result.notes);
  }

  stats.notesTaken = notes.length;
  const notebook = {
    generatedAt: new Date().toISOString(),
    stats,
    notes,
  };
  writeFileSync(
    join(pipelineDir, "notes.json"),
    `${JSON.stringify(notebook, null, 2)}\n`,
    "utf8",
  );
  return notebook;
}

/**
 * Circle deepen pass: restudy focused sources more carefully and merge
 * the new notes into the existing notebook (keeping the stronger note).
 */
export function deepenScholar({ contentDir, catalog, notebook, focusSourceIds }) {
  const cacheDir = join(contentDir, "raw-cache");
  const pipelineDir = join(contentDir, "pipeline");
  const byId = new Map((notebook?.notes ?? []).map((note) => [note.id, note]));
  const focus = focusSourceIds instanceof Set ? focusSourceIds : new Set();
  const stats = {
    sourcesStudied: 0,
    sectionsRead: 0,
    notesAdded: 0,
    notesUpgraded: 0,
  };

  for (const entry of catalog.entries) {
    if (entry.status !== "cataloged" || !focus.has(entry.id)) continue;
    const resource = parseCacheFile(
      readFileSync(join(cacheDir, entry.cacheFile), "utf8"),
    );
    const result = studySource({ entry, resource, deepen: true });
    stats.sourcesStudied += 1;
    stats.sectionsRead += result.sections;
    for (const note of result.notes) {
      const existing = byId.get(note.id);
      if (!existing) {
        byId.set(note.id, note);
        stats.notesAdded += 1;
        continue;
      }
      if ((note.studyScore ?? 0) > (existing.studyScore ?? 0)) {
        byId.set(note.id, note);
        stats.notesUpgraded += 1;
      }
    }
  }

  const next = {
    generatedAt: new Date().toISOString(),
    stats: {
      sourcesStudied: (notebook?.stats?.sourcesStudied ?? 0) + stats.sourcesStudied,
      sectionsRead: (notebook?.stats?.sectionsRead ?? 0) + stats.sectionsRead,
      notesTaken: byId.size,
      circle: stats,
    },
    notes: [...byId.values()],
  };
  writeFileSync(
    join(pipelineDir, "notes.json"),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return next;
}
