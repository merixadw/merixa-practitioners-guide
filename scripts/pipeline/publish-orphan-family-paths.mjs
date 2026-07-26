/**
 * Publish orphan-family learning paths from cards not yet on any path.
 *
 * Quality tiers (E4):
 *   --quality-tier=live      enrichedAt only (legacy soft-launch semantics)
 *   --quality-tier=deepened  offline deepen stamps + teachingDepthScore bar
 *   --quality-tier=any       live OR deepened (default)
 *
 * Does not rewrite content/index.json (path JSON + report only).
 * Does NOT set enrichedAt. soft-launch liveSharePath remains enrichedAt-only.
 *
 * Usage:
 *   npm run library:orphan-family-paths
 *   npm run library:orphan-family-paths -- --quality-tier=any --steps=18
 *   npm run library:orphan-family-paths -- --quality-tier=live
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { teachingDepthScore } from "../lib/improvement-guardrails.mjs";
import { pathCardIds } from "../lib/path-sources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "orphan-family-paths-report.json",
);
const INVENTORY_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "path-orphan-deepen-inventory.json",
);
const PATHS_OUT = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "orphan-family-paths.generated.json",
);
/** Served at runtime — keep out of the Next/Turbopack compile graph. */
const PATHS_PUBLIC = join(
  ROOT,
  "public",
  "path-packs",
  "orphan-family-paths.json",
);

const NON_FIN =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|shop drawings|moh approval|detailed construction|detailed design schedule|install ceramic|install demountable|laminar flow|hepa filter|pneumatic conveying|activity id|leveling concrete|working meeting milestones)\b/i;

const QUALITY_TIERS = new Set(["live", "deepened", "any"]);

/** Prefix families left orphaned after domain-shelf grabs. */
const FAMILIES = [
  {
    key: "strategy",
    title: "Strategy and performance",
    summary:
      "Strategy encyclopedia shelf — competitive position, scorecards, and board-ready choices.",
    bodies: ["CGMA", "Merixa"],
    prefixes: ["strategy-"],
  },
  {
    key: "ma",
    title: "Management accounting",
    summary:
      "Cost, contribution, budgeting, and variance practice — MA encyclopedia cards.",
    bodies: ["CGMA", "ACCA", "Merixa"],
    prefixes: ["ma-"],
  },
  {
    key: "tax",
    title: "Tax accounting practice",
    summary:
      "Current/deferred tax, uncertainty, and transfer-pricing reporting — tax shelf.",
    bodies: ["ACCA", "IFRS", "Merixa"],
    prefixes: ["tax-"],
  },
  {
    key: "sustain",
    title: "Sustainability reporting",
    summary:
      "Climate, materiality, and disclosure practice — sustainability encyclopedia.",
    bodies: ["Merixa", "IFRS"],
    prefixes: ["sustain-"],
  },
  {
    key: "audit",
    title: "Audit and assurance",
    summary:
      "Evidence, estimates, and controls testing — audit encyclopedia shelf.",
    bodies: ["ACCA", "Merixa"],
    prefixes: ["audit-"],
  },
  {
    key: "gov",
    title: "Governance and controls",
    summary:
      "Board packs, committees, and control oversight — governance encyclopedia.",
    bodies: ["COSO", "Merixa"],
    prefixes: ["gov-"],
  },
  {
    key: "project",
    title: "Project delivery finance",
    summary:
      "Business case, accruals, and change control — project-delivery encyclopedia.",
    bodies: ["Merixa", "CGMA"],
    prefixes: ["project-"],
  },
  {
    key: "coso",
    title: "COSO internal control",
    summary:
      "Control components, principles, and deficiency practice — COSO shelf.",
    bodies: ["COSO", "IIA", "Merixa"],
    prefixes: ["coso-"],
  },
  {
    key: "frm",
    title: "FRM / market risk",
    summary:
      "Market, credit, and operational risk practice — FRM encyclopedia shelf.",
    bodies: ["GARP", "FRM", "Merixa"],
    prefixes: ["frm-"],
  },
  {
    key: "crma",
    title: "CRMA assurance",
    summary:
      "Assurance mapping, governance, and fraud practice — CRMA encyclopedia.",
    bodies: ["CRMA", "IIA", "Merixa"],
    prefixes: ["crma-"],
  },
  {
    key: "fa",
    title: "Financial accounting",
    summary:
      "Recognition, measurement, and presentation practice — FA encyclopedia.",
    bodies: ["IFRS", "ACCA", "Merixa"],
    prefixes: ["fa-"],
  },
  {
    key: "ifrs",
    title: "IFRS standards",
    summary: "IFRS/IAS topic practice — standards encyclopedia shelf.",
    bodies: ["IFRS", "Merixa"],
    prefixes: ["ifrs-", "ias-"],
  },
  {
    key: "iia",
    title: "IIA standards",
    summary: "Internal audit standards and practice — IIA encyclopedia shelf.",
    bodies: ["IIA", "Merixa"],
    prefixes: ["iia-"],
  },
];

