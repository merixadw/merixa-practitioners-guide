import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Sustain concepts from official professional-body websites.
 *
 * 1. Reads research gaps / agenda to pick which bodies matter this cycle
 * 2. Fetches public overview pages into content/raw-cache (official-open)
 * 3. Attaches living body website references to published cards so concepts
 *    stay grounded in the professional bodies that own them
 *
 * Usage:
 *   npm run library:sustain
 *   node scripts/pipeline/sustain-bodies.mjs --limit=12
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PROFESSIONAL_BODIES,
  bodiesForTopic,
  listProfessionalBodies,
  sustainingReferences,
} from "../lib/professional-bodies.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR = join(ROOT, "content");

const FETCH_TIMEOUT_MS = 20_000;
const MIN_TEXT_CHARS = 400;
const MAX_TEXT_CHARS = 40_000;

function parseLimit(argv) {
  const flag = argv.find((arg) => arg.startsWith("--limit="));
  if (!flag) return 16;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 40) : 16;
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr|br|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}

function cacheName(url) {
  const digest = createHash("sha1").update(url).digest("hex").slice(0, 12);
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "").replace(/\./g, "-");
    } catch {
      return "body";
    }
  })();
  return `official-${host}-${digest}.txt`;
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MerixaGuideBot/1.0 (+local learning circle; educational use)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!response.ok) {
      return { ok: false, reason: `http-${response.status}` };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!/html|text|xml/i.test(contentType)) {
      return { ok: false, reason: "non-html" };
    }
    const html = await response.text();
    const text = htmlToText(html);
    if (text.length < MIN_TEXT_CHARS) {
      return { ok: false, reason: "insufficient-text" };
    }
    return { ok: true, text, finalUrl: response.url || url };
  } catch (error) {
    return {
      ok: false,
      reason: error?.name === "AbortError" ? "timeout" : "fetch-failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Choose body pages from agenda gaps + weak cards needing sustain. */
export function selectBodyPages({ agenda, synthesis, index, limit }) {
  const needed = new Map();
  const gaps = agenda?.stages?.researcher ?? synthesis?.researchGaps ?? [];

  for (const gap of gaps) {
    const domain = gap.domain || String(gap.topic || "").split(" | ")[0]?.trim();
    const topic =
      gap.topicKey?.split(" | ")[1]?.trim() ||
      String(gap.topic || "").split(" | ")[1]?.trim() ||
      "";
    for (const body of bodiesForTopic(domain, topic)) {
      needed.set(body.id, body);
    }
  }

  // Always sustain core reporting bodies lightly.
  for (const id of ["IFRS", "FRC", "IIA", "ACCA", "FRM", "CFA", "CRMA"]) {
    if (PROFESSIONAL_BODIES[id]) needed.set(id, PROFESSIONAL_BODIES[id]);
  }

  // Bodies already present on published cards stay in the sustain set.
  for (const card of index?.cards ?? []) {
    for (const id of card.bodies ?? []) {
      if (PROFESSIONAL_BODIES[id]) needed.set(id, PROFESSIONAL_BODIES[id]);
    }
  }

  const pages = [];
  for (const body of needed.values()) {
    for (const page of body.pages) {
      pages.push({ bodyId: body.id, body, page });
    }
  }
  return pages.slice(0, limit);
}

/**
 * Attach official body website references to published cards.
 * Keeps concepts sustained even when a fetch cycle cannot deepen notes yet.
 */
export function attachBodyReferences(index) {
  let updated = 0;
  const cards = (index?.cards ?? []).map((card) => {
    const refs = sustainingReferences({
      domain: card.classification?.domain,
      topic: card.classification?.topic,
      bodies: card.bodies,
    });
    if (refs.length === 0) return card;

    const existingPaths = new Set(
      (card.sources ?? []).map((source) => source.path || source.url),
    );
    const newSources = refs
      .filter((ref) => !existingPaths.has(ref.url))
      .map((ref) => ({
        label: ref.label,
        path: ref.url,
        kind: "official-open",
        body: ref.body,
      }));

    const bodyIds = new Set(
      (card.bodies ?? []).filter((id) => typeof id === "string"),
    );
    for (const ref of refs) {
      if (PROFESSIONAL_BODIES[ref.body]) bodyIds.add(ref.body);
    }

    const hadOfficial = (card.officialReferences?.length ?? 0) > 0;
    const bodiesChanged = bodyIds.size !== (card.bodies?.length ?? 0);
    const needsOfficial = !hadOfficial || newSources.length > 0 || bodiesChanged;
    if (!needsOfficial) return card;

    updated += 1;
    return {
      ...card,
      bodies: [...bodyIds],
      sources: [...(card.sources ?? []), ...newSources].slice(0, 8),
      officialReferences: refs,
      sustainedAt: new Date().toISOString(),
    };
  });

  return { cards, updated };
}

export async function runSustainBodies({
  contentDir = CONTENT_DIR,
  limit = 16,
  attachOnly = false,
} = {}) {
  const cacheDir = join(contentDir, "raw-cache");
  const pipelineDir = join(contentDir, "pipeline");
  const corpusDir = join(contentDir, "corpus");
  const indexPath = join(contentDir, "index.json");
  const reportPath = join(pipelineDir, "sustain-report.json");

  mkdirSync(pipelineDir, { recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  const agenda = readJson(join(pipelineDir, "agenda.json"));
  const synthesis = readJson(join(pipelineDir, "synthesis.json"));
  const index = readJson(indexPath);
  if (!index?.cards) {
    throw new Error("Missing content/index.json. Run library:rebuild first.");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    bodiesKnown: listProfessionalBodies().length,
    fetched: [],
    failed: [],
    skipped: [],
    cardsUpdated: 0,
    attachOnly,
  };

  if (!attachOnly) {
    const selected = selectBodyPages({ agenda, synthesis, index, limit });
    for (const item of selected) {
      const name = cacheName(item.page.url);
      if (existsSync(join(cacheDir, name))) {
        report.skipped.push({ url: item.page.url, reason: "already-cached" });
        continue;
      }
      const result = await fetchPage(item.page.url);
      if (!result.ok) {
        report.failed.push({ url: item.page.url, reason: result.reason });
        continue;
      }
      const meta = {
        source: result.finalUrl || item.page.url,
        titleHint: item.page.title,
        body: item.bodyId,
        kind: "official-open",
        fetchedAt: new Date().toISOString(),
      };
      writeFileSync(
        join(cacheDir, name),
        `@@META::${JSON.stringify(meta)}\n\n${result.text}\n`,
        "utf8",
      );
      report.fetched.push({
        body: item.bodyId,
        url: item.page.url,
        cacheFile: name,
        chars: result.text.length,
      });
    }
  }

  const attached = attachBodyReferences(index);
  report.cardsUpdated = attached.updated;
  const nextIndex = buildIndexFromCards(attached.cards);
  atomicWriteFile(indexPath, `${JSON.stringify(nextIndex, null, 2)}\n`, "utf8");

  mkdirSync(corpusDir, { recursive: true });
  for (const card of attached.cards) {
    if (!card.sustainedAt) continue;
    writeFileSync(
      join(corpusDir, `${card.id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
  }

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

async function main() {
  const argv = process.argv.slice(2);
  const attachOnly = argv.includes("--attach-only");
  const limit = parseLimit(argv);
  const report = await runSustainBodies({ limit, attachOnly });
  console.log(
    `Sustain bodies: fetched=${report.fetched.length} failed=${report.failed.length} skipped=${report.skipped.length} cardsUpdated=${report.cardsUpdated}`,
  );
}

const isDirectRun = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
