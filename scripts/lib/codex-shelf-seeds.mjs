/**
 * Extra concept seeds for priority encyclopedia shelves, drawn from:
 * - Merixa CRMA / COSO catalogs already in-repo
 * - Merixa × Codex book families (Audit, IFRS, CFA/FRM, governance, CRMA/CIA)
 *
 * Used by encyclopedia-shelf-targets.mjs — not a separate publish path.
 */
import { CRMA_DOMAINS } from "./crma-encyclopedia-catalog.mjs";
import { COSO_DOMAINS } from "./coso-encyclopedia-catalog.mjs";

function titlesFromDomains(domains) {
  const out = [];
  const seen = new Set();
  for (const domain of domains || []) {
    for (const step of domain.steps || []) {
      const title = String(step.title || "").trim();
      if (!title) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(title);
    }
  }
  return out;
}

/** IIA / CIA Learning System–aligned workplace concepts (not exam drills). */
export const IIA_CONCEPT_SEEDS = [
  "IPPF mission of internal auditing",
  "Core Principles for the Professional Practice of Internal Auditing",
  "Code of Ethics integrity principle",
  "Code of Ethics objectivity principle",
  "Code of Ethics confidentiality principle",
  "Code of Ethics competency principle",
  "Attribute Standard organisational independence",
  "Attribute Standard individual objectivity",
  "Attribute Standard proficiency and due professional care",
  "Attribute Standard quality assurance and improvement program",
  "Performance Standard managing the internal audit activity",
  "Performance Standard nature of work governance risk control",
  "Engagement planning risk assessment",
  "Engagement objectives and scope",
  "Engagement resource allocation",
  "Work program design",
  "Performing the engagement evidence",
  "Analysing and evaluating information",
  "Documenting information working papers",
  "Engagement supervision",
  "Communicating results criteria",
  "Overall opinions vs engagement opinions",
  "Monitoring progress follow-up",
  "Communicating the acceptance of risks",
  "Board and senior management reporting",
  "Internal audit charter essentials",
  "Functional reporting to the board",
  "Administrative reporting lines",
  "Assurance map across lines of defence",
  "Combined assurance coordination",
  "Risk-based internal audit plan",
  "Continuous auditing vs continuous monitoring",
  "Data analytics in fieldwork",
  "IT general controls assurance",
  "Application control testing",
  "Cybersecurity assurance scoping",
  "Third-party and outsourcing assurance",
  "Fraud risk assessment in engagements",
  "Whistleblowing liaison with internal audit",
  "Culture and conduct audits",
  "ESG assurance readiness for internal audit",
  "Soft controls assessment",
  "Root cause analysis in findings",
  "Agreed actions and ownership",
  "Issue ageing and escalation",
  "Co-sourcing governance",
  "Guest auditor model",
  "Conformance vs performance language",
  "External quality assessment",
  "Internal assessment periodic vs ongoing",
  "Audit universe maintenance",
  "Heat map linkage to plan hours",
  "Consulting engagement documentation",
  "Blended assurance and consulting",
  "Mandatory guidance vs recommended guidance",
  "Implementation guidance use",
  "Supplemental guidance practice guides",
  "Public sector internal audit differences",
  "Financial services regulatory assurance",
  "Model risk assurance overview",
  "Credit risk process audits",
  "Market risk control audits",
  "Operational resilience audits",
  "Business continuity assurance",
  "Health and safety assurance lens",
  "Procurement and contract audit",
  "Capital projects assurance",
  "Revenue leakage audits",
  "Payroll and HR process audits",
  "Treasury process audits",
  "Tax process assurance",
  "Related party and conflicts audits",
  "Disclosure committee liaison",
  "External auditor coordination",
  "Management letter theme tracking",
  "Tone at the top assessment evidence",
  "Three lines model clarification",
  "Second line vs third line roles",
  "Risk appetite assurance",
  "KRIs vs KPIs in audit planning",
  "Control self-assessment facilitation",
  "Workshop-based risk identification",
  "Walkthrough vs substantive testing",
  "Dual-purpose testing design",
  "Population completeness procedures",
  "Sampling judgement documentation",
  "Exception evaluation materiality",
  "Report ratings calibration",
  "Positive vs negative assurance language",
  "Limited vs reasonable assurance analogy",
  "Confidentiality of draft reports",
  "Legal privilege considerations",
  "Data protection in working papers",
  "Remote auditing evidence quality",
  "Agile internal audit sprints",
  "Product and change assurance",
  "Post-implementation reviews",
  "Lessons learned register",
];