function parseArg(argv, name, fallback) {
  const flag = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  const raw = flag.slice(name.length + 1);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseStringArg(argv, name, fallback) {
  const flag = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  return flag.slice(name.length + 1);
}

function isVisible(card) {
  if (card.editorialStatus === "quarantined") return false;
  if ((card.tags || []).includes("quarantined")) return false;
  if (NON_FIN.test(card.title || "")) return false;
  return true;
}

function matchesFamily(cardId, prefixes) {
  return prefixes.some((prefix) => cardId.startsWith(prefix));
}

function isDeepened(card) {
  return Boolean(
    card.locallyDeepenedAt ||
      card.agentAuthoredAt ||
      card.codexDeepenedAt ||
      card.deepenedAt ||
      card.heuristicDeepenedAt,
  );
}

function passesOfflineDepthBar(card, minDepthScore) {
  if (teachingDepthScore(card) < minDepthScore) return false;
  const definition = String(card.teachingSummary || card.body || "");
  const example = String(card.workedExample || "");
  // Softer than full "deep" bar: prefer teachingDepthScore primary gate.
  return definition.length >= 160 && example.length >= 200;
}

function qualifiesForTier(card, qualityTier, minDepthScore) {
  const live = Boolean(card.enrichedAt);
  const deepenedOk = isDeepened(card) && passesOfflineDepthBar(card, minDepthScore);
  if (qualityTier === "live") return live;
  if (qualityTier === "deepened") return deepenedOk && !live;
  return live || deepenedOk;
}

function tierLabel(card) {
  if (card.enrichedAt) return "live";
  return "deepened";
}

function cutSummary(card) {
  return String(card.teachingSummary || card.body || card.title)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120)
    .replace(/\s+\S*$/, "…");
}

function countDeepenedNotInPath(cards, onPath) {
  let n = 0;
  for (const card of cards) {
    if (!(card.locallyDeepenedAt || card.agentAuthoredAt)) continue;
    if (onPath.has(card.id)) continue;
    n += 1;
  }
  return n;
}

