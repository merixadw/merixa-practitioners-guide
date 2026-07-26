import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Sweep duplicate sources, official references, and path resources —
 * same spirit as information dedupe (card-dedupe / library:dedupe).
 *
 * - Collapse URL variants (trailing slash, query noise)
 * - Collapse same-body home-page label twins
 * - Drop official-open sources that already appear as officialReferences
 * - Deduplicate path steps and near-identical path titles across generated packs
 *
 * Usage: npm run library:dedupe:sources
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "dedupe-sources-paths-report.json",
);

const PATH_FILES = [
  "src/lib/guide/ifrs-paths.generated.json",
  "src/lib/guide/frm-paths.generated.json",
  "src/lib/guide/fa-paths.generated.json",
  "src/lib/guide/cross-body-paths.generated.json",
  "src/lib/guide/priority-domain-paths.generated.json",
];

function normUrl(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "")
    .split("?")[0]
    .split("#")[0];
}

function normLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[™®]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isHomeUrl(url) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    return path === "/" || path === "";
  } catch {
    return false;
  }
}

function sourceKey(item) {
  const url = normUrl(item?.path || item?.url);
  if (url) return `u:${url}`;
  const body = String(item?.body || "").toLowerCase();
  return `l:${body}:${normLabel(item?.label)}`;
}

function preferLongerLabel(left, right) {
  const a = String(left?.label || "");
  const b = String(right?.label || "");
  return b.length > a.length ? right : left;
}

/**
 * Deduplicate a list of source/ref objects.
 * Also collapses multiple home-page entries for the same body/host.
 */
function dedupeResourceList(items, { urlField = "path" } = {}) {
  const list = Array.isArray(items) ? items : [];
  const byKey = new Map();
  let removedExact = 0;
  let removedHomeTwin = 0;

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const url = normUrl(item[urlField] || item.path || item.url);
    const key = sourceKey({ ...item, path: url, url });
    if (byKey.has(key)) {
      byKey.set(key, preferLongerLabel(byKey.get(key), item));
      removedExact += 1;
      continue;
    }
    byKey.set(key, item);
  }

  const collapsed = [];
  const homeSeen = new Set();
  for (const item of byKey.values()) {
    const url = normUrl(item[urlField] || item.path || item.url);
    const body = String(item.body || "").toLowerCase();
    const host = hostOf(url);
    if (url && isHomeUrl(url)) {
      const homeKey = `home:${body || host}`;
      if (homeSeen.has(homeKey)) {
        removedHomeTwin += 1;
        continue;
      }
      homeSeen.add(homeKey);
    }
    collapsed.push(item);
  }

  return { items: collapsed, removedExact, removedHomeTwin };
}

function scrubCard(card) {
  const sourcesBefore = (card.sources || []).length;
  const refsBefore = (card.officialReferences || []).length;

  const sourcesPass = dedupeResourceList(card.sources || [], {
    urlField: "path",
  });
  const refsPass = dedupeResourceList(card.officialReferences || [], {
    urlField: "url",
  });

  const refUrls = new Set(
    refsPass.items.map((ref) => normUrl(ref.url)).filter(Boolean),
  );
  let removedCross = 0;
  const sources = [];
  for (const source of sourcesPass.items) {
    const url = normUrl(source.path);
    const isOfficialOpen = source.kind === "official-open";
    if (isOfficialOpen && url && refUrls.has(url)) {
      removedCross += 1;
      continue;
    }
    // Same-host home already covered by an officialReference home.
    if (
      isOfficialOpen &&
      url &&
      isHomeUrl(url) &&
      [...refUrls].some(
        (refUrl) =>
          isHomeUrl(refUrl) && hostOf(refUrl) === hostOf(url),
      )
    ) {
      removedCross += 1;
      continue;
    }
    sources.push(source);
  }

  const changed =
    sources.length !== sourcesBefore ||
    refsPass.items.length !== refsBefore ||
    sourcesPass.removedExact > 0 ||
    sourcesPass.removedHomeTwin > 0 ||
    refsPass.removedExact > 0 ||
    refsPass.removedHomeTwin > 0 ||
    removedCross > 0;

  return {
    card: {
      ...card,
      sources,
      officialReferences: refsPass.items,
    },
    changed,
    stats: {
      sourcesBefore,
      sourcesAfter: sources.length,
      refsBefore,
      refsAfter: refsPass.items.length,
      removedExact:
        sourcesPass.removedExact + refsPass.removedExact,
      removedHomeTwin:
        sourcesPass.removedHomeTwin + refsPass.removedHomeTwin,
      removedCross,
    },
  };
}

