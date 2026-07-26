/**
 * Expand priority encyclopedia shelves toward continuous-growth floors.
 *
 * Shelves:
 *   ma, tax, fa, ifrs — classic packs
 *   crma, iia, coso, frm — Merixa×Codex / IIA / COSO / GARP
 *   (+ domain-floor and tax-jurisdiction via --domain-floor / --tax-floor)
 *
 * Usage:
 *   npm run library:shelves:expand
 *   npm run library:shelves:expand -- --shelf=crma --batch=20
 *   npm run library:shelves:expand:aggressive -- --ignore-budget
 *   npm run library:domains:floor -- --until-target --rounds=80 --batch=25
 *
 * Offline / OpenAI-quota fallback:
 *   When OpenAI is unavailable, drafts are pulled from the codex local feed
 *   (content/pipeline/codex-feed/<shelf>.json — build with
 *   scripts/pipeline/codex-local-feed.mjs). Generic heuristic template filler
 *   is DISABLED by default; enable only with --allow-heuristic.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteFile } from "../lib/atomic-write.mjs";
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
import {
  ALL_ENCYCLOPEDIA_SHELVES,
  ENCYCLOPEDIA_SHELF_TARGET,
  ENCYCLOPEDIA_SHELVES,
  DOMAIN_FLOOR_SHELVES,
  TAX_FLOOR_TARGET,
  TAX_JURISDICTION_SHELVES,
  isTaxEncyclopediaCard,
  isTaxFacetCloneTitle,
  shelfExistingCount,
  shelfTarget,
  taxEncyclopediaCount,
  taxJurisdictionCount,
} from "../lib/encyclopedia-shelf-targets.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { sustainingReferences } from "../lib/professional-bodies.mjs";
import {
  JOBS,
  canAfford,
  extractUsageTokens,
  formatBudgetLine,
  loadBudgetState,
  recordSpend,
  budgetSnapshot,
} from "../lib/token-budget.mjs";
import { unionMergeWithDiskIndex } from "../lib/index-union.mjs";
import { withIndexHolder } from "./index-holder.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);

const CONTENT_DIR = join(ROOT, "content");
const CORPUS_DIR = join(CONTENT_DIR, "corpus");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const CODEX_FEED_DIR = join(PIPELINE_DIR, "codex-feed");
const INDEX_PATH = join(CONTENT_DIR, "index.json");
const STATE_PATH = join(PIPELINE_DIR, "encyclopedia-shelf-expand-state.json");
const REPORT_PATH = join(PIPELINE_DIR, "encyclopedia-shelf-expand-report.json");
const SHELF_JOB = JOBS.shelves;

function flag(argv, name) {
  return argv.includes(name);
}

function flagValue(argv, name, fallback) {
  const hit = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!hit) return fallback;
  const raw = hit.split("=").slice(1).join("=");
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) return Math.floor(num);
  return raw || fallback;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
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

/** Keep differentiating facet tails so sibling titles stay unique. */
function cutTitle(value, max) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const sep = " — ";
  if (text.includes(sep)) {
    const parts = text.split(sep);
    const facet = parts.slice(1).join(sep).trim();
    const head = parts[0].trim();
    const room = max - facet.length - sep.length;
    if (room >= 24 && facet.length > 0) {
      return `${head.slice(0, room).trim()}${sep}${facet}`.slice(0, max);
    }
  }
  return text.slice(0, max).trim();
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function existingTitles(cards, shelf) {
  const set = new Set();
  for (const card of cards) {
    if (shelf.countByTaxFloor) {
      const id = String(card.id || "");
      const tags = Array.isArray(card.tags) ? card.tags : [];
      if (!id.startsWith("tax-") && !tags.includes("tax-encyclopedia")) continue;
    } else if (shelf.countByDomain) {
      if (card?.classification?.domain !== shelf.domain) continue;
    } else if (!String(card.id || "").startsWith(shelf.idPrefix)) {
      if (
        !(
          shelf.idMatch instanceof RegExp &&
          shelf.idMatch.test(String(card.id || ""))
        )
      ) {
        continue;
      }
    }
    set.add(String(card.title || "").toLowerCase().trim());
  }
  return set;
}

