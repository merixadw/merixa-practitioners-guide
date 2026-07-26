/**
 * Multi-domain practitioner encyclopedia spine.
 * Merixa-authored definitions — no invented IFRS/IAS/FRS clause text.
 * Bodies are affinity tags for navigation; prose does not name-drop bodies.
 */
export const DOMAIN_ENCYCLOPEDIA = [
  // —— Accounting foundations ——
  {
    id: "enc-asset",
    title: "Asset",
    domain: "Financial reporting",
    topic: "Assets",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "An asset is a present economic resource controlled by the entity as a result of past events. Control and future economic benefit matter more than legal title alone.",
    example:
      "Capitalise a machine only when the entity controls it and expects future cash inflows; training costs that do not create a separable resource stay in expense.",
    trap:
      "Recording every spend as an asset because ‘it will help the business’ without testing control and future benefit.",
  },
  {
    id: "enc-liability",
    title: "Liability",
    domain: "Financial reporting",
    topic: "Liabilities",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "A liability is a present obligation to transfer an economic resource as a result of past events. The obligation can be legal or constructive.",
    example:
      "Accrue a known supplier obligation at period end even if the invoice arrives later, with estimate, owner, and reverse flag.",
    trap:
      "Leaving material obligations off the balance sheet because cash has not yet left the bank.",
  },
  {
    id: "enc-equity",
    title: "Equity",
    domain: "Financial reporting",
    topic: "Equity",
    bodies: ["IFRS", "FRC", "ACCA", "CFA", "Merixa"],
    definition:
      "Equity is the residual interest in assets after deducting liabilities. It is not a pile of cash — it is the accounting claim of owners.",
    example:
      "Separate share capital, share premium, and retained earnings on the TB so gearing and distributable reserves stay readable.",
    trap:
      "Treating equity as available cash for dividends without checking restrictions and distributable profits.",
  },
  {
    id: "enc-revenue",
    title: "Revenue",
    domain: "Financial reporting",
    topic: "Revenue",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Revenue is income from ordinary activities arising from contracts with customers or equivalent frameworks. Recognition follows performance, not only invoicing or cash.",
    example:
      "Map each material stream through performance obligations before booking period revenue in the management P&L.",
    trap:
      "Booking revenue on invoice date when control has not transferred, or ignoring variable consideration.",
  },
  {
    id: "enc-expense",
    title: "Expense",
    domain: "Financial reporting",
    topic: "Expenses",
    bodies: ["IFRS", "FRC", "ACCA", "CGMA", "Merixa"],
    definition:
      "Expenses are decreases in economic benefits during a period other than distributions to owners. Classification (cost of sales vs opex) must stay stable for variance use.",
    example:
      "Reclassify misposted project costs out of opex into cost of sales before the variance pack goes to the board.",
    trap:
      "Moving costs between lines each month to ‘manage’ margins without a documented policy change.",
  },
  {
    id: "enc-going-concern",
    title: "Going concern",
    domain: "Financial reporting",
    topic: "Going concern",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Going concern is the assumption that the entity will continue in operation for the foreseeable future. It shapes measurement, classification, and disclosure — and must be evidenced, not asserted.",
    example:
      "Link the 13-week cash view, covenant headroom, and mitigating actions into one going-concern memo before sign-off.",
    trap:
      "Relying on a boilerplate statement while the cash model shows a funding cliff inside the assessment period.",
  },
  {
    id: "enc-fair-value",
    title: "Fair value",
    domain: "Financial reporting",
    topic: "Measurement",
    bodies: ["IFRS", "CFA", "ACCA", "Merixa"],
    definition:
      "Fair value is the price that would be received to sell an asset or paid to transfer a liability in an orderly transaction between market participants at the measurement date.",
    example:
      "Document the valuation technique, observable inputs, and hierarchy level before using fair value in a board pack.",
    trap:
      "Using an entity-specific ‘strategic value’ as if it were fair value without market-participant evidence.",
  },
  {
    id: "enc-impairment",
    title: "Impairment",
    domain: "Financial reporting",
    topic: "Impairment",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Impairment reduces a carrying amount when recoverable amount is lower. Indicators trigger testing; evidence and CGU definition drive the conclusion.",
    example:
      "For a loss-making CGU, assemble cash-flow forecasts, discount rate rationale, and sensitivity before proposing a write-down.",
    trap:
      "Skipping impairment indicators because ‘the asset is still in use’ while cash flows no longer support the book value.",
  },
  {
    id: "enc-provisions",
    title: "Provisions",
    domain: "Financial reporting",
    topic: "Provisions",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "A provision is a liability of uncertain timing or amount, recognised when there is a present obligation, probable outflow, and a reliable estimate.",
    example:
      "Book a restructuring provision only after a detailed plan and valid expectation have been created; keep a probability-weighted range in the workpaper.",
    trap:
      "Creating a ‘cookie jar’ provision for future costs that are not present obligations.",
  },
  {
    id: "enc-contingent-liability",
    title: "Contingent liability",
    domain: "Financial reporting",
    topic: "Provisions",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "A contingent liability is a possible obligation depending on uncertain future events, or a present obligation that is not recognised because outflow is not probable or cannot be measured reliably. It is disclosed, not quietly ignored.",
    example:
      "Track litigation outcomes with counsel letters, probability assessment, and disclosure draft alongside any recognised provision.",
    trap:
      "Treating every lawsuit as ‘contingent only’ when a present obligation and probable loss already exist.",
  },
  {
    id: "enc-frs-102",
    title: "FRS 102 framework",
    domain: "Financial reporting",
    topic: "UK GAAP framework",
    bodies: ["FRC", "ACCA", "Merixa"],
    definition:
      "FRS 102 is the main UK and Ireland financial reporting standard for many entities not applying IFRS. Topic sections and the glossary drive recognition, measurement, and disclosure choices.",
    example:
      "Confirm the entity’s framework election (FRS 102 vs IFRS vs FRS 101/105) before drafting the accounting policies note.",
    trap:
      "Copying IFRS policy wording into FRS 102 accounts without checking section differences and disclosure exemptions.",
  },
  {
    id: "enc-ifrs-standards",
    title: "IFRS Accounting Standards",
    domain: "Financial reporting",
    topic: "IFRS framework",
    bodies: ["IFRS", "ACCA", "Merixa"],
    definition:
      "IFRS Accounting Standards are the IASB’s suite of standards and interpretations used for general purpose financial statements. Practice maps should cite the applicable standard family without inventing clause text.",
    example:
      "For a new revenue stream, start with the IFRS 15 five-step map, then check interaction with IFRS 9 for variable consideration receivables.",
    trap:
      "Quoting remembered paragraph numbers from memory instead of checking the current consolidated text.",
  },

  // —— Financial management / CFA ——
  {
    id: "enc-npv",
    title: "Net present value (NPV)",
    domain: "Financial management",
    topic: "Investment appraisal",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "NPV discounts expected future cash flows to today at a required rate and subtracts initial investment. A positive NPV means the project meets the hurdle on the stated assumptions.",
    formula: "NPV = Σ (CF_t / (1 + r)^t) − Initial investment",
    example:
      "Run base, downside, and upside NPVs on one capex request with an explicit WACC and terminal assumption in the DAC pack.",
    trap:
      "Mixing accounting profit with cash flows, or changing the discount rate after seeing the answer.",
  },
  {
    id: "enc-irr",
    title: "Internal rate of return (IRR)",
    domain: "Financial management",
    topic: "Investment appraisal",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "IRR is the discount rate that sets NPV to zero. It is a relative yield signal — compare it to the hurdle rate and check for multiple-IRR and scale problems.",
    formula: "Find r such that Σ (CF_t / (1 + r)^t) − Initial investment = 0",
    example:
      "Show IRR next to NPV and payback for mutually exclusive projects so ranking conflicts are visible.",
    trap:
      "Picking the higher IRR project when NPV is lower and capital is not constrained the way IRR assumes.",
  },
  {
    id: "enc-wacc",
    title: "Weighted average cost of capital (WACC)",
    domain: "Financial management",
    topic: "Cost of capital",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "WACC blends after-tax cost of debt and cost of equity by target capital structure. It is the default discount rate for unlevered project cash flows when risk matches the firm.",
    formula: "WACC = (E/V) × r_e + (D/V) × r_d × (1 − tax rate)",
    example:
      "Document component costs, tax rate, and target weights before using WACC in an investment paper.",
    trap:
      "Using yesterday’s book leverage or a peer WACC without checking project risk and funding reality.",
  },
  {
    id: "enc-capm",
    title: "Capital asset pricing model (CAPM)",
    domain: "Financial management",
    topic: "Cost of capital",
    bodies: ["CFA", "FRM", "Merixa"],
    definition:
      "CAPM estimates expected equity return as risk-free rate plus beta times equity risk premium. It is a market-risk model — not a complete story of total risk.",
    formula: "r_e = r_f + β × (r_m − r_f)",
    example:
      "State beta source, risk-free instrument, and ERP assumption in the cost-of-equity appendix.",
    trap:
      "Using an unadjusted historical beta for a project whose operating leverage differs sharply from the listed peer set.",
  },
  {
    id: "enc-beta",
    title: "Beta",
    domain: "Financial management",
    topic: "Market risk",
    bodies: ["CFA", "FRM", "Merixa"],
    definition:
      "Beta measures sensitivity of an asset’s returns to market returns. Higher beta means stronger co-movement with the market risk factor used in CAPM.",
    formula: "β = Cov(r_i, r_m) / Var(r_m)",
    example:
      "Unlever and relever peer betas to the project’s target gearing before setting cost of equity.",
    trap:
      "Treating a noisy short-window beta as precise without checking estimation period and peers.",
  },
  {
    id: "enc-duration",
    title: "Duration",
    domain: "Financial management",
    topic: "Interest rate risk",
    bodies: ["CFA", "FRM", "Merixa"],
    definition:
      "Duration estimates the sensitivity of a bond’s price to a change in yield. Modified duration converts yield moves into approximate percentage price changes.",
    formula: "Approx. % ΔPrice ≈ −Modified duration × ΔYield",
    example:
      "Compare portfolio modified duration to the ALM target band before approving a duration extension.",
    trap:
      "Using duration as an exact price predictor for large yield shocks where convexity matters.",
  },
  {
    id: "enc-var",
    title: "Value at risk (VaR)",
    domain: "Risk management",
    topic: "Market risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "VaR estimates a loss threshold that is not expected to be exceeded at a chosen confidence level over a holding period. It is a tail summary, not the worst possible loss.",
    example:
      "Report 1-day 99% VaR with method (historical/parametric/Monte Carlo), limitations, and a stress loss alongside it.",
    trap:
      "Managing solely to VaR while ignoring expected shortfall and liquidity horizons.",
  },
  {
    id: "enc-ebitda",
    title: "EBITDA",
    domain: "Financial management",
    topic: "Performance measures",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "EBITDA is earnings before interest, tax, depreciation, and amortisation. It is a cash-flow proxy used in covenants and comps — not a substitute for free cash flow.",
    formula: "EBITDA = Operating profit + Depreciation + Amortisation",
    example:
      "Bridge EBITDA to operating cash flow and free cash flow in the pack so ‘cash earnings’ claims stay honest.",
    trap:
      "Treating EBITDA as cash available for dividends while ignoring working capital, tax, and capex.",
  },
  {
    id: "enc-free-cash-flow",
    title: "Free cash flow",
    domain: "Financial management",
    topic: "Cash flow",
    bodies: ["CFA", "CGMA", "Merixa"],
    definition:
      "Free cash flow is cash generated after operating needs and necessary reinvestment, available to capital providers. Definitions must state FCFF vs FCFE clearly.",
    example:
      "Show FCFF bridge from NOPAT and working-capital/capex movements for the investment committee.",
    trap:
      "Labelling EBITDA or operating profit as free cash flow without the investment and WC bridge.",
  },
  {
    id: "enc-working-capital-cycle",
    title: "Working capital",
    domain: "Financial management",
    topic: "Cash and liquidity",
    bodies: ["CGMA", "ACCA", "CFA", "Merixa"],
    definition:
      "Working capital is the operating liquidity tied in receivables, inventory, and payables (and related balances). Managing it changes cash timing without necessarily changing profit.",
    formula: "CCC ≈ DIO + DSO − DPO",
    example:
      "Rank DSO, DIO, and DPO levers by cash impact this quarter and assign owners in Cash Pulse.",
    trap:
      "Stretching payables while ignoring supplier risk, or cutting inventory without service-level evidence.",
  },

  // —— Risk / FRM ——
  {
    id: "enc-market-risk",
    title: "Market risk",
    domain: "Risk management",
    topic: "Market risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Market risk is the risk of loss from movements in market prices — rates, FX, equities, commodities, and related volatilities. Limits, measurement, and hedging must match the exposure map.",
    example:
      "List material market exposures, owners, and limit breaches before the risk committee pack.",
    trap:
      "Hedging accounting volatility while leaving economic exposure unmeasured.",
  },
  {
    id: "enc-credit-risk",
    title: "Credit risk",
    domain: "Risk management",
    topic: "Credit risk",
    bodies: ["FRM", "CFA", "ACCA", "Merixa"],
    definition:
      "Credit risk is the risk that a counterparty fails to meet contractual obligations. Exposure, probability of default, and loss given default shape expected loss.",
    example:
      "Review aged debtors with concentration cuts, disputed invoices, and ECL staging notes before month-end.",
    trap:
      "Focusing only on new sales while overdue concentration silently rises.",
  },
  {
    id: "enc-liquidity-risk",
    title: "Liquidity risk",
    domain: "Risk management",
    topic: "Liquidity risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Liquidity risk is the risk of being unable to meet obligations as they fall due (funding liquidity) or to exit positions without material price impact (market liquidity).",
    example:
      "Maintain a living 13-week cash forecast with committed facilities, covenant headroom, and stressed receipts.",
    trap:
      "Assuming unused facilities are immediately available without noticing conditions precedent or MAC clauses.",
  },
  {
    id: "enc-operational-risk",
    title: "Operational risk",
    domain: "Risk management",
    topic: "Operational risk",
    bodies: ["FRM", "IIA", "CRMA", "Merixa"],
    definition:
      "Operational risk is the risk of loss from inadequate or failed processes, people, systems, or external events. It includes process failure, fraud, cyber, and legal/compliance process failures.",
    example:
      "Map one priority process to failure modes, KRIs, and control owners in the RCM.",
    trap:
      "Calling every unexpected loss ‘ops risk’ without a process owner or control redesign.",
  },
  {
    id: "enc-risk-appetite",
    title: "Risk appetite",
    domain: "Risk management",
    topic: "Risk governance",
    bodies: ["FRM", "IIA", "CRMA", "Merixa"],
    definition:
      "Risk appetite is the type and amount of risk an organisation is willing to take to meet objectives. It must translate into measurable limits and escalation paths.",
    example:
      "Map appetite statements to hard limits (cash runway days, concentration %, VaR) with breach owners.",
    trap:
      "Publishing qualitative appetite language with no metrics that can trigger action.",
  },
  {
    id: "enc-inherent-residual-risk",
    title: "Inherent and residual risk",
    domain: "Risk management",
    topic: "Risk assessment",
    bodies: ["IIA", "CRMA", "FRM", "Merixa"],
    definition:
      "Inherent risk is risk before controls; residual risk is risk after controls. The gap is only credible if control design and operating effectiveness are evidenced.",
    example:
      "Score inherent vs residual on one process with control evidence attached — not self-asserted ‘green’.",
    trap:
      "Marking residual risk ‘low’ because a control exists on paper without recent operating evidence.",
  },
  {
    id: "enc-hedging",
    title: "Hedging",
    domain: "Risk management",
    topic: "Hedging",
    bodies: ["FRM", "CFA", "IFRS", "Merixa"],
    definition:
      "Hedging reduces exposure to a risk factor using an offsetting instrument or natural offset. Economic hedge effectiveness and accounting hedge designation are related but not identical questions.",
    example:
      "Document the risk being hedged, instrument, hedge ratio, and whether hedge accounting is sought before trade approval.",
    trap:
      "Entering a ‘hedge’ that changes basis risk or liquidity risk more than it reduces the named exposure.",
  },

  // —— Audit & assurance ——
  {
    id: "enc-audit-evidence",
    title: "Audit evidence",
    domain: "Audit and assurance",
    topic: "Audit evidence",
    bodies: ["ACCA", "IIA", "FRC", "Merixa"],
    definition:
      "Audit evidence is information used to draw conclusions on which the auditor’s opinion is based. Sufficiency (quantity) and appropriateness (quality) both matter.",
    example:
      "For a revenue assertion, combine contracts, shipping evidence, and subsequent cash receipts rather than relying on a management schedule alone.",
    trap:
      "Accepting client-prepared summaries as sufficient without testing underlying source documents.",
  },
  {
    id: "enc-materiality-audit",
    title: "Audit materiality",
    domain: "Audit and assurance",
    topic: "Materiality",
    bodies: ["ACCA", "FRC", "IIA", "Merixa"],
    definition:
      "Audit materiality is the threshold above which misstatements could reasonably influence users. Performance materiality is set lower to reduce aggregation risk.",
    example:
      "Document overall and performance materiality with benchmark rationale before substantive sample sizes are fixed.",
    trap:
      "Changing materiality mid-file to clear a known difference without revisiting risk assessment.",
  },
  {
    id: "enc-substantive-testing",
    title: "Substantive testing",
    domain: "Audit and assurance",
    topic: "Substantive procedures",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "Substantive procedures test assertions directly through detail testing and analytical procedures. They respond to assessed risks of material misstatement.",
    example:
      "For inventory existence, combine count observation with subsequent movement testing on high-value SKUs.",
    trap:
      "Performing the same low-precision analytical review every year regardless of changing risk.",
  },
  {
    id: "enc-internal-control-audit",
    title: "Internal control (audit view)",
    domain: "Audit and assurance",
    topic: "Internal control",
    bodies: ["IIA", "ACCA", "FRC", "Merixa"],
    definition:
      "From an audit perspective, internal control is the process designed to provide reasonable assurance about reporting reliability, operations, and compliance. Understanding controls shapes the nature, timing, and extent of procedures.",
    example:
      "Walk through purchase-to-pay, identify key controls, and decide which to rely on versus where to go substantive.",
    trap:
      "Relying on a control without testing whether it operated effectively in the period.",
  },
  {
    id: "enc-assurance-engagement",
    title: "Assurance engagement",
    domain: "Audit and assurance",
    topic: "Assurance",
    bodies: ["ACCA", "IIA", "Merixa"],
    definition:
      "An assurance engagement is one in which a practitioner aims to obtain sufficient appropriate evidence to express a conclusion that enhances the degree of confidence of intended users other than the responsible party.",
    example:
      "Clarify limited vs reasonable assurance scope in the engagement letter before fieldwork starts.",
    trap:
      "Marketing a review as if it were an audit opinion.",
  },
  {
    id: "enc-external-vs-internal-audit",
    title: "External vs internal audit",
    domain: "Audit and assurance",
    topic: "Audit roles",
    bodies: ["IIA", "ACCA", "Merixa"],
    definition:
      "External audit provides an opinion on financial statements to users; internal audit provides independent assurance to the board/audit committee on governance, risk, and control. They coordinate but do not replace each other.",
    example:
      "Share internal audit’s RCM testing results with external audit early, then document reliance decisions.",
    trap:
      "Assuming strong internal audit removes the need for external substantive work on high-risk assertions.",
  },

  // —— Controls & governance ——
  {
    id: "enc-control-environment",
    title: "Control environment",
    domain: "Governance and controls",
    topic: "Control environment",
    bodies: ["IIA", "CRMA", "CGMA", "Merixa"],
    definition:
      "The control environment is the set of standards, processes, and structures that provide the foundation for internal control across the organisation — tone, integrity, oversight, and accountability.",
    example:
      "Score tone, accountability, and competence with evidence before listing activity-level controls.",
    trap:
      "Building long control lists while leadership still overrides policies without consequence.",
  },
  {
    id: "enc-preventive-detective",
    title: "Preventive and detective controls",
    domain: "Governance and controls",
    topic: "Control design",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "Preventive controls stop errors or fraud before they occur; detective controls identify them after. A balanced mix is needed — detection without prevention leaves damage done.",
    example:
      "Pair system approval limits (preventive) with exception reporting on override rates (detective).",
    trap:
      "Relying only on after-the-fact reviews for high-volume payment risks.",
  },
  {
    id: "enc-sod",
    title: "Segregation of duties",
    domain: "Governance and controls",
    topic: "Segregation of duties",
    bodies: ["IIA", "CRMA", "ACCA", "Merixa"],
    definition:
      "Segregation of duties separates incompatible functions (custody, recording, authorisation, reconciliation) so one person cannot complete and conceal a high-risk transaction path.",
    example:
      "Complete an SoD matrix for payments: who requests, who approves, who releases, who reconciles.",
    trap:
      "Granting ‘temporary’ combined access that becomes permanent without compensating monitoring.",
  },
  {
    id: "enc-rcm",
    title: "Risk and control matrix",
    domain: "Governance and controls",
    topic: "RCM",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "An RCM links risks to controls, owners, evidence, and testing. It is the operating map of how assurance claims will be evidenced.",
    example:
      "Draft an RCM for purchase-to-pay with risk, control, frequency, owner, and evidence location.",
    trap:
      "Listing controls without naming the risk they mitigate or where evidence lives.",
  },
  {
    id: "enc-three-lines",
    title: "Three lines model",
    domain: "Governance and controls",
    topic: "Governance",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "The three lines model clarifies roles: management owns risk and controls (first), specialist risk/compliance supports (second), and internal audit provides independent assurance (third). Governing bodies oversee the whole.",
    example:
      "Assign RACI across three lines for one regulatory process and remove duplicated ‘assurance’ that is actually management self-check.",
    trap:
      "Calling management monitoring ‘third line’ because it feels independent.",
  },
  {
    id: "enc-itac",
    title: "IT application controls",
    domain: "Governance and controls",
    topic: "IT controls",
    bodies: ["IIA", "ACCA", "Merixa"],
    definition:
      "IT application controls are automated controls inside systems — access, input validation, configured workflows, and interface checks — that enforce processing rules.",
    example:
      "Evidence one approval workflow configuration and the access list that can change it.",
    trap:
      "Assuming ‘the system does it’ without checking who can alter parameters.",
  },
  {
    id: "enc-entity-level-controls",
    title: "Entity-level controls",
    domain: "Governance and controls",
    topic: "Entity-level controls",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "Entity-level controls operate across the organisation — governance, culture, risk assessment, monitoring — and influence the reliability of process-level controls.",
    example:
      "Test board reporting integrity and ethics escalation channels before relying solely on process walkthroughs.",
    trap:
      "Skipping entity-level assessment because process RCMs look complete.",
  },

  // —— Management / performance ——
  {
    id: "enc-kpi-vs-kri",
    title: "KPI vs KRI",
    domain: "Strategy and performance",
    topic: "Performance measures",
    bodies: ["CGMA", "IIA", "CRMA", "Merixa"],
    definition:
      "KPIs track performance against objectives; KRIs give early warning that risk conditions are changing. Mixing them hides whether you are steering or sensing danger.",
    example:
      "Pair margin KPI with a concentration KRI and define breach escalations for both.",
    trap:
      "Calling lagging financial outcomes ‘KRIs’ when they only report damage already done.",
  },
  {
    id: "enc-contribution-margin",
    title: "Contribution margin",
    domain: "Management reporting",
    topic: "Cost behaviour",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "Contribution margin is revenue minus variable costs. It funds fixed costs and profit — and is the spine of break-even and unit economics.",
    formula: "Contribution = Revenue − Variable costs; CM% = Contribution / Revenue",
    example:
      "Compute contribution by product line before allocating shared overhead in the management pack.",
    trap:
      "Treating allocated overhead as variable when making short-term pricing decisions.",
  },
  {
    id: "enc-break-even",
    title: "Break-even",
    domain: "Management reporting",
    topic: "Cost behaviour",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "Break-even is the activity level where contribution covers fixed costs. It is sensitive to cost classification and price assumptions.",
    formula: "Break-even units = Fixed costs / Contribution per unit",
    example:
      "Show break-even units and cash break-even separately when working capital lags sales.",
    trap:
      "Using accounting break-even as cash break-even when receipts trail invoices.",
  },

  // —— IFRS / FRS depth ——
  {
    id: "enc-ppe",
    title: "Property, plant and equipment",
    domain: "Financial reporting",
    topic: "Property, plant and equipment",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "PPE are tangible assets held for use in production, supply, rental, or administration, expected to be used for more than one period. Cost includes directly attributable costs to bring the asset to location and condition for use.",
    example:
      "Split purchase price and installation from training and start-up losses before capitalising a production line.",
    trap:
      "Capitalising every project cost because the project number exists, without testing whether each cost creates the asset.",
  },
  {
    id: "enc-intangibles",
    title: "Intangible assets",
    domain: "Financial reporting",
    topic: "Intangible assets",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Intangible assets are identifiable non-monetary assets without physical substance. Recognition needs identifiability, control, and probable future economic benefits with reliable cost.",
    example:
      "Capitalise development costs only after technical feasibility, intention, ability, and reliable measurement are evidenced.",
    trap:
      "Capitalising research-phase spend or internally generated brands that fail recognition tests.",
  },
  {
    id: "enc-leases",
    title: "Leases (lessee view)",
    domain: "Financial reporting",
    topic: "Leases",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Under current IFRS lessee accounting, most leases bring a right-of-use asset and lease liability reflecting payment obligations. Classification and exemptions still need a documented assessment.",
    example:
      "Build a lease inventory with term, payments, discount rate, and extension options before measuring the liability.",
    trap:
      "Ignoring extension options that management is reasonably certain to exercise.",
  },
  {
    id: "enc-financial-instruments",
    title: "Financial instruments",
    domain: "Financial reporting",
    topic: "Financial instruments",
    bodies: ["IFRS", "CFA", "ACCA", "Merixa"],
    definition:
      "A financial instrument is a contract that gives rise to a financial asset of one entity and a financial liability or equity instrument of another. Classification drives subsequent measurement.",
    example:
      "Classify a receivable portfolio by business model and cash-flow characteristics before setting measurement basis.",
    trap:
      "Defaulting everything to amortised cost without testing the contractual cash-flow and business-model facts.",
  },
  {
    id: "enc-ecl",
    title: "Expected credit losses",
    domain: "Financial reporting",
    topic: "Impairment",
    bodies: ["IFRS", "FRM", "ACCA", "Merixa"],
    definition:
      "Expected credit loss models estimate credit losses using probability-weighted outcomes, time value of money, and reasonable forward-looking information — not only incurred losses.",
    example:
      "Document staging criteria, forward-looking overlays, and collateral assumptions for the trade receivable book.",
    trap:
      "Using a static historical loss rate while customer mix and macro conditions have changed.",
  },
  {
    id: "enc-deferred-tax",
    title: "Deferred tax",
    domain: "Financial reporting",
    topic: "Income taxes",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Deferred tax arises from temporary differences between carrying amounts and tax bases. Recognition of deferred tax assets requires convincing evidence of future taxable profit where applicable.",
    example:
      "Reconcile book vs tax bases for PPE and provisions, then test recoverability of any deferred tax asset.",
    trap:
      "Recognising deferred tax assets on losses without a supportable profit forecast and expiry analysis.",
  },
  {
    id: "enc-business-combinations",
    title: "Business combinations",
    domain: "Financial reporting",
    topic: "Business combinations",
    bodies: ["IFRS", "ACCA", "Merixa"],
    definition:
      "A business combination is a transaction in which an acquirer obtains control of a business. Acquisition accounting measures identifiable assets and liabilities, with residual goodwill.",
    example:
      "Separate identifiable intangibles from goodwill and document the control assessment at acquisition date.",
    trap:
      "Calling every acquisition ‘goodwill’ without allocating to identifiable assets.",
  },
  {
    id: "enc-consolidation",
    title: "Consolidation",
    domain: "Financial reporting",
    topic: "Consolidation",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Consolidation presents a parent and subsidiaries as a single economic entity. Control, ownership interests, and elimination of intragroup balances drive the group statements.",
    example:
      "Maintain an entity register, ownership %, and close calendar before eliminations and NCI calculations.",
    trap:
      "Eliminating P&L only while leaving intragroup balances unmatched on the balance sheet.",
  },
  {
    id: "enc-functional-currency",
    title: "Functional currency",
    domain: "Financial reporting",
    topic: "Foreign currency",
    bodies: ["IFRS", "ACCA", "Merixa"],
    definition:
      "Functional currency is the currency of the primary economic environment in which an entity operates. It drives which FX differences hit P&L versus equity on translation.",
    example:
      "Document sales, labour, and financing currency evidence before locking functional currency for a new subsidiary.",
    trap:
      "Choosing presentation currency preferences as if they were functional currency facts.",
  },
  {
    id: "enc-events-after-reporting",
    title: "Events after the reporting period",
    domain: "Financial reporting",
    topic: "Events after reporting",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Events after the reporting period are adjusting or non-adjusting depending on whether they provide evidence of conditions that existed at the reporting date.",
    example:
      "For a post-balance-sheet customer insolvency, test whether the condition existed at year-end before adjusting receivables.",
    trap:
      "Adjusting for all bad news after year-end regardless of when the condition arose.",
  },
  {
    id: "enc-related-parties",
    title: "Related party disclosures",
    domain: "Financial reporting",
    topic: "Related parties",
    bodies: ["IFRS", "FRC", "ACCA", "Merixa"],
    definition:
      "Related party disclosures reveal relationships and transactions that users need to understand the entity’s position and performance, including outstanding balances and terms.",
    example:
      "Compile a related-party register from ownership, key management, and significant influence maps before drafting the note.",
    trap:
      "Omitting management compensation or close-family transactions because they feel ‘ordinary’.",
  },
  {
    id: "enc-frs-101",
    title: "FRS 101 reduced disclosure",
    domain: "Financial reporting",
    topic: "UK GAAP framework",
    bodies: ["FRC", "ACCA", "Merixa"],
    definition:
      "FRS 101 allows qualifying entities to apply IFRS recognition and measurement with reduced disclosures in individual accounts, subject to framework conditions.",
    example:
      "Confirm qualifying-entity status and shareholder notification before claiming disclosure exemptions.",
    trap:
      "Copying IFRS consolidated disclosure sets into FRS 101 individual accounts without checking exemptions.",
  },
  {
    id: "enc-frs-105",
    title: "FRS 105 micro-entities",
    domain: "Financial reporting",
    topic: "UK GAAP framework",
    bodies: ["FRC", "ACCA", "Merixa"],
    definition:
      "FRS 105 is the micro-entities regime with simplified recognition, measurement, and presentation for entities meeting size criteria.",
    example:
      "Re-test micro thresholds each year before assuming FRS 105 still applies.",
    trap:
      "Staying on FRS 105 after growth takes the entity outside the micro limits.",
  },

  // —— Audit depth ——
  {
    id: "enc-risk-of-material-misstatement",
    title: "Risk of material misstatement",
    domain: "Audit and assurance",
    topic: "Risk assessment",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "Risk of material misstatement is the risk that the financial statements are materially misstated before the audit. It combines inherent and control risk at assertion level.",
    example:
      "Link significant risks to assertions and planned responses in the audit strategy memo.",
    trap:
      "Leaving risk assessment generic (‘revenue is risky’) without assertion-level responses.",
  },
  {
    id: "enc-analytical-procedures",
    title: "Analytical procedures",
    domain: "Audit and assurance",
    topic: "Analytical procedures",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "Analytical procedures evaluate financial information through analysis of plausible relationships among data. They can be risk-assessment, substantive, or overall-review tools.",
    example:
      "Set an expectation for gross margin by product, investigate variances beyond threshold with evidence.",
    trap:
      "Calling a high-level year-on-year scan ‘substantive’ without precision or investigation.",
  },
  {
    id: "enc-sampling",
    title: "Audit sampling",
    domain: "Audit and assurance",
    topic: "Sampling",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "Audit sampling applies procedures to less than 100% of items so that all sampling units have a chance of selection, enabling projection to the population.",
    example:
      "Document population, sampling method, and projection of differences before concluding on the assertion.",
    trap:
      "Hand-picking ‘interesting’ items and calling it a representative sample.",
  },
  {
    id: "enc-management-override",
    title: "Management override",
    domain: "Audit and assurance",
    topic: "Fraud risk",
    bodies: ["ACCA", "FRC", "IIA", "Merixa"],
    definition:
      "Management override is the ability of management to manipulate accounting records or bypass controls. It is a significant fraud risk that requires specific responses.",
    example:
      "Test journal entries, estimates bias, and unusual transactions near period end as override responses.",
    trap:
      "Relying on control testing alone for areas where override risk is elevated.",
  },
  {
    id: "enc-going-concern-audit",
    title: "Going concern (audit procedures)",
    domain: "Audit and assurance",
    topic: "Going concern",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "Auditors evaluate management’s going-concern assessment, covering the period required by the framework, and consider whether material uncertainty disclosures are adequate.",
    example:
      "Challenge cash-flow assumptions, facility availability, and mitigating actions with bank confirmations and board minutes.",
    trap:
      "Accepting a going-concern conclusion based only on an unaudited budget without stress testing.",
  },
  {
    id: "enc-unmodified-opinion",
    title: "Unmodified audit opinion",
    domain: "Audit and assurance",
    topic: "Audit opinion",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "An unmodified opinion states that the financial statements are presented fairly (or give a true and fair view) in accordance with the applicable framework.",
    example:
      "Clear all material unresolved differences and disclosure gaps before recommending an unmodified opinion.",
    trap:
      "Issuing unmodified wording while known material misstatements remain uncorrected.",
  },
  {
    id: "enc-emphasis-of-matter",
    title: "Emphasis of matter",
    domain: "Audit and assurance",
    topic: "Audit opinion",
    bodies: ["ACCA", "FRC", "Merixa"],
    definition:
      "An emphasis of matter draws attention to a matter appropriately presented or disclosed that is fundamental to users’ understanding, without modifying the opinion.",
    example:
      "Consider emphasis wording for a major subsequent event that is correctly disclosed but critical to users.",
    trap:
      "Using emphasis of matter to avoid a modification when the matter is misstated or inadequately disclosed.",
  },

  // —— Risk / FRM depth ——
  {
    id: "enc-expected-shortfall",
    title: "Expected shortfall",
    domain: "Risk management",
    topic: "Market risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Expected shortfall (CVaR) is the expected loss given that loss exceeds the VaR threshold. It captures tail severity that VaR alone hides.",
    example:
      "Report VaR and expected shortfall together for the trading book risk pack.",
    trap:
      "Managing only to VaR while average losses beyond VaR keep rising.",
  },
  {
    id: "enc-stress-testing",
    title: "Stress testing",
    domain: "Risk management",
    topic: "Stress testing",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Stress testing evaluates portfolio or entity outcomes under severe but plausible scenarios. It complements statistical risk measures with narrative shocks.",
    example:
      "Run liquidity and earnings stress under simultaneous receipt delay and margin compression scenarios.",
    trap:
      "Stressing only mild historical moves that never threaten limits.",
  },
  {
    id: "enc-counterparty-risk",
    title: "Counterparty credit risk",
    domain: "Risk management",
    topic: "Credit risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Counterparty credit risk is the risk that a derivative or other bilateral counterparty defaults before final settlement of the contract’s cash flows.",
    example:
      "Monitor exposure at default, netting, and collateral for active OTC counterparties.",
    trap:
      "Treating mark-to-market as the only exposure while ignoring potential future exposure.",
  },
  {
    id: "enc-basis-risk",
    title: "Basis risk",
    domain: "Risk management",
    topic: "Hedging",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Basis risk is residual risk when a hedge instrument does not move perfectly with the exposure being hedged.",
    example:
      "Measure correlation and residual P&L between the exposure and the hedge before calling a hedge ‘effective’.",
    trap:
      "Assuming a hedge eliminates risk because a hedge accounting designation exists.",
  },
  {
    id: "enc-liquidity-coverage",
    title: "Liquidity coverage mindset",
    domain: "Risk management",
    topic: "Liquidity risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Liquidity coverage thinking asks whether high-quality liquid resources can meet net outflows over a short stress horizon. Corporates adapt the idea with cash, facilities, and stressed receipts.",
    example:
      "Compare available liquidity to stressed 4- and 13-week net outflows with facility draw conditions tested.",
    trap:
      "Counting undrawn facilities that cannot be drawn under the stress being modelled.",
  },
  {
    id: "enc-model-risk",
    title: "Model risk",
    domain: "Risk management",
    topic: "Model risk",
    bodies: ["FRM", "CFA", "Merixa"],
    definition:
      "Model risk is the risk of loss from decisions based on incorrect or misused models — including bad assumptions, coding errors, and overlay misuse.",
    example:
      "Inventory critical finance models with owner, validation date, and known limitations before board use.",
    trap:
      "Treating a spreadsheet output as fact because it is precise to two decimals.",
  },

  // —— CFA / finance depth ——
  {
    id: "enc-enterprise-value",
    title: "Enterprise value",
    domain: "Financial management",
    topic: "Valuation",
    bodies: ["CFA", "CGMA", "Merixa"],
    definition:
      "Enterprise value is the value of core operations attributable to all capital providers, typically equity value plus net debt (and other adjustments).",
    formula: "EV ≈ Equity value + Net debt (+ minorities / other claims as applicable)",
    example:
      "Reconcile equity value from a DCF to EV and implied share price with net debt bridges.",
    trap:
      "Comparing EV/EBITDA across peers without aligning lease, pension, and one-off adjustments.",
  },
  {
    id: "enc-dcf",
    title: "Discounted cash flow valuation",
    domain: "Financial management",
    topic: "Valuation",
    bodies: ["CFA", "CGMA", "Merixa"],
    definition:
      "DCF values an asset by discounting expected free cash flows at a risk-appropriate rate. Terminal value and WACC assumptions usually dominate the result.",
    example:
      "Show explicit forecast, terminal method, and sensitivity of value to WACC and growth.",
    trap:
      "Anchoring to a target price by reversing into an unjustified growth rate.",
  },
  {
    id: "enc-payback",
    title: "Payback period",
    domain: "Financial management",
    topic: "Investment appraisal",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "Payback is the time to recover initial investment from cash inflows. It is a liquidity screen, not a value-maximising rule by itself.",
    formula: "Payback ≈ years until cumulative cash inflows = initial investment",
    example:
      "Show payback beside NPV/IRR so short-payback low-NPV projects are not preferred by default.",
    trap:
      "Choosing projects solely on fastest payback while destroying NPV.",
  },
  {
    id: "enc-roe",
    title: "Return on equity",
    domain: "Financial management",
    topic: "Performance measures",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "ROE is net income divided by equity. It rises with margin, asset turnover, or leverage — DuPont decomposition shows which driver moved.",
    formula: "ROE = Net income / Equity ≈ Margin × Asset turnover × Equity multiplier",
    example:
      "Bridge ROE changes into margin, turnover, and gearing effects in the monthly pack.",
    trap:
      "Celebrating higher ROE that came only from thinner equity after buybacks or losses.",
  },
  {
    id: "enc-roa",
    title: "Return on assets",
    domain: "Financial management",
    topic: "Performance measures",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "ROA measures profit generated per unit of assets. It is useful for comparing operating performance with less distortion from capital structure than ROE.",
    formula: "ROA = Net income / Average total assets",
    example:
      "Track ROA alongside asset turnover when capacity utilisation is a live board question.",
    trap:
      "Comparing ROA across businesses with very different asset intensity without context.",
  },
  {
    id: "enc-gearing",
    title: "Gearing / financial leverage",
    domain: "Financial management",
    topic: "Capital structure",
    bodies: ["CFA", "CGMA", "ACCA", "Merixa"],
    definition:
      "Gearing measures the mix of debt and equity financing. Higher gearing amplifies ROE in good times and distress risk in bad times.",
    example:
      "Report net debt/EBITDA and interest cover with covenant headroom in the same table.",
    trap:
      "Ignoring off-balance funding commitments when declaring gearing ‘comfortable’.",
  },
  {
    id: "enc-dividend-policy",
    title: "Dividend policy",
    domain: "Financial management",
    topic: "Capital structure",
    bodies: ["CFA", "CGMA", "Merixa"],
    definition:
      "Dividend policy sets how free cash is returned to owners versus retained. Sustainable dividends require cash, not only accounting profit.",
    example:
      "Link proposed dividend to free cash flow, covenant tests, and investment pipeline before recommending payout.",
    trap:
      "Paying dividends from borrowed cash while the operating cash bridge is negative.",
  },

  // —— Controls / governance depth ——
  {
    id: "enc-monitoring-controls",
    title: "Monitoring activities",
    domain: "Governance and controls",
    topic: "Monitoring",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "Monitoring activities assess whether controls continue to operate. They include ongoing evaluations and separate evaluations such as internal audit reviews.",
    example:
      "Define who reviews exception logs weekly and how findings escalate to the control owner.",
    trap:
      "Assuming annual walkthroughs are enough monitoring for high-volume automated controls.",
  },
  {
    id: "enc-compensating-control",
    title: "Compensating control",
    domain: "Governance and controls",
    topic: "Control design",
    bodies: ["IIA", "CRMA", "Merixa"],
    definition:
      "A compensating control reduces risk when a preferred control is missing or ineffective. It must be targeted at the same risk and evidenced.",
    example:
      "Where SoD is broken in a small team, add independent monthly review of the user-access and payment exception report.",
    trap:
      "Calling informal ‘manager awareness’ a compensating control without evidence.",
  },
  {
    id: "enc-change-management-control",
    title: "Change management control",
    domain: "Governance and controls",
    topic: "IT controls",
    bodies: ["IIA", "ACCA", "Merixa"],
    definition:
      "Change management controls govern how system and process changes are requested, approved, tested, and migrated so unauthorised or untested changes do not enter production.",
    example:
      "Sample production changes for ticket, approval, test evidence, and segregations between developer and deployer.",
    trap:
      "Allowing emergency changes without retrospective approval and documentation.",
  },
  {
    id: "enc-audit-committee",
    title: "Audit committee oversight",
    domain: "Governance and controls",
    topic: "Governance",
    bodies: ["IIA", "FRC", "ACCA", "Merixa"],
    definition:
      "The audit committee oversees financial reporting integrity, internal control, internal audit, and the relationship with the external auditor on behalf of the board.",
    example:
      "Table a clear external-audit independence and significant-judgement paper before year-end committee.",
    trap:
      "Letting management filter internal audit findings before the committee sees them.",
  },
  {
    id: "enc-whistleblowing",
    title: "Speak-up / whistleblowing channel",
    domain: "Governance and controls",
    topic: "Ethics",
    bodies: ["IIA", "FRC", "Merixa"],
    definition:
      "A speak-up channel lets people raise concerns about misconduct or control failure safely. Effectiveness depends on independence, protection, and follow-through — not a poster alone.",
    example:
      "Report case volumes, themes, and closure times to the audit committee without compromising reporters.",
    trap:
      "Measuring success only by ‘few reports’, which may signal fear rather than integrity.",
  },

  // —— Sustainability / ESG ——
  {
    id: "enc-materiality-esg",
    title: "ESG / sustainability materiality",
    domain: "Sustainability",
    topic: "Sustainability materiality",
    bodies: ["IFRS", "CFA", "Merixa"],
    definition:
      "Sustainability materiality identifies topics that matter to enterprise value and/or impacts on people and environment, depending on the reporting framework in use.",
    example:
      "Document the materiality process, stakeholder inputs, and board sign-off before drafting sustainability metrics.",
    trap:
      "Publishing flattering metrics while omitting topics that failed a documented materiality screen.",
  },
  {
    id: "enc-climate-risk",
    title: "Climate-related risk",
    domain: "Sustainability",
    topic: "Climate risk",
    bodies: ["FRM", "CFA", "IFRS", "Merixa"],
    definition:
      "Climate-related risks include physical risks from climate events and transition risks from policy, technology, and market shifts as economies decarbonise.",
    example:
      "Map physical and transition risks to financial statement line items and strategic scenarios.",
    trap:
      "Treating climate as a CSR narrative disconnected from cash flow and asset lives.",
  },
  {
    id: "enc-scope-emissions",
    title: "Scope 1–3 emissions mindset",
    domain: "Sustainability",
    topic: "Emissions reporting",
    bodies: ["IFRS", "ACCA", "CFA", "Merixa"],
    definition:
      "Scope 1 is direct emissions; Scope 2 is purchased energy; Scope 3 is value-chain emissions. Boundaries and data quality must be explicit before metrics go external.",
    example:
      "Document organisational boundary, Scope 3 categories in scope, and estimation methods in the sustainability datapack.",
    trap:
      "Publishing a single headline tCO₂e without boundary notes or restatement policy.",
  },
  {
    id: "enc-sustainability-disclosure",
    title: "Sustainability disclosure pack",
    domain: "Sustainability",
    topic: "Disclosure",
    bodies: ["IFRS", "ACCA", "FRC", "Merixa"],
    definition:
      "Sustainability disclosures connect metrics, governance, strategy, and targets. Finance owns consistency with the financial statements and controls over data.",
    example:
      "Reconcile climate capex in the sustainability note to the cash flow statement and asset register.",
    trap:
      "Letting sustainability metrics bypass the same close controls as financial KPIs.",
  },

  // —— Project delivery ——
  {
    id: "enc-project-business-case",
    title: "Project business case",
    domain: "Project delivery",
    topic: "Business case",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "A project business case states benefits, costs, risks, and alternatives with owners and success measures. It is the baseline for stage-gate decisions.",
    example:
      "NPV/IRR, strategic fit, and non-financial benefits with sensitivity on key assumptions before capex approval.",
    trap:
      "Approving spend on narrative benefits without quantified downside or kill criteria.",
  },
  {
    id: "enc-stage-gate",
    title: "Stage-gate governance",
    domain: "Project delivery",
    topic: "Governance",
    bodies: ["CGMA", "IIA", "ACCA", "Merixa"],
    definition:
      "Stage-gate governance requires defined deliverables and decision rights at each phase. Finance signs off economic assumptions; delivery signs off execution.",
    example:
      "Gate 2: confirm scope, budget, and benefits owner before major procurement commitments.",
    trap:
      "Skipping gates under time pressure while still holding the original budget baseline.",
  },
  {
    id: "enc-benefits-realisation",
    title: "Benefits realisation",
    domain: "Project delivery",
    topic: "Benefits management",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "Benefits realisation tracks whether promised outcomes materialise after go-live. It needs baselines, measurement windows, and accountable owners.",
    example:
      "Six-month post-go-live: compare actual cost savings to business case with variance narrative.",
    trap:
      "Closing the project when go-live happens, not when benefits are evidenced.",
  },
  {
    id: "enc-project-variance",
    title: "Project variance control",
    domain: "Project delivery",
    topic: "Cost control",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "Project variance control compares actual spend and schedule to baseline with clear escalation on material overruns and scope creep.",
    example:
      "Monthly EVM-style view: CPI/SPI with forecast at completion and change-order log.",
    trap:
      "Re-baselining budget every month so variance always looks green.",
  },

  // —— Management reporting depth ——
  {
    id: "enc-variance-analysis",
    title: "Variance analysis",
    domain: "Management reporting",
    topic: "Variance analysis",
    bodies: ["CGMA", "ACCA", "Merixa"],
    definition:
      "Variance analysis explains differences between actual, budget, and forecast. Split volume, price, mix, and timing before management action.",
    example:
      "Revenue variance bridge: volume −£1.2m, price +£0.4m, mix −£0.3m with owner commentary.",
    trap:
      "Reporting only total variance without drivers the business can act on.",
  },
  {
    id: "enc-rolling-forecast",
    title: "Rolling forecast discipline",
    domain: "Management reporting",
    topic: "Forecasting",
    bodies: ["CGMA", "ACCA", "CFA", "Merixa"],
    definition:
      "Rolling forecasts update the forward view each period with consistent drivers. They beat annual budget-only steering in volatile environments.",
    example:
      "12-quarter rolling P&L with driver sheet (headcount, price, volume) refreshed monthly.",
    trap:
      "Rolling forecast that is last year’s budget shifted forward without revisiting drivers.",
  },
];
