import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Repair dead path step cardIds after the 2026-07-23 dedupe/rename wave.
 *
 * For every generated path JSON, each step whose cardId no longer resolves to
 * a runtime-visible card (content/index.json cards that pass runtime
 * validation, plus seed cards) is remapped to a live card:
 *   1. PATH_CARD_REMAP entry (if its target is live)
 *   2. canonical registry idToCanonical (if target is live)
 *   3. exact normalized-title match (IFRS/IAS catalog step title, the step's
 *      own title, or the de-hashed id slug)
 *   4. fuzzy title match (token overlap, standard-tag boost)
 *   5. standard pool fallback — best unused live card for the same
 *      IFRS/IAS standard
 * Unresolvable steps are dropped (reported).
 *
 * Writes:
 *   - repaired path JSONs in src/lib/guide/
 *   - content/pipeline/recovered-aliases.json  (confident dead-id → live-id)
 *   - content/pipeline/runtime-live-ids.json   (runtime-visible card ids)
 *   - content/pipeline/path-repair-report.json
 *
 * Usage: npx tsx scripts/pipeline/repair-path-refs.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- plain .mjs module without type declarations
import { IFRS_IAS_STANDARDS } from "../lib/ifrs-ias-catalog.mjs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- plain .mjs module without type declarations
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- plain .mjs module without type declarations
import { buildIndexFromCards } from "./teacher.mjs";
import { loadGuideIndex } from "../../src/lib/guide/corpus";
import { isVisibleInLibraryBrowse } from "../../src/lib/guide/publishable";
import { PATH_CARD_REMAP } from "../../src/lib/guide/path-card-remap";
import type { GuideCard, LearningPath } from "../../src/lib/guide/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUIDE_DIR = join(ROOT, "src", "lib", "guide");
const PIPELINE_DIR = join(ROOT, "content", "pipeline");
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Hand-reviewed matches for dead ids the automatic matcher cannot resolve
 * confidently (OpenAI-era cross-body cards and stale remap targets). Only
 * applied when the target is live at run time.
 */
const MANUAL_OVERRIDES: Record<string, string> = {
  "tax-etr-reconciliation":
    "tax-accounting-for-effective-tax-rate-fluctuations-in-consol-ywnjb3vudg",
  "accca-transfer-pricing-principles":
    "tax-accounting-for-tax-impacts-of-cross-border-transfer-pric-ywnjb3vudg",
  "acca-intercompany-recharge-controls":
    "tax-accounting-for-tax-effects-of-intercompany-service-fees--ywnjb3vudg",
  "iia-audit-committee-tax-oversight": "enc-audit-committee",
  "merixa-integrated-transfer-pricing-governance":
    "tax-accounting-for-transfer-pricing-risks-in-financial-repor-ywnjb3vudg",
  "ifrs-materiality-sustainability": "enc-materiality-esg",
  "accca-emissions-boundaries-reporting": "enc-scope-emissions",
  "ifrs-finance-disclosure-controls":
    "strategy-enc-sox-disclosure-controls-and-procedures-c294igrpc2",
  "cfa-ifrs-sustainability-bridge": "sustain-enc-financial-materiality-for-esg",
  "ias-19-termination":
    "ifrs-enc-employee-benefits-accounting-for-termination-benefits-zw1wbg95zw",
  "ias-19-short-term":
    "ifrs-enc-employee-benefits-accounting-for-short-term-and-long-ter-zw1wbg95zw",
  "ias-28-equity-method":
    "ifrs-enc-consolidation-accounting-for-associates-and-joint-ventur-y29uc29saw",
  "ias-36-reversal":
    "ifrs-enc-financial-reporting-impairment-reversal-of-impairment-lo-zmluyw5jaw-334214",
  "ifrs-15-contract-costs": "ifrs-enc-contract-cost-amortisation-y29udhjhy3",
  "ifrs-16-discount": "ifrs-enc-ifrs-16-discount-rate-determination",
  "ifrs-16-liability": "ifrs-enc-initial-lease-liability-aw5pdglhbc",
  "ifrs-5-discontinued": "ifrs-enc-discontinued-operation-result-zglzy29udg",
  "ifrs-10-nci": "ifrs-enc-non-controlling-interest-in-equity-bm9ulwnvbn",
  "ifrs-16-rou": "ifrs-enc-right-of-use-asset-movement-cmlnahqtb2",
};