function pickSeeds(shelf, existingTitleSet, limit) {
  const unused = shelf.conceptSeeds.filter(
    (title) => !existingTitleSet.has(title.toLowerCase().trim()),
  );
  return unused.slice(0, limit);
}

async function proposeTitles(shelf, existingTitleSet, limit, env) {
  // Tax jurisdiction shelves must stay unique legislation — never facet-clone.
  if (shelf.countByTaxFloor) {
    return pickSeeds(shelf, existingTitleSet, limit);
  }
  if (!env.OPENAI_API_KEY?.trim() || env.ENCYCLOPEDIA_OFFLINE === "1") {
    // P3: do not mint “Title — facet” clones offline — unique seeds only.
    return pickSeeds(shelf, existingTitleSet, limit);
  }
  const key = env.OPENAI_API_KEY.trim();
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const avoid = [...existingTitleSet].slice(0, 120).join("; ");
  const codexHint =
    Array.isArray(shelf.codexBooks) && shelf.codexBooks.length
      ? ` Ground titles in workplace concepts from these Merixa×Codex book families (not exam marketing): ${shelf.codexBooks.join("; ")}.`
      : "";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You invent distinct practitioner encyclopedia titles for ${shelf.leadBody} / ${shelf.title}.
Return JSON only: {"titles":["..."]}
Rules: workplace concepts only; no exam marketing; no duplicate meaning of avoided titles; keep titles under 80 chars.${codexHint}`,
        },
        {
          role: "user",
          content: `Need ${limit} new titles for domain "${shelf.domain}". Topics: ${shelf.topics.join(", ")}.
Avoid these existing titles: ${avoid || "(none)"}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`proposeTitles HTTP ${response.status}`);
  }
  const data = await response.json();
  recordSpend(PIPELINE_DIR, SHELF_JOB, extractUsageTokens(data));
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const titles = Array.isArray(parsed?.titles) ? parsed.titles : [];
  return titles
    .map((title) => cut(title, 80))
    .filter(
      (title) => title && !existingTitleSet.has(title.toLowerCase().trim()),
    )
    .slice(0, limit);
}

/**
 * Pull source-grounded drafts from the codex local feed queue
 * (content/pipeline/codex-feed/<shelf>.json, built by codex-local-feed.mjs).
 * Taken and duplicate drafts are consumed from the queue file.
 */
function takeCodexDrafts(shelf, count, titleSet) {
  const queuePath = join(CODEX_FEED_DIR, `${shelf.id}.json`);
  if (!existsSync(queuePath)) return [];
  let queue;
  try {
    queue = JSON.parse(readFileSync(queuePath, "utf8"));
  } catch {
    return [];
  }
  const drafts = Array.isArray(queue?.drafts) ? queue.drafts : [];
  const taken = [];
  const rest = [];
  for (const draft of drafts) {
    const titleKey = String(draft?.title || "").toLowerCase().trim();
    if (!titleKey || titleSet.has(titleKey)) continue; // consume duplicates
    if (taken.length < count) taken.push(draft);
    else rest.push(draft);
  }
  if (taken.length > 0 || rest.length !== drafts.length) {
    atomicWriteFile(
      queuePath,
      `${JSON.stringify({ ...queue, count: rest.length, drafts: rest }, null, 1)}\n`,
    );
  }
  return taken;
}

/**
 * Offline batch: prefer real content from the codex feed; template filler
 * (heuristicDraft) only when explicitly allowed via --allow-heuristic.
 */
