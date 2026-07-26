/**
 * Practitioner taxation encyclopedia — ACCA-led, workplace close and reporting focus.
 * Merixa-authored; no invented statute or rate text.
 */

function tax(id, title, topic, definition, example, trap, formula) {
  return {
    id: `tax-${id}`,
    title,
    topic,
    definition,
    example,
    trap,
    formula,
  };
}

export const TAX_ENCYCLOPEDIA = [
  tax(
    "current-expense",
    "Current tax expense",
    "Tax",
    "Current tax expense is the income tax payable or recoverable on taxable profit for the period. It belongs in the close pack with a rate reconciliation, not as a surprise after sign-off.",
    "Taxable profit £18m × 25% = £4.5m current tax; tie to payment on account and under/over provision from prior year.",
    "Booking tax from the management P&L without a taxable-profit bridge from accounting profit.",
    "Current tax ≈ Taxable profit × enacted rate (± prior-year adjustments)",
  ),
  tax(
    "deferred-tax-overview",
    "Deferred tax — overview",
    "Tax",
    "Deferred tax arises when carrying amounts differ from tax bases. Recognise deferred tax assets only when recovery is probable and supported by forecasts.",
    "PPE carrying amount £40m vs tax written-down value £32m → taxable temporary difference → DTL unless reversal pattern says otherwise.",
    "Recognising DTAs on losses without credible taxable-profit forecasts and expiry analysis.",
  ),
  tax(
    "rate-reconciliation",
    "Effective tax rate reconciliation",
    "Tax",
    "The ETR reconciliation explains why the effective rate differs from the headline rate — permanent differences, prior-year items, rate changes, and discrete events.",
    "Bridge: 25% statutory → 22.1% effective with R&D credit, non-deductible fines, and overseas mix.",
    "Publishing a single ‘blended rate’ with no line-by-line reconciliation in the close file.",
  ),
  tax(
    "uncertain-positions",
    "Uncertain tax positions",
    "Tax",
    "Uncertain tax positions need a recognised amount only when it is probable an authority will accept the treatment; otherwise disclose the exposure with range and trigger.",
    "Document technical memo, counsel view, and probability-weighted provision for a transfer-pricing enquiry.",
    "Waiting for a formal enquiry letter before recording any provision when the exposure was known at period end.",
  ),
  tax(
    "withholding",
    "Withholding tax on cross-border flows",
    "Tax",
    "Withholding tax applies to dividends, interest, and royalties paid cross-border. Treaty relief and gross-up clauses change who bears the cost and what hits cash.",
    "Model dividend upstream: 15% WHT unless treaty reduces to 5%; show impact on remittance and group cash plan.",
    "Forecasting full dividend remittance without treaty documentation or paying-agent mechanics.",
  ),
  tax(
    "transfer-pricing-practice",
    "Transfer pricing — practitioner lens",
    "Tax",
    "Transfer pricing sets prices for intra-group transactions as if parties were independent. Documentation and consistency with local filings matter as much as the rate.",
    "Benchmark services margin for shared-cost recharge; keep master file / local file pointers with the close binder.",
    "Recharging costs at arbitrary mark-ups with no comparable analysis or intercompany agreement trail.",
  ),
  tax(
    "rd-credit",
    "R&D tax relief — evidence",
    "Tax",
    "R&D relief claims require eligible projects, qualifying spend, and contemporaneous evidence. Finance owns the bridge; technical owners sign the narrative.",
    "Map payroll and subcontract spend to eligible projects with time records before filing the enhanced relief computation.",
    "Back-filling project narratives after the claim is filed without underlying time or lab notes.",
  ),
  tax(
    "close-provision",
    "Tax provisioning in the close",
    "Tax",
    "Tax provisioning in month-end or year-end close means current tax, deferred tax, and uncertain positions are owned, reviewed, and tied to the trial balance before release.",
    "Checklist: PBT bridge, permanent/temporary differences, DTA/DTL roll-forward, payments on account, and ETR deck approval.",
    "Letting tax be ‘post-close’ while covenant and dividend papers already use net profit.",
  ),
  tax(
    "deferred-tax-asset-recovery",
    "Deferred tax asset recoverability",
    "Tax",
    "DTAs on losses or timing differences are recognised only to the extent recovery is probable against future taxable profits within the utilisation window.",
    "Five-year forecast with sensitivities; cap DTA at lower of unused losses and forecast taxable profits.",
    "Booking full DTA on losses when the business has a history of negative taxable profits.",
  ),
  tax(
    "indirect-tax-finance",
    "Indirect tax — finance team basics",
    "Tax",
    "VAT/GST/sales tax affects cash timing and invoice accuracy. Finance must reconcile output vs input tax, bad debt relief, and cross-border triangulation with ops.",
    "Reconcile GL VAT control account to return; investigate unmatched invoices before filing.",
    "Treating VAT as ‘ops only’ while revenue recognition and bad debt drive return errors.",
  ),
  tax(
    "deferred-tax-income-statement",
    "Deferred tax in the income statement",
    "Tax",
    "Deferred tax in P&L reflects movements in temporary differences except where tax arises on items charged to equity or OCI. Rate changes remeasure opening balances.",
    "Show DTL movement on accelerated capital allowances separately from revaluation differences in the tax note bridge.",
    "Netting all deferred tax through equity movements without tracing OCI items.",
  ),
  tax(
    "group-tax-consolidation",
    "Group tax consolidation mindset",
    "Tax",
    "Groups file on a consolidated or jurisdictional basis depending on regime. Eliminations, loss utilisation, and payment arrangements must match the legal structure.",
    "Map which entities file together, who pays tax, and how losses are shared before approving intercompany dividends.",
    "Assuming losses in one entity automatically shelter profits in another without a formal group relief election.",
  ),
];

export const TAX_PATH = {
  slug: "tax-reporting-close",
  title: "Tax in the reporting close",
  summary:
    "From current tax and deferred tax through ETR reconciliation and uncertain positions — ACCA practitioner close discipline.",
  bodies: ["ACCA", "IFRS", "FRC", "Merixa"],
  steps: TAX_ENCYCLOPEDIA.slice(0, 6).map((entry) => ({
    id: entry.id,
    title: entry.title,
  })),
};