const PATH_FILES = [
  "ifrs-paths.generated.json",
  "cross-body-paths.generated.json",
  "priority-domain-paths.generated.json",
  "domain-shelf-paths.generated.json",
  "frm-paths.generated.json",
  "fa-paths.generated.json",
];

type IfrsStep = { slug: string; title: string; summary?: string };
type IfrsStandard = {
  code: string;
  slug: string;
  title: string;
  steps: IfrsStep[];
};

function normalizeTitle(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "for", "on", "vs",
  "with", "under", "at", "by", "from", "into", "is", "are", "s",
]);

function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokens(value: string): Set<string> {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .filter((t) => t && !STOPWORDS.has(t))
      .map(stem),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / Math.max(a.size, b.size);
}

function dehashSlug(id: string): string {
  return id
    .replace(/-[a-f0-9]{8,}$/i, "")
    .replace(/^(crma|coso|iia|acca|accca|cfa|cgma|merixa|enc|risk-enc|tax-enc|ifrs-enc|frm|fa|ma|tax)-/, "")
    .replace(/-/g, " ")
    .trim();
}

function main() {
  // --- live card universe (runtime-visible ingested cards + seeds) ---
  const index = loadGuideIndex();
  const liveCards = index.cards.filter((card) => isVisibleInLibraryBrowse(card));
  const liveById = new Map<string, GuideCard>(liveCards.map((c) => [c.id, c]));
  const liveByTitle = new Map<string, string>();
  for (const card of liveCards) {
    const key = normalizeTitle(card.title);
    if (key && !liveByTitle.has(key)) liveByTitle.set(key, card.id);
    for (const alias of card.aliases ?? []) {
      const aliasKey = normalizeTitle(alias);
      if (aliasKey && !liveByTitle.has(aliasKey)) liveByTitle.set(aliasKey, card.id);
    }
  }
  const liveTokens = new Map<string, Set<string>>(
    liveCards.map((c) => [c.id, tokens(c.title)]),
  );

  writeFileSync(
    join(PIPELINE_DIR, "runtime-live-ids.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), ids: liveCards.map((c) => c.id) })}\n`,
    "utf8",
  );

  // --- stale canonical registry: invert titleToCanonical for dead-id titles ---
  const oldRegistry = JSON.parse(
    readFileSync(join(GUIDE_DIR, "canonical-registry.generated.json"), "utf8"),
  ) as {
    idToCanonical?: Record<string, string>;
    titleToCanonical?: Record<string, string>;
  };
  const oldTitlesById = new Map<string, string[]>();
  for (const [title, id] of Object.entries(oldRegistry.titleToCanonical ?? {})) {
    if (!oldTitlesById.has(id)) oldTitlesById.set(id, []);
    oldTitlesById.get(id)!.push(title);
  }

  // --- IFRS/IAS catalog: dedicated step-card id → step title + standard ---
  const standards = IFRS_IAS_STANDARDS as IfrsStandard[];
  const ifrsStepById = new Map<string, { title: string; standard: IfrsStandard }>();
  for (const standard of standards) {
    for (const step of standard.steps) {
      ifrsStepById.set(`${standard.slug}-${step.slug}`, { title: step.title, standard });
    }
  }
  const standardBySlugPrefix = [...standards].sort(
    (a, b) => b.slug.length - a.slug.length,
  );

  function standardForId(id: string): IfrsStandard | null {
    return (
      standardBySlugPrefix.find((s) => id === s.slug || id.startsWith(`${s.slug}-`)) ??
      null
    );
  }

  const standardPoolCache = new Map<string, GuideCard[]>();

  function standardPool(standard: IfrsStandard): GuideCard[] {
    const cached = standardPoolCache.get(standard.slug);
    if (cached) return cached;

    const stdTag = `ifrs-ias-${standard.slug}`;
    const codeMatch = standard.code.match(/(IFRS|IAS)\s*(\d+[A-Z]?)/i);
    const codeRe = codeMatch
      ? new RegExp(`\\b${codeMatch[1]}\\s*-?\\s*${codeMatch[2]}\\b`, "i")
      : null;
    const stdTitleTokens = tokens(standard.title);

    const pool = liveCards.filter((card) => {
      if (card.tags.includes(stdTag)) return true;
      if (card.tags.includes(`standard-${standard.code.toLowerCase().replace(/\s+/g, "-")}`)) {
        return true;
      }
      const haystack = `${card.title} ${card.classification?.topic ?? ""}`;
      if (codeRe && codeRe.test(haystack)) return true;
      // ifrs-enc-* / ias-* / frs-* shelf cards carry the standard as a topic
      // string ("Business combinations", "Provisions and contingencies") —
      // match on standard-title token overlap instead of the code.
      const topicTokens = tokens(card.classification?.topic ?? "");
      if (topicTokens.size > 0 && overlap(stdTitleTokens, topicTokens) >= 0.5) {
        const isReportingCard =
          card.classification?.domain === "Financial reporting" ||
          card.tags.includes("ifrs") ||
          card.bodies.includes("IFRS") ||
          /^(ifrs|ias|frs|enc)-/.test(card.id);
        if (isReportingCard) return true;
      }
      return false;
    });
    standardPoolCache.set(standard.slug, pool);
    return pool;
  }

  function rankPool(pool: GuideCard[], want: Set<string>): GuideCard[] {
    return [...pool].sort((a, b) => {
      const oa = overlap(want, liveTokens.get(a.id) ?? new Set());
      const ob = overlap(want, liveTokens.get(b.id) ?? new Set());
      if (ob !== oa) return ob - oa;
      const ea = a.enrichedAt ? 1 : 0;
      const eb = b.enrichedAt ? 1 : 0;
      if (eb !== ea) return eb - ea;
      return (b.qualityScore ?? 0) - (a.qualityScore ?? 0);
    });
  }

  const recoveredAliases: Record<string, string> = {};
  const remapTargetFixes: Record<string, string> = {};
  const appliedRepairs: Record<string, string> = {};
  const publishedCards: GuideCard[] = [];

  function cut(value: string | undefined, max: number): string {
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
    return (boundary > Math.floor(max * 0.55) ? slice.slice(0, boundary) : slice)
      .replace(/[,:;–—-]+$/, "")
      .trim();
  }

  /**
   * Last resort for IFRS/IAS path steps with no live match: republish the
   * dedicated step card offline from the curated catalog (same shape as
   * publish-ifrs-paths.mjs toStepCard) so the path stays whole.
   */
  function publishIfrsStepCard(deadId: string): string | null {
    const entry = ifrsStepById.get(deadId);
    if (!entry) return null;
    const { standard } = entry;
    const step = standard.steps.find((s) => `${standard.slug}-${s.slug}` === deadId) as
      | (IfrsStep & { definition?: string; example?: string; trap?: string; formula?: string })
      | undefined;
    if (!step) return null;

    const definition = cut(step.definition, 1000);
    const example = cut(step.example, 1100);
    const trap = cut(step.trap, 520);
    const stdTag = `ifrs-ias-${standard.slug}`;
    const card = {
      id: deadId,
      title: step.title,
      body: composeUniqueBody({
        definition,
        formula: step.formula,
        interpretation: undefined,
        related: undefined,
        extra: undefined,
      }),
      bodies: ["IFRS", "ACCA", "Merixa"],
      tags: [
        "ifrs-ias-path",
        stdTag,
        standard.slug,
        `standard-${standard.code.toLowerCase().replace(/\s+/g, "-")}`,
        step.slug,
      ],
      workplaceTasks: [],
      sources: [
        {
          label: `Merixa IFRS/IAS path — ${standard.code}`,
          path: `seed/ifrs-ias-path/${standard.slug}/${step.slug}`,
          kind: "merixa",
          body: "Merixa",
        },
      ],
      teachingSummary: definition,
      formula: step.formula ? cut(step.formula, 420) : undefined,
      workedExample: example,
      commonMistake: trap,
      checkQuestion: cut(
        `For ${standard.code}, what evidence would change your conclusion on “${step.title}”?`,
        220,
      ),
      sourceQuotes: [],
      classification: {
        domain: "Financial reporting",
        topic: standard.title,
        contentType: "requirement",
        technicalLevel: "practitioner",
        confidence: 0.9,
      },
      editorialStatus: "editor-approved",
      qualityScore: 0.9,
      ifrsPathAt: new Date().toISOString(),
      standardCode: standard.code,
      standardSlug: standard.slug,
      stepSlug: step.slug,
    } as unknown as GuideCard;

    publishedCards.push(card);
    liveById.set(card.id, card);
    liveTokens.set(card.id, tokens(card.title));
    const titleKey = normalizeTitle(card.title);
    if (titleKey && !liveByTitle.has(titleKey)) liveByTitle.set(titleKey, card.id);
    return card.id;
  }

  type Resolution = { id: string; kind: string; confident: boolean } | null;

  function resolveDead(
    deadId: string,
    stepTitle: string,
    used: Set<string>,
  ): Resolution {
    // 0. hand-reviewed override
    const manual = MANUAL_OVERRIDES[deadId];
    if (manual && liveById.has(manual) && !used.has(manual)) {
      return { id: manual, kind: "manual", confident: true };
    }
    // 1. existing remap (target must be live)
    const remapped = PATH_CARD_REMAP[deadId];
    if (remapped && liveById.has(remapped) && !used.has(remapped)) {
      return { id: remapped, kind: "remap", confident: true };
    }
    // 2. stale registry id mapping
    const viaRegistry = oldRegistry.idToCanonical?.[deadId];
    if (viaRegistry && viaRegistry !== deadId && liveById.has(viaRegistry) && !used.has(viaRegistry)) {
      return { id: viaRegistry, kind: "registry", confident: true };
    }

    const ifrsStep = ifrsStepById.get(deadId);
    const candidateTitles = [
      ifrsStep?.title,
      stepTitle,
      dehashSlug(deadId),
      ...(oldTitlesById.get(deadId) ?? []),
    ].filter((t): t is string => Boolean(t && t.trim()));

    // 3. exact normalized-title match
    for (const title of candidateTitles) {
      const hit = liveByTitle.get(normalizeTitle(title));
      if (hit && !used.has(hit)) {
        return { id: hit, kind: "exact-title", confident: true };
      }
    }

    // 4. fuzzy title match (standard-constrained when the id encodes one).
    // Raw token overlap gates the match; enrichment/tag bonuses only rank
    // candidates that already clear the gate — a bonus must never push a
    // semantically-wrong card over the line.
    const standard = standardForId(deadId);
    const want = tokens(candidateTitles.join(" "));
    const searchPool = standard ? standardPool(standard) : liveCards;
    const gate = standard ? 0.5 : 0.6;
    let best: GuideCard | null = null;
    let bestRaw = 0;
    let bestRank = 0;
    for (const card of searchPool) {
      if (used.has(card.id)) continue;
      const raw = overlap(want, liveTokens.get(card.id) ?? new Set());
      if (raw < gate) continue;
      let rank = raw;
      if (standard && card.tags.includes(`ifrs-ias-${standard.slug}`)) rank += 0.15;
      if (card.enrichedAt) rank += 0.05;
      if (rank > bestRank) {
        bestRank = rank;
        bestRaw = raw;
        best = card;
      }
    }
    if (best) {
      return { id: best.id, kind: "fuzzy-title", confident: bestRaw >= 0.7 };
    }

    // 5. standard pool fallback — any good unused card for the standard
    if (standard) {
      const ranked = rankPool(standardPool(standard), want).filter(
        (c) => !used.has(c.id),
      );
      if (ranked.length > 0) {
        return { id: ranked[0].id, kind: "standard-pool", confident: false };
      }
    }
    return null;
  }

  // --- repair every generated path file ---
  const report: {
    generatedAt: string;
    liveCards: number;
    files: Record<
      string,
      {
        paths: number;
        steps: number;
        deadBefore: number;
        repaired: number;
        dropped: number;
        byKind: Record<string, number>;
        droppedSteps: { path: string; step: string; cardId: string }[];
      }
    >;
  } = {
    generatedAt: new Date().toISOString(),
    liveCards: liveCards.length,
    files: {},
  };

  for (const file of PATH_FILES) {
    const filePath = join(GUIDE_DIR, file);
    const paths = JSON.parse(readFileSync(filePath, "utf8")) as LearningPath[];
    const stats = {
      paths: paths.length,
      steps: 0,
      deadBefore: 0,
      repaired: 0,
      dropped: 0,
      byKind: {} as Record<string, number>,
      droppedSteps: [] as { path: string; step: string; cardId: string }[],
    };

    const repairedPaths = paths.map((path) => {
      const used = new Set<string>(
        path.steps
          .map((s) => s.cardId)
          .filter((id): id is string => Boolean(id && liveById.has(id))),
      );
      const steps = path.steps.flatMap((step) => {
        stats.steps += 1;
        if (!step.cardId || liveById.has(step.cardId)) return [step];
        stats.deadBefore += 1;
        let resolution = resolveDead(step.cardId, step.title, used);
        if (!resolution && ifrsStepById.has(step.cardId)) {
          const publishedId = publishIfrsStepCard(step.cardId);
          if (publishedId) {
            resolution = { id: publishedId, kind: "published-step-card", confident: true };
          }
        }
        if (!resolution) {
          stats.dropped += 1;
          stats.droppedSteps.push({
            path: path.id,
            step: step.id,
            cardId: step.cardId,
          });
          return [];
        }
        used.add(resolution.id);
        stats.repaired += 1;
        stats.byKind[resolution.kind] = (stats.byKind[resolution.kind] ?? 0) + 1;
        appliedRepairs[step.cardId] = resolution.id;
        if (resolution.confident) {
          recoveredAliases[step.cardId] = resolution.id;
        }
        return [{ ...step, cardId: resolution.id }];
      });
      return { ...path, steps };
    });

    report.files[file] = stats;
    if (!DRY_RUN) {
      writeFileSync(
        filePath,
        `${JSON.stringify(repairedPaths, null, 2)}\n`,
        "utf8",
      );
    }
  }

  // --- PATH_CARD_REMAP entries whose targets died ---
  // Only confident matches become suggested fixes; weak fuzzy hits are left
  // blank for manual review rather than silently remapping to a wrong card.
  for (const [from, to] of Object.entries(PATH_CARD_REMAP)) {
    if (liveById.has(to)) continue;
    // Prefer the manual override / the same live card the step repair chose
    // for this id, then a confident automatic resolution of the dead target.
    const viaOverride = MANUAL_OVERRIDES[from];
    if (viaOverride && liveById.has(viaOverride)) {
      remapTargetFixes[from] = viaOverride;
      recoveredAliases[to] = viaOverride;
      continue;
    }
    const viaRepair = appliedRepairs[from];
    if (viaRepair) {
      remapTargetFixes[from] = viaRepair;
      recoveredAliases[to] = viaRepair;
      continue;
    }
    const resolution = resolveDead(to, dehashSlug(to), new Set());
    if (resolution?.confident) {
      remapTargetFixes[from] = resolution.id;
      recoveredAliases[to] = resolution.id;
    } else {
      remapTargetFixes[from] = resolution ? `?${resolution.id}` : "";
    }
  }

  if (!DRY_RUN && publishedCards.length > 0) {
    // Corpus files are the durable store (index rebuilds read them); the
    // index append keeps content/index.json consistent right away.
    for (const card of publishedCards) {
      writeFileSync(
        join(ROOT, "content", "corpus", `${card.id}.json`),
        `${JSON.stringify(card, null, 2)}\n`,
        "utf8",
      );
    }
    const indexPath = join(ROOT, "content", "index.json");
    const rawIndex = JSON.parse(readFileSync(indexPath, "utf8"));
    const existing = new Set(
      (rawIndex.cards ?? []).map((c: { id: string }) => c.id),
    );
    const additions = publishedCards.filter((c) => !existing.has(c.id));
    if (additions.length > 0) {
      atomicWriteFile(
        indexPath,
        `${JSON.stringify(
          buildIndexFromCards([...(rawIndex.cards ?? []), ...additions]),
          null,
          2,
        )}\n`,
        "utf8",
      );
    }
  }

  if (!DRY_RUN) {
    writeFileSync(
      join(PIPELINE_DIR, "recovered-aliases.json"),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          note: "Dead card ids recovered to live canonical ids after the 2026-07-23 dedupe/rename wave. Merged into the canonical registry by publish-canonical-registry.mjs.",
          idToCanonical: recoveredAliases,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    writeFileSync(
      join(PIPELINE_DIR, "path-repair-report.json"),
      `${JSON.stringify({ ...report, remapTargetFixes }, null, 2)}\n`,
      "utf8",
    );
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        publishedStepCards: publishedCards.map((c) => c.id),
        remapTargetFixes,
      },
      null,
      2,
    ),
  );
}

main();