function codexQueueSize(shelf) {
  const queuePath = join(CODEX_FEED_DIR, `${shelf.id}.json`);
  if (!existsSync(queuePath)) return 0;
  try {
    const queue = JSON.parse(readFileSync(queuePath, "utf8"));
    return Array.isArray(queue?.drafts) ? queue.drafts.length : 0;
  } catch {
    return 0;
  }
}

function offlineBatch(shelf, seeds, titleSet, want, allowHeuristic) {
  const codex = takeCodexDrafts(shelf, want, titleSet);
  if (codex.length > 0) {
    console.log(
      `  codex-feed: ${codex.length} source-grounded drafts for ${shelf.id}`,
    );
    return { drafts: codex, seeds: codex.map((draft) => draft.title) };
  }
  if (allowHeuristic) {
    return { drafts: seeds.map((title) => heuristicDraft(shelf, title)), seeds };
  }
  return { drafts: [], seeds: [] };
}

function heuristicDraft(shelf, seedTitle) {
  const topic = shelf.defaultTopic;
  return {
    title: seedTitle,
    topic,
    definition: `${seedTitle} is a practitioner concept in ${shelf.domain}, sustained with ${shelf.leadBody} workplace practice. It is used to produce decision-useful evidence for owners, packs, and controls — not as exam jargon.`,
    example: `Raise “${seedTitle}” when the pack, close, or control test needs an owner, a figure, and an evidence trail. Document the decision, the range or estimate used, and what would reverse the conclusion.`,
    trap: `Naming “${seedTitle}” in a pack without evidence, owner, or decision link — or copying a template that does not match the entity’s facts.`,
  };
}