function dedupePathFile(filePath) {
  const abs = join(ROOT, filePath);
  if (!existsSync(abs)) {
    return { file: filePath, missing: true };
  }
  const paths = JSON.parse(readFileSync(abs, "utf8"));
  let stepDupesRemoved = 0;
  let titleDupesRemoved = 0;
  const seenTitles = new Set();
  const out = [];

  for (const path of paths) {
    const titleKey = normLabel(path.title);
    const seenSteps = new Set();
    const steps = [];
    for (const step of path.steps || []) {
      const id = String(step.cardId || "");
      if (!id) continue;
      if (seenSteps.has(id)) {
        stepDupesRemoved += 1;
        continue;
      }
      seenSteps.add(id);
      steps.push(step);
    }
    if (titleKey && seenTitles.has(titleKey)) {
      titleDupesRemoved += 1;
      continue;
    }
    if (titleKey) seenTitles.add(titleKey);
    out.push({ ...path, steps });
  }

  if (stepDupesRemoved || titleDupesRemoved || out.length !== paths.length) {
    writeFileSync(abs, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  }

  return {
    file: filePath,
    before: paths.length,
    after: out.length,
    stepDupesRemoved,
    titleDupesRemoved,
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });
  mkdirSync(dirname(REPORT_PATH), { recursive: true });

  let cardsChanged = 0;
  const totals = {
    removedExact: 0,
    removedHomeTwin: 0,
    removedCross: 0,
    sourcesBefore: 0,
    sourcesAfter: 0,
    refsBefore: 0,
    refsAfter: 0,
  };
  const samples = [];
  const cards = [];

  for (const card of index.cards || []) {
    const { card: next, changed, stats } = scrubCard(card);
    cards.push(next);
    totals.removedExact += stats.removedExact;
    totals.removedHomeTwin += stats.removedHomeTwin;
    totals.removedCross += stats.removedCross;
    totals.sourcesBefore += stats.sourcesBefore;
    totals.sourcesAfter += stats.sourcesAfter;
    totals.refsBefore += stats.refsBefore;
    totals.refsAfter += stats.refsAfter;
    if (!changed) continue;
    cardsChanged += 1;
    writeFileSync(
      join(CORPUS_DIR, `${next.id}.json`),
      `${JSON.stringify(next, null, 2)}\n`,
      "utf8",
    );
    if (samples.length < 25) {
      samples.push({
        id: next.id,
        title: next.title,
        sources: `${stats.sourcesBefore}→${stats.sourcesAfter}`,
        refs: `${stats.refsBefore}→${stats.refsAfter}`,
        removedExact: stats.removedExact,
        removedHomeTwin: stats.removedHomeTwin,
        removedCross: stats.removedCross,
      });
    }
  }

  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(cards), null, 2)}\n`,
    "utf8",
  );

  const pathReports = PATH_FILES.map(dedupePathFile);
  const report = {
    generatedAt: new Date().toISOString(),
    cardsChanged,
    totalCards: cards.length,
    totals,
    pathReports,
    samples,
    policy:
      "Deduped sources/officialReferences by normalized URL and body home-page twins; dropped official-open sources already covered by officialReferences; deduped path steps and duplicate path titles.",
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