function buildInventory(cards, onPath) {
  const orphans = [];
  for (const card of cards) {
    if (!(card.locallyDeepenedAt || card.agentAuthoredAt)) continue;
    if (onPath.has(card.id)) continue;
    orphans.push({
      id: card.id,
      locallyDeepenedAt: card.locallyDeepenedAt || null,
      agentAuthoredAt: card.agentAuthoredAt || null,
      enrichedAt: card.enrichedAt || null,
      teachingDepthScore: teachingDepthScore(card),
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    count: orphans.length,
    sampleIds: orphans.slice(0, 40).map((o) => o.id),
  };
}

function main() {
  const argv = process.argv.slice(2);
  const stepsPerPath = Math.max(8, Math.floor(parseArg(argv, "--steps", 18)));
  const qualityTier = parseStringArg(argv, "--quality-tier", "any");
  const minDepthScore = Math.max(
    0,
    Math.floor(parseArg(argv, "--min-depth-score", 1100)),
  );

  if (!QUALITY_TIERS.has(qualityTier)) {
    throw new Error(
      `--quality-tier must be one of ${[...QUALITY_TIERS].join("|")}`,
    );
  }
  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = index.cards || [];
  const alreadyOnPath = pathCardIds();

  let priorOrphanIds = new Set();
  if (existsSync(PATHS_OUT)) {
    const prior = JSON.parse(readFileSync(PATHS_OUT, "utf8"));
    for (const path of prior) {
      for (const step of path.steps ?? []) {
        if (step.cardId) priorOrphanIds.add(step.cardId);
      }
    }
  }

  // Baseline before this publish (treat prior orphan-family steps as still orphans
  // for reduction math so re-runs are comparable).
  const baselineOnPath = new Set(
    [...alreadyOnPath].filter((id) => !priorOrphanIds.has(id)),
  );
  const baselineInventory = buildInventory(cards, baselineOnPath);
  const baselineDeepenedNotInPath = baselineInventory.count;

  mkdirSync(dirname(INVENTORY_PATH), { recursive: true });
  writeFileSync(
    INVENTORY_PATH,
    `${JSON.stringify(baselineInventory, null, 2)}\n`,
    "utf8",
  );

  const pool = cards.filter((card) => {
    if (!isVisible(card)) return false;
    if (!qualifiesForTier(card, qualityTier, minDepthScore)) return false;
    if (alreadyOnPath.has(card.id) && !priorOrphanIds.has(card.id)) return false;
    return FAMILIES.some((family) => matchesFamily(card.id, family.prefixes));
  });

  const paths = [];
  const byFamily = {};
  let liveSteps = 0;
  let deepenedSteps = 0;

  for (const family of FAMILIES) {
    const familyCards = pool
      .filter((card) => matchesFamily(card.id, family.prefixes))
      .sort((a, b) => {
        const liveA = a.enrichedAt ? 1 : 0;
        const liveB = b.enrichedAt ? 1 : 0;
        if (liveB !== liveA) return liveB - liveA;
        const sa = teachingDepthScore(a);
        const sb = teachingDepthScore(b);
        if (sb !== sa) return sb - sa;
        const qa = Number(a.qualityScore) || 0;
        const qb = Number(b.qualityScore) || 0;
        if (qb !== qa) return qb - qa;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });

    byFamily[family.key] = {
      orphanPool: familyCards.length,
      liveInPool: familyCards.filter((c) => c.enrichedAt).length,
      deepenedInPool: familyCards.filter((c) => !c.enrichedAt).length,
      paths: 0,
      steps: 0,
    };

    let shelf = 1;
    for (let i = 0; i < familyCards.length; i += stepsPerPath) {
      const slice = familyCards.slice(i, i + stepsPerPath);
      if (slice.length < 4) break;
      const sliceTier = slice.every((c) => c.enrichedAt)
        ? "live"
        : slice.every((c) => !c.enrichedAt)
          ? "deepened"
          : "mixed";
      const tierSuffix =
        sliceTier === "live"
          ? "live shelf"
          : sliceTier === "deepened"
            ? "deepened shelf"
            : "mixed shelf";
      paths.push({
        id: `orphan-family-${family.key}-${shelf}`,
        title: `${family.title} — ${tierSuffix} ${shelf}`,
        summary: family.summary,
        bodies: family.bodies,
        qualityTier: sliceTier,
        steps: slice.map((card, index) => ({
          id: `${family.key}-orphan${shelf}-s${index + 1}`,
          title: card.title,
          summary: cutSummary(card),
          cardId: card.id,
          qualityTier: tierLabel(card),
        })),
      });
      byFamily[family.key].paths += 1;
      byFamily[family.key].steps += slice.length;
      for (const card of slice) {
        if (card.enrichedAt) liveSteps += 1;
        else deepenedSteps += 1;
      }
      shelf += 1;
    }
  }

  mkdirSync(dirname(PATHS_OUT), { recursive: true });
  mkdirSync(dirname(PATHS_PUBLIC), { recursive: true });
  const pathsJson = `${JSON.stringify(paths, null, 2)}\n`;
  writeFileSync(PATHS_OUT, pathsJson, "utf8");
  writeFileSync(PATHS_PUBLIC, pathsJson, "utf8");

  // After publish: pathCardIds would include new orphan paths; compute from output.
  const afterOnPath = new Set(baselineOnPath);
  for (const path of paths) {
    for (const step of path.steps ?? []) {
      if (step.cardId) afterOnPath.add(step.cardId);
    }
  }
  const afterDeepenedNotInPath = countDeepenedNotInPath(cards, afterOnPath);
  const reduction =
    baselineDeepenedNotInPath === 0
      ? 0
      : (baselineDeepenedNotInPath - afterDeepenedNotInPath) /
        baselineDeepenedNotInPath;
  const reductionPct = Math.round(reduction * 1000) / 10;

  const report = {
    generatedAt: new Date().toISOString(),
    stepsPerPath,
    qualityTier,
    minDepthScore,
    enrichedOnly: qualityTier === "live",
    dualTierPublished: qualityTier === "any" || qualityTier === "deepened",
    paths: paths.length,
    totalSteps: paths.reduce((sum, path) => sum + path.steps.length, 0),
    liveSteps,
    deepenedSteps,
    byFamily,
    baselineDeepenedNotInPath,
    afterDeepenedNotInPath,
    deepenedNotInPathReductionPct: reductionPct,
    softLaunchNote:
      "soft-launch liveSharePath still uses enrichedAt-only — this publisher never stamps enrichedAt; deepened tier is visibility/path membership only.",
    inventoryPath: "content/pipeline/path-orphan-deepen-inventory.json",
  };
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(report, null, 2));
}

main();