/** Extra seeds inspired by Merixa × Codex book shelves (unique workplace titles). */
export const CODEX_BOOK_CONCEPT_SEEDS = {
  frm: [
    "Trading book vs banking book boundary",
    "Market risk VaR backtesting exceptions",
    "Expected shortfall vs VaR for capital",
    "Liquidity coverage ratio stress assumptions",
    "NSFR available vs required stable funding",
    "Counterparty credit exposure EE PE",
    "CVA desk governance",
    "Wrong-way risk identification",
    "Credit risk PD LGD EAD hygiene",
    "Rating migration matrices in credit",
    "Concentration risk limits",
    "Operational risk loss data thresholds",
    "RCSA workshop facilitation",
    "Key risk indicator threshold setting",
    "Model risk inventory completeness",
    "Model validation independence",
    "Stress testing governance committee",
    "Reverse stress testing narrative",
    "Risk appetite statement cascade",
    "Three lines in risk management",
    "Market liquidity horizons",
    "Basis risk in hedges",
    "Interest rate risk in the banking book",
    "Credit valuation adjustment accounting bridge",
    "Funding valuation adjustment awareness",
    "Collateral management CSA terms",
    "Initial margin vs variation margin",
    "Central clearing membership risk",
    "Intra-day liquidity monitoring",
    "Contingency funding plan triggers",
  ],
  iia: IIA_CONCEPT_SEEDS,
  crma: [
    "Risk management assurance engagement",
    "Assurance over risk appetite framework",
    "ERM maturity assessment",
    "Risk culture indicators",
    "Board risk reporting pack QA",
    "Risk owner vs control owner map",
    "Emerging risk horizon scanning",
    "Scenario analysis facilitation",
    "Risk acceptance documentation",
    "Residual risk vs target risk",
    "Control effectiveness rating scale",
    "Key control inventory completeness",
    "Risk of material misstatement linkage",
    "Integrated assurance calendar",
    "Regulatory change impact assessment",
  ],
  coso: [
    "Entity-level control inventory",
    "Fraud triangle in risk assessment",
    "Management override compensating controls",
    "Information system general controls map",
    "Monitoring deficiency aggregation",
    "Control deficiency vs significant deficiency",
    "Material weakness indicators",
    "ERM strategy and objective-setting link",
    "Risk appetite vs risk tolerance",
    "Portfolio view of risk",
    "Performance and risk integration",
    "Review and revision of ERM",
    "Information communication and reporting ERM",
    "COSO principle present and functioning test",
    "Outsourced process control responsibility",
  ],
  governance: [
    "UK Corporate Governance Code Provision 29",
    "Audit committee external audit minimum standard",
    "Board skills matrix refresh",
    "CEO succession independence",
    "Workforce engagement mechanism",
    "ESG board oversight map",
    "Internal control declaration evidence",
    "Going concern and viability linkage",
    "Related party governance controls",
    "Whistleblowing independence from management",
  ],
};

export function crmaCatalogSeeds() {
  return titlesFromDomains(CRMA_DOMAINS);
}

export function cosoCatalogSeeds() {
  return titlesFromDomains(COSO_DOMAINS);
}

export function mergeUniqueSeeds(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const title of list || []) {
      const cleaned = String(title || "").trim();
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cleaned);
    }
  }
  return out;
}
