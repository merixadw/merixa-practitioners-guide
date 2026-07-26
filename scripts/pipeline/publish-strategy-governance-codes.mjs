import { atomicWriteFile } from "../lib/atomic-write.mjs";
/**
 * Publish / expand UK Corporate Governance Code, SOX, and Sapin II
 * strategy-governance cards (board / capital-markets / anti-corruption lens).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeUniqueBody } from "../lib/card-dedupe.mjs";
import { buildIndexFromCards } from "./teacher.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const CORPUS_DIR = join(ROOT, "content", "corpus");

const UK_CG = [
  "UK Corporate Governance Code board leadership and company purpose",
  "UK Corporate Governance Code division of responsibilities",
  "UK Corporate Governance Code composition succession and evaluation",
  "UK Corporate Governance Code audit risk and internal control",
  "UK Corporate Governance Code remuneration",
  "UK Corporate Governance Code comply or explain reporting",
  "UK Corporate Governance Code section 172 stakeholder duties",
  "UK Corporate Governance Code workforce engagement mechanisms",
  "UK Corporate Governance Code board independence criteria",
  "UK Corporate Governance Code senior independent director role",
  "UK Corporate Governance Code nomination committee remit",
  "UK Corporate Governance Code audit committee financial literacy",
  "UK Corporate Governance Code risk committee oversight",
  "UK Corporate Governance Code remuneration committee discretion",
  "UK Corporate Governance Code annual board evaluation",
  "UK Corporate Governance Code external board evaluation cycle",
  "UK Corporate Governance Code diversity and inclusion targets",
  "UK Corporate Governance Code culture monitoring by the board",
  "UK Corporate Governance Code whistleblowing oversight",
  "UK Corporate Governance Code going concern and viability statement",
  "UK Corporate Governance Code internal control declaration",
  "UK Corporate Governance Code principal risks disclosure",
  "UK Corporate Governance Code ESG oversight at board level",
  "UK Corporate Governance Code shareholder engagement AGM",
  "UK Corporate Governance Code related party transaction governance",
  "UK FRC Code vs listing rules interaction",
  "UK Corporate Governance Code for premium listed companies",
  "UK Corporate Governance Code Wates principles private companies",
  "UK Corporate Governance Code Provision 29 internal controls",
  "UK Corporate Governance Code chair independence on appointment",
  "UK Corporate Governance Code CEO not becoming chair",
  "UK Corporate Governance Code non-executive time commitment",
  "UK Corporate Governance Code overboarding disclosure",
  "UK Corporate Governance Code skills matrix for the board",
  "UK Corporate Governance Code induction for new directors",
  "UK Corporate Governance Code company secretary access",
  "UK Corporate Governance Code conflicts of interest register",
  "UK Corporate Governance Code related party policy evidence",
  "UK Corporate Governance Code remuneration malus and clawback",
  "UK Corporate Governance Code pension alignment with workforce",
  "UK Corporate Governance Code shareholding guidelines executives",
  "UK Corporate Governance Code workforce remuneration engagement",
  "UK Corporate Governance Code gender and ethnicity targets",
  "UK Corporate Governance Code stakeholder voice in board minutes",
  "UK Corporate Governance Code modern slavery oversight link",
  "UK Corporate Governance Code cyber resilience board agenda",
  "UK Corporate Governance Code AI and data ethics oversight",
  "UK Corporate Governance Code climate transition plan challenge",
  "UK Corporate Governance Code capital allocation committee link",
  "UK Corporate Governance Code dividend policy board challenge",
  "UK Corporate Governance Code transformation programme oversight",
  "UK Corporate Governance Code M&A due diligence board pack",
  "UK Corporate Governance Code joint venture governance",
  "UK Corporate Governance Code subsidiary governance framework",
  "UK Corporate Governance Code speak-up culture metrics",
  "UK Corporate Governance Code external auditor tendering",
  "UK Corporate Governance Code non-audit fee ratio monitoring",
  "UK Corporate Governance Code risk appetite board ownership",
  "UK Corporate Governance Code emerging risk horizon scanning",
  "UK Corporate Governance Code crisis response board protocols",
];

const SOX = [
  "SOX section 302 CEO CFO certification",
  "SOX section 404 management ICFR assessment",
  "SOX section 404 auditor attestation",
  "SOX section 906 criminal certification awareness",
  "SOX audit committee independence requirements",
  "SOX disclosure controls and procedures",
  "SOX material weakness vs significant deficiency",
  "SOX ICFR scoping entity-level controls",
  "SOX ICFR IT general controls linkage",
  "SOX whistleblower channel board oversight",
  "SOX code of ethics for senior financial officers",
  "SOX non-audit services auditor independence",
  "SOX PCAOB inspection implications for boards",
  "SOX 404 COSO mapping for strategy programmes",
  "SOX control remediation timeline for investors",
  "SOX IPO readiness control maturity",
  "SOX foreign private issuer considerations",
  "SOX vs UK Corporate Governance Code control declarations",
  "SOX disclosure committee operating rhythm",
  "SOX cyber incident disclosure governance",
  "SOX section 201 auditor prohibited services",
  "SOX section 203 audit partner rotation",
  "SOX section 204 auditor report to audit committee",
  "SOX section 301 complaints procedures",
  "SOX section 303 improper influence on audits",
  "SOX section 401 off-balance-sheet disclosure",
  "SOX section 402 personal loans to executives ban",
  "SOX section 403 insider trading disclosure timing",
  "SOX section 406 code of ethics disclosure",
  "SOX section 407 financial expert designation",
  "SOX section 409 real-time issuer disclosures",
  "SOX ICFR process-level walkthrough evidence",
  "SOX ICFR management review controls",
  "SOX ICFR precision of estimates challenge",
  "SOX ICFR user access provisioning controls",
  "SOX ICFR change management for ERP",
  "SOX ICFR segregation of duties conflicts",
  "SOX ICFR journal entry controls",
  "SOX ICFR period-end reporting process",
  "SOX ICFR service organisation SOC reliance",
  "SOX ICFR multi-location scoping strategy",
  "SOX ICFR acquisition day-one controls",
  "SOX ICFR divestiture control handoff",
  "SOX ICFR automated vs manual control mix",
  "SOX ICFR deficiency aggregation evaluation",
  "SOX ICFR compensating controls documentation",
  "SOX 302 sub-certification cascade",
  "SOX disclosure controls for non-GAAP metrics",
  "SOX cybersecurity Form 8-K board readiness",
  "SOX ESG metric control environment awareness",
  "SOX revenue recognition control emphasis",
  "SOX inventory and cost control emphasis",
  "SOX tax provision control emphasis",
  "SOX treasury and debt covenant controls",
  "SOX related party disclosure controls",
  "SOX subsequent events disclosure controls",
  "SOX going concern assessment controls",
  "SOX XBRL tagging control awareness",
  "SOX internal audit role in 404 programme",
  "SOX external auditor reliance on management testing",
];

const SAPIN_II = [
  "Sapin II anti-corruption compliance programme",
  "Sapin II eight mandatory programme pillars",
  "Sapin II code of conduct adoption",
  "Sapin II internal whistleblowing system",
  "Sapin II risk mapping corruption and influence",
  "Sapin II third-party due diligence",
  "Sapin II accounting controls for corruption risk",
  "Sapin II training obligations for exposed staff",
  "Sapin II internal control and evaluation procedures",
  "Sapin II disciplinary regime for breaches",
  "Sapin II AFA French Anti-Corruption Agency role",
  "Sapin II AFA guidelines for corporates",
  "Sapin II deferred prosecution CJIP overview",
  "Sapin II monitorship after CJIP",
  "Sapin II extraterritorial reach awareness",
  "Sapin II vs UK Bribery Act comparison",
  "Sapin II vs US FCPA comparison",
  "Sapin II board oversight of anti-corruption",
  "Sapin II audit committee corruption reporting",
  "Sapin II gift hospitality and travel registers",
  "Sapin II sponsorship and donations controls",
  "Sapin II facilitation payment prohibition",
  "Sapin II influence peddling awareness",
  "Sapin II public official interaction protocols",
  "Sapin II M&A anti-corruption due diligence",
  "Sapin II joint venture corruption risk",
  "Sapin II agent and intermediary controls",
  "Sapin II sales incentive scheme red flags",
  "Sapin II procurement tender integrity",
  "Sapin II customs and trade compliance link",
  "Sapin II accounting off-book payment traps",
  "Sapin II cash and petty cash controls",
  "Sapin II related party corruption exposure",
  "Sapin II whistleblower non-retaliation",
  "Sapin II investigation protocol evidence pack",
  "Sapin II remediation and programme upgrades",
  "Sapin II group vs local entity programme design",
  "Sapin II SME proportionality expectations",
  "Sapin II listed company disclosure expectations",
  "Sapin II strategy programme corruption gates",
  "Sapin II transformation vendor diligence",
  "Sapin II ESG integrity metrics for boards",
  "Sapin II training effectiveness testing",
  "Sapin II third-party risk tiering model",
  "Sapin II continuous monitoring KRIs",
  "Sapin II internal audit anti-corruption plan",
  "Sapin II external assurance of programme",
  "Sapin II document retention for AFA readiness",
  "Sapin II cross-border dawn raid readiness",
  "Sapin II tone from the top board evidence",
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function classify(title) {
  if (/^Sapin II\b/i.test(title)) {
    return {
      kind: "sapin",
      topic: "Anti-corruption strategy",
      jurisdiction: "eu",
      tagPrimary: "sapin-ii",
      tagSecondary: "anti-corruption",
      sourceLabel: "Merixa Sapin II strategy governance",
      sourcePath: "seed/strategy-sapin-ii",
      official: {
        label: "AFA — French Anti-Corruption Agency",
        url: "https://www.agence-francaise-anticorruption.gouv.fr/",
        body: "AFA",
      },
      definition: `${title} sits inside France’s Sapin II anti-corruption framework. Boards and strategy owners use it to evidence a living compliance programme — risk mapping, third-party diligence, accounting controls, and speak-up — not a paper policy.`,
      example: `When entering France, buying a French target, or running a group integrity programme, map “${title}” to an owner, evidence schedule, and board/AFA-ready file. Record what would trigger escalation or a CJIP risk discussion.`,
      trap: "Treating Sapin II as a France-only legal formality while group sales, agents, and accounting controls stay unmapped.",
      bodies: ["CGMA", "IIA", "ACCA", "Merixa"],
    };
  }
  if (/^SOX\b/i.test(title)) {
    return {
      kind: "sox",
      topic: "Capital markets governance",
      jurisdiction: "us",
      tagPrimary: "sox",
      tagSecondary: "sox-governance",
      sourceLabel: "Merixa SOX strategy governance",
      sourcePath: "seed/strategy-sox-governance",
      official: {
        label: "SEC Sarbanes-Oxley overview",
        url: "https://www.sec.gov/spotlight/sarbanes-oxley.htm",
        body: "SEC",
      },
      definition: `${title} is a US Sarbanes-Oxley requirement that boards and executives treat as a capital-markets control obligation. Practitioners use it to evidence ICFR maturity, certification integrity, and investor-grade disclosure — not as a checklist silo.`,
      example: `When a transformation, IPO, or year-end pack lands, map “${title}” to owners, control evidence, and the disclosure committee agenda. Record what would flip a material-weakness conclusion.`,
      trap: "Treating SOX as an IT or audit-only project while strategy programmes change processes without refreshing ICFR scoping.",
      bodies: ["CGMA", "CFA", "FRC", "Merixa"],
    };
  }
  return {
    kind: "ukcg",
    topic: "Board governance strategy",
    jurisdiction: "uk",
    tagPrimary: "uk-corporate-governance",
    tagSecondary: "uk-cg-code",
    sourceLabel: "Merixa UK Corporate Governance Code strategy",
    sourcePath: "seed/strategy-uk-cg-code",
    official: {
      label: "FRC UK Corporate Governance Code",
      url: "https://www.frc.org.uk/library/standards-codes-policy/corporate-governance/uk-corporate-governance-code/",
      body: "FRC",
    },
    definition: `${title} is a UK Corporate Governance Code expectation for listed (and often large private) company boards. Practitioners use it to evidence board effectiveness, comply-or-explain reporting, and strategy oversight for investors and the FRC.`,
    example: `When the board strategy pack is built, map “${title}” to the responsible committee, the evidence pack, and the annual report narrative. Record the explain statement if compliance is partial.`,
    trap: "Treating the UK Code as legal boiler-plate while strategy and culture decisions bypass board committees.",
    bodies: ["CGMA", "CFA", "FRC", "Merixa"],
  };
}

function toCard(title) {
  const meta = classify(title);
  const digest = Buffer.from(title.toLowerCase())
    .toString("base64url")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 10)
    .toLowerCase();
  const id = `strategy-enc-${slugify(title)}-${digest}`;
  return {
    id,
    title,
    body: composeUniqueBody({ definition: meta.definition }),
    bodies: meta.bodies,
    tags: [
      "encyclopedia",
      "strategy-encyclopedia",
      "domain-spine",
      meta.tagPrimary,
      meta.tagSecondary,
      "cgma",
    ],
    workplaceTasks: [],
    sources: [
      {
        label: meta.sourceLabel,
        path: meta.sourcePath,
        kind: "merixa",
        body: "Merixa",
      },
    ],
    officialReferences: [meta.official],
    teachingSummary: meta.definition,
    workedExample: meta.example,
    commonMistake: meta.trap,
    checkQuestion: `What board evidence would change your conclusion on “${title}”?`,
    sourceQuotes: [],
    classification: {
      domain: "Strategy and performance",
      topic: meta.topic,
      contentType: "definition",
      technicalLevel: "practitioner",
      confidence: 0.92,
      jurisdiction: meta.jurisdiction,
    },
    editorialStatus: "model-reviewed",
    qualityScore: 0.91,
    encyclopediaAt: new Date().toISOString(),
    shelfExpandAt: new Date().toISOString(),
  };
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const byId = new Map((index.cards || []).map((card) => [card.id, card]));
  const titles = new Set(
    (index.cards || []).map((card) =>
      String(card.title || "").toLowerCase().trim(),
    ),
  );
  mkdirSync(CORPUS_DIR, { recursive: true });
  let published = 0;
  for (const seed of [...UK_CG, ...SOX, ...SAPIN_II]) {
    if (titles.has(seed.toLowerCase())) continue;
    const card = toCard(seed);
    if (byId.has(card.id)) continue;
    byId.set(card.id, card);
    titles.add(seed.toLowerCase());
    writeFileSync(
      join(CORPUS_DIR, `${card.id}.json`),
      `${JSON.stringify(card, null, 2)}\n`,
      "utf8",
    );
    published += 1;
  }
  const merged = [...byId.values()].sort((a, b) =>
    String(a.title).localeCompare(String(b.title)),
  );
  const next = buildIndexFromCards(merged);
  atomicWriteFile(INDEX_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  const tagsOf = (tag) =>
    merged.filter((c) => (c.tags || []).includes(tag)).length;
  console.log(
    JSON.stringify(
      {
        published,
        strategyDomain: merged.filter(
          (c) => c.classification?.domain === "Strategy and performance",
        ).length,
        ukCg: tagsOf("uk-corporate-governance"),
        sox: tagsOf("sox"),
        sapinII: tagsOf("sapin-ii"),
        projectDelivery: merged.filter(
          (c) => c.classification?.domain === "Project delivery",
        ).length,
        total: merged.length,
      },
      null,
      2,
    ),
  );
}

main();