async function generateBatch(shelf, seeds, env) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key || env.ENCYCLOPEDIA_OFFLINE === "1") {
    // Offline callers must go through offlineBatch (codex feed) instead —
    // never silently mint template filler here.
    return [];
  }

  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";

  const system = `You expand a practitioner encyclopedia for ${shelf.leadBody}-aligned workplace learning.
Return JSON only:
{"cards":[{"title":"...","topic":"...","definition":"...","example":"...","trap":"...","formula":"...optional"}]}
Rules:
- One card per requested title; keep titles close to the requested wording
- definition: 2-4 precise practitioner sentences
- example: concrete workplace numbers/owners/evidence
- trap: common workplace mistake
- formula: only when a stable identity exists; else omit
- topic must be one of: ${shelf.topics.join(" | ")}
- Never invent IFRS/IAS/FRS/ISA clause numbers unless the title already names them
- No exam tips, no membership marketing
- Lead professional body is ${shelf.leadBody}${
    Array.isArray(shelf.codexBooks) && shelf.codexBooks.length
      ? `\n- Align definitions with Merixa×Codex themes from: ${shelf.codexBooks.join("; ")} (workplace application, not exam marketing)`
      : ""
  }`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Create encyclopedia cards for these titles under domain "${shelf.domain}":\n${seeds
            .map((title, index) => `${index + 1}. ${title}`)
            .join("\n")}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI ${response.status}: ${detail.slice(0, 400)}`);
  }

  const data = await response.json();
  recordSpend(PIPELINE_DIR, SHELF_JOB, extractUsageTokens(data));
  const content = data?.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed?.cards) ? parsed.cards : [];
}

export function toCard(shelf, draft, seedTitle) {
  const title = cutTitle(draft.title || seedTitle, 120);
  const topic =
    shelf.topics.find(
      (item) =>
        item.toLowerCase() === String(draft.topic || "").toLowerCase().trim(),
    ) || shelf.defaultTopic;
  const definition = cut(draft.definition, 1100);
  const example = cut(draft.example, 1200);
  const trap = cut(draft.trap, 550);
  const formula = draft.formula ? cut(draft.formula, 420) : undefined;
  const slug = slugify(title);
  // Stable unique suffix — slug alone collides across long facet titles.
  const digest = Buffer.from(title.toLowerCase())
    .toString("base64url")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toLowerCase();
  const id = `${shelf.idPrefix}${slug}-${digest}`.replace(/-$/, "");
  const officialReferences = sustainingReferences({
    domain: shelf.domain,
    topic,
    bodies: shelf.bodies,
  });
  const primarySource = draft.codexSource
    ? {
        label: cut(draft.codexSource.label, 120),
        path: String(draft.codexSource.path || shelf.seedPath),
        kind: "merixa",
        body: "Merixa",
      }
    : {
        label: `Merixa ${shelf.title}`,
        path: shelf.seedPath,
        kind: "merixa",
        body: "Merixa",
      };

  return {
    id,
    title,
    body: composeUniqueBody({
      definition,
      formula,
      interpretation: draft.interpretation
        ? cut(draft.interpretation, 700)
        : undefined,
      related: draft.related ? cut(draft.related, 280) : undefined,
      extra: draft.extra ? cut(draft.extra, 320) : undefined,
    }),
    bodies: shelf.bodies,
    tags: [
      "encyclopedia",
      shelf.tag,
      "domain-spine",
      shelf.leadBody.toLowerCase(),
      topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      ...(draft.codexSource ? ["codex-sourced"] : []),
      ...(Array.isArray(shelf.extraTags) ? shelf.extraTags : []),
    ],
    workplaceTasks: [],
    sources: [
      primarySource,
      ...officialReferences.slice(0, 2).map((ref) => ({
        label: ref.label,
        path: ref.url,
        kind: "official-open",
        body: ref.body,
      })),
    ],
    officialReferences: officialReferences.slice(0, 4),
    teachingSummary: definition,
    formula,
    workedExample: example,
    commonMistake: trap,
    checkQuestion: cut(
      `What evidence would change your conclusion on “${title}”, and who owns the decision?`,
      220,
    ),
    sourceQuotes: [],
    classification: {
      domain: shelf.domain,
      topic,
      contentType: formula ? "formula" : "definition",
      technicalLevel: "practitioner",
      confidence: 0.9,
      ...(shelf.jurisdiction
        ? { jurisdiction: shelf.jurisdiction }
        : {}),
    },
    editorialStatus: "model-reviewed",
    qualityScore: 0.88,
    encyclopediaAt: new Date().toISOString(),
    shelfExpandAt: new Date().toISOString(),
  };
}

export function loadIndex() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  return JSON.parse(readFileSync(INDEX_PATH, "utf8"));
}

export function persistCards(index, newCards) {
  mkdirSync(CORPUS_DIR, { recursive: true });
  const byId = new Map(
    (Array.isArray(index.cards) ? index.cards : []).map((card) => [
      card.id,
      card,
    ]),
  );
  let published = 0;
  let updated = 0;
  for (const card of newCards) {
    const existing = byId.get(card.id);
    if (existing) updated += 1;
    else published += 1;
    const mergedCard = preferImprovedCard(existing, card).card;
    byId.set(mergedCard.id, mergedCard);
    writeFileSync(
      join(CORPUS_DIR, `${mergedCard.id}.json`),
      `${JSON.stringify(mergedCard, null, 2)}\n`,
      "utf8",
    );
  }
  // Lost-update guard: union-merge cards another pipeline published while
  // this round ran, so our write does not wipe them (see index-union.mjs).
  const { cards: merged, recovered } = unionMergeWithDiskIndex(INDEX_PATH, [
    ...byId.values(),
  ]);
  if (recovered > 0) {
    console.warn(
      `expand-shelves: union-merged ${recovered} cards written concurrently by another pipeline`,
    );
  }
  const next = buildIndexFromCards(merged);
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return { published, updated, index: next };
}

/** Drop facet-cloned tax cards so the tax floor is unique legislation only. */
function pruneTaxFacetClones(index) {
  const kept = [];
  const deletedIds = new Set();
  for (const card of Array.isArray(index.cards) ? index.cards : []) {
    if (isTaxEncyclopediaCard(card) && isTaxFacetCloneTitle(card.title)) {
      deletedIds.add(card.id);
      const corpusPath = join(CORPUS_DIR, `${card.id}.json`);
      if (existsSync(corpusPath)) {
        try {
          unlinkSync(corpusPath);
        } catch {
          /* ignore missing corpus file */
        }
      }
      continue;
    }
    kept.push(card);
  }
  if (deletedIds.size === 0) return { index, removed: 0 };
  // Union merge keeps concurrent additions from other pipelines, while
  // deletedIds stops the merge from resurrecting the clones we just pruned.
  const { cards: mergedKept } = unionMergeWithDiskIndex(INDEX_PATH, kept, {
    deletedIds,
  });
  const next = buildIndexFromCards(mergedKept);
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`);
  return { index: next, removed: deletedIds.size };
}

