import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Diagnostic + scrub commercial brand/company/product names from library cards.
 * Keeps regulations, professional bodies, and legal/regulator names.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndexFromCards } from "./teacher.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");
const REPORT_PATH = join(
  ROOT,
  "content",
  "pipeline",
  "brand-scrub-report.json",
);

/** Commercial firms / products / media brands to remove or genericise. */
const REPLACEMENTS = [
  [/PricewaterhouseCoopers/gi, "an assurance firm"],
  [/\bPwC\b/g, "an assurance firm"],
  [/Ernst\s*&\s*Young/gi, "an assurance firm"],
  [/\bEY\b/g, "an assurance firm"],
  [/\bDeloitte\b/gi, "an assurance firm"],
  [/\bKPMG\b/g, "an assurance firm"],
  [/\bBDO\b/g, "an assurance firm"],
  [/\bGrant Thornton\b/gi, "an assurance firm"],
  [/\bMazars\b/gi, "an assurance firm"],
  [/\bRSM\b/g, "an assurance firm"],
  [/\bBig\s*Four\b/gi, "large assurance networks"],
  [/\bBig\s*4\b/gi, "large assurance networks"],
  [/\bMcKinsey\b/gi, "a strategy adviser"],
  [/\bBCG\b/g, "a strategy adviser"],
  [/\bBain\b/g, "a strategy adviser"],
  [/\bAccenture\b/gi, "a consulting firm"],
  [/\bGartner\b/gi, "an industry research house"],
  [/\bForrester\b/gi, "an industry research house"],
  [/\bBloomberg\b/gi, "a market data provider"],
  [/\bRefinitiv\b/gi, "a market data provider"],
  [/\bThomson Reuters\b/gi, "a market data provider"],
  [/\bReuters\b/gi, "a market data provider"],
  [/\bMoody'?s\b/gi, "a credit rating agency"],
  [/\bStandard\s*&\s*Poor'?s\b/gi, "a credit rating agency"],
  [/\bS&P\b/g, "a credit rating agency"],
  [/\bFitch\b/g, "a credit rating agency"],
  [/\bBlackRock\b/gi, "an asset manager"],
  [/\bVanguard\b/gi, "an asset manager"],
  [/\bFidelity\b/gi, "an asset manager"],
  [/\bGoldman Sachs\b/gi, "an investment bank"],
  [/\bJP\s*Morgan\b/gi, "an investment bank"],
  [/\bMorgan Stanley\b/gi, "an investment bank"],
  [/\bCitigroup\b/gi, "a bank"],
  [/\bBarclays\b/gi, "a bank"],
  [/\bHSBC\b/g, "a bank"],
  [/\bDeutsche Bank\b/gi, "a bank"],
  [/\bWalmart\b/gi, "a retailer"],
  [/\bTesla\b/gi, "an automotive issuer"],
  [/\bNetflix\b/gi, "a media issuer"],
  [/\bFacebook\b/gi, "a technology issuer"],
  [/\bUber\b/gi, "a platform issuer"],
  [/\bAirbnb\b/gi, "a platform issuer"],
  [/\bStripe\b/gi, "a payments provider"],
  [/\bPayPal\b/gi, "a payments provider"],
  [/\bVisa\b/gi, "a card network"],
  [/\bMastercard\b/gi, "a card network"],
  [/\bCoca-Cola\b/gi, "a consumer issuer"],
  [/\bPepsi(?:Co)?\b/gi, "a consumer issuer"],
  [/\bNike\b/gi, "a consumer issuer"],
  [/\bAdidas\b/gi, "a consumer issuer"],
  [/\bToyota\b/gi, "an automotive issuer"],
  [/\bRoyal Dutch Shell\b/gi, "an energy issuer"],
  [/\bExxon(?:Mobil)?\b/gi, "an energy issuer"],
  [/\bChevron\b/gi, "an energy issuer"],
  [/\bNestl[eé]\b/gi, "a consumer issuer"],
  [/\bUnilever\b/gi, "a consumer issuer"],
  [/\bAmazon Web Services\b/gi, "a cloud platform"],
  [/\bAmazon\b/gi, "a technology issuer"],
  [/\bMicrosoft\b/gi, "a software vendor"],
  [/\bGoogle\b/gi, "a technology issuer"],
  [/\bApple Inc\.?\b/gi, "a technology issuer"],
  [/\bIBM\b/g, "a technology issuer"],
  [/\bSalesforce\b/gi, "an enterprise software vendor"],
  [/\bWorkday\b/gi, "an enterprise software vendor"],
  [/\bOracle\b/gi, "an enterprise software vendor"],
  [/\bSAP\b/g, "an ERP system"],
  [/\bNetSuite\b/gi, "an ERP system"],
  [/\bQuickBooks\b/gi, "bookkeeping software"],
  [/\bXero\b/gi, "bookkeeping software"],
  [/\bAnaplan\b/gi, "a planning platform"],
  [/\bHyperion\b/gi, "a consolidation system"],
  [/\bTM1\b/g, "a planning system"],
  [/\bAdaptive Insights\b/gi, "a planning platform"],
  [/\bTableau\b/gi, "a visualisation tool"],
  [/\bPower BI\b/gi, "a visualisation tool"],
  [/\bLooker\b/gi, "a visualisation tool"],
  [/\bAlteryx\b/gi, "a data preparation tool"],
  [/\bUiPath\b/gi, "an automation platform"],
  [/\bServiceNow\b/gi, "a workflow platform"],
  [/\bJira\b/gi, "a delivery tracker"],
  [/\bConfluence\b/gi, "a documentation workspace"],
  [/\bGitHub\b/gi, "a source-control platform"],
  [/\bLinkedIn\b/gi, "a professional network"],
  [/\bSlack\b/gi, "a messaging workspace"],
  [/\bZoom\b/gi, "a video meeting tool"],
  [/\bNotion\b/gi, "a documentation workspace"],
  [/\bExcel\b/gi, "a spreadsheet"],
  [/\bFAANG\b/g, "large technology issuers"],
  [/\bMagnificent Seven\b/gi, "large technology issuers"],
];

const TEXT_FIELDS = [
  "title",
  "body",
  "teachingSummary",
  "workedExample",
  "commonMistake",
  "checkQuestion",
  "formula",
];

function scrubText(value) {
  if (typeof value !== "string" || !value) {
    return { text: value, hits: [] };
  }
  let text = value;
  const hits = [];
  for (const [pattern, replacement] of REPLACEMENTS) {
    pattern.lastIndex = 0;
    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;
    const before = text;
    text = text.replace(pattern, replacement);
    if (text !== before) hits.push(String(pattern));
  }
  // Clean doubled articles from replacements.
  text = text
    .replace(/\ban an\b/gi, "an")
    .replace(/\ba a\b/gi, "a")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  return { text, hits };
}

function scrubCard(card) {
  const next = { ...card };
  const fieldsHit = [];
  for (const field of TEXT_FIELDS) {
    if (!(field in next)) continue;
    const { text, hits } = scrubText(next[field]);
    if (hits.length) {
      next[field] = text;
      fieldsHit.push(field);
    }
  }
  if (Array.isArray(next.sourceQuotes)) {
    next.sourceQuotes = next.sourceQuotes.map((quote) => {
      if (typeof quote === "string") {
        return scrubText(quote).text;
      }
      if (quote && typeof quote === "object") {
        const copy = { ...quote };
        for (const key of ["text", "quote", "label"]) {
          if (typeof copy[key] === "string") {
            copy[key] = scrubText(copy[key]).text;
          }
        }
        return copy;
      }
      return quote;
    });
  }
  return { card: next, changed: fieldsHit.length > 0, fieldsHit };
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  mkdirSync(CORPUS_DIR, { recursive: true });
  mkdirSync(dirname(REPORT_PATH), { recursive: true });

  let changedCards = 0;
  const samples = [];
  const byField = {};
  const out = [];

  for (const card of index.cards || []) {
    const { card: scrubbed, changed, fieldsHit } = scrubCard(card);
    out.push(scrubbed);
    if (!changed) continue;
    changedCards += 1;
    for (const field of fieldsHit) {
      byField[field] = (byField[field] || 0) + 1;
    }
    if (samples.length < 40) {
      samples.push({
        id: scrubbed.id,
        title: scrubbed.title,
        fields: fieldsHit,
      });
    }
    writeFileSync(
      join(CORPUS_DIR, `${scrubbed.id}.json`),
      `${JSON.stringify(scrubbed, null, 2)}\n`,
      "utf8",
    );
  }

  const next = buildIndexFromCards(out);
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  const report = {
    finishedAt: new Date().toISOString(),
    changedCards,
    totalCards: out.length,
    byField,
    samples,
    policy:
      "Removed commercial company/product brands; kept regulations, professional bodies, and legal/regulator names.",
  };
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main();
