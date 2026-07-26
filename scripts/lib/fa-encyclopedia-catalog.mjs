/**
 * Financial analysis encyclopedia — domain spine (CFA-aligned practitioner concepts).
 * Merixa-authored; practitioner financial analysis, not exam prep.
 */

import { FA_FORMULA_CORPORATE } from "./fa-formulas-corporate.mjs";
import { FA_FORMULA_EXTENDED } from "./fa-formulas-extended.mjs";
import { FA_FORMULA_FSA } from "./fa-formulas-fsa.mjs";
import { FA_FORMULA_QUANT_FI } from "./fa-formulas-quant-fi.mjs";
import { FA_FORMULA_VALUATION } from "./fa-formulas-valuation.mjs";

function fa(id, title, topic, definition, example, trap, formula) {
  return { id: `fa-${id}`, title, topic, definition, example, trap, formula };
}

export const FA_DOMAINS = [
  {
    slug: "fsa-mechanics",
    title: "Financial reporting mechanics",
    summary: "How statements link, accruals flow, and analysts rebuild economic reality from GAAP/IFRS numbers.",
    steps: [
      fa("accrual-vs-cash", "Accrual versus cash basis", "FSA", "Accrual accounting records revenue when earned and expenses when incurred; cash basis when cash moves. Analysts reconcile both to assess earnings quality.", "Net income £12m but operating cash £7m — map working capital and non-cash items before crediting ‘quality earnings’.", "Treating net income as cash without a cash flow statement bridge."),
      fa("articulation", "Articulation of financial statements", "FSA", "The three primary statements articulate: net income flows to retained earnings; cash flow explains balance sheet cash change; balance sheet balances.", "Close check: opening equity + NI − dividends ± OCI = closing equity; mismatch flags classification error.", "Building a model where cash on B/S does not tie to the cash flow statement."),
      fa("non-recurring-items", "Non-recurring and special items", "FSA", "Items unlikely to persist — restructuring, impairments, gains on disposal. Analysts normalise for run-rate forecasting.", "Strip £4m one-off impairment from EBITDA for peer comparison; document in adjusted bridge.", "Adding back every ‘one-off’ that repeats annually in slightly different labels."),
      fa("accounting-estimates", "Accounting estimates and judgments", "FSA", "Depreciation lives, credit loss provisions, fair values, and pension assumptions embed management judgment in reported numbers.", "Compare DSO and provision coverage to peers; a 5-day DSO stretch can mask revenue pressure.", "Accepting fair value Level 3 inputs without sensitivity or third-party marks."),
    ],
  },
  {
    slug: "income-statement",
    title: "Income statement analysis",
    summary: "Revenue recognition, margins, operating leverage, and earnings composition.",
    steps: [
      fa("revenue-quality", "Revenue quality", "FSA", "Revenue quality assesses sustainability, timing, and collectability of top line — bill-and-hold, channel stuffing, and aggressive recognition degrade quality.", "Revenue +18% but receivables +35% and DSO +12 days — pressure-test recognition policy with credit sales mix.", "Growth celebrated without receivables and deferred revenue trend."),
      fa("gross-margin-analysis", "Gross margin analysis", "FSA", "Gross margin reflects pricing power and input cost control at product level before operating overhead.", "Margin fell 220 bps: split price (−80 bps), mix (−60 bps), input costs (−80 bps) using volume/mix bridge.", "Blaming ‘inflation’ without quantifying price pass-through lag."),
      fa("operating-margin", "Operating margin and EBIT", "FSA", "Operating margin is EBIT over revenue — core profitability before financing and tax structure.", "EBIT margin 11.2% vs peer 14% — identify SG&A density and R&D capitalisation differences.", "Using EBITDA margin alone when capex-heavy business needs EBIT and FCF view."),
      fa("ebitda-adjustments", "EBITDA and adjustments", "FSA", "EBITDA adds back D&A; adjusted EBITDA further removes items analysts deem non-recurring. Document every adjustment.", "Reported EBITDA £90m; add-backs £14m (legal, restructuring) → adjusted £104m — cap add-backs at peer policy.", "Unlimited ‘adjusted’ metrics with no reconciliation to GAAP net income."),
    ],
  },
  {
    slug: "balance-sheet",
    title: "Balance sheet and liquidity",
    summary: "Working capital, leverage, off-balance sheet exposures, and solvency.",
    steps: [
      fa("working-capital", "Working capital analysis", "FSA", "Net working capital (current assets − current liabilities) funds the operating cycle. Changes drive cash flow.", "NWC rose £22m on 12% sales growth — legitimate if stocking for demand; suspect if sales flat.", "Ignoring negative working capital model (subscription prepay) when benchmarking to manufacturers."),
      fa("liquidity-ratios", "Liquidity ratios", "FSA", "Current and quick ratios measure short-term obligation coverage. Context matters — industry and seasonality.", "Current ratio 1.4, quick 0.9 — inventory-heavy; stress quick ratio in downturn scenario.", "Current ratio >2 celebrated when cash trapped in slow inventory."),
      fa("leverage-overview", "Financial leverage overview", "FSA", "Leverage magnifies ROE but raises default risk. Analysts combine book and market measures with coverage ratios.", "Debt/EBITDA 3.8×, interest cover 4.2× — covenant headroom 4.5× on senior leverage.", "Net debt computed without pension deficit or lease liabilities post-IFRS 16."),
      fa("off-balance-sheet", "Off-balance sheet items", "FSA", "Operating leases (pre/post IFRS 16), unconsolidated JVs, guarantees, and SPVs can hide economic leverage.", "Reconstruct lease-adjusted debt; read commitments note for take-or-pay and guarantees.", "Treating post-IFRS 16 balance sheet as comparable to pre-2019 peers without adjustment."),
    ],
  },
  {
    slug: "cash-flow",
    title: "Cash flow analysis",
    summary: "Operating, investing, and financing cash flows; free cash flow; cash conversion.",
    steps: [
      fa("ocf-vs-ni", "Operating cash flow versus net income", "FSA", "Sustained OCF below net income may signal aggressive accruals; OCF above NI can mean working capital release (possibly unsustainable).", "Three-year avg OCF/NI = 0.82 — walk accruals and WC line by line in MD&A.", "Single-year OCF spike from payables stretch labelled ‘strong cash generation’."),
      fa("free-cash-flow", "Free cash flow", "FSA", "FCF is cash available after maintaining/replacing assets — typically OCF minus capex. Definition must be stated.", "OCF £85m − capex £40m = FCF £45m; compare to dividends £20m + buybacks £15m.", "Using EBITDA − capex without interest, tax, and working capital."),
      fa("capex-analysis", "Capital expenditure analysis", "FSA", "Capex maintains versus grows capacity. Compare capex to D&A and to management guidance.", "Capex/D&A 1.35× for three years — growth investment phase; expect margin lag then uplift.", "Underinvestment: capex < D&A for five years while claiming market share gains."),
      fa("cash-flow-ratios", "Cash flow ratios", "FSA", "Cash interest coverage, cash debt service, and FCF yield connect cash to debt and equity value.", "FCF yield 8.2% on enterprise value vs cost of debt 6% — headroom for deleveraging.", "Cash coverage using EBITDA not OCF."),
    ],
  },
  {
    slug: "ratio-analysis",
    title: "Ratio analysis and DuPont",
    summary: "Profitability, activity, liquidity, and solvency ratios; ROE decomposition.",
    steps: [
      fa("dupont-3", "Three-step DuPont analysis", "FSA", "ROE = net profit margin × asset turnover × financial leverage. Shows whether ROE is driven by margin, efficiency, or leverage.", "ROE 18%: margin 6% × turnover 1.5 × leverage 2.0 — leverage elevated vs peer 1.4.", "ROE improvement only from leverage while margins deteriorate."),
      fa("dupont-5", "Five-step DuPont analysis", "FSA", "Extends DuPont to tax and interest burden: ROE = tax burden × interest burden × EBIT margin × asset turnover × leverage.", "Interest burden fell — ROE up but operating performance flat; deleveraging story vs ops story.", "Ignoring tax rate changes from one-off deferred tax credits."),
      fa("peer-benchmarking", "Peer benchmarking", "FSA", "Ratios gain meaning versus peers, history, and industry median — adjust for accounting policy differences.", "Normalise lease-adjusted leverage; use same fiscal year-end cluster.", "Benchmarking gross margin to a peer with different vertical integration."),
      fa("common-size", "Common-size statements", "FSA", "Express each line as % of revenue (I/S) or total assets (B/S) to compare scale-different entities.", "SG&A 22% of revenue vs peer 17% — £40m efficiency gap at same scale.", "Common-size on consolidated group mixing unrelated segments."),
    ],
  },
  {
    slug: "quality",
    title: "Earnings quality and adjustments",
    summary: "Normalisation, red flags, and pro forma analysis for valuation inputs.",
    steps: [
      fa("earnings-quality", "Earnings quality", "FSA", "High-quality earnings are persistent, cash-backed, and from core operations with conservative accounting.", "Scorecard: OCF/NI, accruals ratio, revenue vs receivables, change in estimate frequency.", "Equating ‘beat consensus’ with earnings quality."),
      fa("accruals-ratio", "Accruals ratio", "FSA", "Accruals measure non-cash component of earnings. High accruals vs peers can predict mean reversion.", "(NI − OCF) / average total assets compared to sector — top quartile accruals flagged.", "Using total accruals without separating working capital from non-current accruals."),
      fa("pro-forma-eps", "Pro forma and adjusted EPS", "FSA", "Companies report non-GAAP metrics. Analysts must reconcile to GAAP and limit adjustments to truly non-recurring items.", "Adjusted EPS £1.42 vs GAAP £1.08 — verify stock comp, amortisation of acquired intangibles policy.", "Building DCF on adjusted EPS without tax-affecting adjustments properly."),
      fa("related-party", "Related-party transactions", "FSA", "Transactions with insiders or affiliates can transfer value. Disclosure and pricing fairness matter.", "30% purchases from affiliate — compare pricing to arm’s length benchmark.", "Ignoring immaterial related-party note that concentrates supply risk."),
    ],
  },
  {
    slug: "corporate-finance",
    title: "Corporate finance for analysts",
    summary: "Capital structure, dividends, cost of capital, and value creation.",
    steps: [
      fa("capital-structure", "Capital structure", "Corporate", "Mix of debt and equity financing affects WACC, risk, and flexibility. Target structure reflects industry and cycle.", "Net debt/EBITDA 2.5× inside 2.0–3.0× target; refinancing ladder shown to treasury.", "Optimising book leverage ignoring rating agency metrics."),
      fa("wacc-overview", "Weighted average cost of capital", "Corporate", "WACC is the blended required return on debt and equity weighted by market values. Discount rate for FCFF valuation.", "WACC 8.4%: cost of equity 10%, after-tax debt 4.5%, weights 70/30.", "Using book weights for WACC in acquisition DCF."),
      fa("cost-of-equity", "Cost of equity", "Corporate", "Required return for equity investors — CAPM, build-up, or multifactor models.", "CAPM: Rf 4% + β 1.1 × ERP 5% = 9.5% cost of equity.", "Beta from thinly traded stock without relevering for capital structure."),
      fa("fcff-fcfe", "FCFF and FCFE", "Corporate", "FCFF is cash to all capital providers; FCFE to equity after debt flows. Match discount rate to cash flow definition.", "FCFF discounted at WACC; FCFE at cost of equity — never cross discount rates.", "Adding interest to FCFF or forgetting net borrowing in FCFE."),
    ],
  },
  {
    slug: "equity-valuation",
    title: "Equity valuation",
    summary: "DCF, dividends, multiples, and residual income for intrinsic value.",
    steps: [
      fa("dcf-overview", "Discounted cash flow valuation", "Valuation", "DCF values an asset as PV of expected future cash flows at an appropriate risk-adjusted discount rate.", "Two-stage FCFF: 5-year explicit + terminal value; sensitivity table on WACC and g.", "Terminal value 85% of EV with aggressive perpetual growth."),
      fa("ddm", "Dividend discount model", "Valuation", "Values equity as PV of expected dividends. Best for stable, high-payout firms.", "Gordon growth: D1 £2, ke 9%, g 3% → V0 = £33.33.", "Applying constant-growth DDM to cyclical or non-dividend growth stock."),
      fa("multiples-valuation", "Multiples valuation", "Valuation", "Relative value using EV/EBITDA, P/E, P/B vs peers. Requires comparable economics and accounting.", "Target EV/EBITDA 9× vs peer 11× — justify discount with growth and margin gap.", "Mean reversion on peak-cycle multiples at industry top."),
      fa("residual-income", "Residual income model", "Valuation", "Value = book value plus PV of excess returns (ROE − ke) on book value.", "BVPS £20, ROE 14%, ke 10%, persistence model for RI stream.", "RI model with ROE permanently above ke without competitive moat narrative."),
    ],
  },
  {
    slug: "fixed-income-analytics",
    title: "Fixed income analytics",
    summary: "Yield measures, duration, credit spreads, and bond valuation for analysts.",
    steps: [
      fa("yield-measures", "Bond yield measures", "Fixed income", "Current yield, YTM, YTC, and simple yield serve different purposes for pricing and comparability.", "Premium bond: YTM 5.2% < coupon 6% — price will pull to par at maturity.", "Quoting coupon as YTM."),
      fa("spot-forward", "Spot and forward rates", "Fixed income", "Spot curve prices zero-coupon cash flows; forward rates imply future borrowing rates.", "Bootstrap 2y spot from bonds; forward rates feed swap and liability hedging view.", "Using YTM of coupon bond as spot for wrong maturity."),
      fa("duration-convexity-fa", "Duration and convexity", "Fixed income", "Duration estimates price sensitivity to yield; convexity refines for large moves.", "Mod duration 7, +50 bps shock → approx −3.5% price; add convexity for book.", "Duration-matching assets and liabilities without reviewing convexity mismatch."),
      fa("credit-spread-analysis", "Credit spread analysis", "Fixed income", "Spread over benchmark reflects default and liquidity risk. Relative value and migration analysis for credit investors.", "Z-spread 180 bps widened 40 bps — decompose market vs idiosyncratic.", "Spread tightening assumed permanent without fundamental improvement."),
    ],
  },
  {
    slug: "quant-analyst",
    title: "Quantitative tools for analysts",
    summary: "TVM, statistics, and regression applied to forecasting and risk.",
    steps: [
      fa("tvm", "Time value of money", "Quant", "Money today exceeds money later due to opportunity cost. Foundation of DCF and bond math.", "£100 in 5 years at 8% → PV £68.06; FV of £68.06 confirms round-trip.", "Mixing nominal cash flows with real discount rate."),
      fa("annuity-perpetuity", "Annuities and perpetuities", "Quant", "Regular cash flow patterns with closed-form PV — loan schedules, DDM terminal value.", "Perpetuity £5 at 7% → PV £71.43; growing perpetuity uses g < r.", "Perpetuity formula when growth ≥ discount rate."),
      fa("regression-forecast", "Regression for forecasting", "Quant", "Linear regression estimates relationships for forecasting drivers — sales vs GDP, margins vs utilisation.", "R² 0.65 on volume vs PMI — use interval not point forecast in model.", "Causal language from correlated macro series only."),
      fa("hypothesis-analyst", "Hypothesis testing for analysts", "Quant", "Test whether observed differences (returns, margins) are statistically distinguishable from noise.", "New pricing strategy: test mean basket margin uplift vs control stores p < 0.05.", "P-hacking across twenty KPIs without multiple-testing adjustment."),
    ],
  },
];

const spineEntries = FA_DOMAINS.flatMap((domain) =>
  domain.steps.map((step) => ({
    ...step,
    domainSlug: domain.slug,
    domainTitle: domain.title,
  })),
);

const formulaById = new Map(
  [
    ...FA_FORMULA_FSA,
    ...FA_FORMULA_VALUATION,
    ...FA_FORMULA_CORPORATE,
    ...FA_FORMULA_QUANT_FI,
    ...FA_FORMULA_EXTENDED,
  ].map((entry) => [entry.id, entry]),
);

for (const entry of spineEntries) {
  formulaById.set(entry.id, entry);
}

/** Flat list of all financial analysis encyclopedia cards. */
export const FA_ENCYCLOPEDIA = [...formulaById.values()];