function volumeFreezeActive() {
  try {
    const opsPath = join(PIPELINE_DIR, "ops-status.json");
    if (!existsSync(opsPath)) return false;
    const ops = JSON.parse(readFileSync(opsPath, "utf8"));
    return ops?.shelfFloorExpansion?.mode === "frozen";
  } catch {
    return false;
  }
}

export async function expandEncyclopediaShelves({
  argv = process.argv.slice(2),
} = {}) {
  const untilTarget = flag(argv, "--until-target");
  const dryRun = flag(argv, "--dry-run");
  const allowHeuristic = flag(argv, "--allow-heuristic");
  const domainFloorOnly = flag(argv, "--domain-floor");
  const forceAfterFreeze = flag(argv, "--force-after-freeze");
  if (volumeFreezeActive() && !forceAfterFreeze && !dryRun) {
    throw new Error(
      "VOLUME_FREEZE: shelfFloorExpansion.mode=frozen — refuse shelf expand minting. Pass --force-after-freeze only after distinctness review (E6).",
    );
  }
  const taxFloorOnly = flag(argv, "--tax-floor");
  const priorityOnly = flag(argv, "--priority");
  const shelfFilter = flagValue(argv, "--shelf", "");
  const batchSize = Math.min(
    25,
    Number(flagValue(argv, "--batch", untilTarget ? 18 : 15)) || 15,
  );
  const maxRounds = Number(
    flagValue(argv, "--rounds", untilTarget ? 40 : 1),
  );

  mkdirSync(PIPELINE_DIR, { recursive: true });
  let index = loadIndex();
  const report = {
    startedAt: new Date().toISOString(),
    target: taxFloorOnly ? TAX_FLOOR_TARGET : ENCYCLOPEDIA_SHELF_TARGET,
    domainFloorOnly,
    taxFloorOnly,
    priorityOnly,
    rounds: [],
    before: {},
    after: {},
  };

  if (taxFloorOnly && !dryRun) {
    const pruned = pruneTaxFacetClones(index);
    index = pruned.index;
    report.taxFacetClonesRemoved = pruned.removed;
    if (pruned.removed > 0) {
      console.log(
        `pruned ${pruned.removed} tax facet-clone cards (unique legislation only)`,
      );
    }
  }

  const catalog = taxFloorOnly
    ? TAX_JURISDICTION_SHELVES
    : domainFloorOnly
      ? DOMAIN_FLOOR_SHELVES
      : priorityOnly
        ? ENCYCLOPEDIA_SHELVES
        : ALL_ENCYCLOPEDIA_SHELVES;
  const shelves = catalog.filter(
    (shelf) => !shelfFilter || shelf.id === shelfFilter,
  );
  for (const shelf of shelves) {
    report.before[shelf.id] = shelfExistingCount(index.cards, shelf);
  }

  console.log("\n=== encyclopedia-shelf-expand ===");
  console.log("before:", report.before);
  console.log(
    `targetFloor=${report.target} batch=${batchSize}${taxFloorOnly ? ` tax-floor=${TAX_FLOOR_TARGET}` : ""}${priorityOnly ? " priority=ma,tax,fa,ifrs,crma,iia,coso,frm" : ""}`,
  );
  console.log(formatBudgetLine(budgetSnapshot(PIPELINE_DIR)));

  const ignoreBudget = flag(argv, "--ignore-budget");

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.warn(
      `⚠ OPENAI_API_KEY missing — offline mode: codex-feed drafts${
        allowHeuristic ? " (heuristic filler allowed)" : " only (no filler)"
      }`,
    );
    process.env.ENCYCLOPEDIA_OFFLINE = "1";
  }

  for (let round = 0; round < maxRounds; round += 1) {
    const { state: budgetState, disabled: budgetDisabled } =
      loadBudgetState(PIPELINE_DIR);
    if (
      !ignoreBudget &&
      !budgetDisabled &&
      process.env.ENCYCLOPEDIA_OFFLINE !== "1" &&
      !canAfford(budgetState, SHELF_JOB)
    ) {
      console.log(
        "encyclopedia-shelf-expand: stopping — daily token budget for shelves reached",
      );
      report.budgetStopped = true;
      break;
    }

    let roundPublished = 0;
    const roundDetail = { round: round + 1, shelves: {} };

    for (const shelf of shelves) {
      const current = shelfExistingCount(index.cards, shelf);
      const target = shelfTarget(shelf);
      const gap = Math.max(0, target - current);
      if (gap === 0) {
        roundDetail.shelves[shelf.id] = { current, gap: 0, skipped: true };
        continue;
      }

      const titles = existingTitles(index.cards, shelf);
      let seeds = pickSeeds(shelf, titles, Math.min(batchSize, gap));
      if (seeds.length < Math.min(batchSize, gap)) {
        try {
          const proposed = await proposeTitles(
            shelf,
            titles,
            Math.min(batchSize, gap) - seeds.length,
            process.env,
          );
          seeds = [...seeds, ...proposed];
        } catch (error) {
          console.warn(
            `  proposeTitles failed for ${shelf.id}:`,
            error?.message || error,
          );
        }
      }
      const offlineNow =
        process.env.ENCYCLOPEDIA_OFFLINE === "1" ||
        !process.env.OPENAI_API_KEY?.trim();
      // Codex-feed drafts carry their own titles — seeds unnecessary offline.
      if (seeds.length === 0 && !(offlineNow && codexQueueSize(shelf) > 0)) {
        roundDetail.shelves[shelf.id] = {
          current,
          gap,
          skipped: true,
          reason: "no-unused-seeds",
        };
        console.log(`⚠ ${shelf.id}: could not obtain unused titles.`);
        continue;
      }

      console.log(
        `\n→ ${shelf.id} (${shelf.leadBody}) current=${current} gap=${gap} generating=${seeds.length}`,
      );
      if (dryRun) {
        roundDetail.shelves[shelf.id] = {
          current,
          gap,
          dryRunSeeds: seeds,
        };
        continue;
      }

      try {
        const want = Math.min(batchSize, gap);
        let drafts;
        let batchSeeds = seeds;
        if (
          process.env.ENCYCLOPEDIA_OFFLINE === "1" ||
          !process.env.OPENAI_API_KEY?.trim()
        ) {
          ({ drafts, seeds: batchSeeds } = offlineBatch(
            shelf,
            seeds,
            titles,
            want,
            allowHeuristic,
          ));
        } else {
          try {
            drafts = await generateBatch(shelf, seeds, process.env);
          } catch (error) {
            const msg = String(error?.message || error);
            if (/429|insufficient_quota|quota/i.test(msg)) {
              console.warn(
                `  quota hit — switching to codex-feed drafts for ${shelf.id}`,
              );
              process.env.ENCYCLOPEDIA_OFFLINE = "1";
              ({ drafts, seeds: batchSeeds } = offlineBatch(
                shelf,
                seeds,
                titles,
                want,
                allowHeuristic,
              ));
            } else {
              throw error;
            }
          }
        }
        if (!Array.isArray(drafts) || drafts.length === 0) {
          roundDetail.shelves[shelf.id] = {
            current,
            gap,
            skipped: true,
            reason:
              process.env.ENCYCLOPEDIA_OFFLINE === "1"
                ? "codex-feed-empty (run codex-local-feed.mjs or pass --allow-heuristic)"
                : "empty-model-batch",
          };
          console.warn(
            `⚠ ${shelf.id}: no drafts available — skipping (no template filler).`,
          );
          continue;
        }
        const cards = [];
        for (let i = 0; i < batchSeeds.length; i += 1) {
          let draft = drafts[i];
          if (!draft?.definition || !draft?.example || !draft?.trap) {
            if (!allowHeuristic) continue;
            draft = heuristicDraft(shelf, batchSeeds[i]);
          }
          const card = toCard(shelf, draft, batchSeeds[i]);
          if (titles.has(card.title.toLowerCase())) continue;
          if (index.cards.some((existing) => existing.id === card.id)) {
            card.id = `${card.id}-${String(Date.now()).slice(-4)}${i}`;
          }
          cards.push(card);
          titles.add(card.title.toLowerCase());
        }

        if (cards.length === 0) {
          roundDetail.shelves[shelf.id] = {
            current,
            gap,
            generated: 0,
            reason: "empty-model-batch",
          };
          continue;
        }

        const result = persistCards(index, cards);
        index = result.index;
        roundPublished += result.published;
        roundDetail.shelves[shelf.id] = {
          currentBefore: current,
          currentAfter: shelfExistingCount(index.cards, shelf),
          published: result.published,
          updated: result.updated,
        };
        console.log(
          `  published=${result.published} now=${roundDetail.shelves[shelf.id].currentAfter}`,
        );
        await sleep(process.env.ENCYCLOPEDIA_OFFLINE === "1" ? 50 : 1200);
      } catch (error) {
        roundDetail.shelves[shelf.id] = {
          current,
          gap,
          error: String(error?.message || error).slice(0, 300),
        };
        console.error(`  ERROR ${shelf.id}:`, error?.message || error);
      }
    }

    report.rounds.push(roundDetail);

    const allMet = shelves.every(
      (shelf) => shelfExistingCount(index.cards, shelf) >= shelfTarget(shelf),
    );
    if (!untilTarget || allMet || roundPublished === 0) break;
  }

  for (const shelf of shelves) {
    report.after[shelf.id] = shelfExistingCount(index.cards, shelf);
  }
  if (taxFloorOnly) {
    report.taxTotal = taxEncyclopediaCount(index.cards);
    report.taxByJurisdiction = {
      uk: taxJurisdictionCount(index.cards, "uk"),
      us: taxJurisdictionCount(index.cards, "us"),
      eu: taxJurisdictionCount(index.cards, "eu"),
    };
  }
  report.finishedAt = new Date().toISOString();
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(
    STATE_PATH,
    `${JSON.stringify(
      {
        lastRunAt: report.finishedAt,
        target: report.target,
        after: report.after,
        taxTotal: report.taxTotal,
        taxByJurisdiction: report.taxByJurisdiction,
        remaining: Object.fromEntries(
          shelves.map((shelf) => [
            shelf.id,
            Math.max(
              0,
              shelfTarget(shelf) - (report.after[shelf.id] || 0),
            ),
          ]),
        ),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log("\nafter:", report.after);
  if (report.taxTotal != null) {
    console.log("taxTotal:", report.taxTotal, report.taxByJurisdiction);
  }
  console.log(`report: ${REPORT_PATH}`);
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  withIndexHolder("expand-encyclopedia-shelves", () =>
    expandEncyclopediaShelves(),
  ).catch((error) => {
    console.error(error);
    process.exitCode = error?.code === "INDEX_HOLDER_BUSY" ? 3 : 1;
  });
}
