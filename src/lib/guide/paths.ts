import type { LearningPath } from "./types";
import ifrsPathsGenerated from "./ifrs-paths.generated.json";
import frmPathsGenerated from "./frm-paths.generated.json";
import faPathsGenerated from "./fa-paths.generated.json";
import crossBodyPathsGenerated from "./cross-body-paths.generated.json";
import priorityDomainPathsGenerated from "./priority-domain-paths.generated.json";
import domainShelfPathsGenerated from "./domain-shelf-paths.generated.json";
import orphanFamilyPathsGenerated from "./orphan-family-paths.generated.json";
import { withRemappedPathCards } from "./path-card-remap";

/** Cross-domain practitioner journeys (non IFRS/IAS standard paths). */
export const CORE_LEARNING_PATHS: LearningPath[] = [
  {
    id: "profit-to-cash",
    title: "From profit to cash clarity",
    summary:
      "Learn why P&L success can still create cash pressure, then build a forward cash view.",
    bodies: ["Merixa", "CGMA", "ACCA"],
    steps: [
      {
        id: "s1",
        title: "Profit versus cash",
        summary: "Separate recognition from bank movement.",
        cardId: "profit-vs-cash",
      },
      {
        id: "s2",
        title: "Cash conversion cycle",
        summary: "Quantify days tied up in the operating cycle.",
        cardId: "fa-ccc",
      },
      {
        id: "s3",
        title: "Workplace: Cash Pulse",
        summary: "Model a 13-week horizon with scenarios.",
        cardId: "runway",
        taskLabel: "Open Cash Pulse",
        href: "merixa-micro://cash",
      },
    ],
  },
  {
    id: "tb-to-variance",
    title: "Trial balance → variance lens",
    summary:
      "Turn books into a management P&L, cash bridge, and variance read.",
    bodies: ["Merixa", "CGMA", "ACCA"],
    steps: [
      {
        id: "s1",
        title: "Management P&L",
        summary: "Stable classification from the trial balance.",
        cardId: "management-pl",
      },
      {
        id: "s2",
        title: "Cash bridge",
        summary: "Connect profit to cash movement.",
        cardId: "profit-vs-cash",
        taskLabel: "Open L2 bridge",
        href: "merixa-micro://accounts?level=2",
      },
      {
        id: "s3",
        title: "Variance lens",
        summary: "Explain what moved and why it matters.",
        cardId: "variance-lens",
        taskLabel: "Open L3",
        href: "merixa-micro://accounts?level=3",
      },
    ],
  },
  {
    id: "ifrs-revenue-path",
    title: "Revenue streams under IFRS 15",
    summary: "Map each material stream through the five-step model.",
    bodies: ["IFRS", "ACCA"],
    steps: [
      {
        id: "s1",
        title: "IFRS 15 practice map",
        summary: "Five steps without pasting standard text.",
        cardId: "ifrs-15-revenue",
      },
      {
        id: "s2",
        title: "Materiality",
        summary: "Decide what must be in the matrix.",
        cardId: "materiality-practice",
      },
      {
        id: "s3",
        title: "Partner gate",
        summary: "Escalate timing and variable consideration judgements.",
        cardId: "partner-judgement",
        taskLabel: "Write issue note",
      },
    ],
  },
  {
    id: "controls-lite",
    title: "Controls that actually work",
    summary: "From environment to RCM to evidence—avoid the control illusion.",
    bodies: ["IIA", "CRMA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Control environment",
        summary: "Foundation before activity lists.",
        cardId: "crma-control-environment",
      },
      {
        id: "s2",
        title: "Build an RCM",
        summary: "Risk → control → owner → evidence.",
        cardId: "coso-rcm-coso",
      },
      {
        id: "s3",
        title: "Test design vs OE",
        summary: "Do not sample a control that cannot work.",
        cardId: "design-vs-operating",
      },
      {
        id: "s4",
        title: "Challenge the illusion",
        summary: "Evidence over comfort.",
        cardId: "control-illusion",
      },
    ],
  },
  {
    id: "liquidity-risk-path",
    title: "Liquidity risk for operators",
    summary: "FRM/CFA concepts translated into a weekly cash discipline.",
    bodies: ["FRM", "CFA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Liquidity risk map",
        summary: "Funding vs market liquidity.",
        cardId: "frm-liquidity-risk",
      },
      {
        id: "s2",
        title: "Working capital levers",
        summary: "Cash impact, not cosmetic ratios.",
        cardId: "working-capital",
      },
      {
        id: "s3",
        title: "Workplace horizon",
        summary: "Keep a living 13-week view.",
        cardId: "runway",
        taskLabel: "Update Cash Pulse",
        href: "merixa-micro://cash",
      },
    ],
  },
  {
    id: "liquidity-breadth",
    title: "Liquidity across bodies",
    summary:
      "Stitch cash conversion (reporting/MI) to FRM liquidity risk and a living runway — one practitioner thread.",
    bodies: ["IFRS", "ACCA", "CGMA", "FRM", "CFA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Cash conversion cycle",
        summary: "How working capital ties up cash on the statements.",
        cardId: "fa-ccc",
      },
      {
        id: "s2",
        title: "Working capital levers",
        summary: "DIO, DSO, DPO — operator moves, not cosmetic ratios.",
        cardId: "working-capital",
      },
      {
        id: "s3",
        title: "Liquidity risk map",
        summary: "Funding vs market liquidity in FRM language.",
        cardId: "frm-liquidity-risk",
      },
      {
        id: "s4",
        title: "13-week runway",
        summary: "Turn the map into a living cash horizon.",
        cardId: "runway",
      },
    ],
  },
  {
    id: "group-fx",
    title: "Group reporting & FX",
    summary: "Entity register → eliminations → IAS 21 practice map.",
    bodies: ["IFRS", "ACCA", "CGMA"],
    steps: [
      {
        id: "s1",
        title: "Consolidation basics",
        summary: "Ownership and close calendar first.",
        cardId: "consolidation-basics",
      },
      {
        id: "s2",
        title: "IAS 21 map",
        summary: "Functional vs presentation; P&L vs OCI.",
        cardId: "ias-21-fx",
      },
      {
        id: "s3",
        title: "Partner judgement",
        summary: "Material FX and elimination issues.",
        cardId: "partner-judgement",
      },
    ],
  },
  {
    id: "startup-unit",
    title: "Startup unit economics → runway",
    summary: "Define the unit, then protect cash with scenarios.",
    bodies: ["Merixa", "CFA", "CGMA"],
    steps: [
      {
        id: "s1",
        title: "Unit economics",
        summary: "Contribution per unit before scale.",
        cardId: "unit-economics",
      },
      {
        id: "s2",
        title: "Runway",
        summary: "Forward cash, not average burn only.",
        cardId: "runway",
      },
      {
        id: "s3",
        title: "Scenarios",
        summary: "Few high-impact cases.",
        cardId: "scenario-planning",
        taskLabel: "Stress Custom case",
        href: "merixa-micro://cash",
      },
    ],
  },
  {
    id: "mi-decisions",
    title: "Decision-useful management information",
    summary: "Trim KPIs, separate budget from forecast, write the ask.",
    bodies: ["CGMA", "ACCA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Decision-useful MI",
        summary: "So what / now what.",
        cardId: "cgma-decision",
      },
      {
        id: "s2",
        title: "Budget vs forecast",
        summary: "Accountability vs outlook.",
        cardId: "budget-vs-forecast",
      },
      {
        id: "s3",
        title: "Board pack hygiene",
        summary: "Put the ask on page one.",
        cardId: "board-pack-hygiene",
      },
    ],
  },
  {
    id: "risk-appetite-kri",
    title: "Appetite → KRIs",
    summary: "Turn board appetite into measurable signals.",
    bodies: ["CRMA", "FRM", "IIA"],
    steps: [
      {
        id: "s1",
        title: "Risk appetite",
        summary: "Measurable limits.",
        cardId: "frm-risk-appetite",
      },
      {
        id: "s2",
        title: "KRIs and KCIs",
        summary: "Thresholds and owners.",
        cardId: "kri-kci",
      },
      {
        id: "s3",
        title: "Three lines",
        summary: "Who owns, who challenges, who assures.",
        cardId: "crma-three-lines-model",
      },
    ],
  },
  {
    id: "delivery-prep",
    title: "Practitioner delivery craft",
    summary: "Preparation, evidence, boundaries, partner gates.",
    bodies: ["Merixa", "ACCA", "IIA"],
    steps: [
      {
        id: "s1",
        title: "Impeccable preparation",
        summary: "Question, data, assumptions.",
        cardId: "impeccable-preparation",
      },
      {
        id: "s2",
        title: "Evidence standards",
        summary: "Provenance on every file.",
        cardId: "evidence-standards",
      },
      {
        id: "s3",
        title: "Professional boundaries",
        summary: "Stay inside advisory scope.",
        cardId: "ethics-boundaries",
      },
    ],
  },
  {
    id: "encyclopedia-accounting",
    title: "Accounting equation → statements",
    summary: "Foundation encyclopedia: assets, liabilities, equity, accruals, trial balance.",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Double-entry",
        summary: "Debits, credits, and balance.",
        cardId: "double-entry",
      },
      {
        id: "s2",
        title: "Asset / liability / equity",
        summary: "The equation in practice.",
        cardId: "enc-asset",
      },
      {
        id: "s3",
        title: "Accrual basis",
        summary: "Earn/incur vs cash.",
        cardId: "accrual-basis",
      },
      {
        id: "s4",
        title: "Trial balance",
        summary: "Bridge into the pack.",
        cardId: "trial-balance",
      },
    ],
  },
  {
    id: "encyclopedia-ifrs-frs",
    title: "IFRS & FRS core map",
    summary: "Framework, revenue, impairment, provisions — then practice maps.",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "IFRS Accounting Standards",
        summary: "What the suite is for.",
        cardId: "enc-ifrs-standards",
      },
      {
        id: "s2",
        title: "FRS 102 framework",
        summary: "UK/Ireland GAAP spine.",
        cardId: "enc-frs-102",
      },
      {
        id: "s3",
        title: "Revenue",
        summary: "Performance before invoicing.",
        cardId: "enc-revenue",
      },
      {
        id: "s4",
        title: "IFRS 15 practice map",
        summary: "Five-step workplace route.",
        cardId: "ifrs-15-revenue",
      },
    ],
  },
  {
    id: "encyclopedia-audit",
    title: "Audit evidence → opinion path",
    summary: "Materiality, evidence, substantive work, and assurance boundaries.",
    bodies: ["ACCA", "IIA", "FRC", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Audit materiality",
        summary: "Thresholds that drive testing.",
        cardId: "enc-materiality-audit",
      },
      {
        id: "s2",
        title: "Audit evidence",
        summary: "Sufficiency and appropriateness.",
        cardId: "enc-audit-evidence",
      },
      {
        id: "s3",
        title: "Substantive testing",
        summary: "Respond to assessed risk.",
        cardId: "enc-substantive-testing",
      },
      {
        id: "s4",
        title: "External vs internal audit",
        summary: "Who assures whom.",
        cardId: "enc-external-vs-internal-audit",
      },
    ],
  },
  {
    id: "encyclopedia-risk-frm",
    title: "Risk types for FRM practitioners",
    summary: "Market, credit, liquidity, operational — then appetite and residual risk.",
    bodies: ["FRM", "CFA", "IIA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Market risk",
        summary: "Prices, rates, FX.",
        cardId: "frm-market-risk",
      },
      {
        id: "s2",
        title: "Credit risk",
        summary: "Counterparties and expected loss.",
        cardId: "frm-credit-risk",
      },
      {
        id: "s3",
        title: "Liquidity risk",
        summary: "Funding vs market liquidity.",
        cardId: "frm-liquidity-risk",
      },
      {
        id: "s4",
        title: "VaR",
        summary: "Tail summary with limits.",
        cardId: "frm-var-definition",
      },
      {
        id: "s5",
        title: "Risk appetite",
        summary: "Willingness with metrics.",
        cardId: "frm-risk-appetite",
      },
    ],
  },
  {
    id: "encyclopedia-cfa-finance",
    title: "CFA finance decision spine",
    summary: "TVM → NPV/IRR → WACC/CAPM → free cash flow.",
    bodies: ["CFA", "CGMA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Time value of money",
        summary: "Discounting foundation.",
        cardId: "fa-tvm",
      },
      {
        id: "s2",
        title: "NPV",
        summary: "Absolute value created.",
        cardId: "fa-npv",
      },
      {
        id: "s3",
        title: "WACC",
        summary: "Hurdle rate components.",
        cardId: "fa-wacc",
      },
      {
        id: "s4",
        title: "Free cash flow",
        summary: "Cash to capital providers.",
        cardId: "fa-fcf",
      },
    ],
  },
  {
    id: "encyclopedia-controls",
    title: "Controls encyclopedia route",
    summary: "Environment → preventive/detective → SoD → RCM → three lines.",
    bodies: ["IIA", "CRMA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Control environment",
        summary: "Foundation before lists.",
        cardId: "crma-control-environment",
      },
      {
        id: "s2",
        title: "Preventive and detective",
        summary: "Stop vs find.",
        cardId: "enc-preventive-detective",
      },
      {
        id: "s3",
        title: "Segregation of duties",
        summary: "Incompatible duties.",
        cardId: "crma-segregation-of-duties",
      },
      {
        id: "s4",
        title: "RCM",
        summary: "Risk → control → evidence.",
        cardId: "coso-rcm-coso",
      },
    ],
  },
  {
    id: "encyclopedia-management-accounting",
    title: "Management accounting spine",
    summary:
      "Cost behaviour, contribution, budgeting, variance, and divisional performance — learn by example.",
    bodies: ["CGMA", "ACCA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Fixed and variable costs",
        summary: "Separate behaviour before any decision model.",
        cardId: "ma-fixed-variable-cost",
      },
      {
        id: "s2",
        title: "Contribution margin",
        summary: "The short-term decision metric.",
        cardId: "ma-contribution-margin",
      },
      {
        id: "s3",
        title: "Break-even and CVP",
        summary: "Volume, price, and profit linkage.",
        cardId: "ma-break-even",
      },
      {
        id: "s4",
        title: "Relevant cost",
        summary: "What changes between alternatives.",
        cardId: "ma-relevant-cost",
      },
      {
        id: "s5",
        title: "Flexed budget",
        summary: "Fair variance at actual activity.",
        cardId: "ma-flexed-budget",
      },
      {
        id: "s6",
        title: "Standard costing variances",
        summary: "Price, usage, rate, efficiency.",
        cardId: "ma-standard-costing",
      },
      {
        id: "s7",
        title: "Responsibility centres",
        summary: "Cost, profit, and investment accountability.",
        cardId: "ma-profit-centre",
      },
      {
        id: "s8",
        title: "Transfer pricing",
        summary: "Divisional incentives and group profit.",
        cardId: "fa-transfer-pricing",
      },
    ],
  },
  {
    id: "encyclopedia-frm-spine",
    title: "FRM practitioner spine",
    summary:
      "Quant foundations through market, credit, liquidity, and operational risk — concepts with formulas where they matter.",
    bodies: ["FRM", "CFA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Expected value and volatility",
        summary: "Probability-weighted outcomes and dispersion.",
        cardId: "frm-expected-value",
      },
      {
        id: "s2",
        title: "Value at risk",
        summary: "Quantile loss measure and limits.",
        cardId: "frm-var-definition",
      },
      {
        id: "s3",
        title: "Expected shortfall",
        summary: "Tail severity beyond VaR.",
        cardId: "frm-expected-shortfall",
      },
      {
        id: "s4",
        title: "Duration and DV01",
        summary: "Interest rate sensitivity.",
        cardId: "frm-duration-modified",
      },
      {
        id: "s5",
        title: "Option Greeks",
        summary: "Delta, gamma, vega, theta.",
        cardId: "frm-delta",
      },
      {
        id: "s6",
        title: "Expected loss",
        summary: "PD, LGD, and EAD.",
        cardId: "frm-expected-loss",
      },
      {
        id: "s7",
        title: "LCR and NSFR",
        summary: "Regulatory liquidity ratios.",
        cardId: "frm-lcr",
      },
      {
        id: "s8",
        title: "Sharpe and tracking error",
        summary: "Risk-adjusted performance.",
        cardId: "fa-sharpe-ratio",
      },
    ],
  },
  {
    id: "encyclopedia-financial-analysis",
    title: "Financial analysis spine",
    summary:
      "Statement mechanics, ratios, cash flow, WACC, and valuation — CFA-aligned practitioner reference with formulas.",
    bodies: ["CFA", "ACCA", "Merixa"],
    steps: [
      {
        id: "s1",
        title: "Articulation and accruals",
        summary: "How statements link and earnings map to cash.",
        cardId: "fa-articulation",
      },
      {
        id: "s2",
        title: "DuPont and ROE",
        summary: "Decompose return on equity.",
        cardId: "fa-dupont-3",
      },
      {
        id: "s3",
        title: "Current and quick ratio",
        summary: "Liquidity from the balance sheet.",
        cardId: "fa-current-ratio",
      },
      {
        id: "s4",
        title: "Free cash flow",
        summary: "Cash after maintenance capex.",
        cardId: "fa-fcf",
      },
      {
        id: "s5",
        title: "WACC",
        summary: "Discount rate for FCFF.",
        cardId: "fa-wacc",
      },
      {
        id: "s6",
        title: "DCF valuation",
        summary: "Intrinsic value from cash flows.",
        cardId: "fa-dcf-overview",
      },
      {
        id: "s7",
        title: "EV/EBITDA multiples",
        summary: "Relative valuation cross-check.",
        cardId: "fa-ev-ebitda",
      },
      {
        id: "s8",
        title: "Modified duration",
        summary: "Rate sensitivity for fixed income.",
        cardId: "fa-modified-duration",
      },
    ],
  },
];

