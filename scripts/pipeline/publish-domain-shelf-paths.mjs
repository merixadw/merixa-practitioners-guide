import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish domain shelf learning paths so path membership can hit the
 * competitive bar (~40% of visible cards) without growing thin stubs.
 *
 * Prefer cards not already on any path. Chunk by domain into practice shelves.
 *
 * Usage:
 *   npm run library:domain-shelf-paths
 *   npm run library:domain-shelf-paths -- --steps=20 --target=0.42
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pathCardIds } from "../lib/path-sources.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "domain-shelf-paths-report.json",
);
const PATHS_OUT = join(
  ROOT,
  "src",
  "lib",
  "guide",
  "domain-shelf-paths.generated.json",
);
/** Served at runtime — keep out of the Next/Turbopack compile graph. */
const PATHS_PUBLIC = join(
  ROOT,
  "public",
  "path-packs",
  "domain-shelf-paths.json",
);

const NON_FIN =
  /\b(formwork|trench excavation|gypsum plaster|ifc drawings|shop drawings|moh approval|detailed construction|detailed design schedule|install ceramic|install demountable|laminar flow|hepa filter|pneumatic conveying|activity id|leveling concrete|working meeting milestones)\b/i;

const DOMAIN_BODIES = {
  "Financial reporting": ["IFRS", "FRC", "ACCA", "Merixa"],
  "Financial management": ["CFA", "CGMA", "ACCA", "Merixa"],
  "Risk management": ["FRM", "CRMA", "COSO", "Merixa"],
  "Governance and controls": ["COSO", "UK CG Code", "Merixa"],
  "Audit and assurance": ["IAASB", "ACCA", "Merixa"],
  "Management reporting": ["CGMA", "CIMA", "Merixa"],
  "Strategy and performance": ["CGMA", "Merixa"],
  "Project delivery": ["Merixa", "CGMA"],
  "Sustainability": ["ISSB", "GRI", "Merixa"],
};

function parseArg(argv, name, fallback) {
  const flag = argv.find((arg) => arg.startsWith(`${name}=`));
  if (!flag) return fallback;
  const raw = flag.slice(name.length + 1);
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function isVisible(card) {
  if (card.editorialStatus === "quarantined") return false;
  if ((card.tags || []).includes("quarantined")) return false;
  if (NON_FIN.test(card.title || "")) return false;
  return true;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function main() {
  const argv = process.argv.slice(2);
  const stepsPerPath = Math.max(8, Math.floor(parseArg(argv, "--steps", 18)));
  const targetShare = Math.min(
    0.95,
    Math.max(0.2, parseArg(argv, "--target", 0.42)),
  );

  if (!existsSync(INDEX_PATH)) {
    throw new Error("Missing content/index.json");
  }

  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = (index.cards || []).filter(isVisible);
  const alreadyOnPath = pathCardIds();
  const targetCount = Math.ceil(cards.length * targetShare);
  const needMore = Math.max(0, targetCount - alreadyOnPath.size);

  const byDomain = new Map();
  for (const card of cards) {
    if (alreadyOnPath.has(card.id)) continue;
    const domain = card.classification?.domain || "Practice";
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(card);
  }

  for (const list of byDomain.values()) {
    list.sort((a, b) => {
      const qa = Number(a.qualityScore) || 0;
      const qb = Number(b.qualityScore) || 0;
      if (qb !== qa) return qb - qa;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  }

  const paths = [];
  let linked = 0;
  const domainOrder = [
    "Financial management",
    "Risk management",
    "Financial reporting",
    "Governance and controls",
    "Audit and assurance",
    "Management reporting",
    "Strategy and performance",
    "Project delivery",
    "Sustainability",
  ];

  const domains = [
    ...domainOrder.filter((d) => byDomain.has(d)),
    ...[...byDomain.keys()].filter((d) => !domainOrder.includes(d)).sort(),
  ];

  for (const domain of domains) {
    if (linked >= needMore) break;
    const pool = byDomain.get(domain) || [];
    let shelf = 1;
    for (let i = 0; i < pool.length && linked < needMore; i += stepsPerPath) {
      const slice = pool.slice(i, i + stepsPerPath);
      if (slice.length < 4) break;
      const take = slice.slice(0, Math.min(slice.length, needMore - linked));
      const domainSlug = slugify(domain);
      paths.push({
        id: `domain-shelf-${domainSlug}-${shelf}`,
        title: `${domain} — practice shelf ${shelf}`,
        summary: `Curated ${domain.toLowerCase()} concepts for sequential study — evidence, owners, and pack-ready judgement.`,
        bodies: DOMAIN_BODIES[domain] || ["Merixa"],
        steps: take.map((card, index) => ({
          id: `${domainSlug}-shelf${shelf}-s${index + 1}`,
          title: card.title,
          summary: String(card.teachingSummary || card.body || card.title)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120)
            .replace(/\s+\S*$/, "…"),
          cardId: card.id,
        })),
      });
      linked += take.length;
      shelf += 1;
    }
  }

  mkdirSync(dirname(PATHS_OUT), { recursive: true });
  mkdirSync(dirname(PATHS_PUBLIC), { recursive: true });
  const pathsJson = `${JSON.stringify(paths, null, 2)}\n`;
  writeFileSync(PATHS_OUT, pathsJson, "utf8");
  writeFileSync(PATHS_PUBLIC, pathsJson, "utf8");

  const report = {
    generatedAt: new Date().toISOString(),
    stepsPerPath,
    targetShare,
    targetCount,
    alreadyOnPath: alreadyOnPath.size,
    needMore,
    paths: paths.length,
    totalSteps: paths.reduce((sum, path) => sum + path.steps.length, 0),
    estimatedMembership:
      Math.round(
        ((alreadyOnPath.size + linked) / Math.max(1, cards.length)) * 1000,
      ) / 1000,
    byDomain: Object.fromEntries(
      [...byDomain.entries()].map(([domain, list]) => [domain, list.length]),
    ),
  };
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  atomicWriteFile(
    INDEX_PATH,
    `${JSON.stringify(buildIndexFromCards(index.cards || []), null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(report, null, 2));
}

main();
