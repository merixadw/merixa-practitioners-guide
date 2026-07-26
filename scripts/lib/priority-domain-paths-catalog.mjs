/**
 * Priority domain paths — thin Library domains + taxation + underused bodies.
 */
import { TAX_PATH } from "./tax-encyclopedia-catalog.mjs";

function path(slug, title, summary, bodies, steps) {
  return {
    slug,
    title,
    summary,
    bodies,
    steps: steps.map((step, index) => ({
      id: `${slug}-s${index + 1}`,
      title: step.title,
      cardId: step.cardId,
    })),
  };
}

export const PRIORITY_DOMAIN_PATHS = [
  {
    ...TAX_PATH,
    steps: TAX_PATH.steps.map((step, index) => ({
      id: `${TAX_PATH.slug}-s${index + 1}`,
      title: step.title,
      cardId: step.id,
    })),
  },
  path(
    "sustainability-reporting",
    "Sustainability reporting in practice",
    "Materiality, climate risk, and disclosure discipline — IFRS Sustainability and investor lens.",
    ["IFRS", "CFA", "FRM", "ACCA"],
    [
      { title: "ESG materiality", cardId: "enc-materiality-esg" },
      { title: "Climate-related risk", cardId: "enc-climate-risk" },
      { title: "Scope emissions mindset", cardId: "enc-scope-emissions" },
      { title: "Sustainability disclosure pack", cardId: "enc-sustainability-disclosure" },
    ],
  ),
  path(
    "project-delivery-finance",
    "Project delivery — finance view",
    "Business case, stage gates, and variance control for project finance owners.",
    ["CGMA", "ACCA", "IIA"],
    [
      { title: "Project business case", cardId: "enc-project-business-case" },
      { title: "Stage-gate governance", cardId: "enc-stage-gate" },
      { title: "Benefits realisation", cardId: "enc-benefits-realisation" },
      { title: "Project variance control", cardId: "enc-project-variance" },
    ],
  ),
  path(
    "governance-controls-spine",
    "Governance and controls spine",
    "Control environment through monitoring — IIA and CRMA practitioner route.",
    ["IIA", "CRMA", "ACCA", "FRC"],
    [
      { title: "Control environment", cardId: "enc-control-environment" },
      { title: "Segregation of duties", cardId: "enc-sod" },
      { title: "Risk and control matrix", cardId: "enc-rcm" },
      { title: "Three lines model", cardId: "enc-three-lines" },
      { title: "Monitoring activities", cardId: "enc-monitoring-controls" },
    ],
  ),
  path(
    "audit-assurance-spine",
    "Audit and assurance spine",
    "Evidence, materiality, and opinion types — ACCA and IIA workplace lens.",
    ["ACCA", "IIA", "FRC"],
    [
      { title: "Audit evidence", cardId: "enc-audit-evidence" },
      { title: "Audit materiality", cardId: "enc-materiality-audit" },
      { title: "Substantive testing", cardId: "enc-substantive-testing" },
      { title: "Analytical procedures", cardId: "enc-analytical-procedures" },
      { title: "Going concern audit", cardId: "enc-going-concern-audit" },
    ],
  ),
  path(
    "risk-management-spine",
    "Risk management spine",
    "Market, credit, liquidity, and operational risk — FRM and CRMA depth.",
    ["FRM", "CRMA", "IIA", "CFA"],
    [
      { title: "Risk appetite", cardId: "enc-risk-appetite" },
      { title: "Inherent and residual risk", cardId: "enc-inherent-residual-risk" },
      { title: "Market risk", cardId: "enc-market-risk" },
      { title: "Credit risk", cardId: "enc-credit-risk" },
      { title: "Operational risk", cardId: "enc-operational-risk" },
      { title: "Stress testing", cardId: "enc-stress-testing" },
    ],
  ),
  path(
    "management-reporting-spine",
    "Management reporting spine",
    "Cost behaviour, variance, and pack-ready MI — CGMA and ACCA.",
    ["CGMA", "ACCA", "CFA"],
    [
      { title: "Contribution margin", cardId: "enc-contribution-margin" },
      { title: "Break-even", cardId: "enc-break-even" },
      { title: "KPI vs KRI", cardId: "enc-kpi-vs-kri" },
      { title: "Variance analysis mindset", cardId: "enc-variance-analysis" },
      { title: "Rolling forecast discipline", cardId: "enc-rolling-forecast" },
    ],
  ),
  path(
    "cfa-frm-bridge",
    "CFA and FRM bridge",
    "Valuation and risk measurement concepts practitioners use together.",
    ["CFA", "FRM", "ACCA"],
    [
      { title: "WACC", cardId: "enc-wacc" },
      { title: "Value at risk", cardId: "enc-var" },
      { title: "Duration", cardId: "enc-duration" },
      { title: "Enterprise value", cardId: "enc-enterprise-value" },
      { title: "Model risk", cardId: "enc-model-risk" },
    ],
  ),
];
