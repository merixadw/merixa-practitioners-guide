/**
 * Residual brand diagnostic — flags likely commercial names still in titles.
 * Does not mutate content; prints candidates for human review.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const index = JSON.parse(
  readFileSync(join(ROOT, "content", "index.json"), "utf8"),
);

const ALLOW = new Set(
  [
    "ifrs",
    "ias",
    "iasb",
    "fasb",
    "frc",
    "sec",
    "pcaob",
    "hmrc",
    "irs",
    "oecd",
    "acca",
    "cfa",
    "cgma",
    "iia",
    "crma",
    "frm",
    "coso",
    "sox",
    "gaap",
    "asc",
    "frs",
    "uk",
    "us",
    "eu",
    "un",
    "afa",
    "dac",
    "atad",
    "globe",
    "qdmtt",
    "iir",
    "utpr",
    "issb",
    "sasb",
    "gri",
    "tcfd",
    "csrd",
    "esrs",
    "merixa",
    "iso",
    "isa",
    "isqm",
    "aicpa",
    "cipfa",
    "cima",
    "icaew",
    "icas",
    "chartered",
    "pillar",
    "two",
    "one",
    "vat",
    "etl",
    "erp",
    "saas",
    "kpi",
    "okr",
    "ebitda",
    "roic",
    "wacc",
    "dcf",
    "npv",
    "irr",
    "fx",
    "itgc",
    "icfr",
    "soc",
    "cjip",
  ].map((s) => s.toLowerCase()),
);

const hits = [];
for (const card of index.cards || []) {
  const title = String(card.title || "");
  const tokens = title.match(/\b[A-Z][A-Za-z0-9&'.-]{1,}\b/g) || [];
  const suspicious = tokens.filter((token) => {
    const key = token.toLowerCase().replace(/[™®]/g, "");
    if (ALLOW.has(key)) return false;
    if (/^(ias|ifrs|frs|asc|isa|iso)\s*\d+/i.test(title)) return false;
    if (/^\d+$/.test(token)) return false;
    // Single common English title-case words are fine.
    if (
      /^(The|And|For|With|From|Into|Over|Under|After|Before|When|What|How|Why|Board|Code|Risk|Tax|Audit|Control|Report|Group|Company|Entity|Asset|Liability|Equity|Cash|Cost|Value|Rate|Model|Plan|Policy|Process|System|Data|Note|Pack|Owner|Close|Year|End)$/i.test(
        token,
      )
    ) {
      return false;
    }
    // Likely brand: mixed/internal caps or known-looking proper noun length
    return /[a-z][A-Z]/.test(token) || (token.length >= 5 && /^[A-Z]/.test(token) && !/^[A-Z]+$/.test(token));
  });
  if (suspicious.length) {
    hits.push({ id: card.id, title, suspicious: [...new Set(suspicious)] });
  }
}

console.log(
  JSON.stringify(
    {
      titleCandidates: hits.length,
      sample: hits.slice(0, 30),
    },
    null,
    2,
  ),
);