/** One step-by-step path per IFRS/IAS standard (generated by library:ifrs-paths). */
export const IFRS_LEARNING_PATHS = ifrsPathsGenerated as LearningPath[];

/** FRM domain paths (generated by library:frm-paths). */
export const FRM_LEARNING_PATHS = frmPathsGenerated as LearningPath[];

/** Financial analysis domain paths (generated by library:fa-paths). */
export const FA_LEARNING_PATHS = faPathsGenerated as LearningPath[];

/** OpenAI cross-body paths (generated by library:expand --generate). */
export const CROSS_BODY_LEARNING_PATHS =
  crossBodyPathsGenerated as LearningPath[];

/** Priority domain paths — tax, sustainability, project delivery, governance, audit, risk, MI. */
export const PRIORITY_DOMAIN_LEARNING_PATHS =
  priorityDomainPathsGenerated as LearningPath[];

/** Domain practice shelves — broad membership for competitive path coverage. */
export const DOMAIN_SHELF_LEARNING_PATHS =
  domainShelfPathsGenerated as LearningPath[];

/** Enriched orphan families — Strategy, MA, Tax, sustain/audit/gov/project. */
export const ORPHAN_FAMILY_LEARNING_PATHS =
  orphanFamilyPathsGenerated as LearningPath[];

const CORE_IDS_WITHOUT_IFRS_OVERLAP = new Set([
  "ifrs-revenue-path",
  "encyclopedia-ifrs-frs",
]);

export const LEARNING_PATHS: LearningPath[] = withRemappedPathCards([
  ...CORE_LEARNING_PATHS.filter((path) => !CORE_IDS_WITHOUT_IFRS_OVERLAP.has(path.id)),
  ...CROSS_BODY_LEARNING_PATHS,
  ...PRIORITY_DOMAIN_LEARNING_PATHS,
  ...DOMAIN_SHELF_LEARNING_PATHS,
  ...ORPHAN_FAMILY_LEARNING_PATHS,
  ...IFRS_LEARNING_PATHS,
  ...FRM_LEARNING_PATHS,
  ...FA_LEARNING_PATHS,
]);

export function isIfrsStandardPath(path: LearningPath): boolean {
  return path.id.startsWith("ifrs-path-");
}

export function isFrmDomainPath(path: LearningPath): boolean {
  return path.id.startsWith("frm-path-");
}

export function isFaDomainPath(path: LearningPath): boolean {
  return path.id.startsWith("fa-path-");
}

export function isPriorityDomainPath(path: LearningPath): boolean {
  return path.id.startsWith("priority-path-");
}
