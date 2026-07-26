/**
 * Stage 1 — Librarian.
 * Catalogs every extracted source: identifies it, records provenance,
 * classifies the document as a whole, and decides whether it belongs in
 * the professional library at all. Nothing is rewritten here; the output
 * is a catalog the later stages study from.
 *
 * Input:  content/raw-cache/*.txt
 * Output: content/pipeline/catalog.json
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { classifyResource } from "../lib/practitioner-taxonomy.mjs";
import {
  EXCLUDED_CONTENT,
  EXCLUDED_SOURCE,
  MIN_SECTION_CHARS,
  citedStandards,
  hashId,
  parseCacheFile,
  sourceKind,
  sourceLabel,
} from "../lib/source-study.mjs";

export function runLibrarian({ contentDir }) {
  const cacheDir = join(contentDir, "raw-cache");
  if (!existsSync(cacheDir)) {
    throw new Error("Missing content/raw-cache. Run: npm run extract");
  }
  const pipelineDir = join(contentDir, "pipeline");
  mkdirSync(pipelineDir, { recursive: true });

  const entries = [];
  const stats = { scanned: 0, cataloged: 0, rejected: {} };

  for (const name of readdirSync(cacheDir).filter((file) => file.endsWith(".txt")).sort()) {
    stats.scanned += 1;
    const resource = parseCacheFile(readFileSync(join(cacheDir, name), "utf8"));
    const entry = {
      id: `src-${hashId([resource.source, name])}`,
      cacheFile: name,
      source: resource.source,
      titleHint: resource.titleHint,
      kind: sourceKind(resource.source),
      label: sourceLabel(resource.source, resource.titleHint),
      chars: resource.text.length,
      standards: citedStandards(resource.text.slice(0, 20000)),
      status: "cataloged",
      rejectReason: null,
    };

    if (EXCLUDED_SOURCE.test(`${resource.source} ${resource.titleHint}`)) {
      entry.status = "rejected";
      entry.rejectReason = "excluded-source";
    } else if (resource.text.length < MIN_SECTION_CHARS) {
      entry.status = "rejected";
      entry.rejectReason = "insufficient-content";
    } else if (EXCLUDED_CONTENT.test(resource.text.slice(0, 5000))) {
      entry.status = "rejected";
      entry.rejectReason = "exam-or-assignment-content";
    }

    if (entry.status === "cataloged") {
      const classification = classifyResource({
        sourcePath: resource.source,
        title: resource.titleHint,
        text: resource.text,
      });
      entry.classification = {
        domain: classification.domain,
        topic: classification.topic,
        contentType: classification.contentType,
        technicalLevel: classification.technicalLevel,
        confidence: Number(classification.confidence.toFixed(2)),
      };
      entry.bodies = classification.bodies;
      stats.cataloged += 1;
    } else {
      stats.rejected[entry.rejectReason] = (stats.rejected[entry.rejectReason] ?? 0) + 1;
    }

    entries.push(entry);
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    stats,
    entries,
  };
  writeFileSync(
    join(pipelineDir, "catalog.json"),
    `${JSON.stringify(catalog, null, 2)}\n`,
    "utf8",
  );
  return catalog;
}

/**
 * Circle reclassify pass: refresh document-level classification for focused
 * sources so later stages study from an updated catalog.
 */
export function reclassifyLibrarian({ contentDir, catalog, focusSourceIds }) {
  const cacheDir = join(contentDir, "raw-cache");
  const pipelineDir = join(contentDir, "pipeline");
  const focus = focusSourceIds instanceof Set ? focusSourceIds : new Set();
  let reclassified = 0;

  const entries = catalog.entries.map((entry) => {
    if (entry.status !== "cataloged" || !focus.has(entry.id)) return entry;
    const resource = parseCacheFile(
      readFileSync(join(cacheDir, entry.cacheFile), "utf8"),
    );
    const classification = classifyResource({
      sourcePath: resource.source,
      title: resource.titleHint,
      text: resource.text,
    });
    reclassified += 1;
    return {
      ...entry,
      standards: citedStandards(resource.text.slice(0, 20000)),
      classification: {
        domain: classification.domain,
        topic: classification.topic,
        contentType: classification.contentType,
        technicalLevel: classification.technicalLevel,
        confidence: Number(classification.confidence.toFixed(2)),
      },
      bodies: classification.bodies,
      circleReclassifiedAt: new Date().toISOString(),
    };
  });

  const next = {
    ...catalog,
    generatedAt: new Date().toISOString(),
    stats: {
      ...catalog.stats,
      circleReclassified: reclassified,
    },
    entries,
  };
  writeFileSync(
    join(pipelineDir, "catalog.json"),
    `${JSON.stringify(next, null, 2)}\n`,
    "utf8",
  );
  return next;
}
