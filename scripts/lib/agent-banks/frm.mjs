/** Agent-authored frm encyclopedia drafts — workplace only. */
export const FRM_DRAFTS = [
  [
    "Historical simulation VaR lookback window",
    "Market risk",
    "Historical simulation VaR lookback window sets how many past trading days form the P&L vector used to pick a percentile loss. A shorter window reacts faster to regime shifts; a longer window is smoother but can understate fresh volatility. The chosen window, confidence level, and change-control must sit in the market-risk model inventory and limit schedule.",
    "Risk compares 250-day vs 500-day 99% HS VaR on the same book: £4.2m vs £3.1m. ALCO confirms 250-day feeds desk limits after a documented methodology memo.",
    "Quietly shortening the lookback after a breach to make VaR look smaller without model-change approval.",
    "VaR_α = percentile_α({−ΔP_t}) over lookback N"
  ],
  [
    "Parametric VaR normality assumption stress",
    "Market risk",
    "Parametric VaR normality assumption stress checks whether Gaussian σ-based VaR still fits the portfolio’s return shape under fat tails and skew. When returns are heavy-tailed, normal VaR understates true tail loss and must be challenged with HS, Student-t, or ES overlays.",
    "Equity book daily returns show kurtosis 8; 99% parametric VaR is £2.1m while HS VaR is £3.4m. Risk requires HS for limit utilisation until the model is recalibrated.",
    "Defending parametric VaR with calm-period σ while the book holds options with asymmetric payoffs."
  ],
  [
    "Expected shortfall capital allocation by desk",
    "Market risk",
    "Expected shortfall capital allocation by desk assigns group ES to trading units using a coherent risk measure so diversified capital is shared fairly. Subadditivity means the sum of desk standalones exceeds group ES; allocation methods must be documented and stable through stress.",
    "Group 97.5% ES is £48m; two desks show standalones £30m and £28m. Risk allocates £25m and £23m using Euler contributions and publishes the split in the weekly capital pack.",
    "Charging each desk its standalone ES and ignoring diversification, then wondering why desks refuse hedges.",
    "ES_α = E[L | L ≥ VaR_α]"
  ],
  [
    "VaR exception clustering review",
    "Market risk",
    "VaR exception clustering review examines whether breaches bunch in time rather than arriving independently. Clustering signals stale volatility, missing risk factors, or crisis correlation and usually fails independence backtests even when the raw exception count looks acceptable.",
    "Six 99% VaR exceptions occur in 12 sessions during a rates shock while the annual count is still inside Kupiec bounds. The validation pack flags Christoffersen failure and triggers a model remediation plan.",
    "Reporting only the annual exception count and ignoring a March cluster that coincided with a curve inversion."
  ],
  [
    "Stressed VaR period selection governance",
    "Market risk",
    "Stressed VaR period selection governance documents which historical stress window feeds regulatory or internal stressed VaR and who can change it. The period should reflect significant stress relevant to the firm’s risk factors, not the calmest recent year.",
    "Market risk proposes updating the stressed VaR window from 2008–09 to a 2020 COVID window after factor mapping shows better coverage of the current book; the model risk committee minutes the decision.",
    "Cherry-picking a stress window that minimises capital without mapping the firm’s material risk factors."
  ],
  [
    "Risk factor mapping completeness for VaR",
    "Market risk",
    "Risk factor mapping completeness for VaR ensures every material price risk in the book is represented in the VaR engine’s factor set. Gaps create phantom hedges and understated VaR when unmapped basis or idiosyncratic risk moves.",
    "A new exotic commodity curve is booked but not mapped; IPV shows £0.9m unexplained P&L. Risk blocks further growth until the factor is added and the proxy mapping is validated.",
    "Proxying an illiquid name to a liquid index without documenting residual basis risk in the mapping inventory."
  ],
  [
    "Incremental VaR for new issue approval",
    "Market risk",
    "Incremental VaR for new issue approval measures how much portfolio VaR rises when a proposed trade is added. It supports limit headroom checks before execution and complements standalone VaR, which ignores diversification.",
    "Syndicate desk proposes a £200m corporate bond; incremental 99% VaR is £1.1m against £1.5m unused limit. The desk head approves with a same-day hedge plan.",
    "Approving on standalone VaR alone when the position is highly correlated with an existing overweight sector.",
    "IncVaR = VaR_with − VaR_without"
  ],
  [
    "Component VaR concentration dashboard",
    "Market risk",
    "Component VaR concentration dashboard attributes portfolio VaR to names, sectors, or factors so concentration is visible before limits breach. It guides hedge prioritisation and board risk narratives.",
    "Top five names contribute 38% of desk VaR; the dashboard triggers a pre-emptive hedge when any name exceeds 12%. CRO cites the chart in the monthly pack.",
    "Showing only total VaR while a single issuer drives most of the risk."
  ],
  [
    "Interest rate DV01 ladder by tenor bucket",
    "Market risk",
    "Interest rate DV01 ladder by tenor bucket reports sensitivity of P&L to one-basis-point moves along the curve, not just parallel shift. Bucket ladders reveal steepener/flattener risk that parallel DV01 hides.",
    "Banking book shows +£120k/bp at 2y and −£95k/bp at 10y. ALCO funds a partial flattener hedge after the ladder exceeds policy gaps.",
    "Managing only parallel DV01 while the 2s10s gap widens through the quarter.",
    "DV01_bucket ≈ −ΔP / 1bp"
  ],
  [
    "CS01 credit spread sensitivity limits",
    "Market risk",
    "CS01 credit spread sensitivity limits cap P&L impact from a one-basis-point widening in credit spreads for trading or banking books. Limits should reflect liquidity of the names and correlation with rates hedges.",
    "Trading book CS01 is £85k/bp against a £70k limit after a new HY package. Desk reduces by selling CDS protection overlays the same day.",
    "Netting CS01 across uncorrelated names without a concentration overlay."
  ],
  [
    "FX delta and vega joint limit utilisation",
    "Market risk",
    "FX delta and vega joint limit utilisation tracks directional FX exposure alongside option volatility risk so desks cannot exhaust vega while appearing delta-flat. Joint dashboards prevent silent vol concentration.",
    "EM FX options book is delta-neutral but vega uses 92% of limit ahead of an election. Risk requires vega reduction before adding new straddles.",
    "Approving new options on delta alone while vega sits near the ceiling."
  ],
  [
    "Basis risk between futures and cash hedge",
    "Market risk",
    "Basis risk between futures and cash hedge is the residual P&L when the hedge instrument does not perfectly track the cash exposure. Delivery baskets, cheapest-to-deliver switches, and calendar rolls all create basis.",
    "Cash gilt hedged with bond futures shows £0.4m adverse basis through a CTD switch week. Desk documents the basis VaR add-on in the weekly pack.",
    "Treating a futures hedge as perfect and omitting basis from VaR and limit reports."
  ],
  [
    "Liquidity horizon adjustment in internal VaR",
    "Market risk",
    "Liquidity horizon adjustment in internal VaR scales or floors risk for positions that cannot be exited in the base VaR horizon. Illiquid names need longer horizons so capital and limits reflect exit difficulty.",
    "Private placement bonds get a 10-day liquidity horizon vs 1-day for liquid sovereigns; internal VaR rises £2.6m. Desk limit is restated accordingly.",
    "Applying one-day VaR to a thinly traded loan trading book without a liquidity add-on."
  ],
  [
    "Market risk limit breach escalation clock",
    "Market risk",
    "Market risk limit breach escalation clock defines how quickly a VaR, DV01, or stress breach must be notified, remediated, or formally accepted. Clear clocks stop informal overnight overstays.",
    "Soft VaR breach at 10:15 must be notified by noon and remediated or accepted by close; hard breach requires same-hour CRO alert. Compliance samples the timestamps monthly.",
    "Allowing repeated soft breaches to roll overnight without a logged acceptance."
  ],
  [
    "Backtesting P&L clean vs unclean definition",
    "Market risk",
    "Backtesting P&L clean vs unclean definition separates hypothetical P&L attributable to market moves from actual P&L that includes fees, new trades, and intraday activity. Clean P&L is required for unbiased VaR exception tests.",
    "Validation rebuilds clean hypothetical P&L and finds two extra exceptions vs unclean actual P&L. The model inventory is updated to mandate clean P&L for regulatory backtesting.",
    "Using actual P&L with intraday trading noise to claim the VaR model passes."
  ],
  [
    "Non-modellable risk factor NMRF capital",
    "Market risk",
    "Non-modellable risk factor NMRF capital applies a conservative capital treatment when a risk factor lacks sufficient real price observations for modellable status. NMRF identification must be inventory-driven and evidenced.",
    "An exotic inflation factor fails modellability; capital switches to NMRF stress add-on of £6m. Product control retains the observation evidence pack for audit.",
    "Claiming modellable status with broker runs that are not executable real prices."
  ],
  [
    "Trading book boundary daily attestation",
    "Market risk",
    "Trading book boundary daily attestation confirms positions are correctly classified between trading and banking books under the firm’s policy. Misclassification distorts capital, VaR, and hedge accounting outcomes.",
    "Desk head attests that a hold-to-collect loan was never intended for short-term resale after Ops flagged a trading-book booking. Finance reclasses before month-end.",
    "Leaving intent undocumented so positions migrate books to chase a lower capital charge."
  ],
  [
    "IRC incremental risk charge concentration",
    "Market risk",
    "IRC incremental risk charge concentration captures default and migration risk in the trading book beyond VaR. Concentration in single names or correlated sectors inflates IRC and needs issuer limits.",
    "IRC jumps £9m after three same-sector HY bonds are added. Desk cuts two names to restore IRC inside the weekly capital budget.",
    "Managing only VaR while IRC silently consumes the desk’s capital envelope."
  ],
  [
    "Correlation stress for multi-asset VaR",
    "Market risk",
    "Correlation stress for multi-asset VaR replaces calm-period correlations with stressed matrices so diversification benefit does not vanish only after a crisis. Stress ρ should be approved and version-controlled.",
    "Equity–credit ρ stressed from 0.25 to 0.70 lifts diversified VaR from £12m to £17m. The stress matrix is locked for the quarter after MRC approval.",
    "Continuing to use 0.1 correlations in a risk-off week when cash equities and CDS gap together."
  ],
  [
    "Gamma and cross-gamma risk in option books",
    "Market risk",
    "Gamma and cross-gamma risk in option books measures second-order P&L from large spot moves and joint moves across underlyings. Linear delta limits alone miss convexity losses in short-gamma books.",
    "Short dated FX options show gamma P&L −£1.8m on a 2% spot jump despite flat delta. Risk introduces a gamma stress limit of £2m per 2% move.",
    "Calling the book hedged because net delta is near zero while short gamma is large."
  ],
  [
    "Through-the-cycle vs point-in-time PD",
    "Credit risk",
    "Through-the-cycle vs point-in-time PD distinguishes long-run average default probability from current-condition PD used in IFRS 9 staging and short-horizon pricing. Mixing the two misstates provisions and economic capital.",
    "Credit uses PiT PD 180 bps for Stage 2 ECL and TTC PD 95 bps for IRB capital on the same SME portfolio. The monthly pack reconciles both with a clear purpose label.",
    "Feeding TTC PD into lifetime ECL and understating Stage 2 provisions in a downturn."
  ],
  [
    "LGD downturn calibration evidence pack",
    "Credit risk",
    "LGD downturn calibration evidence pack documents how loss given default is stressed for capital versus expected-loss accounting. Collateral haircuts, recovery lags, and cure rates need vintage evidence.",
    "IRB LGD downturn is 45% vs long-run 32% on residential mortgages; validation cites 2008–10 recoveries. The pack is filed with the model inventory ID.",
    "Haircutting collateral by a flat 10% with no downturn recovery study."
  ],
  [
    "EAD conversion factor for undrawn lines",
    "Credit risk",
    "EAD conversion factor for undrawn lines estimates how much of a committed facility becomes exposure at default. Low CCF on revolving lines understates credit risk when utilisation spikes before default.",
    "RCF CCF set at 55% after observing pre-default drawdowns; EAD on a £40m line becomes £22m undrawn plus drawn. Credit committee adopts the factor for limit utilisation.",
    "Assuming zero drawdown on undrawn commitments in stress because current utilisation is low.",
    "EAD ≈ drawn + CCF × undrawn"
  ],
  [
    "Credit migration matrix annual refresh",
    "Credit risk",
    "Credit migration matrix annual refresh updates transition probabilities used in credit VaR, IFRS 9, and stress testing. Stale matrices miss rating inflation or sector deterioration.",
    "2025 refresh shows BB→B transitions up 30% in commercial real estate; credit VaR rises £4m. The new matrix is versioned and linked to the stress engine.",
    "Running multi-year credit VaR on a pre-pandemic migration matrix without challenge."
  ],
  [
    "Obligor concentration Herfindahl monitor",
    "Credit risk",
    "Obligor concentration Herfindahl monitor tracks name concentration in the credit portfolio beyond single-name limits. A rising HHI signals that granular EL understates true unexpected loss.",
    "Top-20 HHI rises after a large acquisition financing; credit capital add-on of £3m is booked and single-name limit headroom is frozen for that sector.",
    "Relying only on ‘top 10 = 25%’ while mid-tier names become highly correlated."
  ],
  [
    "Wrong-way risk trade booking flag",
    "Credit risk",
    "Wrong-way risk trade booking flag marks derivatives or financing where exposure tends to rise as counterparty creditworthiness falls. Specific wrong-way risk needs tighter collateral, shorter tenor, or hedges.",
    "Commodity prepay with a producer shows exposure rising when the commodity price—and producer credit—falls. CVA desk applies a wrong-way multiplier and cuts tenor to 12 months.",
    "Pricing CVA with independent exposure and PD when the underlier drives the counterparty’s solvency."
  ],
  [
    "CVA hedge effectiveness desk review",
    "Credit risk",
    "CVA hedge effectiveness desk review checks whether CDS or index hedges offset counterparty credit valuation movements within policy. Ineffectiveness belongs in P&L explain, not silent residual.",
    "Single-name CDS hedges cover 70% of CVA move on a dealer; residual £1.2m is explained by index basis. Desk proposes adding a CDX overlay.",
    "Buying index protection and calling CVA fully hedged without measuring name-level residual."
  ],
  [
    "Collateral dispute ageing and exposure add-on",
    "Credit risk",
    "Collateral dispute ageing and exposure add-on increases counterparty exposure when margin calls remain unsettled past agreed timelines. Aged disputes are credit events in all but name.",
    "A £15m VM dispute ages past T+2; exposure add-on is applied and escalated to the counterparty credit officer. Trading is restricted until resolved.",
    "Leaving disputed margin outside exposure while continuing to add risk with the same name."
  ],
  [
    "Credit limit tenor bucket structure",
    "Credit risk",
    "Credit limit tenor bucket structure caps exposure by maturity band so long-dated risk cannot hide under a single notional limit. Longer buckets usually carry tighter capacity.",
    "Counterparty limit is £50m <1y, £30m 1–5y, £10m >5y. A proposed 7y swap is declined until a shorter structure is agreed.",
    "Approving a 10-year exposure against a limit defined only on current MTM."
  ],
  [
    "Shadow rating for unrated counterparties",
    "Credit risk",
    "Shadow rating for unrated counterparties assigns an internal grade using financials, qualitative factors, and peer mapping when no external rating exists. The grade must feed PD, limits, and watchlist rules.",
    "Unrated supplier gets shadow BB- after cash-flow and governance review; PD 220 bps feeds the limit model. Annual review date is diarised.",
    "Parking unrated names in an ‘other’ bucket with a flat optimistic PD."
  ],
  [
    "Forbearance flag linkage to Stage 2 ECL",
    "Credit risk",
    "Forbearance flag linkage to Stage 2 ECL ensures modified loans with financial difficulty are identified for lifetime expected credit loss. Forbearance without staging understates provisions.",
    "A covenant holiday on a CRE loan triggers forbearance and Stage 2; lifetime ECL rises from £0.4m to £1.7m. Credit and finance reconcile the watchlist weekly.",
    "Granting payment holidays without updating IFRS 9 stage or disclosure."
  ],
  [
    "Credit stress overlay for CRE LTV shocks",
    "Credit risk",
    "Credit stress overlay for CRE LTV shocks revalues commercial real estate collateral under price declines and higher yields to test LGD and covenant headroom. Overlays should be portfolio-wide, not deal-by-deal anecdotes.",
    "−25% CRE price shock lifts portfolio Stage 2 ECL by £22m; board risk pack shows the bridge. Lending pauses on >70% LTV until overlays ease.",
    "Stressing income only while holding collateral values flat in a rising-rate CRE market."
  ],
  [
    "Netting set enforceability legal opinion log",
    "Credit risk",
    "Netting set enforceability legal opinion log tracks jurisdictions and agreement types where close-out netting is recognised for exposure and capital. Missing opinions force gross exposure treatment.",
    "Legal confirms netting opinion expired for one emerging-market annex; exposure switches to gross (+£40m). New trades in that jurisdiction are blocked until refreshed.",
    "Assuming ISDA netting everywhere because the master agreement looks standard."
  ],
  [
    "Settlement risk Herstatt window limit",
    "Credit risk",
    "Settlement risk Herstatt window limit caps principal risk when payment legs settle in different time zones or systems. PvP and CLS membership reduce but do not eliminate all settlement risk.",
    "FX settlement risk limit £80m; a large USD/JPY ticket would peak at £95m during the window. Desk splits settlement or uses CLS-eligible pairs.",
    "Ignoring principal settlement risk because replacement-risk MTM is small."
  ],
  [
    "Sovereign ceiling on corporate credit grades",
    "Credit risk",
    "Sovereign ceiling on corporate credit grades constrains borrower ratings when country risk dominates transfer and convertibility. Breaking the ceiling needs explicit exception governance.",
    "Local AA corporate capped at sovereign BBB+ for group PD; exception requires CRO and country-risk sign-off. Two exceptions are logged this quarter.",
    "Rating a corporate above the sovereign without documenting transfer-risk mitigants."
  ],
  [
    "Operational risk loss data threshold policy",
    "Operational risk",
    "Operational risk loss data threshold policy sets the amount above which internal loss events must be captured for RCSA, capital, and board reporting. Thresholds that are too high hide chronic process failure.",
    "Threshold cut from £20k to £5k; capture rises 40% and reveals a payments repair theme. Op risk redesigns the control with Ops.",
    "Keeping a high threshold so the loss database looks clean while near-misses pile up."
  ],
  [
    "RCSA residual risk scoring calibration",
    "Operational risk",
    "RCSA residual risk scoring calibration aligns inherent risk, control effectiveness, and residual scores so colours mean the same across divisions. Uncalibrated scores make heat maps incomparable.",
    "Group workshops re-anchor ‘amber residual’ to defined frequency/impact bands; 18 processes are rescored. Internal audit later samples calibration evidence.",
    "Letting each business invent its own residual scale and then ranking them as if comparable."
  ],
  [
    "Key risk indicator threshold breach protocol",
    "Operational risk",
    "Key risk indicator threshold breach protocol defines amber/red triggers, owners, and time-to-action for KRIs such as failed settlements, system downtime, or complaint volumes. KRIs without protocols are vanity metrics.",
    "Failed payment KRI hits red at 2.5%; Ops must root-cause within 48 hours and report to the risk committee if unresolved in a week.",
    "Raising KRI thresholds after breaches instead of fixing the process."
  ],
  [
    "Scenario analysis workshop for cyber outage",
    "Operational risk",
    "Scenario analysis workshop for cyber outage estimates severe-but-plausible operational loss from a multi-day core-system or cyber event. Scenarios need business, IT, and finance co-ownership of assumptions.",
    "Workshop estimates £35m loss from five-day payments outage including compensation and remediation. The figure feeds ICAAP op-risk stress and resilience investment cases.",
    "Writing a cyber scenario with IT alone and no customer-impact or financial loss estimate."
  ],
  [
    "External loss data scaling to firm size",
    "Operational risk",
    "External loss data scaling to firm size adjusts industry loss events for relevance when internal data are sparse. Scaling must consider business mix, not just revenue multiples.",
    "An external £200m trading-fraud event is scaled to £18m for the firm’s markets footprint and included as a scenario. Validation challenges the scale factor.",
    "Copying headline external losses into capital without scaling or relevance filters."
  ],
  [
    "Conduct risk complaint-to-loss bridge",
    "Operational risk",
    "Conduct risk complaint-to-loss bridge links customer complaint themes to operational and conduct loss estimates for product remediation. Bridges stop conduct being treated as a pure compliance narrative.",
    "Complaint spike on a packaged product maps to £6m expected remediation; finance books a provision and product governance pauses sales.",
    "Tracking complaint volumes with no estimated financial remediation exposure."
  ],
  [
    "Change-the-bank operational risk gate",
    "Operational risk",
    "Change-the-bank operational risk gate requires residual risk assessment before major system or process go-lives. Gates should include rollback criteria and control evidence, not only delivery milestones.",
    "Payments platform go-live delayed one sprint after the gate finds incomplete reconciliation controls. Residual risk accepted only with dual-run evidence.",
    "Skipping the risk gate because the project steering committee wants the original date."
  ],
  [
    "Third-party concentration operational dependency",
    "Operational risk",
    "Third-party concentration operational dependency maps critical services to a small set of vendors so exit and resilience plans are realistic. Concentration is an op-risk and resilience issue, not only procurement savings.",
    "Two cloud regions and one payments processor cover 80% of critical journeys; board requests a diversification plan with 18-month milestones.",
    "Green-rating every vendor individually while ignoring that they share the same subprocessor."
  ],
  [
    "Internal fraud typology control testing",
    "Operational risk",
    "Internal fraud typology control testing designs tests around known fraud schemes—collusion, false accounting, mandate fraud—rather than generic sampling. Typologies keep control testing adversarial.",
    "Audit and op risk jointly test supplier master changes against a mandate-fraud typology; two SOD gaps are closed before year-end.",
    "Testing only happy-path approvals and never the override or dual-control bypass paths."
  ],
  [
    "Business resilience impact tolerance link",
    "Operational risk",
    "Business resilience impact tolerance link connects operational disruption metrics to board-approved impact tolerances for important business services. Breach of tolerance is a risk event, not only an IT incident.",
    "Payments IBS tolerance is 4 hours; a 6-hour outage is reported as a tolerance breach with customer harm metrics. Remediation is tracked to the risk committee.",
    "Reporting uptime percentages without mapping outages to impact tolerances."
  ],
  [
    "LCR HQLA eligibility daily certification",
    "Liquidity risk",
    "LCR HQLA eligibility daily certification confirms assets counted as high-quality liquid assets meet level, haircut, and operational requirements. Ineligible assets silently inflate the ratio.",
    "Treasury removes £120m Level 2 assets that breached the 40% cap after a ratings downgrade; LCR falls from 128% to 119% but remains above policy.",
    "Leaving downgraded bonds in HQLA because the portfolio system still tags them Level 1.",
    "LCR = HQLA / stressed net outflows"
  ],
  [
    "NSFR ASF factor challenge for deposits",
    "Liquidity risk",
    "NSFR ASF factor challenge for deposits reviews available stable funding factors applied to deposit segments. Misclassified wholesale deposits overstate NSFR stability.",
    "Ops reclasses £300m brokered deposits from retail ASF 90% to wholesale 50%; NSFR drops 4 points. ALCO adjusts term issuance plans.",
    "Treating all deposits under £100k as stable retail without product-feature review.",
    "NSFR = ASF / RSF"
  ],
  [
    "Intraday liquidity peak usage dashboard",
    "Liquidity risk",
    "Intraday liquidity peak usage dashboard tracks maximum daylight liquidity needed across payment systems so buffers cover peaks, not just end-of-day balances. Peaks often occur mid-morning.",
    "Peak intraday usage hits £1.1bn vs £0.9bn buffer on month-end Thursday; Treasury pre-positions collateral the prior evening thereafter.",
    "Managing only closing cash and missing a noon peak that stresses payment queues."
  ],
  [
    "Contingency funding plan playbook drill",
    "Liquidity risk",
    "Contingency funding plan playbook drill rehearses activation triggers, communication trees, and monetisation steps under a liquidity stress. Drills expose stale contacts and impractical asset sales.",
    "Annual CFP drill sells £200m HQLA in simulation and finds two counterparties unreachable; contacts and haircuts are updated within a week.",
    "Filing a CFP that has never been drilled and assumes frictionless asset sales."
  ],
  [
    "Deposit runoff segmentation for stress",
    "Liquidity risk",
    "Deposit runoff segmentation for stress applies different outflow rates to operational, retail, and wholesale deposit types. Flat runoff assumptions understate wholesale flight risk.",
    "Stress uses 5% retail operational vs 40% non-operational wholesale; modelled outflows rise £450m. LCR still clears 110% after buffer actions.",
    "Applying a single 10% runoff to all deposits regardless of stickiness."
  ],
  [
    "Encumbrance ratio board limit",
    "Liquidity risk",
    "Encumbrance ratio board limit caps the share of assets pledged for funding, clearing, or secured borrowing so unencumbered buffers remain. Rising encumbrance shrinks true liquidity optionality.",
    "Encumbrance hits 28% vs 25% board limit after a repo surge; Treasury unwinds £150m repo and reports remediation in five days.",
    "Celebrating cheap secured funding while unencumbered HQLA quietly disappears."
  ],
  [
    "Funds transfer pricing liquidity premium",
    "Liquidity risk",
    "Funds transfer pricing liquidity premium charges businesses for the term liquidity they consume and credits stable funding they provide. Without FTP liquidity premia, products look falsely profitable.",
    "FTP adds 35 bps liquidity premium to 5-year fixed-rate loans; product ROE falls and pricing is adjusted. ALCO reviews the curve quarterly.",
    "Leaving FTP as a pure interest curve with no liquidity or contingent commitment charge."
  ],
  [
    "Early warning indicators for liquidity stress",
    "Liquidity risk",
    "Early warning indicators for liquidity stress are market and behavioural signals—spread widening, deposit beta shifts, facility drawdowns—that precede formal CFP triggers. EWIs need owners and escalation.",
    "Wholesale CD spreads +40 bps and sticky deposit beta rising trigger EWI amber; Treasury shortens issuance and raises HQLA target by £100m.",
    "Waiting for LCR to breach before acting on market early-warning signals."
  ],
  [
    "Committed facility undrawn liquidity outflow",
    "Liquidity risk",
    "Committed facility undrawn liquidity outflow recognises that clients draw revolving credit in firm stress exactly when funding is scarce. Undrawn commitments need realistic draw assumptions in LCR and internal stress.",
    "Corporate RCF undrawn £2bn stressed at 30% draw; liquidity outflow £600m is pre-positioned in the buffer plan.",
    "Assuming undrawn facilities stay undrawn because current utilisation is low."
  ],
  [
    "Collateral reuse and rehypothecation inventory",
    "Liquidity risk",
    "Collateral reuse and rehypothecation inventory tracks where received collateral has been re-pledged so recall risk and encumbrance are visible. Opaque reuse creates sudden liquidity gaps.",
    "Prime services inventory shows 62% reuse of hedge-fund collateral; a recall stress needs £180m incremental HQLA. Desk reduces reuse on less stable names.",
    "Counting received collateral as unencumbered liquidity after it has already been rehypothecated."
  ],
  [
    "Model inventory completeness attestation",
    "Model risk",
    "Model inventory completeness attestation is the periodic confirmation that all models in use—credit, market, AML, pricing, AI—are listed with owner, materiality, and validation status. Shadow models outside the inventory are uncontrolled risk.",
    "Q2 attestation finds three pricing spreadsheets used for IPV but absent from inventory; they are onboarded as tier-2 models within 30 days.",
    "Attesting completeness while known Excel calculators remain ‘temporary’ for years."
  ],
  [
    "Model validation independence firewall",
    "Model risk",
    "Model validation independence firewall keeps validators organisationally and incentive-separate from model developers and profit-taking desks. Independence must be real in reporting lines and performance goals.",
    "Validator of the market VaR model reports to the head of model risk, not markets; findings are issued without desk edit rights. Two high findings remain open with dated actions.",
    "Letting the developing desk rewrite adverse validation findings before MRC sees them."
  ],
  [
    "Model performance monitoring drift alert",
    "Model risk",
    "Model performance monitoring drift alert detects when a model’s predictions, rankings, or calibrations deteriorate versus champion benchmarks. Drift without action turns validated models into silent failures.",
    "PD model Gini falls from 0.42 to 0.31 on recent vintages; monitoring raises a red alert and freezes challenger promotion until recalibration.",
    "Reviewing models only on the annual validation anniversary while monthly metrics deteriorate."
  ],
  [
    "Champion challenger model governance",
    "Model risk",
    "Champion challenger model governance runs an alternate model in parallel to detect champion bias and prepare succession. Challengers need the same data lineage and fair comparison rules.",
    "Challenger ECL model shows £8m higher Stage 2 than champion for three months; MRC commissions a root-cause before any switch.",
    "Declaring a challenger ‘failed’ because it is more conservative without analysing why."
  ],
  [
    "Pricing model IPV independent verification",
    "Model risk",
    "Pricing model IPV independent verification compares desk marks to independent consensus or observed prices. Material unexplained differences indicate model, calendar, or valuation control failure.",
    "IPV variance on bermudan swaptions hits £2.3m; product control escalates and trading reduces risk until the smile calibration is fixed.",
    "Accepting desk marks as IPV because the model is ‘approved’ without independent prices."
  ],
  [
    "Overlay and expert judgement model register",
    "Model risk",
    "Overlay and expert judgement model register lists manual adjustments that override model outputs for capital, provisions, or pricing. Overlays need owners, expiry dates, and evidence—otherwise they become permanent shadow models.",
    "Credit overlay +£5m ECL for CRE uncertainty is registered with a 90-day expiry and required exit criteria. Finance tracks expiry on the close checklist.",
    "Applying recurring ‘temporary’ overlays each quarter with no register or exit plan."
  ],
  [
    "Model change materiality triage",
    "Model risk",
    "Model change materiality triage classifies proposed changes as immaterial, material, or new-model events so validation effort matches risk. Triage criteria must be pre-agreed, not invented after the change.",
    "A PD recalibration shifts portfolio EL by 8% and is triaged material; full validation is required before production. The change log cites the triage score.",
    "Pushing a recalibration as ‘parameter maintenance’ to avoid validation when EL moves materially."
  ],
  [
    "AI credit decisioning explainability pack",
    "Model risk",
    "AI credit decisioning explainability pack documents features, adverse-action reasons, fairness tests, and override rights for machine-learning credit models. Explainability is a control, not a brochure.",
    "ML scorecard ships with top-three reason codes per decline and a monthly fairness dashboard by segment. Compliance samples 50 declines each month.",
    "Deploying a black-box score with no reason codes because accuracy looked strong in backtest."
  ],
  [
    "Vendor model reliance assessment",
    "Model risk",
    "Vendor model reliance assessment evaluates third-party models for data opacity, validation rights, and exit options. Outsourcing the model does not outsource model risk accountability.",
    "Market data vendor VaR engine assessed as high reliance; firm negotiates annual validation rights and builds an internal challenger for material books.",
    "Accepting vendor ‘certified’ status as a substitute for firm validation."
  ],
  [
    "Benchmark model for valuation control",
    "Model risk",
    "Benchmark model for valuation control is an independent simpler model used to challenge complex production pricers. Large unexplained gaps trigger deep dives before month-end sign-off.",
    "Benchmark bermudan values differ by 12% from production on two trades; both are booked to a prudent valuation adjustment until resolved.",
    "Using the same library for production and ‘independent’ benchmark with shared calibrations."
  ],
  [
    "Risk appetite cascade to desk limits",
    "Risk governance",
    "Risk appetite cascade to desk limits translates board appetite statements into measurable desk VaR, credit, liquidity, and conduct limits. Cascade gaps leave appetite as prose without operational teeth.",
    "Board market-risk appetite maps to group VaR £60m and desk sub-limits summing with a diversification buffer. QBR shows utilisation vs appetite in one page.",
    "Publishing qualitative appetite while desks still run on legacy limits unrelated to the statement."
  ],
  [
    "Principal risk owner accountability map",
    "Risk governance",
    "Principal risk owner accountability map names executive owners for each principal risk with metrics, appetite, and escalation paths. Shared ownership without a single accountable executive dilutes response.",
    "Cyber principal risk owned by CIO with CRO challenge; KRIs and investment budget sit in the same pack. Internal audit tests ownership clarity annually.",
    "Listing three ‘co-owners’ for a principal risk with no RACI for breach response."
  ],
  [
    "Risk committee MI pack decision log",
    "Risk governance",
    "Risk committee MI pack decision log records decisions, acceptances, and follow-ups arising from the risk MI pack so actions do not vanish between meetings. Logs are part of the control evidence.",
    "Committee accepts elevated CRE risk for six months with three mitigating actions; the log tracks owners and due dates into the next agenda.",
    "Discussing red risks verbally with no minuted acceptance or action."
  ],
  [
    "Three lines role clarity in product approval",
    "Risk governance",
    "Three lines role clarity in product approval defines first-line product ownership, second-line challenge, and third-line assurance for new products. Blurred lines create rubber-stamp approvals.",
    "New structured deposit requires first-line business case, second-line risk/compliance challenge memo, and post-launch audit within nine months. Launch is held until the challenge memo is closed.",
    "Letting second-line rewrite the business case instead of challenging it."
  ],
  [
    "Emerging risk horizon scan quarterly",
    "Risk governance",
    "Emerging risk horizon scan quarterly gathers forward-looking threats—geopolitical, technological, regulatory—not yet in the principal risk register. Scans should feed scenario design and early KRIs.",
    "Horizon scan elevates AI model opacity and critical-mineral supply as watch items; two new KRIs are proposed for the next appetite review.",
    "Recycling last year’s emerging risks with no link to scenarios or investment decisions."
  ],
  [
    "Risk culture survey to control outcomes bridge",
    "Risk governance",
    "Risk culture survey to control outcomes bridge connects survey themes (speak-up, priority conflicts) to actual control breaches and loss events. Culture without outcomes is a poster programme.",
    "Low speak-up scores in markets correlate with late risk-event reporting; remediation includes protected escalation channels and KPI changes.",
    "Reporting high culture scores while loss-event reporting timeliness deteriorates."
  ],
  [
    "Capital contingency trigger framework",
    "Risk governance",
    "Capital contingency trigger framework pre-defines management actions when CET1, leverage, or internal capital ratios approach thresholds. Triggers convert recovery plans from documents into muscle memory.",
    "CET1 buffer trigger at +100 bps above MDA restricts buybacks and discretionary distributions automatically. Board is notified within 24 hours of breach of the internal trigger.",
    "Waiting for regulatory MDA breach before considering pre-planned capital actions."
  ],
  [
    "Integrated stress testing assumption book",
    "Risk governance",
    "Integrated stress testing assumption book locks macroeconomic paths, overlays, and management actions used across ICAAP, IFRS 9, and liquidity stress so results are comparable. Unversioned assumptions destroy auditability.",
    "Assumption book v12 freezes unemployment and HPI paths for the annual stress cycle; late changes require MRC approval and a version bump.",
    "Letting each team pick its own severe path and then comparing results as if consistent."
  ],
  [
    "Board risk appetite breach notification SLA",
    "Risk governance",
    "Board risk appetite breach notification SLA sets how fast breaches of board-level appetite metrics reach the chair or risk committee. Slow notification turns appetite into a rear-view report.",
    "Hard appetite breach must reach the risk committee chair within 24 hours; soft breaches within the weekly pack. Two soft breaches this month met the SLA.",
    "Bundling appetite breaches into the next quarterly board pack only."
  ],
  [
    "Risk data aggregation lineage for BCBS 239",
    "Risk governance",
    "Risk data aggregation lineage for BCBS 239 documents how risk reports are sourced, transformed, and controlled so accuracy and timeliness can be evidenced. Lineage gaps are themselves a risk finding.",
    "Group VaR report lineage maps from trade capture through risk engine to the board pack with reconciliations at each hop. Internal audit rates lineage ‘satisfactory’ after remediation.",
    "Manually pasting risk numbers into board slides with no recon to source systems."
  ],
  [
    "Overnight gap risk limit for cash equities",
    "Market risk",
    "Overnight gap risk limit for cash equities caps exposure held through the close when overnight news can gap prices beyond intraday hedges. Gap limits complement intraday VaR.",
    "Asia desk overnight gap limit £8m; a proposed ADR overweight would use £9.5m. Position is cut before the New York close.",
    "Assuming stop-losses will work through an overnight trading halt."
  ],
  [
    "Jump-to-default exposure on credit derivatives",
    "Credit risk",
    "Jump-to-default exposure on credit derivatives estimates instantaneous loss if the reference name defaults before hedges can be adjusted. It complements spread CS01 for discontinuous credit risk.",
    "Single-name short protection shows JTD £25m vs £15m limit; desk buys CDS protection to cut JTD overnight.",
    "Managing only CS01 while short protection carries large discontinuous default risk."
  ],
  [
    "Recovery rate uncertainty in CVA",
    "Credit risk",
    "Recovery rate uncertainty in CVA recognises that LGD assumptions drive counterparty valuation as much as PD. Stressed recoveries should be sensitivity-tested for material counterparties.",
    "CVA rises £3m when recovery on a dealer is stressed from 40% to 20%. Desk hedges incremental CVA with CDS.",
    "Hard-coding 40% recovery for all counterparties regardless of seniority and collateral."
  ],
  [
    "Operational resilience important business services map",
    "Operational risk",
    "Operational resilience important business services map identifies services whose disruption harms customers or market integrity and links them to processes, people, technology, and third parties.",
    "Fourteen IBS mapped with impact tolerances; two lack complete resource maps and are remediated before the regulatory self-assessment.",
    "Listing systems instead of customer services and calling the map complete."
  ],
  [
    "Liquidity transfer pricing contingent commitment fee",
    "Liquidity risk",
    "Liquidity transfer pricing contingent commitment fee charges businesses for undrawn committed facilities that consume contingent liquidity. Without the fee, RCFs look cheaper than they are.",
    "FTP adds 15 bps on undrawn corporate RCFs; product pricing and limit demand adjust within one quarter.",
    "Charging FTP only on drawn balances while undrawn commitments drive stress outflows."
  ],
  [
    "Model risk appetite statement metrics",
    "Model risk",
    "Model risk appetite statement metrics translate qualitative model-risk appetite into counts of overdue validations, high findings, and unapproved models in use. Metrics make appetite enforceable.",
    "Appetite allows zero unapproved material models and max five overdue high findings; current state is one unapproved pricing tool—blocked from new trades.",
    "Stating ‘low model risk appetite’ with no quantitative breach metrics."
  ],
  [
    "Risk capacity versus risk appetite distinction",
    "Risk governance",
    "Risk capacity versus risk appetite distinction separates the maximum risk the firm can bear (capacity) from the risk it chooses to take (appetite). Appetite must sit inside capacity with a buffer.",
    "Capital capacity supports £80m market VaR but board appetite is £60m; the £20m buffer is reserved for stress. QBR shows both lines.",
    "Setting appetite equal to capacity with no buffer for estimation error or stress."
  ],
  [
    "Desk-level stress P&L attribution",
    "Market risk",
    "Desk-level stress P&L attribution explains which risk factors drive stressed losses so hedges target the real drivers. Attribution turns stress from a single number into an action list.",
    "Rates shock −£12m attributed 70% to 10y DV01 and 20% to vega; desk hedges the 10y bucket first.",
    "Reporting only total stress loss with no factor breakdown."
  ],
  [
    "Credit valuation adjustment wrong-way multiplier",
    "Credit risk",
    "Credit valuation adjustment wrong-way multiplier uplifts CVA when exposure and credit quality are adversely correlated. Multipliers should be name-specific where material.",
    "Energy producer counterparty gets 1.5× WWR multiplier; CVA rises £2.1m and is hedged. Methodology note filed in model inventory.",
    "Applying a flat 1.0 multiplier after a clear WWR relationship is identified."
  ],
  [
    "Op risk capital SMA business indicator mapping",
    "Operational risk",
    "Op risk capital SMA business indicator mapping assigns P&L lines to the standardised approach business indicator components. Mapping errors distort capital and peer comparisons.",
    "Finance remaps fee income after a product reclass; BI falls 3% and SMA capital drops accordingly. Mapping evidence retained for audit.",
    "Leaving discontinued business revenue inside the BI without challenge."
  ],
  [
    "Historical VaR vol scaling overlay",
    "Market risk",
    "Historical VaR vol scaling overlay scales historical P&L vectors by recent versus long-run volatility so HS VaR reacts without shortening the window blindly.",
    "Vol overlay lifts 99% HS VaR £3.0m→£3.8m after a vol spike; MRC approves overlay parameters.",
    "Changing lookback and vol overlay simultaneously without documenting which drove the VaR jump."
  ],
  [
    "Expected shortfall backtesting shortfall exceptions",
    "Market risk",
    "Expected shortfall backtesting shortfall exceptions counts days when loss exceeds ES and compares to expected frequency under the model, complementing VaR exception tests.",
    "Four ES shortfall exceptions in a quarter vs two expected; validation opens a finding.",
    "Backtesting only VaR while capital uses ES."
  ],
  [
    "Risk-not-in-VaR RNIV inventory",
    "Market risk",
    "Risk-not-in-VaR RNIV inventory lists material risks excluded from the VaR engine with capital or limit add-ons until modelled.",
    "RNIV list adds dividend risk and mortgage prepayment; £5m add-on until factors onboarded.",
    "Silent RNIV exclusions discovered only in a P&L explain crisis."
  ],
  [
    "Desk mandate product permission matrix",
    "Market risk",
    "Desk mandate product permission matrix ties allowed products and tenors to desk mandates so booking outside permission is blocked.",
    "New bermudan requires mandate update; trade blocked pre-booking until MRC amends matrix.",
    "Booking first and seeking mandate forgiveness after."
  ],
  [
    "Proxy hedge effectiveness documentation",
    "Market risk",
    "Proxy hedge effectiveness documentation evidences why a proxy hedge reduces risk when the perfect instrument is unavailable, including residual basis.",
    "CDX IG proxies single-name HY book; residual basis VaR £1.2m disclosed in limit pack.",
    "Calling a liquid index a perfect hedge without residual measurement."
  ],
  [
    "Intraday VaR flash limit utilisation",
    "Market risk",
    "Intraday VaR flash limit utilisation monitors intraday theoretical VaR so desks cannot hide risk between end-of-day snapshots.",
    "Intraday flash hits 95% of limit at 11:00; desk reduces before noon auction.",
    "End-of-day only VaR while intraday risk doubles."
  ],
  [
    "Curve bucketing key-rate stress set",
    "Market risk",
    "Curve bucketing key-rate stress set applies standardised key-rate shocks for ALM and trading curve risk beyond parallel moves.",
    "2s10s steepener stress −£6m; ALCO hedges 10y bucket.",
    "Parallel +100bp as the only rates stress."
  ],
  [
    "Equity event risk takeover gap limit",
    "Market risk",
    "Equity event risk takeover gap limit caps overnight event risk around M&A and earnings for cash and delta-one books.",
    "Earnings gap limit £5m; position cut ahead of print after utilisation 110% projected.",
    "Holding full size through binary events on delta alone."
  ],
  [
    "Commodity contango roll yield monitor",
    "Market risk",
    "Commodity contango roll yield monitor tracks roll yield drag/gain in indexed commodity positions for P&L and risk narratives.",
    "Contango roll −£0.9m MTD; VaR unchanged but P&L explain cites roll.",
    "Attributing all commodity P&L to spot beta."
  ],
  [
    "XVA funding curve governance",
    "Credit risk",
    "XVA funding curve governance governs curves used for FVA/ColVA so funding valuation matches treasury reality.",
    "Funding curve switched to SOFR+45 after treasury update; XVA day-1 £2m explained.",
    "Trader-chosen funding curves disconnected from treasury."
  ],
  [
    "Credit overlay to IFRS 9 staging bridge",
    "Credit risk",
    "Credit overlay to IFRS 9 staging bridge reconciles credit risk watchlist overlays to IFRS 9 Stage 2/3 migrations for consistent narratives.",
    "Watchlist names 95% in Stage 2; five mismatches investigated before close.",
    "Credit risk reds still Stage 1 in finance without challenge."
  ],
  [
    "Collateral eligibility schedule change control",
    "Credit risk",
    "Collateral eligibility schedule change control controls changes to eligible collateral types and haircuts under CSAs and clearers.",
    "Haircut on HY bonds raised to 25%; IM call £30m same day; schedule versioned.",
    "Ad-hoc haircut changes without counterparty notice process."
  ],
  [
    "Wrong-way risk stress on commodity finance",
    "Credit risk",
    "Wrong-way risk stress on commodity finance stresses commodity finance where collateral value and obligor credit fall together.",
    "Oil prepay stress: oil −40% and PD ×3; exposure add-on applied.",
    "Commodity collateral assumed independent of producer credit."
  ],
  [
    "Country risk transfer convertibility limit",
    "Credit risk",
    "Country risk transfer convertibility limit caps cross-border exposure where transfer/convertibility could block payment even if obligor is solvent.",
    "Country limit Nigeria £40m; convertibility stress blocks new tickets.",
    "Obligor limit only without country transfer caps."
  ],
  [
    "Trade finance contingent exposure CCF",
    "Credit risk",
    "Trade finance contingent exposure CCF applies CCFs to LCs and guarantees so contingent trade exposures enter EAD correctly.",
    "Confirming bank LC CCF 20%→50% under stress; EAD restated.",
    "Ignoring undrawn trade contingents in EAD."
  ],
  [
    "Op risk scenario capital add-on bridge",
    "Operational risk",
    "Op risk scenario capital add-on bridge bridges scenario analysis outputs into capital or management buffers with clear haircuts.",
    "Cyber scenario £35m → 40% haircut into ICAAP buffer £14m; rationale minuted.",
    "Putting full workshop maxima straight into capital."
  ],
  [
    "Conduct remediation provision linkage",
    "Operational risk",
    "Conduct remediation provision linkage links conduct remediation programmes to accounting provisions and customer outcome MI.",
    "Remediation book £12m provision; outcome MI shows 80% customers contacted.",
    "Conduct programme with no provision or outcome tracking."
  ],
  [
    "Payments reconciliation break ageing",
    "Operational risk",
    "Payments reconciliation break ageing ages payment and nostro breaks with escalation so operational losses are prevented early.",
    "Breaks >3 days escalate to Ops head; two aged breaks caused near-miss loss.",
    "Open breaks rolling indefinitely in 'research'."
  ],
  [
    "Change failure rate KRI for releases",
    "Operational risk",
    "Change failure rate KRI for releases tracks failed production releases as a leading operational risk indicator for technology.",
    "Change failure rate 18% vs 5% appetite; release freeze until RCA done.",
    "Celebrating release velocity while failure rate climbs."
  ],
  [
    "Vendor exit test evidence pack",
    "Operational risk",
    "Vendor exit test evidence pack evidences that critical vendor exit plans have been tested, not only written.",
    "Exit test for payments processor recovers critical journey in 72h simulation; gaps logged.",
    "Exit plans that have never been exercised."
  ],
  [
    "LCR outflow assumption challenge log",
    "Liquidity risk",
    "LCR outflow assumption challenge log records challenges to deposit and commitment outflow assumptions with decisions.",
    "Wholesale outflow 40% challenged to 50% for brokered; LCR still 115%.",
    "Copying regulatory runoff rates without firm-specific challenge."
  ],
  [
    "High-quality liquid asset operational requirements",
    "Liquidity risk",
    "High-quality liquid asset operational requirements ensures HQLA is unencumbered, controlled by treasury, and monetisable in stress.",
    "£200m bonds pledged to clearer removed from HQLA; LCR restated.",
    "Counting encumbered inventory as HQLA."
  ],
  [
    "Intraday credit line usage with clearers",
    "Liquidity risk",
    "Intraday credit line usage with clearers monitors intraday credit from clearers/payment systems as a liquidity resource with caps.",
    "Clearer intraday usage 90% of line; pre-fund next month-end.",
    "Treating unlimited clearer credit as free liquidity."
  ],
  [
    "Contingent liquidity from undrawn syndicates",
    "Liquidity risk",
    "Contingent liquidity from undrawn syndicates assesses reliability of undrawn syndicate lines under reputation stress when many borrowers draw.",
    "Assume 50% of undrawn RCF unavailable in market stress; buffer sized up.",
    "100% reliance on undrawn RCFs in the CFP."
  ],
  [
    "Asset monetisation haircut library",
    "Liquidity risk",
    "Asset monetisation haircut library maintains stress haircuts by asset class for CFP monetisation schedules.",
    "HY monetisation haircut 35% in CFP; drill uses library v4.",
    "CFP assumes par sales of illiquid assets."
  ],
  [
    "Model overlay expiry dashboard",
    "Model risk",
    "Model overlay expiry dashboard tracks temporary model overlays to force expiry, renewal evidence, or removal.",
    "Seven overlays past expiry; two removed, five renewed with fresh evidence.",
    "Overlays living for years labelled temporary."
  ],
  [
    "Input data lineage for PD models",
    "Model risk",
    "Input data lineage for PD models documents source systems and transforms for PD model inputs so performance issues are diagnosable.",
    "Bureau feed latency caused score staleness; lineage fix prioritised.",
    "Model monitoring without knowing input provenance."
  ],
  [
    "Champion model production access control",
    "Model risk",
    "Champion model production access control restricts who can promote models to production scoring or limit engines.",
    "Promotion requires validator + model owner dual control; one attempted bypass blocked.",
    "Developers self-promoting to production."
  ],
  [
    "Benchmark challenger for market VaR",
    "Model risk",
    "Benchmark challenger for market VaR runs a simpler VaR challenger alongside production to detect engine faults.",
    "Challenger exceeds production by 25% for a week; mapping bug found.",
    "Single VaR engine with no challenger."
  ],
  [
    "AI model fairness constraint register",
    "Model risk",
    "AI model fairness constraint register registers fairness constraints and test results for AI models affecting customers.",
    "Collections model fairness gap on age band; constrained redeployed.",
    "Accuracy-only AI credit models."
  ],
  [
    "Risk appetite quantitative metric dictionary",
    "Risk governance",
    "Risk appetite quantitative metric dictionary defines each appetite metric’s formula, source, and breach rule in one dictionary.",
    "Dictionary v3 adds LCR hard/soft; board pack footnotes link to it.",
    "Appetite metrics with undocumented formulas."
  ],
  [
    "Principal risk KRIs leading indicator set",
    "Risk governance",
    "Principal risk KRIs leading indicator set assigns leading KRIs to each principal risk so boards see risk before losses.",
    "Cyber principal risk KRI: privileged access violations; leading spike precedes incident.",
    "Principal risks with only lagging loss KRIs."
  ],
  [
    "Risk committee skills matrix refresh",
    "Risk governance",
    "Risk committee skills matrix refresh ensures committee skills cover market, credit, cyber, and conduct as the risk profile evolves.",
    "Matrix gap on AI risk; training plus adviser retained.",
    "Static skills matrix through a digital transformation."
  ],
  [
    "Incident to principal risk remapping",
    "Risk governance",
    "Incident to principal risk remapping remaps material incidents to principal risks and appetite metrics within a set SLA.",
    "Payments outage remapped to resilience principal risk in 48h; appetite breach assessed.",
    "Incidents closed in Ops with no risk register update."
  ],
  [
    "Recovery plan playbook ownership map",
    "Risk governance",
    "Recovery plan playbook ownership map names owners for each recovery option with activation authorities and communications.",
    "Playbook drill finds missing comms owner for capital action; fixed in a week.",
    "Recovery options without named activators."
  ],
  [
    "Inter-risk contagion matrix annual update",
    "Risk governance",
    "Inter-risk contagion matrix annual update updates how market, credit, liquidity, and op risks amplify each other in stress.",
    "Contagion matrix raises liquidity impact of cyber; joint scenario redesigned.",
    "Independent silo stresses only."
  ],
  [
    "Board risk deep-dive calendar",
    "Risk governance",
    "Board risk deep-dive calendar schedules rotating deep-dives so each principal risk gets substantive time yearly.",
    "Calendar assigns cyber Q1, credit Q2; deep-dive packs are decision-oriented.",
    "Every meeting skimming all risks equally shallowly."
  ],
  [
    "Risk function capacity versus plan hours",
    "Risk governance",
    "Risk function capacity versus plan hours matches second-line capacity to the assurance and challenge plan to avoid phantom coverage.",
    "Plan hours exceed capacity 30%; plan cut or hiring approved.",
    "Ambitious challenge plan with no FTEs."
  ],
  [
    "Limit excess temporary approval register",
    "Market risk",
    "Limit excess temporary approval register logs temporary limit excesses with expiry, mitigants, and approver seniority.",
    "Intraday excess approved to 16:00 only; auto-alerts if still open at 16:05.",
    "Verbal overnight excesses without register."
  ],
  [
    "P&L explain unexplained threshold",
    "Market risk",
    "P&L explain unexplained threshold sets thresholds for unexplained P&L that trigger risk/product control investigation.",
    "Unexplained £0.5m day triggers joint IPV/risk huddle; mapping fix found.",
    "Absorbing unexplained P&L into 'noise'."
  ],
  [
    "Basis risk limit between CDS and bonds",
    "Credit risk",
    "Basis risk limit between CDS and bonds limits CDS-bond basis positions that can gap in stress despite appearing hedged.",
    "Basis book limit £3m; March gap −£2.1m inside limit but triggers review.",
    "Netting CDS and bonds to zero risk."
  ],
  [
    "Settlement fails cash penalty monitor",
    "Operational risk",
    "Settlement fails cash penalty monitor tracks fails and penalties as both cost and operational risk signal.",
    "Fails rate doubles; penalty £0.4m; Ops capacity action raised.",
    "Treating fails as pure P&L without risk escalation."
  ],
  [
    "Treasury mismatch book banking book IRRBB",
    "Liquidity risk",
    "Treasury mismatch book banking book IRRBB measures interest rate risk in the banking book with earnings and EVE views under governance.",
    "EVE −£90m in +200bp; board IRRBB limit headroom 10%.",
    "Trading-book rate risk tools applied unchanged to banking book."
  ],
  [
    "Model performance champion dashboard",
    "Model risk",
    "Model performance champion dashboard shows key models’ PSI, Gini, and calibration in one dashboard for MRC.",
    "PD PSI breaches on two segments; recalibration sprint started.",
    "Annual validation binders as the only performance view."
  ],
  [
    "Risk culture speak-up case SLA",
    "Risk governance",
    "Risk culture speak-up case SLA sets time-to-triage and protection commitments for speak-up cases involving risk issues.",
    "Speak-up triage SLA 5 days; Q2 median 4 days; one breach explained to AC.",
    "Speak-up cases ageing without triage owners."
  ],
  [
    "Desk-level capital consumption attribution",
    "Market risk",
    "Desk-level capital consumption attribution attributes capital (VaR, IRC, NMRF) to desks for incentivising hedges and reducing RNIV.",
    "Desk capital report shows NMRF 40% of charge; product simplification funded.",
    "P&L-only desk scorecards ignoring capital."
  ],
  [
    "Credit estimation uncertainty disclosure pack",
    "Credit risk",
    "Credit estimation uncertainty disclosure pack documents uncertainty ranges around PD/LGD for IC and disclosure narratives.",
    "LGD ±8pp range disclosed for CRE; IC uses midpoint with range.",
    "Point PD/LGD presented as certainty."
  ],
  [
    "Operational loss boundary vs credit loss",
    "Operational risk",
    "Operational loss boundary vs credit loss clarifies when losses are operational versus credit so databases and capital stay consistent.",
    "Loan fraud classified op risk after boundary note; dual counting avoided.",
    "Same loss in credit and op databases."
  ],
  [
    "Liquidity stress deposit beta feedback",
    "Liquidity risk",
    "Liquidity stress deposit beta feedback feeds observed deposit betas in prior stress into the next CFP assumptions.",
    "2023 beta 0.55 used to uplift 2026 CFP outflows.",
    "Never updating runoff with observed betas."
  ],
  [
    "Validation finding severity calibration",
    "Model risk",
    "Validation finding severity calibration calibrates high/medium/low validation findings so severity matches capital and customer impact.",
    "Severity guide issued; two findings re-rated high given limit use.",
    "Everything medium to avoid conflict."
  ],
  [
    "Risk MI latency SLA to board pack",
    "Risk governance",
    "Risk MI latency SLA to board pack defines maximum data latency for board risk KPIs and flags late numbers.",
    "VaR KPI latency SLA T+1; one late week footnoted.",
    "Board packs mixing T+1 and T+10 numbers silently."
  ],
  [
    "Correlation breakdown playbook for desks",
    "Market risk",
    "Correlation breakdown playbook for desks pre-plans desk actions when correlations spike and diversification vanishes.",
    "Playbook: cut gross, tighten proxies; activated in March stress.",
    "Discovering correlation 1 only after limits blow."
  ],
  [
    "Sovereign wrong-way on local currency debt",
    "Credit risk",
    "Sovereign wrong-way on local currency debt flags local-currency sovereign exposure where FX and credit worsen together for foreigners.",
    "Local bond book WWR add-on when FX falls with spreads; limit tightened.",
    "Treating local sovereign as risk-free for foreigners."
  ],
  [
    "Cyber loss data consortium scaling",
    "Operational risk",
    "Cyber loss data consortium scaling scales consortium cyber loss points to firm size and controls maturity.",
    "Consortium event scaled £9m; scenario library updated.",
    "Ignoring external cyber losses as irrelevant."
  ],
  [
    "NSFR derivative RSF factor challenge",
    "Liquidity risk",
    "NSFR derivative RSF factor challenge challenges required stable funding factors on derivative books when margining changes.",
    "Centrally cleared derivatives RSF reduced after IM recognition; NSFR +2pp.",
    "Stale RSF factors after clearing migration."
  ],
  [
    "Pre-provision net revenue PPNR stress link",
    "Risk governance",
    "Pre-provision net revenue PPNR stress link links PPNR stress paths to credit and market stress so capital stress is coherent.",
    "PPNR −25% path locked with credit stress; ICAAP uses joint path.",
    "Optimistic PPNR with severe credit stress."
  ],
  [
    "Market risk stressed period representativeness",
    "Market risk",
    "Market risk stressed period representativeness tests whether the stressed VaR window still represents current risk factors and products.",
    "Window lacks inflation vol; NMRF until window refreshed.",
    "Decade-old stressed window for a new product set."
  ],
  [
    "Obligor group connected client aggregation",
    "Credit risk",
    "Obligor group connected client aggregation aggregates connected clients for limit utilisation under economic dependence tests.",
    "Two legally separate borrowers aggregated after supply dependence; limit breach fixed.",
    "Legal entity limits only when economic group risk is one."
  ],
  [
    "Resilience important business service deep dive",
    "Operational risk",
    "Resilience important business service deep dive assures one IBS end-to-end including people, tech, and third parties each quarter.",
    "Deep dive on card authorisations finds single SPOF vendor; dual route funded.",
    "IBS maps never tested end-to-end."
  ],
  [
    "Funding plan versus business plan recon",
    "Liquidity risk",
    "Funding plan versus business plan recon reconciles asset growth plans to funding issuance capacity under appetite.",
    "Loan growth plan needs £2bn funding; issuance calendar short—plan cut.",
    "Business growth approved without funding plan recon."
  ],
  [
    "Model risk in stress testing engines",
    "Model risk",
    "Model risk in stress testing engines applies model risk overlays when stress engines are less validated than BAU models.",
    "Stress engine overlay +10% loss; documented in ICAAP.",
    "Stress engines exempt from model risk."
  ],
  [
    "Board appetite re-set after strategy change",
    "Risk governance",
    "Board appetite re-set after strategy change triggers appetite review when strategy or footprint changes materially.",
    "New markets entry triggers appetite re-set within 90 days; country limits added.",
    "Old appetite kept after entering riskier markets."
  ],
  [
    "Trading book default risk charge DRC hygiene",
    "Market risk",
    "Trading book default risk charge DRC hygiene ensures DRC/JTD inputs—notionals, offsets, hedges—are complete daily.",
    "Missing hedge offset inflated DRC £7m; booking fix same day.",
    "Weekly DRC with stale hedges."
  ],
  [
    "Credit risk appetite sector tilt governance",
    "Credit risk",
    "Credit risk appetite sector tilt governance governs intentional sector tilts inside appetite with expiry and review.",
    "CRE tilt +£500m for 12 months; monthly review; sunset dated.",
    "Permanent sector overweight labelled temporary tilt."
  ],
  [
    "Ops risk control automation ROI case",
    "Operational risk",
    "Ops risk control automation ROI case business-cases automation where manual controls drive repeat losses.",
    "Duplicate payment losses £1.1m/yr; automation ROI 9 months—funded.",
    "More checkers hired forever without automation case."
  ],
  [
    "Liquidity dashboard board vs ALCO grain",
    "Liquidity risk",
    "Liquidity dashboard board vs ALCO grain defines which liquidity KPIs go to board versus ALCO to avoid overload and gaps.",
    "Board: LCR/NSFR/encumbrance; ALCO: intraday peaks and issuance.",
    "Board pack with 40 liquidity charts and no decisions."
  ],
  [
    "Model inventory tiering by materiality",
    "Model risk",
    "Model inventory tiering by materiality tiers models so validation intensity matches materiality and customer impact.",
    "Tier-1 models annual independent validation; tier-3 peer review.",
    "Same validation depth for every spreadsheet."
  ],
  [
    "Risk acceptance linked to insurance",
    "Risk governance",
    "Risk acceptance linked to insurance checks whether accepted risks are actually insured and within policy terms.",
    "Accepted cyber residual exceeds insurance sublimit; acceptance revised.",
    "Accepting risk because 'we have insurance' without reading sublimits."
  ],
  [
    "Desk P&L attribution to risk factors",
    "Market risk",
    "Desk P&L attribution to risk factors attributes daily P&L to risk factors to validate VaR factor completeness.",
    "Unexplained 15% of P&L two weeks; missing dividend factor onboarded.",
    "VaR green while P&L explain chronically unexplained."
  ],
  [
    "ECL macroeconomic scenario governance",
    "Credit risk",
    "ECL macroeconomic scenario governance governs weights and paths of IFRS 9 macro scenarios with MRC/finance approval.",
    "Downside weight raised 20%→30%; ECL +£25m; minutes filed.",
    "Silent scenario weight tweaks to hit provision targets."
  ],
  [
    "Third-party concentration resilience metric",
    "Operational risk",
    "Third-party concentration resilience metric metrics concentration of critical journeys on single vendors/regions.",
    "Metric shows 70% journeys on one cloud region; dual-region plan dated.",
    "Vendor count metrics ignoring journey concentration."
  ],
  [
    "Buffer HQLA versus regulatory minimum",
    "Liquidity risk",
    "Buffer HQLA versus regulatory minimum sets internal HQLA buffer above regulatory LCR for management appetite.",
    "Internal LCR target 120% vs reg 100%; buffer funded.",
    "Managing exactly to regulatory minimum."
  ],
  [
    "Shadow model detection analytics",
    "Model risk",
    "Shadow model detection analytics uses analytics to find calculators in use outside the model inventory.",
    "Analytics finds 12 pricing sheets; three material onboarded.",
    "Inventory attestation without detection analytics."
  ],
  [
    "Risk committee action ageing report",
    "Risk governance",
    "Risk committee action ageing report ages open risk committee actions with automatic escalation.",
    "Actions >90 days auto-escalate to board risk chair summary.",
    "Actions open for a year without escalation."
  ],
  [
    "Vol surface calibration IPV controls",
    "Market risk",
    "Vol surface calibration IPV controls controls vol surface calibration sources and IPV for option books.",
    "Calibration to stale broker marks; IPV fail £1.5m; source switched.",
    "Desk-only vol marks without IPV."
  ],
  [
    "Credit limit override dual approval",
    "Credit risk",
    "Credit limit override dual approval requires dual approval for limit overrides with time-bound excesses.",
    "Override to 120% for 5 days; second approver CRO delegate; auto-expiry.",
    "Permanent overrides via repeated one-day renewals."
  ],
  [
    "Business continuity test residual risk update",
    "Operational risk",
    "Business continuity test residual risk update updates residual risk ratings after BC/DR tests pass or fail.",
    "DR test fail keeps resilience residual red; investment prioritised.",
    "Green residual despite failed DR test."
  ],
  [
    "Deposit insurance coverage mapping",
    "Liquidity risk",
    "Deposit insurance coverage mapping maps which deposits are insured to refine runoff assumptions.",
    "Insured retail 60%; runoff lower than uninsured SME; LCR refined.",
    "Flat runoff ignoring insurance coverage."
  ],
  [
    "Model change dual environment testing",
    "Model risk",
    "Model change dual environment testing requires parallel run in a dual environment before production model changes.",
    "Parallel run 20 days; EL difference 3% within tolerance; promote.",
    "Hotfix to production on a Friday without parallel."
  ],
  [
    "Risk disclosure fair presentation review",
    "Risk governance",
    "Risk disclosure fair presentation review reviews external risk disclosures for consistency with internal residual ratings.",
    "ARA says cyber stable while internal residual red; wording fixed.",
    "Optimistic external risk narrative vs internal reds."
  ],
  [
    "Filtered historical simulation VaR",
    "Market risk",
    "Filtered historical simulation VaR reweights recent returns more heavily than distant ones so HS VaR reacts without discarding long history entirely.",
    "Half-life 30 days lifts VaR £2.8m→£3.5m after a vol spike; MRC minutes the half-life choice.",
    "Changing half-life after every breach to manage the number."
  ],
  [
    "VaR covariance matrix shrinkage",
    "Market risk",
    "VaR covariance matrix shrinkage shrinks noisy sample covariances toward a structured target so portfolio VaR is more stable.",
    "Ledoit-Wolf shrink cuts day-to-day VaR churn 40%; desk limits use shrunk matrix.",
    "Raw sample Σ with 30 days and 200 factors."
  ],
  [
    "Stressed ES versus stressed VaR pack",
    "Market risk",
    "Stressed ES versus stressed VaR pack reports both stressed ES and stressed VaR so tail capital and limits are not confused.",
    "Stressed ES £62m vs stressed VaR £48m; capital narrative uses ES; desk soft limit uses VaR.",
    "Using stressed VaR language when the binding metric is ES."
  ],
  [
    "Risk factor proxy residual limit",
    "Market risk",
    "Risk factor proxy residual limit caps unexplained residual after proxy mapping so unmapped basis cannot grow silently.",
    "Proxy residual VaR £0.7m vs £0.5m limit; name onboarded as modellable factor.",
    "Infinite proxying with no residual cap."
  ],
  [
    "Equity single-stock concentration VaR",
    "Market risk",
    "Equity single-stock concentration VaR attributes equity VaR to single names and enforces issuer concentration inside the VaR limit.",
    "One name is 22% of equity VaR; pre-emptive trim before hard limit.",
    "Diversified VaR green while one name dominates."
  ],
  [
    "FX quanto adjustment risk inventory",
    "Market risk",
    "FX quanto adjustment risk inventory inventories quanto and cross-gamma risks that linear FX delta misses.",
    "Quanto book stress −£1.4m; cross-gamma limit added.",
    "Delta-only FX limits on quanto structures."
  ],
  [
    "Commodity smile risk bucket report",
    "Market risk",
    "Commodity smile risk bucket report buckets commodity option vega/volga across strikes and tenors for smile risk.",
    "Wing vega limit breach on WTI; smile flattened.",
    "Net vega only across the whole smile."
  ],
  [
    "Mortgage prepayment RNIV capital",
    "Market risk",
    "Mortgage prepayment RNIV capital capitalises mortgage prepayment risk when it is not in the VaR engine as RNIV.",
    "Prepayment RNIV £4m until factor onboarded; product growth capped.",
    "Ignoring prepayment because duration is hedged."
  ],
  [
    "Auction date liquidity horizon uplift",
    "Market risk",
    "Auction date liquidity horizon uplift uplifts liquidity horizons around known auction/illiquidity dates for affected positions.",
    "Gilt auction week horizon 1d→3d; internal VaR +£1.1m.",
    "Same horizon through known illiquid windows."
  ],
  [
    "Desk P&L to VaR ratio monitor",
    "Market risk",
    "Desk P&L to VaR ratio monitor flags when absolute P&L persistently exceeds VaR, signalling missing factors or wrong confidence.",
    "P&L/VaR >1 on eight days; mapping review opened.",
    "Ignoring chronic P&L>VaR as 'bad luck'."
  ],
  [
    "Interest rate convexity hedge slippage",
    "Market risk",
    "Interest rate convexity hedge slippage tracks P&L from convexity and gamma not captured by DV01 hedges.",
    "Convexity slippage −£0.6m on 25bp move; convexity limit introduced.",
    "Calling the book hedged on DV01 alone."
  ],
  [
    "Credit index basis limit CDX vs CDX options",
    "Market risk",
    "Credit index basis limit CDX vs CDX options limits basis between index CDS and index options that can gap in stress.",
    "Basis P&L −£1.9m; basis VaR add-on raised.",
    "Netting index delta and option delta to zero risk."
  ],
  [
    "Sovereign curve steepener stress set",
    "Market risk",
    "Sovereign curve steepener stress set applies standardised steepener/flattener stresses to sovereign curve books.",
    "2s30s steepener −£8m; ALCO hedge approved.",
    "Parallel shocks only for sovereign ALM."
  ],
  [
    "ETF creation redemption liquidity risk",
    "Market risk",
    "ETF creation redemption liquidity risk captures liquidity and basis risk in ETF market-making around create/redeem windows.",
    "Create/redeem fail stress needs £40m cash; buffer pre-positioned.",
    "Treating ETF inventory as cash-equivalent."
  ],
  [
    "Volatility risk premium harvesting limit",
    "Market risk",
    "Volatility risk premium harvesting limit caps short-vol harvesting strategies with stress and gap limits, not only vega.",
    "Short-vol gap limit £5m per 5vol point; utilisation 80% ahead of event.",
    "Vega-flat short vol with huge gap risk."
  ],
  [
    "Cleared versus bilateral IM disparity",
    "Credit risk",
    "Cleared versus bilateral IM disparity tracks initial margin differences between cleared and bilateral books for liquidity and credit.",
    "Bilateral IM £120m vs cleared £40m on similar risk; migration plan funded.",
    "Ignoring IM location in counterparty strategy."
  ],
  [
    "Credit valuation adjustment market hedges P&L",
    "Credit risk",
    "Credit valuation adjustment market hedges P&L attributes CVA desk P&L to credit spreads, rates, and FX to validate hedge design.",
    "70% CVA P&L from credit; 20% rates unexplained—rates hedge added.",
    "One-line CVA P&L with no factor split."
  ],
  [
    "Wrong-way risk collateral FX mismatch",
    "Credit risk",
    "Wrong-way risk collateral FX mismatch flags when collateral currency differs from exposure in a way that worsens together.",
    "EUR collateral on USD exposure; WWR multiplier 1.3 applied.",
    "Assuming collateral always reduces risk regardless of FX."
  ],
  [
    "Obligor rating outlook watchlist automation",
    "Credit risk",
    "Obligor rating outlook watchlist automation auto-adds names to watchlist on negative outlook or downgrade with limit freeze rules.",
    "Outlook negative → freeze same day; three names caught.",
    "Manual watchlist updates lagging weeks."
  ],
  [
    "Trade finance documentary risk checklist",
    "Credit risk",
    "Trade finance documentary risk checklist checks documentary compliance risk on LCs separately from obligor credit.",
    "Discrepant docs delayed payment 12 days; process control finding.",
    "LC credit approval without documentary ops review."
  ],
  [
    "Commercial real estate interest cover stress",
    "Credit risk",
    "Commercial real estate interest cover stress stresses CRE ICR under higher rates and lower occupancy jointly.",
    "ICR <1.2x on 18% of book in joint stress; Stage 2 overlay raised.",
    "LTV-only CRE stress."
  ],
  [
    "SME PD scorecard reject inference bias",
    "Credit risk",
    "SME PD scorecard reject inference bias tests whether reject inference and through-the-door bias distort SME PD.",
    "Reject inference uplift PD 30 bps; model change material.",
    "Through-the-door PD treated as portfolio PD."
  ],
  [
    "LGD downturn collateral lag model",
    "Credit risk",
    "LGD downturn collateral lag model models collateral sale lag and price path in downturn LGD, not only haircut.",
    "Lag 18 months adds 8pp to downturn LGD; IRB pack updated.",
    "Instant fire-sale haircut only."
  ],
  [
    "EAD for revolving with behavioural maturity",
    "Credit risk",
    "EAD for revolving with behavioural maturity uses behavioural maturity and draw patterns for revolving EAD beyond contractual.",
    "Behavioural maturity 2.1y vs contractual 1y; EAD up 12%.",
    "Contractual maturity only for revolvers."
  ],
  [
    "Connected clients economic dependence test",
    "Credit risk",
    "Connected clients economic dependence test tests supply, guarantee, and cash-flow dependence to aggregate connected clients.",
    "Supplier-customer pair aggregated; limit breach remediated.",
    "Legal separation treated as risk separation always."
  ],
  [
    "Sovereign ceiling exception evidence pack",
    "Credit risk",
    "Sovereign ceiling exception evidence pack evidences mitigants when corporate grades pierce the sovereign ceiling.",
    "Offshore cash and hard-currency receivables support +1 notch exception; CRO signed.",
    "Exceptions without mitigant evidence."
  ],
  [
    "Settlement risk multilateral netting eligibility",
    "Credit risk",
    "Settlement risk multilateral netting eligibility confirms which payments qualify for multilateral netting in settlement risk.",
    "Non-CLS pair kept principal risk; limit headroom cut.",
    "Assuming all FX settles with multilateral netting."
  ],
  [
    "Credit insurance claim operability test",
    "Credit risk",
    "Credit insurance claim operability test tests whether credit insurance claims processes are operable and within policy terms.",
    "Claim drill finds notice period missed historically; process redesigned.",
    "Insurance presence as automatic risk transfer."
  ],
  [
    "Forbearance cure definition credit policy",
    "Credit risk",
    "Forbearance cure definition credit policy defines when forborne loans can cure back to performing for staging and watchlist.",
    "Cure requires 12 months clean pay; 40% fail cure—ECL retained.",
    "Immediate cure on one payment after forbearance."
  ],
  [
    "Sector contagion credit VaR uplift",
    "Credit risk",
    "Sector contagion credit VaR uplift uplifts credit VaR when sector correlations spike beyond calibration.",
    "CRE contagion uplift +£5m credit VaR; sector limit cut.",
    "Static sector ρ through a sector crisis."
  ],
  [
    "Op risk boundary with market P&L",
    "Operational risk",
    "Op risk boundary with market P&L clarifies when trading losses are market risk versus operational (rogue, misbook).",
    "Misbooked product treated as op loss £2m; market VaR untouched.",
    "Parking op losses in market P&L."
  ],
  [
    "RCSA inherent score monetary anchors",
    "Operational risk",
    "RCSA inherent score monetary anchors anchors inherent impact scores to monetary bands firm-wide.",
    "£10m+ = critical inherent; scores recalibrated across ops.",
    "Inherent colours incomparable across divisions."
  ],
  [
    "KRI predictive validation backtest",
    "Operational risk",
    "KRI predictive validation backtest backtests whether KRIs actually led losses or incidents.",
    "Failed settlement KRI led 60% of related losses; kept. Vanity KRI dropped.",
    "KRIs never validated against outcomes."
  ],
  [
    "Scenario correlation in op risk capital",
    "Operational risk",
    "Scenario correlation in op risk capital applies dependence between op risk scenarios so capital is not a naive sum.",
    "Copula dependence cuts summed scenarios £80m→£55m capital.",
    "Summing scenario maxima as capital."
  ],
  [
    "Conduct customer remediation quality assurance",
    "Operational risk",
    "Conduct customer remediation quality assurance QA samples remediation outcomes for correctness and completeness.",
    "QA fail rate 8%; remediation restarted for one cohort.",
    "Remediation counted complete on contact attempt only."
  ],
  [
    "Change risk residual acceptance after go-live",
    "Operational risk",
    "Change risk residual acceptance after go-live requires dated acceptance of residual change risk with exit criteria.",
    "Dual-run residual accepted 60 days; exited on recon stability.",
    "Temporary change controls still live a year later."
  ],
  [
    "Fourth-party subprocessor resilience map",
    "Operational risk",
    "Fourth-party subprocessor resilience map extends third-party maps to critical fourth parties / subprocessors.",
    "Payments processor cloud region is single fourth party; dual-region demanded.",
    "Vendor diligence stopping at the prime contractor."
  ],
  [
    "Internal fraud data analytics typology pack",
    "Operational risk",
    "Internal fraud data analytics typology pack packs analytics typologies for mandate fraud, ghost vendors, and collusion.",
    "Ghost vendor analytics recover £0.3m; SOD fixed.",
    "Fraud analytics without typologies."
  ],
  [
    "IBS dependency resource mapping completeness",
    "Operational risk",
    "IBS dependency resource mapping completeness tests completeness of people/tech/facility/third-party maps under each IBS.",
    "Card auth IBS missing alternate site staff; remediated.",
    "System lists presented as IBS maps."
  ],
  [
    "Near-miss severity scoring for learning",
    "Operational risk",
    "Near-miss severity scoring for learning scores near-misses by potential severity so learning prioritises the dangerous ones.",
    "High-potential near-miss funds automation; low ones batched.",
    "All near-misses equal noise."
  ],
  [
    "SMA ILM loss data quality gate",
    "Operational risk",
    "SMA ILM loss data quality gate gates internal loss multiplier inputs on loss data completeness and thresholds.",
    "ILM rises after threshold cut improves capture; capital restated.",
    "ILM gamed by high thresholds."
  ],
  [
    "LCR Level 2A versus 2B composition cap",
    "Liquidity risk",
    "LCR Level 2A versus 2B composition cap monitors Level 2A/2B caps and composition so HQLA eligibility stays valid daily.",
    "Level 2B breach after downgrade; assets removed same day.",
    "Composition caps checked only month-end."
  ],
  [
    "NSFR RSF for securities financing",
    "Liquidity risk",
    "NSFR RSF for securities financing applies required stable funding factors to SFT books with collateral grade sensitivity.",
    "Reverse repo RSF up after collateral downgrade; NSFR −2pp.",
    "Flat RSF ignoring collateral quality."
  ],
  [
    "Intraday throughput payment queue risk",
    "Liquidity risk",
    "Intraday throughput payment queue risk monitors payment queue throughput so liquidity peaks do not strand critical payments.",
    "Queue delay 40 minutes on month-end; pre-funding rule set.",
    "End-of-day liquidity OK while noon queues fail."
  ],
  [
    "CFP monetisation capacity versus book size",
    "Liquidity risk",
    "CFP monetisation capacity versus book size tests whether assumed monetisation volumes fit realistic market capacity.",
    "HY sale assumption cut £500m→£200m/week; buffer raised.",
    "Parachute sales of the whole HY book in a day."
  ],
  [
    "Deposit beta asymmetric up versus down",
    "Liquidity risk",
    "Deposit beta asymmetric up versus down uses different deposit betas for rising versus falling rate paths in FTP and stress.",
    "Up-beta 0.6 / down-beta 0.3; NIM and outflow models updated.",
    "Symmetric beta in both directions."
  ],
  [
    "Encumbrance by collateral class dashboard",
    "Liquidity risk",
    "Encumbrance by collateral class dashboard breaks encumbrance by asset class so unencumbered buffers are visible by type.",
    "Gilts encumbrance 55%; unencumbered Level 1 thin—issuance plan.",
    "Single encumbrance % hiding Level 1 scarcity."
  ],
  [
    "FTP contingent liquidity for undrawn RCFs",
    "Liquidity risk",
    "FTP contingent liquidity for undrawn RCFs charges FTP for contingent liquidity on undrawn committed facilities by segment.",
    "Non-op RCF FTP +20 bps undrawn; demand softens.",
    "Drawn-only FTP with free undrawn options."
  ],
  [
    "Liquidity EWI market-implied set",
    "Liquidity risk",
    "Liquidity EWI market-implied set includes market-implied EWIs—CDS, CP spreads, equity—in the liquidity dashboard.",
    "CP spread +35 bps triggers amber; term issuance brought forward.",
    "Internal deposit EWIs only."
  ],
  [
    "Committed facility draw correlation stress",
    "Liquidity risk",
    "Committed facility draw correlation stress stresses correlated draws across RCFs when market stress hits many borrowers.",
    "Correlated 40% draw on £3bn undrawn; outflow pre-funded.",
    "Independent draw assumptions in a systemic stress."
  ],
  [
    "Rehypothecation recall liquidity buffer",
    "Liquidity risk",
    "Rehypothecation recall liquidity buffer sizes buffers for collateral recall under rehypothecation agreements.",
    "Recall stress £150m; HQLA target raised.",
    "Reuse income without recall buffer."
  ],
  [
    "Wholesale maturity ladder board limit",
    "Liquidity risk",
    "Wholesale maturity ladder board limit limits wholesale funding maturing in any rolling 30-day window.",
    "Ladder breach £1.5bn in March window; issuance smoothed.",
    "Average maturity OK with a cliff week."
  ],
  [
    "Model materiality scoring for validation depth",
    "Model risk",
    "Model materiality scoring for validation depth scores model materiality to set validation depth, frequency, and challenger needs.",
    "Tier-1 market VaR annual full validation; tier-3 annual peer review.",
    "Same validation for every model."
  ],
  [
    "Model developer versus owner role split",
    "Model risk",
    "Model developer versus owner role split splits developer, owner, and validator roles with named individuals.",
    "Owner attests use; developer cannot approve own model.",
    "Developer self-attesting as owner."
  ],
  [
    "Population stability index alert bands",
    "Model risk",
    "Population stability index alert bands sets PSI alert bands for monitoring drift with action playbooks.",
    "PSI 0.25 red on PD segment; lending freeze on that segment.",
    "PSI reported with no action bands."
  ],
  [
    "Challenger promotion criteria checklist",
    "Model risk",
    "Challenger promotion criteria checklist checklists evidence required before a challenger can replace a champion.",
    "Checklist blocks promotion despite better Gini due to fairness fail.",
    "Promoting on a single metric win."
  ],
  [
    "IPV price source hierarchy policy",
    "Model risk",
    "IPV price source hierarchy policy ranks independent price sources for IPV and documents fallbacks.",
    "Consensus > exchange > broker; fallback used twice this month.",
    "Desk marks as IPV source."
  ],
  [
    "Overlay dual control and expiry",
    "Model risk",
    "Overlay dual control and expiry requires dual control to set overlays and hard expiry dates.",
    "Overlay +£3m ECL dual-approved; expires in 60 days.",
    "Single-person permanent overlays."
  ],
  [
    "Model change parallel run tolerance",
    "Model risk",
    "Model change parallel run tolerance sets quantitative tolerances for parallel runs before production promotion.",
    "EL difference 2% within 5% tolerance; promote.",
    "Promote despite 15% parallel gap."
  ],
  [
    "AI model adverse action reason testing",
    "Model risk",
    "AI model adverse action reason testing tests that AI adverse-action reasons are accurate and non-discriminatory.",
    "Reason codes mismatch features 12%; model blocked.",
    "Generic reasons for all declines."
  ],
  [
    "Vendor model exit and escrow plan",
    "Model risk",
    "Vendor model exit and escrow plan plans exit, data return, and escrow for critical vendor models.",
    "Escrow triggered on vendor downgrade rumour; tested restore.",
    "Critical vendor model with no exit."
  ],
  [
    "Benchmark model governance for AVA",
    "Model risk",
    "Benchmark model governance for AVA governs benchmark models used for additional valuation adjustments.",
    "Benchmark range feeds AVA £2.5m; committee minutes.",
    "AVA from informal chat marks."
  ],
  [
    "Model risk appetite breach auto-report",
    "Model risk",
    "Model risk appetite breach auto-report auto-reports appetite breaches on overdue validations and unapproved models.",
    "Unapproved tool auto-reported to MRC same day.",
    "Breaches found only at quarter-end."
  ],
  [
    "Risk appetite metric lineage certificate",
    "Risk governance",
    "Risk appetite metric lineage certificate certificates lineage from board appetite metrics to source systems each quarter.",
    "Two metrics fail lineage; footnoted and fixed.",
    "Board metrics with unknown lineage."
  ],
  [
    "Principal risk owner deputy register",
    "Risk governance",
    "Principal risk owner deputy register registers deputies for principal risk owners to cover absence.",
    "Deputy acted during CRO leave; escalation unbroken.",
    "Owner on leave; risk orphaned."
  ],
  [
    "Risk committee MI decision usefulness score",
    "Risk governance",
    "Risk committee MI decision usefulness score scores MI packs for decision usefulness after each meeting.",
    "Score 3.4/5; stress pages redesigned.",
    "MI volume mistaken for quality."
  ],
  [
    "Product approval risk opinion SLA clock",
    "Risk governance",
    "Product approval risk opinion SLA clock clocks second-line risk opinions in product approval with hard holds.",
    "Opinion late; launch held—process capacity funded.",
    "Launch without opinion because of schedule."
  ],
  [
    "Emerging risk to scenario promotion criteria",
    "Risk governance",
    "Emerging risk to scenario promotion criteria criteria for promoting emerging risks into formal stress scenarios.",
    "AI opacity promoted to ICAAP scenario after two quarters on watch.",
    "Emerging forever; never scenario."
  ],
  [
    "Culture indicator link to loss events",
    "Risk governance",
    "Culture indicator link to loss events links culture indicators to subsequent loss/incident rates.",
    "Low speak-up precedes late reporting spike; channel redesigned.",
    "Culture scores in a vacuum."
  ],
  [
    "Capital trigger playbook communications tree",
    "Risk governance",
    "Capital trigger playbook communications tree trees communications for capital contingency triggers with acknowledgements.",
    "Drill finds missing investor comms owner; fixed.",
    "Trigger without comms tree."
  ],
  [
    "Stress assumption change control board",
    "Risk governance",
    "Stress assumption change control board boards a change-control log for stress assumptions mid-cycle.",
    "Late HPI path change version-bumped with MRC approval.",
    "Silent assumption edits."
  ],
  [
    "Appetite hard breach 24-hour evidence pack",
    "Risk governance",
    "Appetite hard breach 24-hour evidence pack assembles evidence packs within 24 hours of hard appetite breaches.",
    "Pack to chair in 18 hours; remediation dated.",
    "Breach noted next quarter."
  ],
  [
    "Risk data recon breaks ageing to CRO",
    "Risk governance",
    "Risk data recon breaks ageing to CRO ages risk data recon breaks to CRO when SLA missed.",
    "Break >5 days auto-escalates; two this month.",
    "Breaks ageing in IT only."
  ],
  [
    "Capacity buffer quantification method",
    "Risk governance",
    "Capacity buffer quantification method quantifies the buffer between capacity and appetite with method notes.",
    "Buffer £20m VaR = estimation error + stress; method in QBR.",
    "Vague 'prudent buffer' language."
  ],
  [
    "Combined assurance intentional duplication log",
    "Risk governance",
    "Combined assurance intentional duplication log logs when duplicate assurance is intentional versus accidental.",
    "AML dual review intentional post-remediation; logged.",
    "Accidental triple coverage."
  ],
  [
    "Risk acceptance customer impact tag",
    "Risk governance",
    "Risk acceptance customer impact tag tags acceptances with customer impact to prioritise revisit.",
    "Customer-impacting acceptance revisited early after complaint spike.",
    "All acceptances same priority."
  ],
  [
    "Board KPI drill path latency SLA",
    "Risk governance",
    "Board KPI drill path latency SLA SLAs latency of drill-down from board KPI to underlying positions.",
    "Drill path >30s fails SLA; optimised.",
    "KPI without workable drill."
  ],
  [
    "Market risk limit framework annual recalibration",
    "Market risk",
    "Market risk limit framework annual recalibration recalibrates desk limits annually against appetite, capital, and book growth.",
    "Limits uplifted 10% with capital; CRE desk cut 15%.",
    "Legacy limits unchanged for five years."
  ],
  [
    "Backtesting clean P&L sign-off control",
    "Market risk",
    "Backtesting clean P&L sign-off control requires dual sign-off that backtesting P&L is clean hypothetical.",
    "Sign-off catches intraday trades left in series; restated.",
    "Unclean P&L signed as clean."
  ],
  [
    "NMRF observation count evidence",
    "Market risk",
    "NMRF observation count evidence evidences real price observation counts for modellability assessments.",
    "Factor has 18 observations vs 25 needed; NMRF retained.",
    "Broker runs counted as real prices."
  ],
  [
    "Trading book intent attestation sample",
    "Market risk",
    "Trading book intent attestation sample samples trading book intent attestations against actual holding behaviour.",
    "Hold-to-collect pattern in trading book; reclass forced.",
    "Attestation theatre."
  ],
  [
    "Incremental risk charge hedge eligibility",
    "Market risk",
    "Incremental risk charge hedge eligibility checks hedge eligibility in IRC so offsets are not overstated.",
    "Ineligible hedge removed; IRC +£3m.",
    "Any short credit as IRC hedge."
  ],
  [
    "Crisis correlation override governance",
    "Market risk",
    "Crisis correlation override governance governs temporary crisis correlation overrides with expiry.",
    "ρ=0.9 override for two weeks; auto-expired.",
    "Crisis ρ left on forever."
  ],
  [
    "Short gamma earnings event playbook",
    "Market risk",
    "Short gamma earnings event playbook playbooks actions for short-gamma books into binary events.",
    "Playbook cuts gamma 50% into election; loss avoided.",
    "Full short gamma into prints."
  ],
  [
    "Overnight gap limit by sector news",
    "Market risk",
    "Overnight gap limit by sector news sets overnight gap limits tighter into known sector event clusters.",
    "Pharma PDUFA week gap limit −30%; positions cut.",
    "Static overnight limits always."
  ],
  [
    "Stress attribution action tracker",
    "Market risk",
    "Stress attribution action tracker tracks actions from stress factor attributions to closure.",
    "10y DV01 hedge action closed in five days.",
    "Attribution without actions."
  ],
  [
    "Vega expiry bucket limit ladder",
    "Market risk",
    "Vega expiry bucket limit ladder ladders vega limits by expiry bucket with gross and net caps.",
    "1m bucket gross breach despite net flat; flattened.",
    "Net-only vega."
  ],
  [
    "Jump-to-default hedge timeliness SLA",
    "Market risk",
    "Jump-to-default hedge timeliness SLA SLAs time to cut JTD after a credit event signal.",
    "SLA four hours; CDS bought in two.",
    "JTD cut next week."
  ],
  [
    "Commodity calendar spread limit set",
    "Market risk",
    "Commodity calendar spread limit set sets calendar spread limits separate from prompt delta.",
    "1s12s limit hit; deferred cut.",
    "Prompt delta hedging only."
  ],
  [
    "PiT PD point-in-cycle placement",
    "Credit risk",
    "PiT PD point-in-cycle placement documents where on the cycle PiT PDs sit versus long-run for overlays.",
    "PiT above TTC by 40%; Stage 2 ECL elevated—explained.",
    "PiT treated as TTC."
  ],
  [
    "Downturn LGD floor versus experience",
    "Credit risk",
    "Downturn LGD floor versus experience floors downturn LGD at regulatory or internal minima evidenced by experience.",
    "Floor 45% binds above model 38%; capital uses floor.",
    "Model below floor used for capital."
  ],
  [
    "Undrawn commitment behavioural CCF",
    "Credit risk",
    "Undrawn commitment behavioural CCF estimates CCFs from pre-default draw behaviour by product.",
    "Card CCF 75% vs 50% regulatory; limits use internal.",
    "Regulatory CCF as behavioural truth."
  ],
  [
    "Migration matrix cohort stability test",
    "Credit risk",
    "Migration matrix cohort stability test tests whether migration matrices are stable across cohorts before use.",
    "CRE matrix unstable; stress overlay added.",
    "Pooled matrix for unstable sectors."
  ],
  [
    "Name concentration capital add-on method",
    "Credit risk",
    "Name concentration capital add-on method documents method for single-name concentration capital add-ons.",
    "Granularity add-on £6m; method in ICAAP.",
    "No add-on despite top-10 40%."
  ],
  [
    "Specific wrong-way risk deal checklist",
    "Credit risk",
    "Specific wrong-way risk deal checklist checklists SWR indicators at deal approval.",
    "Airline fuel derivative flagged SWR; tenor cut.",
    "CWR only, SWR ignored."
  ],
  [
    "CVA hedge CDS single-name availability",
    "Credit risk",
    "CVA hedge CDS single-name availability assesses single-name CDS availability before claiming CVA hedgeability.",
    "No single-name; index hedge residual disclosed.",
    "Index claimed as perfect CVA hedge."
  ],
  [
    "Margin dispute legal ownership clock",
    "Credit risk",
    "Margin dispute legal ownership clock clocks legal ownership of margin disputes to credit officers.",
    "Dispute >T+1 owned by CCO delegate; trading restricted.",
    "Disputes stuck in ops."
  ],
  [
    "Tenor limit waterfall approval",
    "Credit risk",
    "Tenor limit waterfall approval waterfalls approvals when tenor bucket limits are breached.",
    " >5y breach needs CRO; deal shortened instead.",
    "Notional limit used for 10y risk."
  ],
  [
    "Shadow rating override dual control",
    "Credit risk",
    "Shadow rating override dual control dual-controls overrides of model shadow ratings.",
    "Override +2 notches dual-approved with expiry.",
    "Analyst self-override permanent."
  ],
  [
    "Forbearance IFRS 9 staging reconciler",
    "Credit risk",
    "Forbearance IFRS 9 staging reconciler reconciles forbearance flags to Stage 2/3 nightly.",
    "Five mismatches fixed before close.",
    "Flags and stages diverge."
  ],
  [
    "CRE valuation frequency under stress",
    "Credit risk",
    "CRE valuation frequency under stress increases CRE valuation frequency when market stress indicators trip.",
    "Stress trip → quarterly valuations become monthly.",
    "Annual vals through a CRE crash."
  ],
  [
    "Netting opinion refresh SLA",
    "Credit risk",
    "Netting opinion refresh SLA SLAs refresh of netting/collateral opinions before expiry.",
    "Opinion refreshed 30 days pre-expiry; no gross spike.",
    "Expired opinions discovered in audit."
  ],
  [
    "Herstatt limit intraday clock",
    "Credit risk",
    "Herstatt limit intraday clock clocks intraday settlement risk peaks against Herstatt limits.",
    "Peak 11:40 breach projected; ticket split.",
    "End-of-day settlement risk only."
  ],
  [
    "Sovereign ceiling committee minutes",
    "Credit risk",
    "Sovereign ceiling committee minutes minutes sovereign ceiling exceptions with votes and mitigants.",
    "Two exceptions minuted; one denied.",
    "Verbal exceptions."
  ],
  [
    "CVA recovery stress board metric",
    "Credit risk",
    "CVA recovery stress board metric boards CVA sensitivity to recovery rate as a standard metric.",
    "Recovery −20pp → CVA +£4m; hedged.",
    "PD-only CVA narrative."
  ],
  [
    "Credit VaR sector ρ governance",
    "Credit risk",
    "Credit VaR sector ρ governance governs sector correlation parameters with version control.",
    "ρ version 8 locked for quarter.",
    "Ad-hoc ρ tweaks."
  ],
  [
    "Watchlist exit criteria discipline",
    "Credit risk",
    "Watchlist exit criteria discipline defines exit criteria from watchlist so names do not linger or exit early.",
    "Exit after two clean quarters; 12 exits documented.",
    "Watchlist as permanent scarlet letter—or revolving door."
  ],
  [
    "Op loss threshold inflation adjust",
    "Operational risk",
    "Op loss threshold inflation adjust  inflates loss data thresholds with wage/price indices periodically.",
    "Threshold £5k→£5.5k; capture still complete.",
    "Stale nominal thresholds for a decade."
  ],
  [
    "RCSA calibration inter-rater reliability",
    "Operational risk",
    "RCSA calibration inter-rater reliability measures inter-rater reliability of RCSA scores across facilitators.",
    "Kappa low; training mandated.",
    "Uncalibrated facilitators."
  ],
  [
    "KRI threshold dynamic recalibration",
    "Operational risk",
    "KRI threshold dynamic recalibration recalibrates KRI thresholds when process volumes change.",
    "Volume +40%; threshold recalibrated to rate not count.",
    "Count thresholds obsolete after growth."
  ],
  [
    "Cyber scenario customer harm estimate",
    "Operational risk",
    "Cyber scenario customer harm estimate estimates customer harm hours and remediation in cyber scenarios—not only IT cost.",
    "Harm 2m customer-hours; £12m remediation in scenario.",
    "IT rebuild cost only."
  ],
  [
    "External loss relevance filter board",
    "Operational risk",
    "External loss relevance filter board boards relevance filters for external loss data inclusion.",
    "Filter drops unrelated retail fraud for a wholesale firm.",
    "All headline losses included."
  ],
  [
    "Conduct provision to outcome recon",
    "Operational risk",
    "Conduct provision to outcome recon recons conduct provisions to customer outcome completion rates.",
    "Provision £6m; outcomes 70% complete; recon explained.",
    "Provision without outcome tracking."
  ],
  [
    "Go-live risk gate evidence standard",
    "Operational risk",
    "Go-live risk gate evidence standard standards evidence required at change risk gates.",
    "Gate fails without recon evidence; delayed.",
    "Gate as signature page."
  ],
  [
    "Third-party concentration board appetite",
    "Operational risk",
    "Third-party concentration board appetite sets board appetite on max % of critical journeys per vendor.",
    "Appetite 40% per vendor; current 55%—plan dated.",
    "No concentration appetite."
  ],
  [
    "Fraud typology control coverage matrix",
    "Operational risk",
    "Fraud typology control coverage matrix matrices fraud typologies to preventive/detective controls.",
    "Mandate fraud typology uncovered; control designed.",
    "Generic fraud controls only."
  ],
  [
    "Impact tolerance breach customer metrics",
    "Operational risk",
    "Impact tolerance breach customer metrics requires customer harm metrics in every impact tolerance breach report.",
    "Breach report includes customers affected and duration.",
    "Technical downtime only."
  ],
  [
    "BI mapping change dual control",
    "Operational risk",
    "BI mapping change dual control dual-controls changes to SMA business indicator mappings.",
    "Mapping change dual-approved; capital −2%.",
    "Unilateral BI remap."
  ],
  [
    "Near-miss to RCSA feedback loop",
    "Operational risk",
    "Near-miss to RCSA feedback loop feeds near-miss themes into RCSA residual scoring.",
    "Payments near-misses uplift residual; control investment.",
    "Near-misses siloed from RCSA."
  ],
  [
    "HQLA operational control attestation",
    "Liquidity risk",
    "HQLA operational control attestation attests daily that HQLA is unencumbered and treasury-controlled.",
    "Attestation fails on pledged bonds; removed from HQLA.",
    "Stale eligibility tags."
  ],
  [
    "ASF factor product feature review",
    "Liquidity risk",
    "ASF factor product feature review reviews product features that change ASF factors (brokered, rate-sensitive).",
    "Feature review reclasses £200m; NSFR −3pp.",
    "Product features ignored in ASF."
  ],
  [
    "Intraday liquidity stress playbook",
    "Liquidity risk",
    "Intraday liquidity stress playbook playbooks actions when intraday peaks breach buffers.",
    "Playbook pre-positions collateral; peak covered.",
    "Intraday breach improvisation."
  ],
  [
    "CFP counterparties reachability test",
    "Liquidity risk",
    "CFP counterparties reachability test tests reachability of CFP monetisation counterparties quarterly.",
    "Two unreachable; backups added.",
    "Stale contact sheets."
  ],
  [
    "Runoff segmentation product mapping",
    "Liquidity risk",
    "Runoff segmentation product mapping maps every deposit product to a runoff segment with owner.",
    "Mapping finds misclass; outflow +£100m in stress.",
    "Unmapped products in 'other 10%'."
  ],
  [
    "Encumbrance limit soft versus hard",
    "Liquidity risk",
    "Encumbrance limit soft versus hard defines soft/hard encumbrance limits with different escalations.",
    "Soft 25% / hard 30%; soft breach remediated in five days.",
    "Single limit with unclear escalation."
  ],
  [
    "FTP liquidity curve governance committee",
    "Liquidity risk",
    "FTP liquidity curve governance committee governs FTP liquidity premia via a named committee and calendar.",
    "Curve updated quarterly; ALCO approved.",
    "FTP liquidity set by one desk."
  ],
  [
    "EWI owner acknowledgement SLA",
    "Liquidity risk",
    "EWI owner acknowledgement SLA requires EWI owners to acknowledge amber/red within hours.",
    "Acknowledgement median 2h; one breach explained.",
    "EWIs firing into a void."
  ],
  [
    "Undrawn stress by industry correlation",
    "Liquidity risk",
    "Undrawn stress by industry correlation varies undrawn draw assumptions by industry stress correlation.",
    "Oil & gas undrawn draw 50% in oil stress; buffer sized.",
    "Flat draw across industries."
  ],
  [
    "Reuse inventory legal enforceability",
    "Liquidity risk",
    "Reuse inventory legal enforceability checks legal enforceability of reuse/rehypothecation terms by jurisdiction.",
    "One jurisdiction blocks reuse; inventory restated.",
    "Global reuse assumption."
  ],
  [
    "Rollover calendar board exception",
    "Liquidity risk",
    "Rollover calendar board exception requires board-level exception for rollover cliffs above policy.",
    "Exception denied; issuance brought forward.",
    "Silent cliffs."
  ],
  [
    "Model inventory orphan detection job",
    "Model risk",
    "Model inventory orphan detection job jobs detect models in production logs missing from inventory.",
    "Job finds two scorers; onboarded.",
    "Attestation without detection."
  ],
  [
    "Validator incentive independence test",
    "Model risk",
    "Validator incentive independence test tests that validator incentives are not tied to business P&L.",
    "Comp review confirms independence; OK.",
    "Validators in desk bonus pools."
  ],
  [
    "Drift alert to lending policy link",
    "Model risk",
    "Drift alert to lending policy link links model drift alerts to automatic lending policy constraints.",
    "Drift red freezes new originations in segment.",
    "Drift noted; lending continues."
  ],
  [
    "Challenger data lineage parity",
    "Model risk",
    "Challenger data lineage parity requires challengers to use lineage-parity data versus champion.",
    "Parity fail explains challenger gap; not a win.",
    "Challenger on cleaner data unfairly."
  ],
  [
    "IPV unexplained threshold escalation",
    "Model risk",
    "IPV unexplained threshold escalation escalates IPV unexplained above threshold to product control head.",
    "£1m unexplained escalated; smile fixed.",
    "IPV breaks rolled."
  ],
  [
    "Overlay register board summary",
    "Model risk",
    "Overlay register board summary summarises material overlays for MRC/board quarterly.",
    "Summary shows £12m overlays; two near expiry.",
    "Overlays invisible upstairs."
  ],
  [
    "Materiality triage appeal path",
    "Model risk",
    "Materiality triage appeal path paths appeals when developers dispute materiality triage.",
    "Appeal upholds material; full validation proceeds.",
    "Triage as unchallengeable."
  ],
  [
    "Fairness dashboard customer segment set",
    "Model risk",
    "Fairness dashboard customer segment set defines protected/customer segments for fairness dashboards.",
    "Segments approved by conduct; monthly dashboard live.",
    "Fairness without defined segments."
  ],
  [
    "Vendor model validation rights exercise",
    "Model risk",
    "Vendor model validation rights exercise exercises contractual validation rights on vendor models annually.",
    "Rights exercised; findings two medium.",
    "Rights never used."
  ],
  [
    "Benchmark AVA methodology note",
    "Model risk",
    "Benchmark AVA methodology note notes methodology linking benchmark ranges to AVA.",
    "Note ties 25th–75th range to AVA £2m.",
    "AVA plucked from air."
  ],
  [
    "Unapproved model kill-switch",
    "Model risk",
    "Unapproved model kill-switch implements kill-switch blocking unapproved models from production decisions.",
    "Kill-switch blocks one tool; incident logged.",
    "Unapproved models deciding credit."
  ],
  [
    "Appetite dictionary change control",
    "Risk governance",
    "Appetite dictionary change control change-controls the appetite metric dictionary with versioning.",
    "Dictionary v4 adds cyber KRI; board noted.",
    "Silent formula edits."
  ],
  [
    "Principal risk KRI leading/lagging mix",
    "Risk governance",
    "Principal risk KRI leading/lagging mix requires each principal risk to have at least one leading KRI.",
    "Credit adds watchlist inflow leading KRI.",
    "Only lagging losses."
  ],
  [
    "Risk committee skills gap hiring brief",
    "Risk governance",
    "Risk committee skills gap hiring brief briefs Nominations on risk committee skills gaps.",
    "Brief leads to NED with cyber background.",
    "Skills gaps unaddressed."
  ],
  [
    "Incident remapping SLA dashboard",
    "Risk governance",
    "Incident remapping SLA dashboard dashboards SLA compliance for incident-to-principal-risk remapping.",
    "SLA 90% met; two breaches explained.",
    "Remaps forgotten."
  ],
  [
    "Recovery option activation authority card",
    "Risk governance",
    "Recovery option activation authority card cards who can activate each recovery option and under what trigger.",
    "Card used in drill; authority clear.",
    "Ambiguous activators."
  ],
  [
    "Contagion matrix ownership",
    "Risk governance",
    "Contagion matrix ownership names owner and refresh cadence for the inter-risk contagion matrix.",
    "Owner CRO desk; annual refresh done.",
    "Orphan matrix."
  ],
  [
    "Deep-dive action closure rate",
    "Risk governance",
    "Deep-dive action closure rate tracks closure rates of actions from board risk deep-dives.",
    "Closure 85% in 90 days; target 95%.",
    "Deep-dives without closure."
  ],
  [
    "Second-line capacity plan recon",
    "Risk governance",
    "Second-line capacity plan recon recons second-line FTEs to the challenge/assurance plan hours.",
    "Shortfall 2 FTE; hiring approved.",
    "Plan without capacity."
  ],
  [
    "Temporary excess approval seniority map",
    "Market risk",
    "Temporary excess approval seniority map maps required seniority for temporary limit excess by size.",
    " >10% excess needs CRO; map enforced.",
    "Junior excess approvals."
  ],
  [
    "Unexplained P&L root-cause taxonomy",
    "Market risk",
    "Unexplained P&L root-cause taxonomy taxonomises unexplained P&L causes for trend fixing.",
    "60% mapping gaps; factor programme funded.",
    "Unexplained forever."
  ],
  [
    "CDS-bond basis stress limit",
    "Credit risk",
    "CDS-bond basis stress limit stresses and limits CDS-bond basis under liquidity crises.",
    "Basis stress −£4m; limit cut.",
    "Basis ignored in stress."
  ],
  [
    "Fails penalty to op risk bridge",
    "Operational risk",
    "Fails penalty to op risk bridge bridges settlement fail penalties into op risk loss/near-miss capture.",
    "Penalties £0.5m captured as op losses; process fix.",
    "Penalties only in P&L."
  ],
  [
    "IRRBB EVE versus NII dual view",
    "Liquidity risk",
    "IRRBB EVE versus NII dual view requires both EVE and NII views for banking book rate risk decisions.",
    "EVE −£90m / NII +£20m year-1; dual narrative to ALCO.",
    "NII-only IRRBB."
  ],
  [
    "Model performance board one-pager",
    "Model risk",
    "Model performance board one-pager one-pagers top model health for MRC with red/amber/green.",
    "Two ambers on PD; actions dated.",
    "Validation PDFs only."
  ],
  [
    "Speak-up risk case board theme",
    "Risk governance",
    "Speak-up risk case board theme themes speak-up risk cases for the board without compromising anonymity.",
    "Theme: sales pressure; incentive review ordered.",
    "Case detail leaked upstairs."
  ],
  [
    "Capital consumption desk scorecard",
    "Market risk",
    "Capital consumption desk scorecard scorecards desks on capital consumption versus P&L.",
    "High capital low P&L desk cut risk.",
    "P&L-only scorecards."
  ],
  [
    "PD/LGD uncertainty range disclosure",
    "Credit risk",
    "PD/LGD uncertainty range disclosure discloses uncertainty ranges around key credit parameters to IC.",
    "PD range ±40 bps shown; decision under range.",
    "Point estimates as truth."
  ],
  [
    "Op versus credit loss boundary memo",
    "Operational risk",
    "Op versus credit loss boundary memo memos boundary cases annually with examples.",
    "Loan process fraud → op; credit default → credit; memo clear.",
    "Double counting."
  ],
  [
    "Observed beta into CFP version bump",
    "Liquidity risk",
    "Observed beta into CFP version bump version-bumps CFP when observed deposit betas change materially.",
    "Beta 0.55→CFP v7; LCR stress restated.",
    "CFP betas stale."
  ],
  [
    "Validation severity customer impact factor",
    "Model risk",
    "Validation severity customer impact factor factors customer impact into validation finding severity.",
    "Fairness fail = high even if capital small.",
    "Capital-only severity."
  ],
  [
    "Board pack number freshness stamp",
    "Risk governance",
    "Board pack number freshness stamp stamps freshness/as-of on every board risk number.",
    "Mixed T+1/T+10 stamped; debate informed.",
    "Undated numbers."
  ],
  [
    "Correlation playbook desk drill",
    "Market risk",
    "Correlation playbook desk drill drills desk correlation breakdown playbooks annually.",
    "Drill cuts gross within hour; OK.",
    "Playbook unread."
  ],
  [
    "Local currency sovereign WWR add-on",
    "Credit risk",
    "Local currency sovereign WWR add-on adds WWR add-ons for foreign holders of local-currency sovereign debt.",
    "Add-on 1.4× on local bonds; limit tightened.",
    "Local sovereign as risk-free for foreigners."
  ],
  [
    "Consortium cyber scaling method note",
    "Operational risk",
    "Consortium cyber scaling method note notes method for scaling consortium cyber losses to the firm.",
    "Method uses revenue and control maturity; £9m scenario.",
    "Unscaled copy-paste."
  ],
  [
    "Cleared derivative NSFR recognition",
    "Liquidity risk",
    "Cleared derivative NSFR recognition recognises IM/VM in NSFR for cleared derivatives correctly.",
    "Recognition lifts NSFR 2pp after clearing migration.",
    "Stale bilateral NSFR treatment."
  ],
  [
    "PPNR path joint approval with credit",
    "Risk governance",
    "PPNR path joint approval with credit jointly approves PPNR and credit stress paths for coherence.",
    "Joint path locked; optimistic PPNR rejected.",
    "Incoherent paths."
  ],
  [
    "Stressed window product coverage test",
    "Market risk",
    "Stressed window product coverage test tests whether stressed VaR windows cover current product risk factors.",
    "Inflation products uncovered; NMRF until refresh.",
    "Old window for new books."
  ],
  [
    "Economic group limit system encoding",
    "Credit risk",
    "Economic group limit system encoding encodes economic group limits in booking systems, not only paper.",
    "System blocks ticket over group limit.",
    "Paper group limits."
  ],
  [
    "IBS end-to-end quarterly deep dive",
    "Operational risk",
    "IBS end-to-end quarterly deep dive deep-dives one IBS end-to-end each quarter with residual update.",
    "Deep dive finds SPOF; dual route funded.",
    "Maps never exercised."
  ],
  [
    "Funding versus asset growth recon gate",
    "Liquidity risk",
    "Funding versus asset growth recon gate gates asset growth plans on funding plan recon.",
    "Growth cut until issuance calendar matches.",
    "Asset growth without funding."
  ],
  [
    "Stress engine model risk overlay",
    "Model risk",
    "Stress engine model risk overlay applies explicit model-risk overlays to less-validated stress engines.",
    "Overlay +10% losses in ICAAP.",
    "Stress engines exempt."
  ],
  [
    "Strategy change appetite reset clock",
    "Risk governance",
    "Strategy change appetite reset clock clocks 90-day appetite reset after material strategy change.",
    "New market entry resets appetite day 70.",
    "Old appetite in new markets."
  ],
  [
    "DRC input completeness daily control",
    "Market risk",
    "DRC input completeness daily control daily-controls completeness of DRC/JTD inputs and hedges.",
    "Missing hedge fixed; DRC −£5m.",
    "Weekly stale DRC."
  ],
  [
    "Sector tilt sunset enforcement",
    "Credit risk",
    "Sector tilt sunset enforcement enforces sunset dates on sector tilts inside appetite.",
    "CRE tilt sunsets; not renewed—exposure cut.",
    "Temporary tilts permanent."
  ],
  [
    "Control automation loss ROI case",
    "Operational risk",
    "Control automation loss ROI case cases ROI of automation against repeat op losses.",
    "Duplicate payments ROI 8 months; funded.",
    "More checkers forever."
  ],
  [
    "Board versus ALCO liquidity KPI split",
    "Liquidity risk",
    "Board versus ALCO liquidity KPI split splits which liquidity KPIs go to board versus ALCO.",
    "Board LCR/NSFR; ALCO intraday—clarity up.",
    "Board drowned in charts."
  ],
  [
    "Model tiering customer impact axis",
    "Model risk",
    "Model tiering customer impact axis adds customer-impact axis to model tiering, not only capital.",
    "Collections model tier-1 despite small capital.",
    "Capital-only tiering."
  ],
  [
    "Insurance sublimit versus acceptance",
    "Risk governance",
    "Insurance sublimit versus acceptance compares accepted residual risk to insurance sublimits before acceptance.",
    "Acceptance exceeds sublimit; revised.",
    "Insurance assumed enough."
  ],
  [
    "Factor completeness via P&L explain",
    "Market risk",
    "Factor completeness via P&L explain uses chronic unexplained P&L to drive factor completeness work.",
    "Dividend factor added after 15% unexplained streak.",
    "VaR green, explain red ignored."
  ],
  [
    "IFRS 9 scenario weight change control",
    "Credit risk",
    "IFRS 9 scenario weight change control change-controls IFRS 9 scenario weights with finance/MRC.",
    "Downside 30%; ECL +£20m; controlled.",
    "Silent weight tweaks."
  ],
  [
    "Journey concentration resilience metric",
    "Operational risk",
    "Journey concentration resilience metric metrics % of critical journeys on single vendor/region.",
    "70% on one region; dual-region plan.",
    "Vendor count vanity."
  ],
  [
    "Internal LCR buffer above regulatory",
    "Liquidity risk",
    "Internal LCR buffer above regulatory sets and funds internal LCR buffer above the regulatory minimum.",
    "Internal 120%; managed thereto.",
    "Managing to 100%."
  ],
  [
    "Shadow model analytics quarterly",
    "Model risk",
    "Shadow model analytics quarterly runs quarterly analytics to detect shadow models in use.",
    "Finds five sheets; three material onboarded.",
    "Blind attestation."
  ],
  [
    "Committee action auto-escalate rules",
    "Risk governance",
    "Committee action auto-escalate rules auto-escalates aged risk committee actions to the chair summary.",
    " >90 days escalate; backlog down.",
    "Actions eternal."
  ],
  [
    "Vol surface source hierarchy IPV",
    "Market risk",
    "Vol surface source hierarchy IPV hierarchies vol surface sources for calibration and IPV.",
    "Stale broker source replaced; IPV fail cleared.",
    "Desk-only surfaces."
  ],
  [
    "Limit override time-box hard stop",
    "Credit risk",
    "Limit override time-box hard stop hard-stops limit overrides at expiry without renewal dual control.",
    "Override auto-expires; position cut.",
    "Renewal chains."
  ],
  [
    "DR test updates residual ratings",
    "Operational risk",
    "DR test updates residual ratings updates residual risk ratings immediately after BC/DR test results.",
    "Fail keeps residual red.",
    "Green despite fail."
  ],
  [
    "Deposit insurance mapping to runoff",
    "Liquidity risk",
    "Deposit insurance mapping to runoff maps insured versus uninsured deposits into runoff segments.",
    "Insured runoff lower; LCR refined.",
    "Flat runoff."
  ],
  [
    "Dual-environment model promote gate",
    "Model risk",
    "Dual-environment model promote gate gates promotion on dual-environment parallel evidence.",
    "Parallel 20 days within tolerance; promote.",
    "Friday hotfixes."
  ],
  [
    "External risk disclosure consistency",
    "Risk governance",
    "External risk disclosure consistency checks external risk wording against internal residual ratings.",
    "External 'stable' vs internal red fixed.",
    "Optimistic ARA."
  ],
  [
    "Intraday VaR versus EOD divergence alert",
    "Market risk",
    "Intraday VaR versus EOD divergence alert alerts when intraday peak VaR diverges materially from EOD.",
    "Divergence 40%; desk cut midday.",
    "EOD-only comfort."
  ],
  [
    "Collateral schedule version legal sync",
    "Credit risk",
    "Collateral schedule version legal sync syncs collateral eligibility schedule versions with legal CSA terms.",
    "Version mismatch caused wrong haircut; synced.",
    "Ops schedule ≠ CSA."
  ],
  [
    "Op risk capital versus insurance recoveries",
    "Operational risk",
    "Op risk capital versus insurance recoveries nets insurance recoveries in op loss/capital per policy cautiously.",
    "Recovery uncertain; capital gross until received.",
    "Capital net of hoped insurance."
  ],
  [
    "HQLA monetisation test trades",
    "Liquidity risk",
    "HQLA monetisation test trades periodically executes small monetisation tests to prove operability.",
    "Test sale £25m HQLA succeeds; haircuts confirmed.",
    "Untested monetisation assumptions."
  ],
  [
    "Model use attestation versus inventory",
    "Model risk",
    "Model use attestation versus inventory attests models actually used match inventory listings.",
    "Attestation finds retired model still scoring; killed.",
    "Inventory ghosts."
  ],
  [
    "Risk MI pack page budget",
    "Risk governance",
    "Risk MI pack page budget budgets page counts so packs stay decision-useful.",
    "Pack cut 40→25 pages; discussion deeper.",
    "Pack bloat."
  ],
  [
    "Proxy mapping expiry review",
    "Market risk",
    "Proxy mapping expiry review expires proxy mappings unless revalidated.",
    "Expired proxy blocked new risk until remapped.",
    "Eternal proxies."
  ],
  [
    "Stage migration early warning credit",
    "Credit risk",
    "Stage migration early warning credit EWIs for Stage 1→2 migrations by segment.",
    "EWI amber on CRE; underwriting tightened.",
    "Migrations surprise at close."
  ],
  [
    "Payments break customer impact tag",
    "Operational risk",
    "Payments break customer impact tag tags payment breaks with customer impact severity.",
    "Customer-impacting breaks page faster.",
    "All breaks equal."
  ],
  [
    "Term issuance versus runoff recon",
    "Liquidity risk",
    "Term issuance versus runoff recon recons planned term issuance to stressed runoff needs.",
    "Issuance short £300m; plan lifted.",
    "Issuance vanity calendar."
  ],
  [
    "Fairness constraint model card",
    "Model risk",
    "Fairness constraint model card publishes model cards including fairness constraints for AI credit models.",
    "Model card reviewed by conduct; deployed.",
    "No model card."
  ],
  [
    "Appetite cascade booking system test",
    "Risk governance",
    "Appetite cascade booking system test tests that cascading limits are enforced in booking systems.",
    "System allows over-limit; fix priority-1.",
    "Paper cascade."
  ],
  [
    "Exotic product VaR onboarding checklist",
    "Market risk",
    "Exotic product VaR onboarding checklist checklists factor mapping, IPV, and limits before exotic onboarding.",
    "Checklist blocks exotic until mapping done.",
    "Trade first, map later."
  ],
  [
    "Guarantee benefit in LGD evidence",
    "Credit risk",
    "Guarantee benefit in LGD evidence evidences guarantee benefit in LGD with enforceability and correl.",
    "Guarantee benefit cut for correlated guarantor.",
    "Full LGD benefit always."
  ],
  [
    "RCSA residual to IA plan feed",
    "Operational risk",
    "RCSA residual to IA plan feed feeds high residual RCSA cells into IA planning automatically.",
    "Feed schedules two engagements.",
    "RCSA unused by IA."
  ],
  [
    "Stable funding ratio early warning",
    "Liquidity risk",
    "Stable funding ratio early warning EWIs for NSFR before hard breach using forward maturity view.",
    "Forward NSFR 102% amber; term issuance pulled forward.",
    "NSFR only spot."
  ],
  [
    "Model inventory board attestation",
    "Model risk",
    "Model inventory board attestation attests model inventory completeness to MRC/board quarterly.",
    "Attestation with detection analytics attached.",
    "Verbal completeness."
  ],
  [
    "Risk culture incentive scorecard audit",
    "Risk governance",
    "Risk culture incentive scorecard audit audits whether incentive scorecards include risk KRIs.",
    "Two units omit risk KRIs; redesigned.",
    "P&L-only incentives."
  ],
  [
    "Basis VaR add-on methodology note",
    "Market risk",
    "Basis VaR add-on methodology note notes methodology for basis VaR add-ons on imperfect hedges.",
    "Note applied to gilt vs future; add-on £0.4m.",
    "Perfect hedge fiction."
  ],
  [
    "Obligor group look-through equity links",
    "Credit risk",
    "Obligor group look-through equity links looks through equity ownership links for group aggregation.",
    "50% common owner → aggregated; limit fixed.",
    "Missed ownership links."
  ],
  [
    "Third-party exit test residual update",
    "Operational risk",
    "Third-party exit test residual update updates residual risk after vendor exit tests.",
    "Exit test fail keeps residual red.",
    "Exit plan PDF comfort."
  ],
  [
    "Liquidity buffer composition quality",
    "Liquidity risk",
    "Liquidity buffer composition quality monitors buffer composition quality not only LCR ratio.",
    "Buffer heavy Level 2; quality score amber.",
    "Ratio-only liquidity."
  ],
  [
    "Champion challenger P&L impact bridge",
    "Model risk",
    "Champion challenger P&L impact bridge bridges P&L/ECL impact of switching champion to challenger.",
    "Bridge £8m ECL; root-cause before switch.",
    "Switch on Gini alone."
  ],
  [
    "Principal risk investment case link",
    "Risk governance",
    "Principal risk investment case link links principal risk residuals to funded investment cases.",
    "Cyber residual red → £15m programme funded.",
    "Risk reds without money."
  ],
  [
    "Desk mandate tenor permission matrix",
    "Market risk",
    "Desk mandate tenor permission matrix matrices allowed tenors by product in desk mandates.",
    "30y ticket blocked; mandate update needed.",
    "Product OK, tenor free-for-all."
  ],
  [
    "Collateral dispute exposure add-on auto",
    "Credit risk",
    "Collateral dispute exposure add-on auto auto-applies exposure add-ons when disputes age past SLA.",
    "Add-on auto at T+2; trading restricted.",
    "Manual forgotten add-ons."
  ],
  [
    "Conduct scenario to provision bridge",
    "Operational risk",
    "Conduct scenario to provision bridge bridges conduct scenarios to accounting provision processes.",
    "Scenario £10m → provision assessment triggered.",
    "Scenarios unused by finance."
  ],
  [
    "Intraday credit line board visibility",
    "Liquidity risk",
    "Intraday credit line board visibility gives ALCO/board visibility of clearer intraday credit reliance.",
    "Reliance 90%; pre-fund plan.",
    "Hidden clearer credit."
  ],
  [
    "AI explainability sample audit",
    "Model risk",
    "AI explainability sample audit audits samples of AI explanations against model features monthly.",
    "12% mismatch; blocked until fixed.",
    "Explainability untested."
  ],
  [
    "Risk acceptance insurance schedule attach",
    "Risk governance",
    "Risk acceptance insurance schedule attach attaches insurance schedule excerpts to relevant acceptances.",
    "Attach shows sublimit gap; acceptance revised.",
    "Acceptance without insurance facts."
  ],
  [
    "Clean P&L reconstruction automation",
    "Market risk",
    "Clean P&L reconstruction automation automates clean hypothetical P&L reconstruction for backtesting.",
    "Automation cuts rebuild time; two extra exceptions found.",
    "Manual unclean series."
  ],
  [
    "Thin-file PD segment monitoring",
    "Credit risk",
    "Thin-file PD segment monitoring monitors thin-file segments separately for PD performance.",
    "Thin-file Gini collapse; segment freeze.",
    "Pooled monitoring hides thin-file fail."
  ],
  [
    "Change failure customer journey tag",
    "Operational risk",
    "Change failure customer journey tag tags failed changes by customer journey impact.",
    "Journey-tagged failures prioritised.",
    "Change fail rate without customer lens."
  ],
  [
    "HQLA haircut library versioning",
    "Liquidity risk",
    "HQLA haircut library versioning versions HQLA haircut libraries with change control.",
    "Library v5 after rating methodology change.",
    "Ad-hoc haircuts."
  ],
  [
    "Model use case inventory link",
    "Model risk",
    "Model use case inventory link links each model to approved use cases; blocks other uses.",
    "Marketing use of credit PD blocked.",
    "Model reused off-label."
  ],
  [
    "Board deep-dive pre-read challenge log",
    "Risk governance",
    "Board deep-dive pre-read challenge log logs director pre-read challenges before deep-dives.",
    "Pre-read challenges sharpen the session.",
    "Cold deep-dives."
  ],
  [
    "Auction liquidity horizon calendar sync",
    "Market risk",
    "Auction liquidity horizon calendar sync syncs liquidity horizon uplifts to the auction/corporate event calendar.",
    "Calendar sync uplifts 12 names this week.",
    "Manual forgotten uplifts."
  ],
  [
    "Guarantee correl with obligor PD",
    "Credit risk",
    "Guarantee correl with obligor PD reduces guarantee benefit when guarantor PD correlates with obligor.",
    "Correlated parent guarantee benefit cut 50%.",
    "Independent guarantor assumed."
  ],
  [
    "Op loss enrichment completeness SLA",
    "Operational risk",
    "Op loss enrichment completeness SLA SLAs enrichment of op loss records with cause and control failed.",
    "Enrichment SLA 10 days; 92% met.",
    "Bare loss amounts only."
  ],
  [
    "NSFR derivative RSF factor version",
    "Liquidity risk",
    "NSFR derivative RSF factor version versions derivative RSF factors after margining model changes.",
    "Version bump after IM recognition.",
    "Stale factors."
  ],
  [
    "Validation finding customer notify assess",
    "Model risk",
    "Validation finding customer notify assess assesses whether model findings require customer notification/remediation.",
    "Fairness finding triggers customer outcome review.",
    "Findings capital-only."
  ],
  [
    "Risk capacity stress anchor certificate",
    "Risk governance",
    "Risk capacity stress anchor certificate certificates that capacity numbers are anchored to latest stress.",
    "Certificate fails; capacity restated down.",
    "Capacity storytelling."
  ],
  [
    "Equity opening auction gap limit",
    "Market risk",
    "Equity opening auction gap limit caps P&L from opening-auction gaps that intraday VaR understates.",
    "Auction gap −£1.2m vs £0.8m limit; overnight inventory cut.",
    "Treating intraday VaR as overnight coverage."
  ],
  [
    "Index rebalance flow risk buffer",
    "Market risk",
    "Index rebalance flow risk buffer buffers expected index rebalance flows so market-making books are not sized on average days.",
    "Rebalance week buffer £25m; utilisation 90%.",
    "Average ADV limits through rebalance."
  ],
  [
    "Dividend future versus cash basis desk limit",
    "Market risk",
    "Dividend future versus cash basis desk limit limits basis between dividend futures and cash equity hedges.",
    "Basis P&L −£0.9m; basis add-on raised.",
    "Netting dividend future delta into cash delta."
  ],
  [
    "Volatility surface sticky-delta stress pack",
    "Market risk",
    "Volatility surface sticky-delta stress pack stresses sticky-delta and sticky-strike assumptions on option books.",
    "Sticky-delta stress −£3.1m; smile risk limit cut.",
    "Parallel vol shift only."
  ],
  [
    "Cross-gamma FX equity hybrid inventory",
    "Market risk",
    "Cross-gamma FX equity hybrid inventory inventories cross-gamma on FX–equity hybrids missed by siloed desks.",
    "Cross-gamma −£1.4m in joint move; hybrid limit set.",
    "Desk silo Greeks only."
  ],
  [
    "Bond future cheapest-to-deliver switch risk",
    "Market risk",
    "Bond future cheapest-to-deliver switch risk tracks CTD switch risk around delivery windows for bond futures.",
    "CTD switch P&L −£0.7m; delivery week limit tighter.",
    "Duration hedge assumed stable through delivery."
  ],
  [
    "Commodity calendar spread liquidity horizon",
    "Market risk",
    "Commodity calendar spread liquidity horizon uplifts liquidity horizons on far calendar spreads in commodities.",
    "Far spread horizon 1d→5d; internal VaR +£2m.",
    "Front-month liquidity for the whole curve."
  ],
  [
    "Repo specialness squeeze stress",
    "Market risk",
    "Repo specialness squeeze stress stresses specialness squeezes on short bond inventory.",
    "Specialness stress −£4m; locate buffer raised.",
    "GC repo assumptions on specials."
  ],
  [
    "Inflation breakeven curve twist set",
    "Market risk",
    "Inflation breakeven curve twist set applies twist stresses to inflation breakeven curves separately from real rates.",
    "Breakeven twist −£2.2m; ALCO noted.",
    "Nominal-only curve stresses."
  ],
  [
    "Variance swap versus realised vol hedge slip",
    "Market risk",
    "Variance swap versus realised vol hedge slip tracks hedge slippage between variance swaps and realised-vol proxies.",
    "Slippage −£0.5m/month; hedge redesign.",
    "Calling variance flat when proxy lags."
  ],
  [
    "Options pin risk expiry concentration",
    "Market risk",
    "Options pin risk expiry concentration limits notional pinned at strikes into expiry.",
    "Pin notional 2× limit; trimmed pre-expiry.",
    "Net vega flat hiding pin risk."
  ],
  [
    "Market risk factor mapping orphan report",
    "Market risk",
    "Market risk factor mapping orphan report reports positions with orphan or stale risk-factor mappings weekly.",
    "12 orphans found; mapped or hard-limited.",
    "Unmapped notionals in residual bucket forever."
  ],
  [
    "Intraday limit utilisation heat clock",
    "Market risk",
    "Intraday limit utilisation heat clock clocks intraday utilisation peaks, not only end-of-day snapshots.",
    "Peak 140% at 10:15; EOD 70%—breach logged.",
    "EOD-only limit monitoring."
  ],
  [
    "Proxy hedge effectiveness decay alert",
    "Market risk",
    "Proxy hedge effectiveness decay alert alerts when proxy hedge R² or effectiveness decays below policy.",
    "R² 0.55 vs 0.70 floor; hedge replaced.",
    "Static proxy list for years."
  ],
  [
    "Jump-to-default equity single-name add-on",
    "Market risk",
    "Jump-to-default equity single-name add-on adds jump-to-default add-ons for concentrated equity names in VaR.",
    "JTD add-on £3m on one name; trimmed.",
    "Diffusive VaR only for single-stock risk."
  ],
  [
    "Commodity storage and convenience yield risk",
    "Market risk",
    "Commodity storage and convenience yield risk captures storage and convenience-yield risks in physical commodity books.",
    "Convenience yield shock −£1.8m; physical limit cut.",
    "Futures-only risk on physical books."
  ],
  [
    "FX fixing risk window inventory",
    "Market risk",
    "FX fixing risk window inventory inventories notionals exposed to WM/benchmark fixings by window.",
    "Fixing window £120m; pre-hedge plan required.",
    "Ignoring fixing concentration."
  ],
  [
    "Structured note issuer secondary liquidity",
    "Market risk",
    "Structured note issuer secondary liquidity assesses secondary liquidity of structured notes held in inventory.",
    "Secondary bid vanished in stress; inventory cap set.",
    "Issue size treated as liquidity."
  ],
  [
    "Vol-of-vol risk on exotic books",
    "Market risk",
    "Vol-of-vol risk on exotic books limits vol-of-vol exposure on exotics beyond vega.",
    "Volga limit breach; exotic book hedged.",
    "Vega-only exotic limits."
  ],
  [
    "Basis between CDS index and single names",
    "Market risk",
    "Basis between CDS index and single names limits index–single-name basis that can gap in credit events.",
    "Basis P&L −£2.5m; basis VaR add-on.",
    "Netting index hedges to zero risk."
  ],
  [
    "Treasury curve PCA residual risk cap",
    "Market risk",
    "Treasury curve PCA residual risk cap caps residual risk after PCA curve factors so unexplained modes are limited.",
    "Residual 18% of curve VaR; factor added.",
    "Three PCAs assumed complete."
  ],
  [
    "Equity borrow recall stress playbook",
    "Market risk",
    "Equity borrow recall stress playbook playbooks forced recalls on hard-to-borrow shorts.",
    "Recall stress needs £15m cover; buffer held.",
    "Assuming borrows always roll."
  ],
  [
    "Market risk holiday calendar misalignment",
    "Market risk",
    "Market risk holiday calendar misalignment flags books spanning misaligned holiday calendars for gap risk.",
    "US/HK holiday gap −£0.6m; calendar limits set.",
    "One calendar for global books."
  ],
  [
    "Option early-exercise American risk report",
    "Market risk",
    "Option early-exercise American risk report reports early-exercise risk on American options versus European proxies.",
    "Early exercise cost £0.4m; model flag raised.",
    "European proxy for American inventory."
  ],
  [
    "Cleared vs OTC margin procyclicality buffer",
    "Market risk",
    "Cleared vs OTC margin procyclicality buffer buffers procyclical IM calls that amplify market stress P&L needs.",
    "IM call +£80m in stress; buffer pre-positioned.",
    "IM treated as constant."
  ],
  [
    "Sector rotation stress for equity desks",
    "Market risk",
    "Sector rotation stress for equity desks applies sector-rotation stresses beyond beta shocks.",
    "Rotation stress −£5m; sector caps tightened.",
    "Market beta only."
  ],
  [
    "Digital asset weekend gap policy",
    "Market risk",
    "Digital asset weekend gap policy sets weekend gap policies for 24/7 digital asset books versus traditional closes.",
    "Weekend gap limit £2m; inventory cut Friday.",
    "Friday close risk for crypto."
  ],
  [
    "Mortgage pipeline fallout hedge slippage",
    "Market risk",
    "Mortgage pipeline fallout hedge slippage tracks fallout and hedge slippage on mortgage pipelines.",
    "Fallout 28% vs 20% assumed; hedge resized.",
    "Static fallout in rate rallies."
  ],
  [
    "Municipal curve tax-exempt basis risk",
    "Market risk",
    "Municipal curve tax-exempt basis risk captures tax-exempt versus taxable municipal curve basis.",
    "Basis move −£1.1m; basis limit set.",
    "Treasury hedge for munis without basis."
  ],
  [
    "Volatility risk premium term-structure limit",
    "Market risk",
    "Volatility risk premium term-structure limit limits harvesting of vol risk premium by tenor bucket.",
    "Short-dated VRP utilisation 95%; truncated.",
    "Net vega across all tenors."
  ],
  [
    "On-the-run off-the-run liquidity switch",
    "Market risk",
    "On-the-run off-the-run liquidity switch stresses liquidity switches between on-the-run and off-the-run bonds.",
    "Switch stress +15bp; haircut raised.",
    "On-the-run liquidity for off-the-run."
  ],
  [
    "Delta-one synthetic versus cash tracking error",
    "Market risk",
    "Delta-one synthetic versus cash tracking error limits tracking error of synthetic delta-one versus cash.",
    "TE 1.2% vs 0.5% cap; composition fixed.",
    "Notional match as hedge proof."
  ],
  [
    "Commodity quality and location basis book",
    "Market risk",
    "Commodity quality and location basis book books quality and location basis separately from flat price.",
    "Location basis −£0.8m; limit introduced.",
    "Flat price only for physical."
  ],
  [
    "Interest rate bermudan exercise boundary risk",
    "Market risk",
    "Interest rate bermudan exercise boundary risk monitors exercise-boundary model risk on bermudan swaptions.",
    "Boundary shift P&L −£1.5m; RNIV held.",
    "European swaption proxy only."
  ],
  [
    "Equity dividend forecast revision VaR",
    "Market risk",
    "Equity dividend forecast revision VaR includes dividend forecast revision risk in equity VaR.",
    "Dividend cut wave +£2m VaR; hedges adjusted.",
    "Fixed dividend in VaR."
  ],
  [
    "FX correlation break stress for quanto",
    "Market risk",
    "FX correlation break stress for quanto stresses FX–equity correlation breaks on quanto structures.",
    "Corr→0 stress −£3m; quanto limit cut.",
    "Constant corr for quantos."
  ],
  [
    "Market abuse surveillance alert risk feed",
    "Market risk",
    "Market abuse surveillance alert risk feed feeds surveillance alert spikes into desk risk reviews when patterns emerge.",
    "Alert spike on one desk; position review ordered.",
    "Surveillance siloed from risk."
  ],
  [
    "Block trade liquidity impact add-on",
    "Market risk",
    "Block trade liquidity impact add-on adds liquidity impact add-ons for block-sized positions.",
    "Block add-on £4m; exit plan required.",
    "Mid price exit assumed."
  ],
  [
    "Yield curve butterfly residual limit",
    "Market risk",
    "Yield curve butterfly residual limit limits butterfly residuals after key-rate DV01 hedges.",
    "Butterfly residual £0.9m/bp; trimmed.",
    "Key-rate flat as fully hedged."
  ],
  [
    "Carbon allowance auction timing risk",
    "Market risk",
    "Carbon allowance auction timing risk captures auction timing and allocation risks in carbon books.",
    "Auction miss −£0.6m; timing limit set.",
    "Continuous liquidity assumption for EUA."
  ],
  [
    "Prepayment model update P&L attribution",
    "Market risk",
    "Prepayment model update P&L attribution attributes P&L from prepayment model updates separately from rates.",
    "Model update −£2.1m; validation gate tightened.",
    "Burying model P&L in rates."
  ],
  [
    "Equity correl book dispersion stress",
    "Market risk",
    "Equity correl book dispersion stress stresses dispersion (index vs single-name vol) on correlation books.",
    "Dispersion stress −£6m; book reduced.",
    "Index vol hedge for single-name short vol."
  ],
  [
    "Treasury futures delivery option value risk",
    "Market risk",
    "Treasury futures delivery option value risk tracks delivery-option value risk in bond futures positions.",
    "Delivery option move −£0.5m; monitored.",
    "Ignoring delivery option in hedge ratios."
  ],
  [
    "Market risk capital RNIV inventory freeze",
    "Market risk",
    "Market risk capital RNIV inventory freeze freezes RNIV inventory versions used for capital until change control clears.",
    "RNIV version drift caught; capital restated.",
    "Ad-hoc RNIV edits pre-submission."
  ],
  [
    "Intraday credit spread jump desk halt",
    "Market risk",
    "Intraday credit spread jump desk halt halts spread-risk adding after intraday credit jump thresholds.",
    "Jump +40bp; desk halt 2 hours.",
    "Continuous quoting through jumps."
  ],
  [
    "Option assignment physical delivery capacity",
    "Market risk",
    "Option assignment physical delivery capacity checks physical delivery capacity before large option assignment risk builds.",
    "Assignment capacity short; positions cut.",
    "Cash-settled assumptions on physical options."
  ],
  [
    "Hedge accounting ineffectiveness risk feed",
    "Market risk",
    "Hedge accounting ineffectiveness risk feed feeds hedge accounting ineffectiveness into market risk P&L explain.",
    "Ineffectiveness £1.2m unexplained; mapping fixed.",
    "Accounting hedges ignored by risk."
  ],
  [
    "Sovereign CDS quanto and dual-currency risk",
    "Market risk",
    "Sovereign CDS quanto and dual-currency risk inventories quanto and dual-currency features on sovereign CDS.",
    "Quanto risk £0.7m; limit set.",
    "Local-currency CDS treated as USD risk."
  ],
  [
    "ETF premium discount stress for MM",
    "Market risk",
    "ETF premium discount stress for MM stresses ETF premium/discount blows for market-making inventory.",
    "Discount −2% stress needs £10m; buffer held.",
    "NAV trading assumed always."
  ],
  [
    "Rate option smile wing liquidity charge",
    "Market risk",
    "Rate option smile wing liquidity charge charges extra liquidity for rate-option smile wings.",
    "Wing liquidity charge +£1.5m capital.",
    "ATM liquidity for wings."
  ],
  [
    "Multi-curve OIS discounting residual risk",
    "Market risk",
    "Multi-curve OIS discounting residual risk tracks residual multi-curve discounting risk after OIS adoption.",
    "Residual £0.3m/bp; residual limit set.",
    "Single-curve legacy still in spots."
  ],
  [
    "Equity event vol crush limit into earnings",
    "Market risk",
    "Equity event vol crush limit into earnings limits short event-vol into earnings when crush risk is asymmetric.",
    "Crush limit £2m; utilisation 85%.",
    "Vega-flat into binary events."
  ],
  [
    "Physical power shape risk hourly book",
    "Market risk",
    "Physical power shape risk hourly book captures hourly shape risk in power books beyond baseload.",
    "Shape stress −£1.9m; hourly limits set.",
    "Baseload MWh only."
  ],
  [
    "Convertible bond equity credit hybrid Greek",
    "Market risk",
    "Convertible bond equity credit hybrid Greek reports hybrid equity–credit Greeks on convertibles.",
    "Credit Greek understated; desk limit split.",
    "Delta-only convertibles."
  ],
  [
    "Market risk backtesting exception cluster rule",
    "Market risk",
    "Market risk backtesting exception cluster rule triggers model review when VaR exceptions cluster, not only annually.",
    "4 exceptions in 20 days; review opened.",
    "Counting exceptions without clustering."
  ],
  [
    "FX nondeliverable forward fixing risk",
    "Market risk",
    "FX nondeliverable forward fixing risk limits NDF fixing risk in restricted currencies.",
    "NDF fixing concentration £50m; cut.",
    "Deliverable FX limits reused for NDFs."
  ],
  [
    "Structured rates bermudan vega bucket report",
    "Market risk",
    "Structured rates bermudan vega bucket report buckets bermudan vega by expiry and underlying swap tenor.",
    "Long bermudan vega breach; hedged.",
    "Net swaption vega only."
  ],
  [
    "Collateral transformation desk market risk",
    "Market risk",
    "Collateral transformation desk market risk applies market-risk limits to collateral transformation desks, not only funding.",
    "Transformation VaR £3m; limit set.",
    "Funding desk without market limits."
  ],
  [
    "Equity total return swap financing reset risk",
    "Market risk",
    "Equity total return swap financing reset risk captures financing reset and spread risks on equity TRS.",
    "Financing reset +30bp; P&L −£0.8m.",
    "Price delta only on TRS."
  ],
  [
    "Weather derivative basis to physical load",
    "Market risk",
    "Weather derivative basis to physical load limits basis between weather derivatives and physical load exposures.",
    "Basis residual −£1.2m; hedge redesigned.",
    "HDD match as perfect hedge."
  ],
  [
    "Obligor early-warning signal escalation clock",
    "Credit risk",
    "Obligor early-warning signal escalation clock clocks escalation from EWS signals to credit action with SLAs.",
    "EWS red open 12 days vs 3-day SLA; escalation.",
    "EWS as a dashboard nobody owns."
  ],
  [
    "Covenant headroom forecast versus actual",
    "Credit risk",
    "Covenant headroom forecast versus actual compares forecast covenant headroom to actuals each quarter.",
    "Forecast ICR 2.1x vs actual 1.4x; watchlist.",
    "Annual covenant certificate only."
  ],
  [
    "Trade finance soft-commodities fraud screen",
    "Credit risk",
    "Trade finance soft-commodities fraud screen screens soft-commodity trade finance for document and diversion fraud patterns.",
    "Fraud screen blocks £8m shipment; loss avoided.",
    "Obligor rating as sole trade-finance control."
  ],
  [
    "Leveraged loan EBITDA add-back challenge",
    "Credit risk",
    "Leveraged loan EBITDA add-back challenge challenges EBITDA add-backs used in leveraged loan underwriting.",
    "Add-backs cut 25%; leverage rises above policy.",
    "Sponsor EBITDA accepted raw."
  ],
  [
    "CRE exit liquidity by asset class stress",
    "Credit risk",
    "CRE exit liquidity by asset class stress stresses CRE exit liquidity by asset class, not only LTV.",
    "Secondary office exit −35%; Stage 2 overlay.",
    "LTV-only CRE stress."
  ],
  [
    "Supply-chain finance buyer continuity risk",
    "Credit risk",
    "Supply-chain finance buyer continuity risk assesses buyer continuity risk in supply-chain finance programmes.",
    "Buyer downgrade freezes programme; limits cut.",
    "Supplier credit only in SCF."
  ],
  [
    "Credit insurance exclusion operability map",
    "Credit risk",
    "Credit insurance exclusion operability map maps policy exclusions to portfolio segments so cover is not overstated.",
    "War exclusion on 12% book; risk retained marked.",
    "Insurance notional as full transfer."
  ],
  [
    "Multi-obligor project finance completion risk",
    "Credit risk",
    "Multi-obligor project finance completion risk separates completion risk from offtake credit in project finance.",
    "Completion delay 9 months; reserve raised.",
    "Offtake rating as project rating."
  ],
  [
    "Retail PD seasonality overlay control",
    "Credit risk",
    "Retail PD seasonality overlay control controls seasonality overlays on retail PD so peaks are not smoothed away.",
    "Q4 PD overlay +15bps; ECL up.",
    "Annual average PD through peaks."
  ],
  [
    "Wrong-way collateral equity correlation book",
    "Credit risk",
    "Wrong-way collateral equity correlation book flags equity collateral correlating with obligor credit (wrong-way).",
    "WWR multiplier 1.4 on founder-share collateral.",
    "Haircut-only on correlated collateral."
  ],
  [
    "Sovereign transfer and convertibility pack",
    "Credit risk",
    "Sovereign transfer and convertibility pack packs transfer/convertibility risk separately from sovereign default.",
    "T&C risk uplift on EM book; limit cut.",
    "Local-currency sovereign as hard-currency."
  ],
  [
    "Banking book fair-value credit spread risk",
    "Credit risk",
    "Banking book fair-value credit spread risk captures credit-spread risk on banking-book instruments at FVTPL/FVOCI.",
    "Spread VaR £6m; ALCO limit set.",
    "IFRS 9 staging only as credit risk."
  ],
  [
    "Obligor group look-through SPV test",
    "Credit risk",
    "Obligor group look-through SPV test looks through SPVs to economic obligor groups for limits.",
    "SPV group aggregated; limit breach fixed.",
    "Legal entity limits only."
  ],
  [
    "Trade credit insurance claim lag LGD",
    "Credit risk",
    "Trade credit insurance claim lag LGD models claim-lag and denial risk in LGD when insurance is present.",
    "Lag 10 months adds 6pp LGD; ECL up.",
    "Insured = zero LGD."
  ],
  [
    "Revolving EAD crisis draw assumption",
    "Credit risk",
    "Revolving EAD crisis draw assumption stresses crisis draws on revolvers beyond through-the-cycle CCF.",
    "Crisis CCF 75% vs 40%; EAD shock.",
    "TTC CCF in stress ECL."
  ],
  [
    "Credit approval condition subsequent test",
    "Credit risk",
    "Credit approval condition subsequent test tests whether approval conditions subsequent were actually met before draw.",
    "Condition missed on 3 facilities; draws blocked.",
    "Approval memo as draw authority."
  ],
  [
    "Sector dual-default correlation uplift",
    "Credit risk",
    "Sector dual-default correlation uplift uplifts dual-default correlation in stressed sectors for capital and limits.",
    "CRE ρ uplift; credit VaR +£4m.",
    "Static ρ through sector crisis."
  ],
  [
    "Forbearance multiple-touch indicator",
    "Credit risk",
    "Forbearance multiple-touch indicator flags obligors with multiple forbearance touches for staging and oversight.",
    "Second touch → Stage 2 auto; ECL retained.",
    "Each forbearance as independent cure."
  ],
  [
    "Commodity producer hedge effectiveness credit",
    "Credit risk",
    "Commodity producer hedge effectiveness credit links producer hedge effectiveness to credit capacity.",
    "Ineffective hedge → capacity cut 20%.",
    "Ignoring hedge book in credit."
  ],
  [
    "LGD downturn cure versus liquidation mix",
    "Credit risk",
    "LGD downturn cure versus liquidation mix calibrates downturn LGD with cure vs liquidation pathway mix.",
    "Cure 30% in downturn vs 55% TTC; LGD up.",
    "TTC cure rates in downturn."
  ],
  [
    "Bank counterparty network contagion add-on",
    "Credit risk",
    "Bank counterparty network contagion add-on adds contagion add-ons for tightly linked bank counterparties.",
    "Network add-on £5m; limit redistributed.",
    "Name limits ignoring network."
  ],
  [
    "Invoice finance concentration debtor cap",
    "Credit risk",
    "Invoice finance concentration debtor cap caps debtor concentration inside invoice finance facilities.",
    "Single debtor 40%; cap 25%—reduced.",
    "Client limit only."
  ],
  [
    "Credit risk model override governance log",
    "Credit risk",
    "Credit risk model override governance log logs PD/LGD overrides with reason codes and expiry.",
    "Override >90 days without renew; auto-expire.",
    "Permanent silent overrides."
  ],
  [
    "Collateral valuation frequency by volatility",
    "Credit risk",
    "Collateral valuation frequency by volatility sets collateral revaluation frequency by asset volatility class.",
    "Listed equity daily; CRE quarterly—enforced.",
    "Annual valuation for all collateral."
  ],
  [
    "Country risk ceiling exception board pack",
    "Credit risk",
    "Country risk ceiling exception board pack packs country-ceiling exceptions with mitigants for board/CRC.",
    "Exception +1 notch with offshore cash; CRC signed.",
    "Exceptions in credit memos only."
  ],
  [
    "SME thin-file PD challenger model",
    "Credit risk",
    "SME thin-file PD challenger model runs challenger PD on thin-file SMEs to test bureau gaps.",
    "Challenger lifts PD 40bps; overlay set.",
    "Bureau score as sole SME PD."
  ],
  [
    "Shipping charter-rate credit stress",
    "Credit risk",
    "Shipping charter-rate credit stress stresses shipping credits under charter-rate collapses.",
    "Rate −40% → ICR breach 22% book; overlay.",
    "LTV on vessel only."
  ],
  [
    "Netting opinion jurisdiction inventory",
    "Credit risk",
    "Netting opinion jurisdiction inventory inventories netting/close-out opinions by jurisdiction for CCR.",
    "Two jurisdictions opinion-stale; exposure grossed.",
    "ISDA presence as netting certainty."
  ],
  [
    "Credit migration matrix through-cycle test",
    "Credit risk",
    "Credit migration matrix through-cycle test tests whether migration matrices remain plausible through the cycle.",
    "Matrix too sticky; recalibrated.",
    "Point-in-time matrix for TTC capital."
  ],
  [
    "Obligor ESG controversy credit overlay",
    "Credit risk",
    "Obligor ESG controversy credit overlay applies credit overlays when ESG controversies impair cash flows or access.",
    "Controversy overlay +50bps PD; limit freeze.",
    "ESG as non-credit forever."
  ],
  [
    "Synthetic securitisation attachment monitor",
    "Credit risk",
    "Synthetic securitisation attachment monitor monitors attachment/detachment and tranche thickness on synthetic risk transfer.",
    "Attachment eroded; retained risk up £12m.",
    "Day-1 tranche maths for life."
  ],
  [
    "Trade finance sanctions hit credit unwind",
    "Credit risk",
    "Trade finance sanctions hit credit unwind defines credit unwind and exposure treatment on sanctions hits mid-trade.",
    "Hit → exposure freeze playbook executed in 4h.",
    "Credit and sanctions processes disconnected."
  ],
  [
    "Retail hardship programme cure definition",
    "Credit risk",
    "Retail hardship programme cure definition defines cure from hardship programmes for staging and reporting.",
    "Cure needs 6 clean pays; 35% fail—ECL kept.",
    "Immediate cure on programme entry."
  ],
  [
    "CCR wrong-way FX on EM counterparty",
    "Credit risk",
    "CCR wrong-way FX on EM counterparty flags EM counterparties where FX moves worsen exposure and credit together.",
    "WWR FX multiplier 1.25 applied.",
    "MtM only without WWR."
  ],
  [
    "Acquisition leverage bridge credit monitor",
    "Credit risk",
    "Acquisition leverage bridge credit monitor monitors bridge-to-permanent leverage after acquisitions.",
    "Bridge >180 days; limit tightened.",
    "Day-1 acquisition case for life."
  ],
  [
    "Credit limit intra-day peak versus EOD",
    "Credit risk",
    "Credit limit intra-day peak versus EOD monitors intra-day peak exposures versus EOD limits for CCR.",
    "Peak 130% EOD limit; real-time alert added.",
    "EOD CCR only."
  ],
  [
    "Obligor audit opinion emphasis credit flag",
    "Credit risk",
    "Obligor audit opinion emphasis credit flag flags emphasis-of-matter or qualified opinions into credit review.",
    "EOM → review in 10 days; three caught.",
    "Audit opinions unread by credit."
  ],
  [
    "Project finance offtaker downgrade cascade",
    "Credit risk",
    "Project finance offtaker downgrade cascade cascades offtaker downgrades into project ratings and reserves.",
    "Offtaker −2 notches → project Stage 2.",
    "SPV rating frozen after financial close."
  ],
  [
    "Collateral repossession cost in LGD",
    "Credit risk",
    "Collateral repossession cost in LGD includes repossession, legal, and time costs in LGD, not only haircut.",
    "Costs +7pp LGD; downturn pack updated.",
    "Haircut equals LGD."
  ],
  [
    "Credit risk appetite name concentration %",
    "Credit risk",
    "Credit risk appetite name concentration % expresses name concentration appetite as % of capital with hard stops.",
    "Name at 9% vs 8% appetite; pre-emptive cut.",
    "Soft concentration guidance only."
  ],
  [
    "Structured credit waterfall breach test",
    "Credit risk",
    "Structured credit waterfall breach test tests waterfall and trigger breaches on structured credit holdings.",
    "Trigger breach → rating watch; limit freeze.",
    "Rating-only monitoring of structures."
  ],
  [
    "Banking book hedge CRA mismatch risk",
    "Credit risk",
    "Banking book hedge CRA mismatch risk flags credit risk adjustment mismatches when hedges and assets diverge.",
    "Hedge CRA gap £2m; ALCO action.",
    "Accounting hedge as credit hedge."
  ],
  [
    "Obligor liquidity runway credit metric",
    "Credit risk",
    "Obligor liquidity runway credit metric adds liquidity runway months as a credit metric for cash-burning obligors.",
    "Runway <6 months → watchlist auto.",
    "Leverage-only for growth credits."
  ],
  [
    "Export credit agency claim process drill",
    "Credit risk",
    "Export credit agency claim process drill drills ECA claim processes before relying on cover in LGD.",
    "Drill finds notice gap; process fixed.",
    "ECA cover as automatic LGD zero."
  ],
  [
    "Credit portfolio sector limit unused headroom",
    "Credit risk",
    "Credit portfolio sector limit unused headroom reports unused sector headroom so growth does not silently cluster.",
    "Tech headroom 5%; pipeline redirected.",
    "Sector limits only at breach."
  ],
  [
    "Default definition operationalisation test",
    "Credit risk",
    "Default definition operationalisation test tests operationalisation of default definition across products and systems.",
    "90DPD vs unlikeliness mismatch; aligned.",
    "Policy PDF default vs system default."
  ],
  [
    "Margin loan concentrated collateral call chain",
    "Credit risk",
    "Margin loan concentrated collateral call chain maps call chains when concentrated collateral gaps in margin loans.",
    "Single-stock gap → call cascade plan tested.",
    "Portfolio haircut hiding name gap."
  ],
  [
    "Credit risk stress reverse severity find",
    "Credit risk",
    "Credit risk stress reverse severity find runs reverse stress to find severity that breaches credit appetite.",
    "−3 notch migration mass breaches appetite; board noted.",
    "One mild credit stress only."
  ],
  [
    "Op risk event taxonomy dual-class rule",
    "Operational risk",
    "Op risk event taxonomy dual-class rule requires dual classification when an event spans conduct and process failure.",
    "Dual-class forced on mis-sale with process break; capital split reviewed.",
    "Forcing a single taxonomy bucket."
  ],
  [
    "RCSA residual versus incident actuals recon",
    "Operational risk",
    "RCSA residual versus incident actuals recon recons RCSA residual ratings to actual incident severity over rolling periods.",
    "Residuals too green vs incidents; scores recalibrated.",
    "RCSA never tested against outcomes."
  ],
  [
    "KRI threshold change control pack",
    "Operational risk",
    "KRI threshold change control pack requires change control when KRI thresholds move, with before/after rationale.",
    "Threshold loosened without pack; reversed.",
    "Silent threshold drift to avoid red."
  ],
  [
    "Scenario workshop facilitator independence",
    "Operational risk",
    "Scenario workshop facilitator independence keeps scenario facilitators independent from the business owning the scenario.",
    "1LOD-only facilitation found; 2LOD co-facilitator added.",
    "Owners facilitating their own severity."
  ],
  [
    "Op loss boundary with credit charge-off",
    "Operational risk",
    "Op loss boundary with credit charge-off clarifies when losses are operational versus credit charge-offs.",
    "Fraudulent lending booked as credit; £3m reclass to op risk.",
    "Parking op losses in credit."
  ],
  [
    "Change the-bank residual register link",
    "Operational risk",
    "Change the-bank residual register link links change-the-bank residuals into the op-risk register with owners.",
    "Release residual orphaned; linked and accepted dated.",
    "Change risks living only in project RAID."
  ],
  [
    "Conduct remediation completeness QA sample",
    "Operational risk",
    "Conduct remediation completeness QA sample QA-samples remediation populations for completeness and correctness.",
    "QA fail 9%; cohort remade.",
    "Remediation complete on mail merge send."
  ],
  [
    "Third-party exit plan operability drill",
    "Operational risk",
    "Third-party exit plan operability drill drills exit plans for material third parties under timed constraints.",
    "Exit drill fails data extract; plan rewritten.",
    "Exit plans as unread PDFs."
  ],
  [
    "Payment fraud mule-account pattern feed",
    "Operational risk",
    "Payment fraud mule-account pattern feed feeds mule-account patterns from ops into fraud scenario severity.",
    "Pattern lift raises scenario £4m; control funded.",
    "Static fraud scenarios for years."
  ],
  [
    "Op risk capital insurance recoverability test",
    "Operational risk",
    "Op risk capital insurance recoverability test tests insurance recoverability assumptions used in op-risk capital.",
    "Denial risk 30%; insurance benefit cut.",
    "Gross loss minus face cover."
  ],
  [
    "Model change dual-run exit criteria",
    "Operational risk",
    "Model change dual-run exit criteria sets dual-run exit criteria when models change that affect customers.",
    "Dual-run exited on recon stability, not calendar.",
    "Calendar exit with open breaks."
  ],
  [
    "Privileged access joiner mover leaver clock",
    "Operational risk",
    "Privileged access joiner mover leaver clock clocks JML for privileged access with hard SLAs into risk reporting.",
    "Leaver admin open 6 days; SLA breach logged.",
    "Quarterly access review only."
  ],
  [
    "Business continuity dependency map assure",
    "Operational risk",
    "Business continuity dependency map assure assures BCP dependency maps against actual system topology.",
    "Missing payment switch dependency; BCP updated.",
    "Org-chart BCP maps."
  ],
  [
    "Customer complaint root-cause theme capital",
    "Operational risk",
    "Customer complaint root-cause theme capital feeds complaint root-cause themes into op-risk scenarios and KRIs.",
    "Fees theme → scenario uplift; KRI added.",
    "Complaints siloed from op risk."
  ],
  [
    "Op risk data lineage for loss database",
    "Operational risk",
    "Op risk data lineage for loss database documents lineage from source systems into the op-loss database.",
    "Lineage break understated losses 12%; fixed.",
    "Manual spreadsheets as golden loss DB."
  ],
  [
    "Internal fraud collusion scenario pack",
    "Operational risk",
    "Internal fraud collusion scenario pack packs collusion scenarios separately from single-actor internal fraud.",
    "Collusion scenario £8m; dual-control gaps found.",
    "Single-actor only in fraud scenarios."
  ],
  [
    "Regulatory reporting misstatement op event",
    "Operational risk",
    "Regulatory reporting misstatement op event classifies material regulatory reporting misstatements as op-risk events with severity.",
    "Misstatement £0; reputational severity raised event.",
    "Only P&L losses as events."
  ],
  [
    "Cloud shared-responsibility control matrix",
    "Operational risk",
    "Cloud shared-responsibility control matrix matrices shared-responsibility controls for material cloud services.",
    "Gaps on key management; control added.",
    "Vendor ISO cert as full coverage."
  ],
  [
    "Op risk appetite cascade to process KRIs",
    "Operational risk",
    "Op risk appetite cascade to process KRIs cascades op-risk appetite into process-level KRIs with owners.",
    "Payments KRI now encodes appetite; breach escalate.",
    "Appetite poster without process metrics."
  ],
  [
    "Physical security cash-in-transit stress",
    "Operational risk",
    "Physical security cash-in-transit stress stresses cash-in-transit and branch cash limits under disruption.",
    "CIT stress needs alternate routes; contracted.",
    "Average-day CIT plans."
  ],
  [
    "AI tool shadow IT op risk inventory",
    "Operational risk",
    "AI tool shadow IT op risk inventory inventories shadow AI tools touching customer or risk data.",
    "12 tools found; three banned; nine gated.",
    "Assuming only approved AI exists."
  ],
  [
    "Settlement fail cascade liquidity op link",
    "Operational risk",
    "Settlement fail cascade liquidity op link links settlement-fail cascades to both op-risk and liquidity playbooks.",
    "Fail cascade drill hits liquidity desk same day.",
    "Op and liquidity playbooks disconnected."
  ],
  [
    "Vendor concentration single-region outage",
    "Operational risk",
    "Vendor concentration single-region outage stresses single-region outages for concentrated vendors.",
    "Region outage −£6m scenario; multi-region mandated.",
    "Vendor diversification by legal entity only."
  ],
  [
    "Op risk control automation false sense",
    "Operational risk",
    "Op risk control automation false sense tests whether automation removes detective coverage without compensating controls.",
    "RPA removed maker-checker; detective added back.",
    "Automation assumed always safer."
  ],
  [
    "Trading error fat-finger limit util alert",
    "Operational risk",
    "Trading error fat-finger limit util alert alerts when fat-finger controls are bypassed or utilisation spikes.",
    "Bypass used 14×; privilege cut.",
    "Bypass logs never reviewed."
  ],
  [
    "Legal privilege boundary in loss data",
    "Operational risk",
    "Legal privilege boundary in loss data defines what loss details can enter op-risk databases under privilege.",
    "Privileged narrative stripped; severity retained.",
    "Empty loss records due to over-redaction."
  ],
  [
    "Resilience important business service map",
    "Operational risk",
    "Resilience important business service map maps important business services to supporting resources for resilience risk.",
    "IBS map misses batch job; added.",
    "System lists without service outcomes."
  ],
  [
    "Op risk scenario correlation capital copula",
    "Operational risk",
    "Op risk scenario correlation capital copula applies dependence between scenarios so capital is not a naive sum.",
    "Copula cuts sum £90m→£58m; documented.",
    "Summing scenario maxima."
  ],
  [
    "Conduct sales quality sample risk feed",
    "Operational risk",
    "Conduct sales quality sample risk feed feeds sales-quality sample fails into conduct risk KRIs.",
    "Fail rate 11%; KRI red; coaching funded.",
    "QA samples unused by risk."
  ],
  [
    "Cyber ransomware recovery time capital",
    "Operational risk",
    "Cyber ransomware recovery time capital uses realistic recovery times in ransomware scenarios for capital severity.",
    "RTO 14 days vs 3 assumed; severity up.",
    "Optimistic RTO in capital scenarios."
  ],
  [
    "Outsourcing notification regulatory clock",
    "Operational risk",
    "Outsourcing notification regulatory clock clocks regulatory notification duties on material outsourcing changes.",
    "Notification late; event raised and remediated.",
    "Contract signed before notice."
  ],
  [
    "Op risk issue ageing severity inflation",
    "Operational risk",
    "Op risk issue ageing severity inflation reviews whether ageing issues inflate or deflate severity to manage optics.",
    "Ageing deflation found; ratings restored.",
    "Severity cut to avoid EXCO."
  ],
  [
    "Payments reconciliation break ageing KRI",
    "Operational risk",
    "Payments reconciliation break ageing KRI KRIs ageing of payment recon breaks with monetary bands.",
    "Breaks >£1m over 3 days → red.",
    "Break count without money."
  ],
  [
    "Model input poisoning detection control",
    "Operational risk",
    "Model input poisoning detection control controls detection of poisoned or manipulated model inputs in ops processes.",
    "Poison test fails; input integrity control added.",
    "Assuming clean upstream data."
  ],
  [
    "Physical document retention breach event",
    "Operational risk",
    "Physical document retention breach event treats material retention/destruction breaches as op-risk events.",
    "Destruction breach event £0 P&L; severity medium.",
    "Only cyber events counted."
  ],
  [
    "Third-line findings recurrence op theme",
    "Operational risk",
    "Third-line findings recurrence op theme themes recurring IA findings into op-risk systemic issues.",
    "Access theme 4×; systemic owner funded.",
    "Finding-by-finding closure only."
  ],
  [
    "Trading book cancel amend surveillance link",
    "Operational risk",
    "Trading book cancel amend surveillance link links cancel/amend spikes to op-risk and market-abuse reviews.",
    "Spike desk review finds control gap.",
    "Surveillance and op risk siloed."
  ],
  [
    "HR key-person concentration risk register",
    "Operational risk",
    "HR key-person concentration risk register registers key-person concentrations for critical risk processes.",
    "Two people run collateral ops; backup plan funded.",
    "Key-person ignored until leave."
  ],
  [
    "Customer data subject request backlog risk",
    "Operational risk",
    "Customer data subject request backlog risk tracks DSAR/complaint backlog as an op-risk KRI with legal overlay.",
    "Backlog KRI amber; surge staffed.",
    "Backlog as ops inconvenience only."
  ],
  [
    "Op risk capital ORC threshold evidence",
    "Operational risk",
    "Op risk capital ORC threshold evidence evidences ORC/threshold choices used for capital with sensitivity.",
    "Threshold change pack to MRC; approved.",
    "Silent threshold tweaks."
  ],
  [
    "Branch cash discrepancy pattern analytics",
    "Operational risk",
    "Branch cash discrepancy pattern analytics analytics patterns in branch cash discrepancies for fraud/ops failure.",
    "Pattern flags three branches; investigation opens.",
    "Each discrepancy isolated."
  ],
  [
    "Change freeze exception risk acceptance",
    "Operational risk",
    "Change freeze exception risk acceptance requires dated risk acceptance for change-freeze exceptions.",
    "Freeze exception without acceptance; blocked.",
    "Emergency changes undocumented."
  ],
  [
    "Vendor fourth-party subprocessor inventory",
    "Operational risk",
    "Vendor fourth-party subprocessor inventory inventories subprocessors for material vendors in op-risk assessments.",
    "Critical subprocessor unknown; added.",
    "Tier-1 vendor only."
  ],
  [
    "Op risk board pack near-miss section",
    "Operational risk",
    "Op risk board pack near-miss section requires a near-miss section in the board op-risk pack with learnings.",
    "Near-miss section surfaces payment close-call.",
    "Board sees losses only."
  ],
  [
    "Identity federation failure customer impact",
    "Operational risk",
    "Identity federation failure customer impact scenarios identity federation failures with customer-impact severity.",
    "Federation outage scenario £2m + harm; MFA failover funded.",
    "IT ticket severity only."
  ],
  [
    "Trade surveillance model drift op flag",
    "Operational risk",
    "Trade surveillance model drift op flag flags surveillance model drift as an operational risk needing action.",
    "Drift alert → model recalibrated in 10 days.",
    "Drift ignored until regulatory ask."
  ],
  [
    "Op risk insurance captive recovery lag",
    "Operational risk",
    "Op risk insurance captive recovery lag models captive recovery lag and haircut in net op-loss views.",
    "Lag 18 months; netting restricted for capital.",
    "Instant captive recovery assumed."
  ],
  [
    "Robotic process exception queue risk",
    "Operational risk",
    "Robotic process exception queue risk risk-rates RPA exception queues that can silently backlog.",
    "Queue 3× limit; human surge + bot fix.",
    "Happy-path RPA metrics only."
  ],
  [
    "Crisis communication approval risk control",
    "Operational risk",
    "Crisis communication approval risk control controls approval of external crisis communications as an op-risk control.",
    "Unapproved tweet incident; control redesigned.",
    "Comms as non-risk."
  ],
  [
    "Op risk taxonomy regulatory mapping pack",
    "Operational risk",
    "Op risk taxonomy regulatory mapping pack maps internal taxonomy to regulatory event types with evidence pack.",
    "Mapping gaps on conduct; fixed pre-return.",
    "Local taxonomy only in returns."
  ],
  [
    "LCR outflow assumption product mapping",
    "Liquidity risk",
    "LCR outflow assumption product mapping maps LCR outflow assumptions to actual products with owners.",
    "Two products mis-mapped; LCR −4pp corrected.",
    "Template products forever."
  ],
  [
    "NSFR RSF factor version freeze",
    "Liquidity risk",
    "NSFR RSF factor version freeze freezes RSF factor versions used in NSFR until change control clears.",
    "Factor drift caught; NSFR restated.",
    "Ad-hoc factor edits."
  ],
  [
    "Intraday liquidity peak versus buffer",
    "Liquidity risk",
    "Intraday liquidity peak versus buffer monitors intraday peaks against intraday buffers, not only end-of-day.",
    "Peak usage 110% buffer; pre-funded.",
    "EOD liquidity only."
  ],
  [
    "Contingency funding counterparty reach test",
    "Liquidity risk",
    "Contingency funding counterparty reach test tests whether CFP counterparties are actually reachable under stress scripts.",
    "Two lines unusable; CFP rewritten.",
    "CFP as a list of names."
  ],
  [
    "Deposit concentration single-client stress",
    "Liquidity risk",
    "Deposit concentration single-client stress stresses outflow from top deposit concentrations.",
    "Top-10 outflow breaks LCR; caps set.",
    "Average deposit runoff only."
  ],
  [
    "Wholesale funding rollover calendar risk",
    "Liquidity risk",
    "Wholesale funding rollover calendar risk calendars wholesale rollovers and stress-miss scenarios.",
    "Rollover cluster week needs £2bn; pre-funded.",
    "Smooth rollover assumption."
  ],
  [
    "Collateral mobilisation time-to-cash drill",
    "Liquidity risk",
    "Collateral mobilisation time-to-cash drill drills time-to-cash for unencumbered collateral mobilisation.",
    "Drill 36h vs 12h SLA; process fixed.",
    "Collateral face value as liquidity."
  ],
  [
    "Payment system outage liquidity playbook",
    "Liquidity risk",
    "Payment system outage liquidity playbook links payment-system outages to liquidity playbooks and buffers.",
    "Outage drill uses dedicated buffer.",
    "Ops incident without treasury."
  ],
  [
    "FX settlement gross liquidity need",
    "Liquidity risk",
    "FX settlement gross liquidity need sizes gross FX settlement liquidity where netting may fail.",
    "Gross need £1.1bn; CLS eligibility checked.",
    "Net settlement assumed always."
  ],
  [
    "Liquidity risk appetite cascade to desks",
    "Liquidity risk",
    "Liquidity risk appetite cascade to desks cascades liquidity appetite into desk cash and inventory limits.",
    "Desk inventory cut after appetite amber.",
    "Firm LCR only."
  ],
  [
    "Encumbrance capacity headroom report",
    "Liquidity risk",
    "Encumbrance capacity headroom report reports encumbrance capacity headroom for contingent funding.",
    "Headroom 8%; ALCO slows pledging.",
    "Encumbrance discussed after breach."
  ],
  [
    "Retail deposit behavioural life stress",
    "Liquidity risk",
    "Retail deposit behavioural life stress stresses behavioural lives of retail deposits under rate and confidence shocks.",
    "Life shortens 40%; NSFR hit modelled.",
    "Contractual maturity only."
  ],
  [
    "Prime brokerage free credit cash sweep risk",
    "Liquidity risk",
    "Prime brokerage free credit cash sweep risk captures free-credit cash sweep and recall risks in PB.",
    "Sweep recall stress −£400m; buffer raised.",
    "PB cash as stable funding."
  ],
  [
    "Liquidity early-warning indicator pack",
    "Liquidity risk",
    "Liquidity early-warning indicator pack packs EWIs with thresholds linked to CFP stages.",
    "EWI amber → stage-1 CFP actions same day.",
    "EWIs without linked actions."
  ],
  [
    "Covered bond soft-bullet extension risk",
    "Liquidity risk",
    "Covered bond soft-bullet extension risk models soft-bullet extension risk on covered-bond funding.",
    "Extension stress lengthens liability; NSFR hit.",
    "Hard maturity assumed."
  ],
  [
    "Intra-group liquidity support legal test",
    "Liquidity risk",
    "Intra-group liquidity support legal test tests legal ability of intra-group liquidity support under stress.",
    "Support blocked by local rules; solo buffer up.",
    "Group LCR as solo safety."
  ],
  [
    "HQLA level composition concentration",
    "Liquidity risk",
    "HQLA level composition concentration limits concentration inside HQLA by issuer and instrument.",
    "Single sovereign 55% HQLA; diversified.",
    "HQLA total only."
  ],
  [
    "Margin call liquidity buffer sizing",
    "Liquidity risk",
    "Margin call liquidity buffer sizing sizes buffers for IM/VM call spikes in market stress.",
    "VM spike £300m; buffer pre-positioned.",
    "Average margin as buffer."
  ],
  [
    "Liquidity stress governance assumption log",
    "Liquidity risk",
    "Liquidity stress governance assumption log logs liquidity stress assumptions with owners and refresh dates.",
    "Runoff assumption stale 18 months; refreshed.",
    "Assumptions buried in models."
  ],
  [
    "Non-operating deposit identification test",
    "Liquidity risk",
    "Non-operating deposit identification test tests identification of non-operating deposits for LCR outflows.",
    "Misclass cut LCR 3pp; corrected.",
    "All operational labelled deposits."
  ],
  [
    "Committed facility draw concurrency stress",
    "Liquidity risk",
    "Committed facility draw concurrency stress stresses concurrent draws on committed facilities firm-wide.",
    "Concurrency 60%; liquidity need +£900m.",
    "Independent facility draws."
  ],
  [
    "Treasury system payment release dual control",
    "Liquidity risk",
    "Treasury system payment release dual control enforces dual control on large payment releases in treasury systems.",
    "Single release £50m blocked; dual enforced.",
    "Trusted operator single control."
  ],
  [
    "Liquidity reverse stress franchise damage",
    "Liquidity risk",
    "Liquidity reverse stress franchise damage includes franchise-damage outflows in reverse liquidity stress.",
    "Social-media run scenario breaks buffer; plan updated.",
    "Historic runoff only."
  ],
  [
    "Secured funding haircut procyclicality",
    "Liquidity risk",
    "Secured funding haircut procyclicality models procyclical haircut increases on secured funding.",
    "Haircut +10pp stress; capacity cut.",
    "Static haircuts in stress."
  ],
  [
    "Currency mismatch liquidity limit",
    "Liquidity risk",
    "Currency mismatch liquidity limit limits currency mismatches between liquidity buffers and outflows.",
    "USD buffer short vs USD outflows; swapped.",
    "Aggregated currency-blind LCR."
  ],
  [
    "Deposit insurance coverage misconception risk",
    "Liquidity risk",
    "Deposit insurance coverage misconception risk assesses runoff risk from customer misconceptions about deposit insurance.",
    "Comms plan funded after survey gaps.",
    "Assuming coverage knowledge."
  ],
  [
    "CCP default fund call liquidity plan",
    "Liquidity risk",
    "CCP default fund call liquidity plan plans liquidity for CCP default-fund and assessment calls.",
    "Assessment call £120m pre-arranged.",
    "CCP calls ignored in CFP."
  ],
  [
    "Liquidity metric reconc to GL cash",
    "Liquidity risk",
    "Liquidity metric reconc to GL cash recons key liquidity metrics to GL cash and treasury positions.",
    "Break £40m; fixed before ALCO.",
    "Metric trust without recon."
  ],
  [
    "Term funding ratio internal monitor",
    "Liquidity risk",
    "Term funding ratio internal monitor monitors an internal term-funding ratio alongside LCR/NSFR.",
    "TFR amber; issuance pulled forward.",
    "Regulatory ratios only."
  ],
  [
    "Unsecured wholesale investor concentration",
    "Liquidity risk",
    "Unsecured wholesale investor concentration caps unsecured wholesale investor concentration.",
    "Single investor 18%; cap 10%—reduced.",
    "Spread assumed in stress."
  ],
  [
    "Liquidity playbook legal entity matrix",
    "Liquidity risk",
    "Liquidity playbook legal entity matrix matrices CFP actions by legal entity with local constraints.",
    "Entity matrix blocks upstream sweep; solo actions set.",
    "Group playbook for all entities."
  ],
  [
    "Intraday credit line usage alert",
    "Liquidity risk",
    "Intraday credit line usage alert alerts when intraday credit lines approach caps.",
    "Usage 92%; payments reordered.",
    "Discovering cap at reject."
  ],
  [
    "Asset sale liquidity monetisation realism",
    "Liquidity risk",
    "Asset sale liquidity monetisation realism tests monetisation realism of assets in CFP versus market capacity.",
    "Sale assumption cut 50%; buffer up.",
    "Parachute asset sales."
  ],
  [
    "Liquidity risk model change MRC pack",
    "Liquidity risk",
    "Liquidity risk model change MRC pack requires MRC packs for liquidity model changes affecting LCR/NSFR.",
    "Runoff model change packed; approved.",
    "Silent model tweaks pre-return."
  ],
  [
    "Brokered deposit rate sensitivity runoff",
    "Liquidity risk",
    "Brokered deposit rate sensitivity runoff stresses brokered deposit runoff under rate competition.",
    "Brokered runoff 40%; caps set.",
    "Retail runoff for brokered."
  ],
  [
    "Time-zone payment cut-off liquidity gap",
    "Liquidity risk",
    "Time-zone payment cut-off liquidity gap captures liquidity gaps from time-zone payment cut-offs.",
    "Cut-off gap needs pre-funding; process set.",
    "Same-day global cash assumption."
  ],
  [
    "Liquidity contingency collateral location",
    "Liquidity risk",
    "Liquidity contingency collateral location ensures contingent collateral is in the right location/custodian to mobilise.",
    "Collateral wrong custodian; moved pre-stress.",
    "Eligible but immovable collateral."
  ],
  [
    "Stablecoin or tokenised deposit runoff add-on",
    "Liquidity risk",
    "Stablecoin or tokenised deposit runoff add-on adds runoff add-ons for tokenised or always-on deposit-like products.",
    "24/7 runoff add-on; buffer raised.",
    "Branch-hour runoff models."
  ],
  [
    "ALCO liquidity dashboard freshness KRI",
    "Liquidity risk",
    "ALCO liquidity dashboard freshness KRI puts freshness KRIs on ALCO liquidity dashboards.",
    "Stale feed footnoted; fixed in 48h.",
    "Board numbers without timestamps."
  ],
  [
    "Netting set liquidity vs capital mismatch",
    "Liquidity risk",
    "Netting set liquidity vs capital mismatch flags when liquidity treatment of netting diverges from capital assumptions.",
    "Mismatch pack to ALCO; aligned.",
    "Capital netting as liquidity netting."
  ],
  [
    "Seasonal working-capital liquidity plan",
    "Liquidity risk",
    "Seasonal working-capital liquidity plan plans seasonal working-capital peaks into liquidity buffers.",
    "Peak season −£200m; buffer calendarised.",
    "Average-month liquidity."
  ],
  [
    "Recovery option liquidity execution drill",
    "Liquidity risk",
    "Recovery option liquidity execution drill drills execution of recovery liquidity options (repo, issuance, asset sale).",
    "Issuance drill fails docs; fixed.",
    "Recovery options on paper only."
  ],
  [
    "Internal FTEs liquidity transfer pricing signal",
    "Liquidity risk",
    "Internal FTEs liquidity transfer pricing signal uses FTP signals so businesses internalise liquidity cost of products.",
    "High-outflow product FTP up; volumes fall.",
    "FTP ignored by product."
  ],
  [
    "Ring-fenced bank liquidity separateness test",
    "Liquidity risk",
    "Ring-fenced bank liquidity separateness test tests separateness of ring-fenced liquidity under group stress.",
    "Upstream support blocked; RFB buffer up.",
    "Group buffer for RFB."
  ],
  [
    "Money-market fund gate risk client outflow",
    "Liquidity risk",
    "Money-market fund gate risk client outflow models client outflows if MMF gates/fees trigger elsewhere in the market.",
    "Gate contagion scenario; deposit EWI added.",
    "Idiosyncratic deposit views only."
  ],
  [
    "Liquidity reporting automation recon break",
    "Liquidity risk",
    "Liquidity reporting automation recon break treats persistent liquidity reporting recon breaks as risk events.",
    "Break open 10 days; escalated.",
    "Breaks as IT chores."
  ],
  [
    "Off-balance liquidity commitment inventory",
    "Liquidity risk",
    "Off-balance liquidity commitment inventory inventories off-balance commitments that can call liquidity.",
    "Undrawn + guarantees mapped; stress updated.",
    "On-balance only."
  ],
  [
    "Treasury dealer limit versus liquidity buffer",
    "Liquidity risk",
    "Treasury dealer limit versus liquidity buffer ensures dealer position limits cannot consume the liquidity buffer silently.",
    "Dealer limit cut when buffer amber.",
    "Trading limits ignoring firm liquidity."
  ],
  [
    "Cross-currency swap funding rollover risk",
    "Liquidity risk",
    "Cross-currency swap funding rollover risk captures funding rollover risk on cross-currency swaps.",
    "XCCY rollover stress −£150m; staggered.",
    "FX delta-only on XCCY."
  ],
  [
    "Liquidity risk board appetite metric set",
    "Liquidity risk",
    "Liquidity risk board appetite metric set defines a minimal board liquidity appetite metric set with hard/soft.",
    "LCR, NSFR, intraday peak, top-deposit % adopted.",
    "Single LCR appetite only."
  ],
  [
    "Unencumbered asset location register daily",
    "Liquidity risk",
    "Unencumbered asset location register daily maintains a daily register of unencumbered asset locations for mobilisation.",
    "Register miss on £80m; fixed.",
    "Monthly encumbrance report only."
  ],
  [
    "Client money segregation liquidity constraint",
    "Liquidity risk",
    "Client money segregation liquidity constraint models client-money segregation as a constraint on usable liquidity.",
    "Segregation blocks £60m; buffer adjusted.",
    "Treating client money as buffer."
  ],
  [
    "Stress LCR versus business-as-usual bridge",
    "Liquidity risk",
    "Stress LCR versus business-as-usual bridge bridges stress LCR results to BAU management actions with owners.",
    "Bridge actions dated; ALCO tracks.",
    "Stress results without actions."
  ],
  [
    "Term auction facility eligibility readiness",
    "Liquidity risk",
    "Term auction facility eligibility readiness keeps collateral eligibility ready for central-bank facilities named in CFP.",
    "Eligibility pack stale; refreshed.",
    "Facility named but ineligible assets."
  ],
  [
    "Liquidity transferability legal opinion ageing",
    "Liquidity risk",
    "Liquidity transferability legal opinion ageing ages legal opinions on liquidity transferability across entities.",
    "Opinion >3y; refreshed before reliance.",
    "Eternal opinions."
  ],
  [
    "Overnight wholesale reliance hard cap",
    "Liquidity risk",
    "Overnight wholesale reliance hard cap hard-caps overnight wholesale reliance as % of funding.",
    "Cap breach; term issuance pulled.",
    "Soft reliance guidance."
  ],
  [
    "Payment queue prioritisation under stress",
    "Liquidity risk",
    "Payment queue prioritisation under stress defines payment-queue prioritisation rules under liquidity stress.",
    "Priority rules executed in drill.",
    "FIFO payments in stress."
  ],
  [
    "Liquidity risk climate physical disruption",
    "Liquidity risk",
    "Liquidity risk climate physical disruption includes physical-climate disruption to branches/ops in liquidity scenarios.",
    "Flood scenario boosts digital outflows; buffer plan.",
    "Climate only in credit."
  ],
  [
    "Intraday throughput capacity stress",
    "Liquidity risk",
    "Intraday throughput capacity stress stresses payment throughput capacity as a liquidity risk, not only cash.",
    "Throughput cap delays; ops capacity funded.",
    "Cash buffer with jammed rails."
  ],
  [
    "Funding plan versus risk appetite recon",
    "Liquidity risk",
    "Funding plan versus risk appetite recon recons the funding plan to liquidity risk appetite each quarter.",
    "Plan breaches soft appetite; resized.",
    "Funding plan owned only by Treasury markets."
  ],
  [
    "Liquidity contingency FX swap capacity",
    "Liquidity risk",
    "Liquidity contingency FX swap capacity sizes FX-swap capacity assumed in cross-currency liquidity stress.",
    "Swap capacity cut 40% in stress; plan updated.",
    "Unlimited swap markets."
  ],
  [
    "Deposit platform outage outflow asymmetry",
    "Liquidity risk",
    "Deposit platform outage outflow asymmetry models asymmetric outflows when digital platforms outage while competitors live.",
    "Outage runoff add-on; resilience funded.",
    "Outage as zero-balance change."
  ],
  [
    "HQLA valuation and haircut daily control",
    "Liquidity risk",
    "HQLA valuation and haircut daily control daily controls HQLA valuation and regulatory haircuts.",
    "Haircut table stale; LCR restated +1pp.",
    "Month-end HQLA only."
  ],
  [
    "Liquidity risk internal audit action ageing",
    "Liquidity risk",
    "Liquidity risk internal audit action ageing ages IA actions on liquidity risk with EXCO visibility.",
    "Action >120 days escalated.",
    "Actions closed on promise."
  ],
  [
    "Model inventory materiality tier evidence",
    "Model risk",
    "Model inventory materiality tier evidence evidences materiality tiers on the model inventory with impact metrics.",
    "Tier uplift on pricing model after usage growth; validation pulled forward.",
    "Static tiers from first registration."
  ],
  [
    "Champion challenger performance divergence",
    "Model risk",
    "Champion challenger performance divergence monitors champion–challenger divergence with action thresholds.",
    "Divergence 18% vs 10% trigger; review opened.",
    "Challenger built but never compared."
  ],
  [
    "Model input data quality scorecard",
    "Model risk",
    "Model input data quality scorecard scorecards input data quality with blockers for material models.",
    "DQ score red blocks monthly run; fixed upstream.",
    "Model runs on known bad inputs."
  ],
  [
    "Overlay governance expiry and owner",
    "Model risk",
    "Overlay governance expiry and owner requires dated expiry and owners on all model overlays.",
    "Overlay open 14 months; forced revalidation.",
    "Permanent overlays as shadow models."
  ],
  [
    "Model change impact on capital bridge",
    "Model risk",
    "Model change impact on capital bridge bridges model changes to capital/ECL impacts before go-live.",
    "Change +£22m ECL; CRO signed.",
    "Go-live then discover capital."
  ],
  [
    "Benchmark model independence from developer",
    "Model risk",
    "Benchmark model independence from developer keeps benchmark/challenger development independent from model owners.",
    "Same team built both; external challenger commissioned.",
    "Developer-built challenger."
  ],
  [
    "Model performance ethnic fairness monitor",
    "Model risk",
    "Model performance ethnic fairness monitor monitors fairness metrics where models affect customer outcomes.",
    "Adverse impact flag; features reviewed.",
    "Accuracy-only model monitoring."
  ],
  [
    "Valuation model AVA model-risk pack",
    "Model risk",
    "Valuation model AVA model-risk pack packs model-risk AVAs with methodology and sensitivity.",
    "AVA £9m evidenced; MRC noted.",
    "AVA as a round number."
  ],
  [
    "Model retirement orphan control test",
    "Model risk",
    "Model retirement orphan control test tests that retired models cannot still drive production decisions.",
    "Retired score still in rules; killed.",
    "Retirement as inventory flag only."
  ],
  [
    "PD LGD EAD dependence model risk",
    "Model risk",
    "PD LGD EAD dependence model risk assesses model risk from PD–LGD–EAD dependence assumptions.",
    "Independence assumption challenged; capital uplift.",
    "Component models validated in isolation only."
  ],
  [
    "Vendor model black-box challenge plan",
    "Model risk",
    "Vendor model black-box challenge plan requires challenge plans for material vendor black-box models.",
    "Vendor PD challenge pack annual; gaps found.",
    "Vendor brochure as validation."
  ],
  [
    "Model risk appetite quantitative metric",
    "Model risk",
    "Model risk appetite quantitative metric defines quantitative model-risk appetite metrics for the board.",
    "Unvalidated material models = 0 appetite; breach logged.",
    "Qualitative model risk only."
  ],
  [
    "Recalibration frequency versus stability trade",
    "Model risk",
    "Recalibration frequency versus stability trade documents recalibration frequency trade-offs against stability.",
    "Quarterly recalib churn cut to semi-annual with overlay.",
    "Recalibrate whenever noisy."
  ],
  [
    "Model documentation effective challenge proof",
    "Model risk",
    "Model documentation effective challenge proof proves effective challenge occurred, not only that docs exist.",
    "Challenge log empty; validation failed gate.",
    "Document completeness as validation."
  ],
  [
    "Stress model versus BAU model inconsistency",
    "Model risk",
    "Stress model versus BAU model inconsistency flags inconsistencies between stress and BAU model families.",
    "Stress PD below BAU for same segment; fixed.",
    "Separate model universes."
  ],
  [
    "Machine learning explainability sample audit",
    "Model risk",
    "Machine learning explainability sample audit audits explainability samples for ML models used in credit/risk.",
    "Sample fails reason codes; model gated.",
    "Global importance as enough."
  ],
  [
    "Model implementation code recon to spec",
    "Model risk",
    "Model implementation code recon to spec recons production code to approved model specification.",
    "Code drift on floor; hotfix and incident.",
    "Spec PDF ≠ production."
  ],
  [
    "Limitation register customer impact link",
    "Model risk",
    "Limitation register customer impact link links model limitations to customer-impact assessments where relevant.",
    "Limitation on thin-files → product gate.",
    "Limitations as academic footnotes."
  ],
  [
    "Annual model risk concentration report",
    "Model risk",
    "Annual model risk concentration report reports concentration of reliance on single models or vendors.",
    "One vendor scores 60% retail; diversification plan.",
    "Inventory count without concentration."
  ],
  [
    "Override rate model health indicator",
    "Model risk",
    "Override rate model health indicator uses override rates as a model health indicator with thresholds.",
    "Override 22% vs 8% cap; model review.",
    "Overrides ignored as business judgment."
  ],
  [
    "Market risk VaR engine patch control",
    "Model risk",
    "Market risk VaR engine patch control controls patches to VaR engines with dual-run and sign-off.",
    "Patch without dual-run rolled back.",
    "IT patching without risk gate."
  ],
  [
    "ECL model SICR threshold sensitivity",
    "Model risk",
    "ECL model SICR threshold sensitivity sensitises SICR thresholds and reports ECL ranges.",
    "Threshold ± band moves ECL £15m; disclosed internally.",
    "Point SICR only."
  ],
  [
    "Model risk of using proxy curves",
    "Model risk",
    "Model risk of using proxy curves assesses model risk when proxy curves replace missing markets.",
    "Proxy residual RNIV £3m; onboarding planned.",
    "Proxy without residual."
  ],
  [
    "Backtesting breach model action ladder",
    "Model risk",
    "Backtesting breach model action ladder defines an action ladder for VaR/ES backtesting breaches.",
    "Clustered breaches → engine review stage-2.",
    "Annual count without ladder."
  ],
  [
    "Pricing model versus risk model gap",
    "Model risk",
    "Pricing model versus risk model gap tracks gaps between front-office pricing and risk models.",
    "Gap P&L £1.1m; alignment project.",
    "Two truths accepted forever."
  ],
  [
    "Climate model scenario uncertainty band",
    "Model risk",
    "Climate model scenario uncertainty band reports uncertainty bands on climate models used in risk.",
    "Band wide; decisions use range not point.",
    "Single climate path as fact."
  ],
  [
    "Model approval quorum and dissent log",
    "Model risk",
    "Model approval quorum and dissent log logs quorum and dissent at model approval committees.",
    "Dissent on LGD recorded; conditions attached.",
    "Unanimous silence culture."
  ],
  [
    "Data lineage break model run blocker",
    "Model risk",
    "Data lineage break model run blocker blocks material model runs when critical lineage breaks.",
    "Lineage red blocked month-end; fixed 2 days.",
    "Run anyway with caveats slide."
  ],
  [
    "Parameter estimation sample period bias",
    "Model risk",
    "Parameter estimation sample period bias tests sample-period bias in parameter estimation.",
    "Crisis-only sample overstates PD; blend set.",
    "Longest sample always best."
  ],
  [
    "Model risk capital RNIV inventory tie",
    "Model risk",
    "Model risk capital RNIV inventory tie ties model-risk RNIV inventory to the model inventory IDs.",
    "Orphan RNIV £4m; linked or dropped.",
    "RNIV spreadsheet separate forever."
  ],
  [
    "Shadow model production leakage control",
    "Model risk",
    "Shadow model production leakage control controls against shadow models leaking into production decisions.",
    "Shadow score in rules; removed.",
    "Analytics sandbox as production."
  ],
  [
    "Validation finding severity customer clock",
    "Model risk",
    "Validation finding severity customer clock clocks validation findings that imply customer harm with SLAs.",
    "High finding open 40 days; escalated.",
    "Validation SLA calendar-only."
  ],
  [
    "Cross-model correlation assumption register",
    "Model risk",
    "Cross-model correlation assumption register registers correlation assumptions shared across models.",
    "Shared ρ break affects three models; coordinated fix.",
    "Each model owns ρ silently."
  ],
  [
    "Model monitoring alert fatigue review",
    "Model risk",
    "Model monitoring alert fatigue review reviews alert fatigue on model monitoring so real breaks surface.",
    "80% alerts ignored; thresholds retuned.",
    "Alert volume as diligence."
  ],
  [
    "Expert judgment model hybrid governance",
    "Model risk",
    "Expert judgment model hybrid governance governs hybrid models that mix algorithms and expert judgment.",
    "Judgment layer owned and sampled; bias found.",
    "Hybrid as ungoverned art."
  ],
  [
    "Trade pricing library version pin risk",
    "Model risk",
    "Trade pricing library version pin risk pins pricing library versions used for official valuation and risk.",
    "Unpinned library drift; P&L noise; pinned.",
    "Latest library always."
  ],
  [
    "Probability weighted scenario model risk",
    "Model risk",
    "Probability weighted scenario model risk assesses model risk in probability weights on scenarios for ECL/capital.",
    "Weights unchallenged 2y; review forced.",
    "Weights as sacred."
  ],
  [
    "Model risk of spreadsheet end-user compute",
    "Model risk",
    "Model risk of spreadsheet end-user compute inventories end-user computing that is effectively a model.",
    "EUC PD tool material; onboarded to inventory.",
    "Spreadsheet outside model risk."
  ],
  [
    "Outcome analysis versus development population",
    "Model risk",
    "Outcome analysis versus development population compares outcome analysis populations to development populations.",
    "Population shift; performance drop explained.",
    "Outcome on wrong book."
  ],
  [
    "Model risk committee escalation matrix",
    "Model risk",
    "Model risk committee escalation matrix publishes escalation matrix from validation to MRC/CRO/board.",
    "High finding skipped MRC; process fixed.",
    "Escalation by personality."
  ],
  [
    "Sensitivity tornado for material models",
    "Model risk",
    "Sensitivity tornado for material models requires tornado sensitivities for material model outputs.",
    "Tornado shows two drivers dominate; challenged.",
    "Point estimate only."
  ],
  [
    "Replicate compute environment for validation",
    "Model risk",
    "Replicate compute environment for validation provides replicate compute so validators can reproduce results.",
    "No replicate; validation delayed; env funded.",
    "Validator trust screenshots."
  ],
  [
    "Model risk in aggregation and allocation",
    "Model risk",
    "Model risk in aggregation and allocation covers model risk in capital/ECL aggregation and allocation steps.",
    "Allocation bug £7m; control added.",
    "Component models only in scope."
  ],
  [
    "Post-model adjustment board visibility",
    "Model risk",
    "Post-model adjustment board visibility gives board/AC visibility of material post-model adjustments.",
    "PMA £30m pack to AC.",
    "PMA buried in technical papers."
  ],
  [
    "Champion model access production control",
    "Model risk",
    "Champion model access production control controls production access to champion model artefacts.",
    "Dev write access in prod; removed.",
    "Open prod for convenience."
  ],
  [
    "Time-series stationarity break protocol",
    "Model risk",
    "Time-series stationarity break protocol protocols actions when stationarity breaks in risk time series.",
    "Break detected; recalib + overlay.",
    "Ignore structural breaks."
  ],
  [
    "Model risk insurance pricing feedback loop",
    "Model risk",
    "Model risk insurance pricing feedback loop watches feedback loops where model prices change the risk they measure.",
    "Loop detected on elasticity model; dampened.",
    "Static world assumed."
  ],
  [
    "External credit rating model use limits",
    "Model risk",
    "External credit rating model use limits limits sole reliance on external ratings inside internal models.",
    "External-only slots capped; internal PD built.",
    "Agency rating as model."
  ],
  [
    "Model validation sampling for low-default",
    "Model risk",
    "Model validation sampling for low-default defines validation sampling strategies for low-default portfolios.",
    "LDP pack uses challengers and benchmarks; approved.",
    "No defaults so no validation."
  ],
  [
    "Hyperparameter change control for ML",
    "Model risk",
    "Hyperparameter change control for ML applies change control to ML hyperparameters like parameters.",
    "Silent hyperparam tweak; rolled back.",
    "Tuning as non-change."
  ],
  [
    "Risk appetite metric source system attest",
    "Risk governance",
    "Risk appetite metric source system attest requires quarterly attestations that appetite metrics match source systems.",
    "Two metrics fail attest; footnoted then fixed.",
    "Pack numbers without source attest."
  ],
  [
    "Limit framework hierarchy consistency test",
    "Risk governance",
    "Limit framework hierarchy consistency test tests consistency of firm → desk → trader limit hierarchies.",
    "Desk sum > firm limit; hierarchy fixed.",
    "Independent limit islands."
  ],
  [
    "Breach remediation evidence closure pack",
    "Risk governance",
    "Breach remediation evidence closure pack requires evidence packs to close risk-appetite or limit breaches.",
    "Breach closed on email; reopened for evidence.",
    "Promise as closure."
  ],
  [
    "Risk committee skills matrix annual",
    "Risk governance",
    "Risk committee skills matrix annual maintains an annual skills matrix for risk committee membership.",
    "Gap on cyber; advisor appointed.",
    "Committee as status roles only."
  ],
  [
    "Delegated credit authority utilisation review",
    "Risk governance",
    "Delegated credit authority utilisation review reviews utilisation and quality of delegated credit authorities.",
    "Authority overused near limit; training + cut.",
    "Delegation without oversight."
  ],
  [
    "Three lines role clarity conflict log",
    "Risk governance",
    "Three lines role clarity conflict log logs conflicts where 1LOD performs 2LOD tasks or vice versa.",
    "2LOD doing 1LOD recon; roles split.",
    "Blurred lines as agile."
  ],
  [
    "Risk policy exception board threshold",
    "Risk governance",
    "Risk policy exception board threshold sets board thresholds for policy exceptions by risk type.",
    "Exception over threshold escalated; approved dated.",
    "All exceptions at desk level."
  ],
  [
    "CRO independent reporting line evidence",
    "Risk governance",
    "CRO independent reporting line evidence evidences CRO independence and direct board/risk-committee access.",
    "Access minutes logged; ToR updated.",
    "CRO reports only via CEO slides."
  ],
  [
    "Risk data aggregation principle self-assess",
    "Risk governance",
    "Risk data aggregation principle self-assess self-assesses risk data aggregation principles with remediation owners.",
    "Aggregation principle fail on manual plugs; plan funded.",
    "Poster principles."
  ],
  [
    "New product approval risk gate packet",
    "Risk governance",
    "New product approval risk gate packet requires a complete risk gate packet before new product launch.",
    "Missing liquidity assess; launch delayed.",
    "Revenue gate without risk."
  ],
  [
    "Risk culture consequence management link",
    "Risk governance",
    "Risk culture consequence management link links material risk breaches to consequence management evidence.",
    "Breach without consequence review; HR process triggered.",
    "Culture speeches without teeth."
  ],
  [
    "Board risk training curriculum attest",
    "Risk governance",
    "Board risk training curriculum attest attests board risk training curriculum completion annually.",
    "Two members overdue; sessions booked.",
    "Appointment CV as training."
  ],
  [
    "Risk limit temporary elevation control",
    "Risk governance",
    "Risk limit temporary elevation control controls temporary limit elevations with expiry and compensating controls.",
    "Elevation expired still live; auto-reverted.",
    "Temporary forever."
  ],
  [
    "Capital contingency trigger playbook link",
    "Risk governance",
    "Capital contingency trigger playbook link links capital contingency triggers to named playbooks and owners.",
    "Trigger near; playbook drill run.",
    "Triggers without playbooks."
  ],
  [
    "Risk report distribution insider list",
    "Risk governance",
    "Risk report distribution insider list maintains insider/distribution controls for sensitive risk reports.",
    "Ex-employee on list; removed; audit trail.",
    "Open distribution."
  ],
  [
    "Material risk concentrator owner map",
    "Risk governance",
    "Material risk concentrator owner map maps owners for material risk concentrators across risk types.",
    "Cloud concentrator owner named; appetite linked.",
    "Concentration owned by everyone."
  ],
  [
    "Risk appetite qualitative to decision test",
    "Risk governance",
    "Risk appetite qualitative to decision test tests whether qualitative appetite statements change real decisions.",
    "Statement rewritten with worked examples after fail.",
    "Slogan appetite."
  ],
  [
    "Group versus solo risk appetite recon",
    "Risk governance",
    "Group versus solo risk appetite recon recons group and solo appetite metrics for conflicts.",
    "Solo tighter than group on credit; aligned.",
    "Group appetite only."
  ],
  [
    "Risk governance calendar regulatory blackout",
    "Risk governance",
    "Risk governance calendar regulatory blackout encodes regulatory blackout/closed periods into risk governance calendars.",
    "Pack release delayed for blackout; compliance ok.",
    "Ignore blackout for internal packs."
  ],
  [
    "Second-line challenge KPI substance rate",
    "Risk governance",
    "Second-line challenge KPI substance rate KPIs 2LOD challenge by substance rate, not meeting count.",
    "Substance rate 35%; target 50%; coaching.",
    "Meetings attended as challenge."
  ],
  [
    "Risk strategy cascade to business OKRs",
    "Risk governance",
    "Risk strategy cascade to business OKRs cascades risk strategy objectives into business OKRs.",
    "OKR includes risk reduction milestone; evidenced.",
    "Risk strategy shelfware."
  ],
  [
    "Incident to appetite impact assessment",
    "Risk governance",
    "Incident to appetite impact assessment assesses material incidents for appetite metric impacts within SLA.",
    "Incident hits conduct appetite; amber same week.",
    "Incidents without appetite lens."
  ],
  [
    "Cross-border booking risk governance pack",
    "Risk governance",
    "Cross-border booking risk governance pack packs booking-location risk governance for cross-border trades.",
    "Booking pack gaps on entity; fixed.",
    "Trader preference booking."
  ],
  [
    "Risk disclosure consistency across reports",
    "Risk governance",
    "Risk disclosure consistency across reports checks consistency of risk disclosures across Pillar 3, annual report, and board packs.",
    "Inconsistent RWA; corrected pre-file.",
    "Each report own truth."
  ],
  [
    "Outsourced risk decision rights matrix",
    "Risk governance",
    "Outsourced risk decision rights matrix matrices which risk decisions cannot be outsourced.",
    "Credit decline outsourced illegally; clawed back.",
    "Vendor decides risk."
  ],
  [
    "Risk appetite breach customer fairness test",
    "Risk governance",
    "Risk appetite breach customer fairness test tests customer fairness impacts when risk appetite breaches occur.",
    "Breach delayed hardship; fairness review opened.",
    "Appetite as internal only."
  ],
  [
    "Board deep-dive action tracking system",
    "Risk governance",
    "Board deep-dive action tracking system tracks board deep-dive actions in the same system as risk actions.",
    "Deep-dive actions orphaned; migrated.",
    "Minutes as action system."
  ],
  [
    "Risk governance MI definition dictionary",
    "Risk governance",
    "Risk governance MI definition dictionary maintains a dictionary of risk MI definitions with owners.",
    "Amber redefined mid-year; dictionary enforced.",
    "Author-defined colours."
  ],
  [
    "Capital allocation risk-adjusted challenge",
    "Risk governance",
    "Capital allocation risk-adjusted challenge challenges capital allocation for risk-adjusted coherence.",
    "Low-return high-RWA book challenged; repriced.",
    "Allocation as politics."
  ],
  [
    "Risk committee private session minutes",
    "Risk governance",
    "Risk committee private session minutes minutes private risk-committee sessions with actions where allowed.",
    "Private session action on model risk logged.",
    "Private means no record."
  ],
  [
    "Emerging risk disposition 30-day rule",
    "Risk governance",
    "Emerging risk disposition 30-day rule requires disposition of emerging risks within 30 days (accept, monitor, escalate, drop).",
    "Six undated items cleared; two escalated.",
    "Endless emerging list."
  ],
  [
    "Risk governance attestation false comfort",
    "Risk governance",
    "Risk governance attestation false comfort samples attestations for false comfort language without evidence.",
    "Attest rewritten with evidence links.",
    "Signed comfort letters."
  ],
  [
    "Trader mandate versus product inventory",
    "Risk governance",
    "Trader mandate versus product inventory recons trader mandates to product inventories and risk systems.",
    "Mandate miss on product; trading halted.",
    "Mandate PDF stale."
  ],
  [
    "Risk function resource adequacy board view",
    "Risk governance",
    "Risk function resource adequacy board view gives board a view of risk-function resource adequacy versus plan.",
    "Vacancy 20% in model risk; board notes.",
    "Risk org chart without capacity."
  ],
  [
    "Sanction risk appetite interaction memo",
    "Risk governance",
    "Sanction risk appetite interaction memo memos how sanctions risk interacts with credit/market appetite.",
    "Frozen name still in market limit; cut.",
    "Sanctions silo."
  ],
  [
    "Risk governance for recovery and resolution",
    "Risk governance",
    "Risk governance for recovery and resolution embeds recovery/resolution indicators into risk governance calendars.",
    "Recovery indicator amber; playbook stage-1.",
    "RRP owned only by Legal."
  ],
  [
    "Internal risk rating system governance",
    "Risk governance",
    "Internal risk rating system governance governs internal risk rating systems with override and appeal paths.",
    "Appeal path used 12×; bias review.",
    "Ratings irreversible without process."
  ],
  [
    "Risk appetite unused headroom report",
    "Risk governance",
    "Risk appetite unused headroom report reports unused appetite headroom to prevent silent clustering later.",
    "Headroom map redirects growth.",
    "Manage only at breach."
  ],
  [
    "Steering committee risk decision log",
    "Risk governance",
    "Steering committee risk decision log logs risk decisions in steering committees into ERM evidence.",
    "Steering accepted residual; ERM updated same day.",
    "Steering minutes lost to ERM."
  ],
  [
    "Risk governance cloud exit clause test",
    "Risk governance",
    "Risk governance cloud exit clause test tests contractual exit clauses for material cloud risk governance.",
    "Exit clause weak; renegotiated.",
    "Contract hope."
  ],
  [
    "Board risk pack page provenance",
    "Risk governance",
    "Board risk pack page provenance requires provenance (system, time, owner) on each board risk pack page.",
    "Unproven page blocked.",
    "Beautiful slides without lineage."
  ],
  [
    "Risk limit excess auto-notify compliance",
    "Risk governance",
    "Risk limit excess auto-notify compliance auto-notifies compliance/conduct on certain limit excess types.",
    "Market limit excess notifies surveillance.",
    "Risk-only notification."
  ],
  [
    "Group risk policy local adoption gap",
    "Risk governance",
    "Group risk policy local adoption gap tracks local adoption gaps against group risk policies.",
    "Two entities not adopted; waivers dated.",
    "Group policy as global fact."
  ],
  [
    "Risk governance whistleblowing interface",
    "Risk governance",
    "Risk governance whistleblowing interface interfaces whistleblowing themes with risk governance agendas.",
    "Theme on pressure → risk committee item.",
    "Whistleblowing siloed in HR."
  ],
  [
    "Capital and liquidity joint governance forum",
    "Risk governance",
    "Capital and liquidity joint governance forum runs a joint forum when capital and liquidity trade off.",
    "Joint forum sizes buffer vs CET1 use.",
    "Separate ALCO and capital without join."
  ],
  [
    "Risk governance model of three lines update",
    "Risk governance",
    "Risk governance model of three lines update updates the three-lines operating model when org design changes.",
    "Reorg left 2LOD gaps; model updated.",
    "Old lines chart after reorg."
  ],
  [
    "Material outsourcing risk committee approve",
    "Risk governance",
    "Material outsourcing risk committee approve requires risk-committee approval for material outsourcing.",
    "Outsourcing approved ops-only; ratified late.",
    "Procurement as risk approval."
  ],
  [
    "Risk appetite calibration to strategy cycle",
    "Risk governance",
    "Risk appetite calibration to strategy cycle recalibrates appetite on the strategy cycle, not only annually by habit.",
    "Strategy pivot → appetite reset mid-year.",
    "Calendar appetite only."
  ],
  [
    "Desk mandate market risk factor whitelist",
    "Risk governance",
    "Desk mandate market risk factor whitelist whitelists permitted risk factors per desk mandate.",
    "Off-whitelist factor trade blocked.",
    "Anything tradable."
  ],
  [
    "Risk governance evidence retention clock",
    "Risk governance",
    "Risk governance evidence retention clock clocks retention of risk governance evidence for regulatory horizons.",
    "Evidence gap on 5y; archive fixed.",
    "Chat as evidence."
  ],
  [
    "Board risk appetite hard versus soft train",
    "Risk governance",
    "Board risk appetite hard versus soft train trains the board on hard versus soft appetite distinctions with examples.",
    "Training clears confusion on amber.",
    "All appetite soft."
  ],
  [
    "Risk governance KPI gaming detection",
    "Risk governance",
    "Risk governance KPI gaming detection detects gaming of risk KPIs (threshold chases, redefinitions).",
    "Threshold chase found; KPI redesigned.",
    "Green KPI worship."
  ],
  [
    "Cross-risk concentration executive owner",
    "Risk governance",
    "Cross-risk concentration executive owner names executive owners for cross-risk concentrations (name, sector, country).",
    "Country concentration owner CRO delegate.",
    "Each silo own concentration."
  ],
  [
    "Risk governance change-the-bank portfolio",
    "Risk governance",
    "Risk governance change-the-bank portfolio portfolios change-the-bank initiatives by residual risk reduction yield.",
    "Low-yield high-risk project stopped.",
    "All change equal."
  ],
  [
    "Limit monitoring clock under system outage",
    "Risk governance",
    "Limit monitoring clock under system outage defines limit monitoring under risk-system outages.",
    "Outage playbook uses conservative freeze.",
    "Fly blind when system down."
  ],
  [
    "Risk governance customer duty interaction",
    "Risk governance",
    "Risk governance customer duty interaction documents how customer duty obligations interact with risk appetite decisions.",
    "Duty conflict on fee risk appetite; board paper.",
    "Duty ignored in risk."
  ],
  [
    "Independent price verification governance",
    "Risk governance",
    "Independent price verification governance governs IPV as part of risk governance with escalation.",
    "IPV break £2m escalated to MRC.",
    "IPV as accounting only."
  ],
  [
    "Risk governance for algorithmic trading",
    "Risk governance",
    "Risk governance for algorithmic trading extends risk governance to algo trading kill switches and mandates.",
    "Kill switch test failed; fixed pre-go.",
    "Algo as IT."
  ],
  [
    "Strategic risk early-warning board metric",
    "Risk governance",
    "Strategic risk early-warning board metric defines strategic-risk EWIs for the board beyond financial KRIs.",
    "Franchise EWI amber; strategy review.",
    "Financial KRIs only."
  ],
  [
    "Risk governance lessons from peer events",
    "Risk governance",
    "Risk governance lessons from peer events systematically reviews peer risk events for local applicability.",
    "Peer outage → local control gap found.",
    "Not invented here."
  ],
  [
    "Capital distribution risk capacity test",
    "Risk governance",
    "Capital distribution risk capacity test tests distributions/buybacks against risk capacity and reverse stress.",
    "Buyback delayed after capacity test.",
    "Distribution as pure finance."
  ],
  [
    "Risk governance data ethics overlay",
    "Risk governance",
    "Risk governance data ethics overlay overlays data-ethics constraints on risk data use and model features.",
    "Feature banned on ethics; model rebuilt.",
    "Any predictive feature allowed."
  ],
  [
    "Board risk appetite reverse stress link",
    "Risk governance",
    "Board risk appetite reverse stress link links reverse-stress findings to appetite calibration.",
    "Reverse stress breaches appetite earlier; appetite tightened.",
    "Reverse stress theatre."
  ],
  [
    "Risk governance dual-hatting register",
    "Risk governance",
    "Risk governance dual-hatting register registers dual-hatting of risk roles with conflict mitigants.",
    "Dual-hat CRO/CFO rejected; separated.",
    "Dual-hat efficiency."
  ],
  [
    "Material risk take onboarding gate",
    "Risk governance",
    "Material risk take onboarding gate gates onboarding of material new risk takes with committee approval.",
    "New desk risk take approved with limits.",
    "Soft launch without gate."
  ],
  [
    "Risk governance metrics audit trail immutable",
    "Risk governance",
    "Risk governance metrics audit trail immutable keeps immutable audit trails for changes to risk governance metrics.",
    "Metric edit without trail; system hardened.",
    "Editable board numbers."
  ],
  [
    "Internal capital adequacy action tracker",
    "Risk governance",
    "Internal capital adequacy action tracker tracks ICAAP actions in enterprise action systems with owners.",
    "ICAAP actions orphaned; migrated.",
    "ICAAP PDF graveyard."
  ],
  [
    "Risk governance climate transition owner",
    "Risk governance",
    "Risk governance climate transition owner names transition-risk owners and appetite metrics.",
    "Transition metric amber; product tilt.",
    "Climate owned by CSR only."
  ],
  [
    "Limit breach notification customer impact",
    "Risk governance",
    "Limit breach notification customer impact assesses whether limit breaches imply customer or market impact needing notice.",
    "Breach halted quotes; clients notified per playbook.",
    "Internal breach only."
  ],
  [
    "Risk governance for recovery options menu",
    "Risk governance",
    "Risk governance for recovery options menu keeps a governed menu of recovery options with execution owners.",
    "Option owners drilled; two options dropped as infeasible.",
    "Recovery laundry list."
  ],
  [
    "Second-line hiring independence from 1LOD",
    "Risk governance",
    "Second-line hiring independence from 1LOD protects 2LOD hiring/performance independence from 1LOD business lines.",
    "1LOD veto removed from 2LOD hiring.",
    "Business veto on risk hires."
  ],
  [
    "Risk appetite cascade system encoding test",
    "Risk governance",
    "Risk appetite cascade system encoding test tests that appetite cascades are encoded in booking/limit systems.",
    "Paper cascade only; system encoding project.",
    "Cascade slides."
  ],
  [
    "Board risk pack assumption cite control",
    "Risk governance",
    "Board risk pack assumption cite control requires cited, versioned assumptions on stress pages of board packs.",
    "Uncited stress page blocked.",
    "Silent assumption drift."
  ],
  [
    "Risk governance regulatory Q&A log",
    "Risk governance",
    "Risk governance regulatory Q&A log logs regulatory Q&A that change risk interpretations with owners.",
    "Q&A changes LCR view; pack updated.",
    "Tribal knowledge."
  ],
  [
    "Enterprise risk taxonomy change impact",
    "Risk governance",
    "Enterprise risk taxonomy change impact assesses impact of taxonomy changes on history and appetite.",
    "Taxonomy change breaks trends; bridge provided.",
    "Rename without bridge."
  ],
  [
    "Risk governance overtime fatigue indicator",
    "Risk governance",
    "Risk governance overtime fatigue indicator tracks fatigue/overtime in control functions as a risk-culture indicator.",
    "Fatigue KRI red in ops risk; headcount case.",
    "Heroics as culture."
  ],
  [
    "Material model go-live board notification",
    "Risk governance",
    "Material model go-live board notification notifies board/AC of material model go-lives and conditions.",
    "Go-live conditions reported; two open.",
    "Models go live silently."
  ],
  [
    "Risk governance conflict of interest map",
    "Risk governance",
    "Risk governance conflict of interest map maps conflicts where remuneration fights risk appetite.",
    "Bonus on volume vs risk; redesign proposed.",
    "Pay vs risk ignored."
  ],
  [
    "Crisis management team risk role cards",
    "Risk governance",
    "Crisis management team risk role cards issues role cards for risk seats on the crisis management team.",
    "Role card missing data lead; added after drill.",
    "Improvised crisis roles."
  ],
  [
    "Risk governance evidence of tone challenges",
    "Risk governance",
    "Risk governance evidence of tone challenges evidences real challenges to tone-from-the-top narratives when outcomes diverge.",
    "Challenge logged after sales pressure incident.",
    "Tone posters only."
  ],
  [
    "Portfolio risk vs name risk governance split",
    "Risk governance",
    "Portfolio risk vs name risk governance split splits governance of portfolio measures versus name measures with clear owners.",
    "Portfolio green / name red escalated.",
    "Portfolio average hiding names."
  ],
  [
    "Risk governance for stressed product exit",
    "Risk governance",
    "Risk governance for stressed product exit governs orderly exit playbooks when products breach risk appetite chronically.",
    "Exit playbook executed on product; customers migrated.",
    "Chronic breach tolerated."
  ],
  [
    "Inter-affiliate risk transfer governance",
    "Risk governance",
    "Inter-affiliate risk transfer governance governs inter-affiliate risk transfers with residual ownership clear.",
    "Transfer without residual owner; fixed.",
    "Transfer deletes risk."
  ],
  [
    "Risk governance metric parallel run rule",
    "Risk governance",
    "Risk governance metric parallel run rule requires parallel runs when board risk metrics are redefined.",
    "Parallel run 2 cycles; then cutover.",
    "Redefine and forget history."
  ],
  [
    "Desk closure risk residual acceptance",
    "Risk governance",
    "Desk closure risk residual acceptance requires residual acceptance when desks close with leftover risk.",
    "Closed desk residual accepted 60 days; exited.",
    "Closure without residual."
  ],
  [
    "Risk governance open-source model use",
    "Risk governance",
    "Risk governance open-source model use governs use of open-source models/libraries in risk stacks.",
    "OS library CVE; patched; policy updated.",
    "OSS untracked."
  ],
  [
    "Board risk appetite multilingual consistency",
    "Risk governance",
    "Board risk appetite multilingual consistency ensures translated appetite materials stay consistent across entities.",
    "Translation softened hard limit; corrected.",
    "Local rewrite of appetite."
  ],
  [
    "Risk governance surveillance to desk limits",
    "Risk governance",
    "Risk governance surveillance to desk limits feeds repeated surveillance concerns into desk limit reviews.",
    "Surveillance theme → limit cut.",
    "Surveillance silo."
  ],
  [
    "Capital planning risk constraint register",
    "Risk governance",
    "Capital planning risk constraint register registers risk constraints binding capital planning (concentration, model, op).",
    "Constraint binds plan; growth tilted.",
    "Capital plan finance-only."
  ],
  [
    "Risk governance black-box vendor exit test",
    "Risk governance",
    "Risk governance black-box vendor exit test tests exit/replace feasibility for black-box risk vendors.",
    "Exit infeasible in 180 days; dual-vendor plan.",
    "Vendor lock-in surprise."
  ],
  [
    "Limit framework product onboarding checklist",
    "Risk governance",
    "Limit framework product onboarding checklist checklists limit framework updates before product onboarding.",
    "Product live without limit; blocked retrospectively.",
    "Onboard then limit."
  ],
  [
    "Risk governance near-miss board visibility",
    "Risk governance",
    "Risk governance near-miss board visibility gives board visibility to material near-misses with systemic learning.",
    "Near-miss pack quarterly instituted.",
    "Losses only to board."
  ],
  [
    "Risk function quality assurance sampling",
    "Risk governance",
    "Risk function quality assurance sampling QA-samples 2LOD opinions for quality and evidence.",
    "QA fail on three opinions; coaching.",
    "2LOD volume without QA."
  ],
  [
    "Strategic initiative risk capacity reservation",
    "Risk governance",
    "Strategic initiative risk capacity reservation reserves risk capacity for approved strategic initiatives explicitly.",
    "Initiative consumes silent capacity; reservation process added.",
    "Strategy eats appetite unseen."
  ],
  [
    "Risk governance immutable breach timeline",
    "Risk governance",
    "Risk governance immutable breach timeline keeps an immutable timeline of appetite/limit breaches and closures.",
    "Timeline rewrite attempt blocked.",
    "Editable breach history."
  ],
  [
    "Customer remediation risk governance join",
    "Risk governance",
    "Customer remediation risk governance join joins remediation governance with risk appetite and conduct metrics.",
    "Remediation slip hits conduct appetite; EXCO.",
    "Remediation ops-only."
  ],
  [
    "Risk governance for multi-entity booking books",
    "Risk governance",
    "Risk governance for multi-entity booking books governs split booking books across entities with consolidated risk view.",
    "Split books hid concentration; consolidate view built.",
    "Entity blinds."
  ],
  [
    "Board risk metrics change log annual",
    "Risk governance",
    "Board risk metrics change log annual publishes an annual change log of board risk metrics and why.",
    "Change log to AC; two metrics retired.",
    "Silent metric churn."
  ],
  [
    "Risk governance stress testing role clarity",
    "Risk governance",
    "Risk governance stress testing role clarity clarifies 1LOD vs 2LOD roles in enterprise stress testing.",
    "Role clarity stops duplicated scenarios.",
    "Everyone runs own stress."
  ],
  [
    "Material risk acceptance public disclosure check",
    "Risk governance",
    "Material risk acceptance public disclosure check checks whether accepted material risks need external disclosure consideration.",
    "Acceptance triggers disclosure assess; Legal joined.",
    "Accept silently."
  ],
  [
    "Risk governance continuous monitoring scope",
    "Risk governance",
    "Risk governance continuous monitoring scope defines which risks require continuous monitoring versus periodic.",
    "Continuous scope for cyber/liquidity; others periodic.",
    "All risks quarterly equal."
  ],
  [
    "Desk risk strategy alignment attest",
    "Risk governance",
    "Desk risk strategy alignment attest attests desk strategies align with firm risk strategy annually.",
    "Desk strategy off-mandate; rewritten.",
    "Desk freelancing."
  ],
  [
    "Risk governance incident severity calibration",
    "Risk governance",
    "Risk governance incident severity calibration calibrates incident severity scales firm-wide with monetary anchors.",
    "Severity recalibrated; comparability restored.",
    "Local severity colours."
  ],
  [
    "Outsourced CRO office independence test",
    "Risk governance",
    "Outsourced CRO office independence test tests independence when parts of CRO office are outsourced.",
    "Outsourced analytics reporting line fixed.",
    "Outsource equals independent."
  ],
  [
    "Risk appetite visualization comprehension test",
    "Risk governance",
    "Risk appetite visualization comprehension test tests whether board visualizations of appetite are comprehended correctly.",
    "Comprehension fail on dual-axis chart; redesigned.",
    "Pretty charts assumed clear."
  ],
  [
    "Risk governance legal entity resolution stay",
    "Risk governance",
    "Risk governance legal entity resolution stay incorporates resolution stay powers into close-out risk governance.",
    "Stay impacts netting assumption; documented.",
    "Ignore stay in CCR."
  ],
  [
    "Capital conservation buffer governance trigger",
    "Risk governance",
    "Capital conservation buffer governance trigger governs management actions as CCB/MDA triggers approach.",
    "Trigger proximity plan activated.",
    "Buffer as dead number."
  ],
  [
    "Risk governance product complexity score",
    "Risk governance",
    "Risk governance product complexity score scores product complexity for enhanced risk governance gates.",
    "High complexity → extra validation gate.",
    "All products same gate."
  ],
  [
    "Second-line opinion disagreement register",
    "Risk governance",
    "Second-line opinion disagreement register registers formal 1LOD/2LOD disagreements with resolution paths.",
    "Disagreement on residual; CRO decides dated.",
    "Disagreement smoothed away."
  ],
  [
    "Risk governance training for limit approvers",
    "Risk governance",
    "Risk governance training for limit approvers trains limit approvers on hierarchy, breach, and evidence duties.",
    "Approver error rate down after training.",
    "Title as competence."
  ],
  [
    "Enterprise risk dashboard drill-through control",
    "Risk governance",
    "Enterprise risk dashboard drill-through control controls drill-through from enterprise dashboards to source evidence.",
    "Drill-through broken; fixed before board.",
    "Dashboard without drill."
  ],
  [
    "Risk governance merger integration day-1",
    "Risk governance",
    "Risk governance merger integration day-1 sets day-1 risk governance for mergers (limits, appetite, models).",
    "Day-1 dual limits; integration plan tracked.",
    "Merge first, risk later."
  ],
  [
    "Board risk appetite scenario narrative pack",
    "Risk governance",
    "Board risk appetite scenario narrative pack packs short narratives that show how appetite would bind in scenarios.",
    "Narratives used in board education; decisions clearer.",
    "Metrics without stories."
  ],
  [
    "Risk governance whistleblower retaliation KRI",
    "Risk governance",
    "Risk governance whistleblower retaliation KRI tracks retaliation indicators as a risk-culture KRI for governance.",
    "KRI amber after incident; board informed.",
    "Retaliation as HR only."
  ],
  [
    "Limit framework FX translation consistency",
    "Risk governance",
    "Limit framework FX translation consistency ensures FX translation of limits is consistent across systems.",
    "FX mismatch created false headroom; fixed.",
    "Local currency limit islands."
  ],
  [
    "Risk governance open validation finding age",
    "Risk governance",
    "Risk governance open validation finding age ages open validation findings to CRO/board thresholds.",
    "High finding >60 days to board.",
    "Findings age in silence."
  ],
  [
    "Strategic risk capacity versus financial capacity",
    "Risk governance",
    "Strategic risk capacity versus financial capacity separates strategic risk capacity discussions from financial risk capacity.",
    "Strategic capacity paper distinct; board clearer.",
    "One capacity word for all."
  ],
  [
    "Risk governance for discontinued ops runoff",
    "Risk governance",
    "Risk governance for discontinued ops runoff governs risk in discontinued operations runoff portfolios.",
    "Runoff limits and owners set; monitored.",
    "Discontinued equals ignored."
  ],
  [
    "Appetite breach 24-hour evidence pack rule",
    "Risk governance",
    "Appetite breach 24-hour evidence pack rule requires a 24-hour evidence pack starter for hard appetite breaches.",
    "Pack started same day; EXCO briefed.",
    "Breach email only."
  ],
  [
    "Risk governance model of customer harm",
    "Risk governance",
    "Risk governance model of customer harm embeds a customer-harm lens into enterprise risk governance agendas.",
    "Harm lens changes residual on complaints risk.",
    "Shareholder-only risk."
  ],
  [
    "Cross-desk netting governance approval",
    "Risk governance",
    "Cross-desk netting governance approval requires governance approval before cross-desk risk netting in limits.",
    "Unofficial netting banned; formal policy.",
    "Traders net across desks ad hoc."
  ],
  [
    "Risk governance regulatory horizon calendar",
    "Risk governance",
    "Risk governance regulatory horizon calendar maintains a regulatory horizon calendar owned by risk governance.",
    "Horizon item hits capital; plan pre-baked.",
    "Legal calendar only."
  ],
  [
    "Board risk metrics bilingual number recon",
    "Risk governance",
    "Board risk metrics bilingual number recon recons bilingual/dual-presentation board risk numbers for consistency.",
    "Rounding recon fail; fixed.",
    "Two languages two numbers."
  ],
  [
    "Risk governance assurance map annual",
    "Risk governance",
    "Risk governance assurance map annual publishes an annual assurance map across 1/2/3LOD for material risks.",
    "Map gap on model risk; IA added.",
    "Assume coverage."
  ],
  [
    "Material residual acceptance expiry wake",
    "Risk governance",
    "Material residual acceptance expiry wake wakes expired material residual acceptances automatically.",
    "Expired acceptance woke; residual reopened.",
    "Accept and forget."
  ],
  [
    "Risk governance crypto desk special addendum",
    "Risk governance",
    "Risk governance crypto desk special addendum applies a special governance addendum for crypto/digital asset desks.",
    "Addendum limits overnight and venue risk; enforced.",
    "Same governance as cash equities."
  ],
  [
    "Internal audit risk governance reliance rules",
    "Risk governance",
    "Internal audit risk governance reliance rules sets rules for when risk governance may rely on IA versus reperform.",
    "Reliance rules applied; reperformance 25% high risk.",
    "Blind rely on IA."
  ],
  [
    "Risk governance P&L attribution unexplained",
    "Risk governance",
    "Risk governance P&L attribution unexplained escalates persistent unexplained P&L as a governance risk signal.",
    "Unexplained 8 days; mapping review.",
    "P&L noise accepted."
  ],
  [
    "Desk closure customer migration risk gate",
    "Risk governance",
    "Desk closure customer migration risk gate gates desk closures on customer migration risk assessments.",
    "Migration risk high; closure phased.",
    "Close desk, strand customers."
  ],
  [
    "Risk governance stress test board education",
    "Risk governance",
    "Risk governance stress test board education educates the board on what stress tests can and cannot show.",
    "Education cuts overconfidence in green stress.",
    "Stress as prophecy."
  ],
  [
    "Capital RWA optimisation risk governance",
    "Risk governance",
    "Capital RWA optimisation risk governance governs RWA optimisation so it cannot undermine risk substance.",
    "Optimisation challenge pack; two trades blocked.",
    "RWA games unchecked."
  ],
  [
    "Risk governance third-party board metric",
    "Risk governance",
    "Risk governance third-party board metric includes a third-party concentration/resilience metric in board risk MI.",
    "Metric amber on cloud; dual-region funded.",
    "Vendor risk ops-only."
  ],
  [
    "Limit monitoring holiday calendar coverage",
    "Risk governance",
    "Limit monitoring holiday calendar coverage ensures limit monitoring coverage across holiday calendars.",
    "Holiday blind spot found; coverage extended.",
    "Local holiday unmonitored."
  ],
  [
    "Risk governance ethics hotline to ERM bridge",
    "Risk governance",
    "Risk governance ethics hotline to ERM bridge bridges ethics hotline themes into ERM when patterns form.",
    "Theme bridged; risk raised.",
    "Ethics silo."
  ],
  [
    "Board risk appetite capacity joint paper",
    "Risk governance",
    "Board risk appetite capacity joint paper requires a joint appetite–capacity paper at least annually.",
    "Joint paper resets both; coherent.",
    "Appetite without capacity."
  ],
  [
    "Risk governance unexplained model overlay",
    "Risk governance",
    "Risk governance unexplained model overlay escalates large unexplained overlays as governance failures.",
    "Overlay £25m unexplained; removed pending evidence.",
    "Overlay as plug."
  ],
  [
    "Trading authority digital signature control",
    "Risk governance",
    "Trading authority digital signature control controls digital signatures on trading authorities and mandate changes.",
    "Forged authority attempt blocked; control held.",
    "Email authority."
  ],
  [
    "Risk governance scenario library access",
    "Risk governance",
    "Risk governance scenario library access controls access and change rights on the enterprise scenario library.",
    "Unauthorized edit caught; access cut.",
    "Open scenario wiki."
  ],
  [
    "Material risk owner deputy requirement",
    "Risk governance",
    "Material risk owner deputy requirement requires named deputies for material risk owners.",
    "Deputy missing on cyber; appointed.",
    "Owner on leave, risk orphan."
  ],
  [
    "Risk governance post-deal risk retention",
    "Risk governance",
    "Risk governance post-deal risk retention governs risk retention after deals/securitisations against appetite.",
    "Retention exceeds appetite; pared.",
    "Deal done, retention ignored."
  ],
  [
    "Enterprise limit util forecast week-ahead",
    "Risk governance",
    "Enterprise limit util forecast week-ahead forecasts week-ahead limit utilisation for material desks.",
    "Forecast breach; pre-trimmed.",
    "Reactive breaches only."
  ],
  [
    "Risk governance customer outcome testing join",
    "Risk governance",
    "Risk governance customer outcome testing join joins customer outcome testing results into risk committee MI.",
    "Outcome fails elevate conduct residual.",
    "Outcomes in conduct silo only."
  ],
  [
    "Board risk pack late change freeze",
    "Risk governance",
    "Board risk pack late change freeze freezes late changes to board risk packs except emergency process.",
    "Late number swap blocked; appendix used.",
    "Pack churn night before."
  ],
  [
    "Risk governance dual book shadow positions",
    "Risk governance",
    "Risk governance dual book shadow positions detects shadow positions outside official risk books.",
    "Shadow book found; onboarded or closed.",
    "Official books only trust."
  ],
  [
    "Internal funds transfer risk governance",
    "Risk governance",
    "Internal funds transfer risk governance governs internal funds transfer prices as risk behaviour drivers.",
    "FTP rewrite reduces liquidity-hungry products.",
    "FTP as accounting fiction."
  ],
  [
    "Risk governance AI use in credit decisions",
    "Risk governance",
    "Risk governance AI use in credit decisions governs AI-assisted credit decisions with human accountability retained.",
    "AI suggest + human decide evidenced.",
    "AI auto-decide silently."
  ],
  [
    "Concentration risk cross-committee forum",
    "Risk governance",
    "Concentration risk cross-committee forum runs a cross-committee forum for name/sector/country concentration.",
    "Forum catches double-counting gaps.",
    "Each committee own slice."
  ],
  [
    "Risk governance evidence of challenge minutes",
    "Risk governance",
    "Risk governance evidence of challenge minutes requires minutes to evidence challenge, not only decisions.",
    "Minutes upgraded; challenge visible.",
    "Decision-only minutes."
  ],
  [
    "Desk risk self-assessment 2LOD sample",
    "Risk governance",
    "Desk risk self-assessment 2LOD sample samples desk risk self-assessments for 2LOD challenge substance.",
    "Self-green overturned on 3 desks.",
    "Self-assess as truth."
  ],
  [
    "Risk governance resolution valuation assumption",
    "Risk governance",
    "Risk governance resolution valuation assumption governs valuation assumptions used in resolution planning versus BAU.",
    "Resolution haircuts stricter; documented.",
    "BAU marks in resolution."
  ],
  [
    "Material KRI owner vacation cover test",
    "Risk governance",
    "Material KRI owner vacation cover test tests vacation cover for material KRI owners.",
    "Cover fail; deputies named.",
    "KRI dies on leave."
  ],
  [
    "Risk governance market closure playbook",
    "Risk governance",
    "Risk governance market closure playbook playbooks risk governance actions when markets close or halt.",
    "Halt playbook freezes certain limits.",
    "Business as usual in halt."
  ],
  [
    "Board risk metrics external benchmark caution",
    "Risk governance",
    "Board risk metrics external benchmark caution cautions board use of external peer risk metrics without methodology align.",
    "Peer LCR comparison footnoted methodology.",
    "Peer charts as targets."
  ],
  [
    "Risk governance product sunset criteria",
    "Risk governance",
    "Risk governance product sunset criteria sets sunset criteria when products chronically consume scarce risk capacity.",
    "Sunset criteria met; product wound down.",
    "Zombie products."
  ],
  [
    "Limit excess root-cause taxonomy",
    "Risk governance",
    "Limit excess root-cause taxonomy taxonomises limit excess root causes for systemic fix.",
    "Taxonomy shows booking errors 40%; system fix.",
    "Each excess unique."
  ],
  [
    "Risk governance crypto fork event plan",
    "Risk governance",
    "Risk governance crypto fork event plan plans risk actions for crypto chain forks/airdrops on desks.",
    "Fork plan freezes bookings; executed in test.",
    "Ignore forks."
  ],
  [
    "Enterprise risk acceptance monetary bands",
    "Risk governance",
    "Enterprise risk acceptance monetary bands publishes firm-wide monetary bands for residual risk acceptance authority.",
    "Band breach acceptance void; re-approved.",
    "Narrative accept any size."
  ],
  [
    "Risk governance unexplained attribution days",
    "Risk governance",
    "Risk governance unexplained attribution days KRIs consecutive days of unexplained risk P&L attribution.",
    "KRI red at day 5; war room.",
    "Unexplained forever."
  ],
  [
    "Second-line product opinion SLA clock",
    "Risk governance",
    "Second-line product opinion SLA clock clocks 2LOD product opinions with quality and timeliness SLAs.",
    "SLA miss delays launch correctly.",
    "Speed over substance."
  ],
  [
    "Risk governance stress test disclosure align",
    "Risk governance",
    "Risk governance stress test disclosure align aligns internal stress narratives with external stress disclosures.",
    "Misalign found; disclosure committee fixes.",
    "Two stress stories."
  ],
  [
    "Board risk appetite update trigger events",
    "Risk governance",
    "Board risk appetite update trigger events defines trigger events that force off-cycle appetite updates.",
    "Strategy M&A trigger updates appetite.",
    "Annual only."
  ],
  [
    "Risk governance collateral dispute desk link",
    "Risk governance",
    "Risk governance collateral dispute desk link links collateral disputes to counterparty and liquidity governance.",
    "Dispute spike → CCR review.",
    "Disputes as ops noise."
  ],
  [
    "Material risk data vendor dual source",
    "Risk governance",
    "Material risk data vendor dual source requires dual sources for material risk data vendors where feasible.",
    "Single weather data vendor; dual added.",
    "Single source hope."
  ],
  [
    "Risk governance trader holiday risk cover",
    "Risk governance",
    "Risk governance trader holiday risk cover requires risk cover plans when key traders are on leave with open risk.",
    "Holiday cover missing; positions reduced.",
    "Books unmanaged on leave."
  ],
  [
    "Enterprise breach register immutability",
    "Risk governance",
    "Enterprise breach register immutability keeps the enterprise breach register append-only for material events.",
    "Edit attempt blocked; correction entry used.",
    "Rewrite history."
  ],
  [
    "Risk governance payment finality assumption",
    "Risk governance",
    "Risk governance payment finality assumption documents payment finality assumptions in risk and liquidity governance.",
    "Finality lag modelled; limits adjusted.",
    "Instant finality myth."
  ],
  [
    "Cross-border data risk governance pack",
    "Risk governance",
    "Cross-border data risk governance pack packs cross-border data transfer risks into governance for risk systems.",
    "Transfer pack blocks non-compliant feed.",
    "Data wherever."
  ],
  [
    "Risk governance model of reputational spillover",
    "Risk governance",
    "Risk governance model of reputational spillover models reputational spillover into liquidity and franchise risk governance.",
    "Spillover add-on in reverse stress.",
    "Reputation non-financial forever."
  ],
  [
    "Desk-level risk strategy public to 2LOD",
    "Risk governance",
    "Desk-level risk strategy public to 2LOD makes desk risk strategies visible to 2LOD for challenge.",
    "Hidden strategy found off-appetite; cut.",
    "Secret desk strategies."
  ],
  [
    "Risk governance buyback under stress rule",
    "Risk governance",
    "Risk governance buyback under stress rule rules share buybacks/distributions under stress indicator states.",
    "Buyback paused on amber capital EWI.",
    "Distributions on autopilot."
  ],
  [
    "Limit framework crypto venue concentration",
    "Risk governance",
    "Limit framework crypto venue concentration limits venue concentration for crypto and digital asset trading.",
    "Venue cap 40%; enforced.",
    "Best price any venue."
  ],
  [
    "Risk governance assurance over appetite IT",
    "Risk governance",
    "Risk governance assurance over appetite IT assures IT controls that encode appetite and limits.",
    "IT encode fail; paper vs system gap fixed.",
    "Policy PDF as control."
  ],
  [
    "Board risk education on model limitations",
    "Risk governance",
    "Board risk education on model limitations educates the board on material model limitations affecting decisions.",
    "Education pack annual; better challenge.",
    "Models as truth machines."
  ],
  [
    "Risk governance freeze on unresolved high findings",
    "Risk governance",
    "Risk governance freeze on unresolved high findings can freeze related risk-taking when high risk findings stay unresolved past SLA.",
    "Freeze on desk after 90-day high finding.",
    "Findings without teeth."
  ],
  [
    "Enterprise risk owner RACI interview assure",
    "Risk governance",
    "Enterprise risk owner RACI interview assure assures RACI via interviews so owners know they own the risk.",
    "Owners unaware; RACI corrected.",
    "Spreadsheet RACI."
  ],
  [
    "Risk governance scenario severity challenge",
    "Risk governance",
    "Risk governance scenario severity challenge requires independent challenge of scenario severities before capital use.",
    "Severity cut £10m after challenge; evidenced.",
    "Facilitator severity final."
  ],
  [
    "Material third-party board approval threshold",
    "Risk governance",
    "Material third-party board approval threshold sets board/risk-committee thresholds for material third-party engagements.",
    "Threshold deal escalated; conditions set.",
    "Procurement signs all."
  ],
  [
    "Risk governance P&L to risk system recon",
    "Risk governance",
    "Risk governance P&L to risk system recon recons official P&L to risk-system expected P&L regularly.",
    "Recon break reveals missing factor; added.",
    "P&L and risk diverge quietly."
  ],
  [
    "Risk governance for stressed netting beliefs",
    "Risk governance",
    "Risk governance for stressed netting beliefs challenges netting/close-out beliefs under stress and stay regimes.",
    "Belief cut; exposure up; limits cut.",
    "ISDA optimism."
  ],
  [
    "Board risk pack bilingual glossary",
    "Risk governance",
    "Board risk pack bilingual glossary provides a glossary so board risk terms stay consistent across packs.",
    "Glossary stops amber confusion.",
    "Author slang."
  ],
  [
    "Risk governance unplanned risk take log",
    "Risk governance",
    "Risk governance unplanned risk take log logs unplanned risk takes discovered post-facto with sanctions/learning.",
    "Unplanned take logged; mandate training.",
    "Hide unplanned takes."
  ],
  [
    "Capital contingency securities issuance readiness",
    "Risk governance",
    "Capital contingency securities issuance readiness keeps issuance readiness (docs, ratings, slots) for capital contingency.",
    "Docs stale; refreshed in drill.",
    "Contingency without readiness."
  ],
  [
    "Risk governance market risk factor whitelist firm",
    "Risk governance",
    "Risk governance market risk factor whitelist firm maintains a firm-wide whitelist of modellable risk factors with onboarding gate.",
    "New factor onboarded with residual cap.",
    "Infinite proxies."
  ],
  [
    "Desk risk limits vs HR performance goals",
    "Risk governance",
    "Desk risk limits vs HR performance goals checks desk performance goals do not conflict with risk limits.",
    "Volume goal fights limit; goal rewritten.",
    "Pay vs limit war."
  ],
  [
    "Risk governance climate legal claim overlay",
    "Risk governance",
    "Risk governance climate legal claim overlay overlays climate-related legal claim risk into governance agendas.",
    "Claim overlay raises conduct/legal residual.",
    "Climate physical only."
  ],
  [
    "Enterprise risk MI mobile leak control",
    "Risk governance",
    "Enterprise risk MI mobile leak control controls mobile/distribution leak risk for sensitive risk MI.",
    "Watermark + list; leak test pass.",
    "Open PDF forwards."
  ],
  [
    "Risk governance settlement finality jurisdiction",
    "Risk governance",
    "Risk governance settlement finality jurisdiction maps settlement finality by jurisdiction into risk taking permissions.",
    "Weak finality currency limited.",
    "Assume finality everywhere."
  ],
  [
    "Board risk appetite example decision library",
    "Risk governance",
    "Board risk appetite example decision library maintains a library of example decisions showing appetite binding.",
    "Library used in induction; clearer votes.",
    "Abstract appetite."
  ],
  [
    "Risk governance unexplained credit migration",
    "Risk governance",
    "Risk governance unexplained credit migration escalates unexplained large credit migrations as governance signals.",
    "Migration spike unexplained; model+credit review.",
    "Migrations as weather."
  ],
  [
    "Limit monitoring crypto 24/7 coverage rota",
    "Risk governance",
    "Limit monitoring crypto 24/7 coverage rota sets 24/7 coverage rotas for desks with continuous markets.",
    "Rota gap weekend; filled.",
    "Friday coverage only."
  ],
  [
    "Risk governance recovery indicator ownership",
    "Risk governance",
    "Risk governance recovery indicator ownership assigns owners to each recovery indicator with data lineage.",
    "Ownerless indicator fixed.",
    "Indicators without owners."
  ],
  [
    "Material risk strategy offsite outcomes track",
    "Risk governance",
    "Material risk strategy offsite outcomes track tracks outcomes from risk strategy offsites into funded actions.",
    "Offsite actions 60% done; remainder escalated.",
    "Offsite theatre."
  ],
  [
    "Risk governance customer complaint systemic flag",
    "Risk governance",
    "Risk governance customer complaint systemic flag flags systemic complaint patterns into risk governance automatically.",
    "Systemic flag elevates product residual.",
    "Case-by-case complaints."
  ],
  [
    "Enterprise risk capacity reservation ledger",
    "Risk governance",
    "Enterprise risk capacity reservation ledger ledgers risk capacity reservations and releases like capital commitments.",
    "Ledger prevents double-booking capacity.",
    "Verbal reservations."
  ],
  [
    "Risk governance model risk board dashboard",
    "Risk governance",
    "Risk governance model risk board dashboard puts a board-level model-risk dashboard with tiers and findings age.",
    "Dashboard shows 3 high aged findings.",
    "Model risk deep in tech packs."
  ],
  [
    "Cross-border sanctions risk governance join",
    "Risk governance",
    "Cross-border sanctions risk governance join joins sanctions hits to credit, market, and liquidity governance instantly.",
    "Hit freezes related limits same day.",
    "Sanctions email late."
  ],
  [
    "Risk governance stress test data cut ethics",
    "Risk governance",
    "Risk governance stress test data cut ethics ethics-reviews data cuts used in stress testing for unfair cohort effects.",
    "Cut biases cohort; methodology changed.",
    "Any cut allowed."
  ],
  [
    "Board risk metrics provenance QR or link",
    "Risk governance",
    "Board risk metrics provenance QR or link provides provenance links from board metrics to system extracts.",
    "Link used in AC deep-dive; trust up.",
    "Numbers from nowhere."
  ],
  [
    "Risk governance unexplained liquidity metric jump",
    "Risk governance",
    "Risk governance unexplained liquidity metric jump escalates unexplained jumps in LCR/NSFR/intraday metrics.",
    "Jump from mapping bug; restated.",
    "Accept jumps."
  ],
  [
    "Desk onboarding risk culture module",
    "Risk governance",
    "Desk onboarding risk culture module requires risk-culture modules before desk go-live.",
    "Module evidenced; go-live approved.",
    "Technical go-live only."
  ],
  [
    "Risk governance third-line annual opinion use",
    "Risk governance",
    "Risk governance third-line annual opinion use defines how annual IA opinions feed risk appetite calibration.",
    "IA opinion adverse → appetite review.",
    "Opinion shelfware."
  ],
  [
    "Material residual risk public marker internal",
    "Risk governance",
    "Material residual risk public marker internal internally marks accepted material residuals so staff see them.",
    "Marker on product page; sales aware.",
    "Hidden accepts."
  ],
  [
    "Risk governance calendar collision 1LOD 2LOD",
    "Risk governance",
    "Risk governance calendar collision 1LOD 2LOD prevents assurance/risk review collisions on the same owners.",
    "Collision moved; field quality up.",
    "Pile-on week."
  ],
  [
    "Enterprise risk taxonomy regulator mapping",
    "Risk governance",
    "Enterprise risk taxonomy regulator mapping maps enterprise taxonomy to regulator risk categories with bridges.",
    "Mapping pack supports exam; gaps closed.",
    "Local names only."
  ],
  [
    "Risk governance buy-side vs sell-side books",
    "Risk governance",
    "Risk governance buy-side vs sell-side books separates governance expectations for buy-side versus sell-side risk books.",
    "Buy-side liquidity govern distinct; clearer.",
    "One playbook both."
  ],
  [
    "Board risk appetite soft breach trend rule",
    "Risk governance",
    "Board risk appetite soft breach trend rule escalates trends of soft breaches even if each is approved.",
    "Three soft breaches → hard review.",
    "Soft forever."
  ],
  [
    "Risk governance digital operational resilience",
    "Risk governance",
    "Risk governance digital operational resilience embeds digital operational resilience tests into risk governance cadence.",
    "Resilience test fail → residual up.",
    "Resilience as IT project."
  ],
  [
    "Limit framework stress add-on activation",
    "Risk governance",
    "Limit framework stress add-on activation defines when stress add-ons activate into hard intraday limits.",
    "Add-on activates on VIX trigger; desk cut.",
    "Stress add-on advisory only."
  ],
  [
    "Risk governance peer review of CRO papers",
    "Risk governance",
    "Risk governance peer review of CRO papers peer-reviews material CRO board papers before circulation.",
    "Peer review catches error; pack fixed.",
    "CRO paper unchecked."
  ],
  [
    "Material risk data retention legal hold join",
    "Risk governance",
    "Material risk data retention legal hold join joins legal holds to risk data retention so evidence survives.",
    "Hold missed risk DB; process joined.",
    "Retention fights hold."
  ],
  [
    "Risk governance unexplained RWA movement",
    "Risk governance",
    "Risk governance unexplained RWA movement explains material RWA movements with owners within SLA.",
    "Unexplained RWA +£400m; mapped in 5 days.",
    "RWA weather."
  ],
  [
    "Desk risk limit holiday borrow rules",
    "Risk governance",
    "Desk risk limit holiday borrow rules rules temporary borrows of unused limits across desks with expiry.",
    "Borrow expired auto-revert; no drift.",
    "Informal limit lending."
  ],
  [
    "Risk governance customer duty stress lens",
    "Risk governance",
    "Risk governance customer duty stress lens applies customer-duty lenses to stress and reverse-stress narratives.",
    "Duty lens changes severity on ops scenario.",
    "Shareholder stress only."
  ],
  [
    "Enterprise risk MI accessibility standard",
    "Risk governance",
    "Enterprise risk MI accessibility standard standards accessibility of risk MI so governance is not vision-only.",
    "Colour-only amber fails; labels added.",
    "Traffic lights alone."
  ],
  [
    "Risk governance crypto wallet control attest",
    "Risk governance",
    "Risk governance crypto wallet control attest attests wallet/custody controls for digital asset risk taking.",
    "Attest fail; desk halted until fixed.",
    "Exchange screenshot custody."
  ],
  [
    "Board risk capacity under accounting stress",
    "Risk governance",
    "Board risk capacity under accounting stress considers accounting and capital stresses jointly in capacity.",
    "CECL+RWA joint view; capacity tighter.",
    "Capital-only capacity."
  ],
  [
    "Risk governance open source scorecard use",
    "Risk governance",
    "Risk governance open source scorecard use governs use of open-source credit/behaviour scorecards.",
    "OSS scorecard gated; challenger required.",
    "GitHub model in production."
  ],
  [
    "Material risk acceptance customer notice assess",
    "Risk governance",
    "Material risk acceptance customer notice assess assesses whether accepting residual risk requires customer notice or change.",
    "Acceptance triggers product disclosure update.",
    "Accept silently toward customers."
  ],
  [
    "Risk governance trading halt cascade",
    "Risk governance",
    "Risk governance trading halt cascade defines cascades from market halts into desk risk permissions.",
    "Halt cascade freezes new risk; documented.",
    "Keep quoting in halt."
  ],
  [
    "Enterprise risk owner performance calibration",
    "Risk governance",
    "Enterprise risk owner performance calibration calibrates performance ratings for material risk owners with risk outcomes.",
    "Owner with chronic breaches downgraded.",
    "Risk outcomes ignored in HR."
  ],
  [
    "Risk governance stress test code freeze",
    "Risk governance",
    "Risk governance stress test code freeze freezes stress-test code/config before official runs.",
    "Late tweak blocked; version locked.",
    "Tweak during run."
  ],
  [
    "Limit monitoring alert routing duty roster",
    "Risk governance",
    "Limit monitoring alert routing duty roster rosters who receives limit alerts by hour/desk with backups.",
    "Alert to empty inbox; roster fixed.",
    "Alert into void."
  ],
  [
    "Risk governance franchise risk metric board",
    "Risk governance",
    "Risk governance franchise risk metric board puts a franchise/reputation risk metric on the board appetite set.",
    "Franchise metric amber after incident cluster.",
    "Hard to measure so absent."
  ],
  [
    "Cross-entity risk appetite stricter-wins rule",
    "Risk governance",
    "Cross-entity risk appetite stricter-wins rule applies stricter-wins when entity appetites conflict on shared books.",
    "Stricter entity binds; documented.",
    "Loosest appetite wins."
  ],
  [
    "Risk governance model inventory board extract",
    "Risk governance",
    "Risk governance model inventory board extract extracts board-relevant model inventory stats each cycle.",
    "Extract shows validation backlog; resources approved.",
    "Inventory buried."
  ],
  [
    "Desk mandate algorithm parameter bounds",
    "Risk governance",
    "Desk mandate algorithm parameter bounds bounds algo parameters inside desk mandates with system enforcement.",
    "Bound breach blocked pre-trade.",
    "Algo params free."
  ],
  [
    "Risk governance unexplained collateral dispute",
    "Risk governance",
    "Risk governance unexplained collateral dispute escalates unexplained collateral dispute spikes.",
    "Spike → CSA ops review.",
    "Disputes ignored."
  ],
  [
    "Board risk pack appendix for methodologies",
    "Risk governance",
    "Board risk pack appendix for methodologies keeps methodology appendices for board risk metrics on demand.",
    "Appendix used in deep-dive; trust up.",
    "Methodology mystery."
  ],
  [
    "Risk governance payment incident liquidity join",
    "Risk governance",
    "Risk governance payment incident liquidity join joins payment incidents into liquidity and op-risk governance same day.",
    "Incident triggers both playbooks.",
    "Ops ticket only."
  ],
  [
    "Enterprise risk strategy measurable outcomes",
    "Risk governance",
    "Enterprise risk strategy measurable outcomes defines measurable outcomes for risk strategy over the plan horizon.",
    "Outcome metrics tracked semi-annually.",
    "Strategy adjectives."
  ],
  [
    "Risk governance third-party exit cost capacity",
    "Risk governance",
    "Risk governance third-party exit cost capacity includes exit-cost capacity when accepting third-party concentration risk.",
    "Exit cost £20m reserved conceptually; dual plan.",
    "Concentration without exit cost."
  ],
  [
    "Material breach lessons board education",
    "Risk governance",
    "Material breach lessons board education educates the board using anonymised material breach lessons.",
    "Lesson pack changes appetite question quality.",
    "Breaches forgotten."
  ],
  [
    "Risk governance shadow IT risk inventory join",
    "Risk governance",
    "Risk governance shadow IT risk inventory join joins shadow-IT inventories into enterprise risk assessments.",
    "Shadow tool touching PII gated.",
    "ITAM incomplete forever."
  ],
  [
    "Limit framework overnight gap specials",
    "Risk governance",
    "Limit framework overnight gap specials specials overnight gap limits for products with discontinuous markets.",
    "Gap specials for auctions/crypto; enforced.",
    "Intraday limits overnight."
  ],
  [
    "Risk governance capital plan risk sign-off",
    "Risk governance",
    "Risk governance capital plan risk sign-off requires CRO sign-off on capital plans for risk capacity coherence.",
    "Sign-off conditions growth tilt.",
    "CFO-only capital plan."
  ],
  [
    "Board risk appetite numeric precision policy",
    "Risk governance",
    "Board risk appetite numeric precision policy sets precision/rounding policies so appetite metrics are not gamed by decimals.",
    "Precision policy stops false headroom.",
    "Decimal games."
  ],
  [
    "Risk governance closed-period risk taking rule",
    "Risk governance",
    "Risk governance closed-period risk taking rule rules risk taking and disclosures in closed periods.",
    "Closed-period desk guidance issued.",
    "Business as usual in close."
  ],
  [
    "Enterprise risk MI late arrival KRI",
    "Risk governance",
    "Enterprise risk MI late arrival KRI KRIs late arrival of critical risk MI to committees.",
    "Late MI KRI red; process funded.",
    "Late packs normalised."
  ],
  [
    "Risk governance customer migration fairness",
    "Risk governance",
    "Risk governance customer migration fairness fairness-reviews customer migrations forced by risk exits.",
    "Fairness fail; migration redesigned.",
    "Exit without fairness."
  ],
  [
    "Desk risk self-funding via FTP exception",
    "Risk governance",
    "Desk risk self-funding via FTP exception governs FTP exceptions that can hide risk-taking incentives.",
    "FTP exception register; three cut.",
    "Silent FTP deals."
  ],
  [
    "Risk governance stress test board questions",
    "Risk governance",
    "Risk governance stress test board questions prepares expected board challenge questions for stress results.",
    "Questions pack improves discussion quality.",
    "Results dump."
  ],
  [
    "Material risk data ethics board annual",
    "Risk governance",
    "Material risk data ethics board annual annually briefs the board on data-ethics issues in risk models.",
    "Brief leads to feature ban list.",
    "Ethics never board-level."
  ],
  [
    "Risk governance unexplained vendor outage",
    "Risk governance",
    "Risk governance unexplained vendor outage escalates repeated vendor outages into concentration governance.",
    "Repeat outage → exit plan trigger.",
    "Outage tickets only."
  ],
  [
    "Limit utilisation forecast versus appetite",
    "Risk governance",
    "Limit utilisation forecast versus appetite forecasts utilisation against appetite for the planning horizon.",
    "Forecast breach in Q3; plan resized.",
    "Spot utilisation only."
  ],
  [
    "Risk governance crypto fork accounting join",
    "Risk governance",
    "Risk governance crypto fork accounting join joins crypto fork/airdrop accounting with risk inventory updates.",
    "Fork inventory miss; P&L and risk gap fixed.",
    "Accounting without risk."
  ],
  [
    "Board risk metrics disability accessible",
    "Risk governance",
    "Board risk metrics disability accessible ensures board risk metrics meet accessibility standards.",
    "Patterns+labels replace colour-only.",
    "Colour-blind failure."
  ],
  [
    "Risk governance recovery option socialisation",
    "Risk governance",
    "Risk governance recovery option socialisation socialises recovery options with entities that must execute them.",
    "Entity unaware of option; drill fixes.",
    "Group options unknown locally."
  ],
  [
    "Enterprise risk acceptance customer cohort",
    "Risk governance",
    "Enterprise risk acceptance customer cohort cuts residual accepts by customer cohort for fairness visibility.",
    "Cohort cut shows harm skew; accept revised.",
    "Average accept."
  ],
  [
    "Risk governance market abuse desk heat",
    "Risk governance",
    "Risk governance market abuse desk heat feeds market-abuse heat into desk risk governance reviews.",
    "Heat desk limit cut.",
    "Abuse silo."
  ],
  [
    "Capital RWA restatement governance pack",
    "Risk governance",
    "Capital RWA restatement governance pack packs governance for RWA restatements with board notification rules.",
    "Restatement pack to AC same week.",
    "Quiet restatements."
  ],
  [
    "Risk governance continuous auditing overlap",
    "Risk governance",
    "Risk governance continuous auditing overlap coordinates continuous auditing with 2LOD monitoring to avoid gaps/overlap.",
    "Overlap map; coverage improved.",
    "Duplicate monitoring."
  ],
  [
    "Desk go-live risk war-room criteria",
    "Risk governance",
    "Desk go-live risk war-room criteria sets war-room criteria for material desk go-lives.",
    "War-room catches limit encode bug.",
    "Go-live hope."
  ],
  [
    "Risk governance board deep-dive follow-through",
    "Risk governance",
    "Risk governance board deep-dive follow-through measures follow-through rate on board deep-dive actions.",
    "Follow-through 55%; EXCO escalates.",
    "Deep-dive without follow-through."
  ],
  [
    "Material risk owner conflict of interest",
    "Risk governance",
    "Material risk owner conflict of interest registers conflicts when risk owners are measured on opposing P&L goals.",
    "Conflict mitigated by dual metrics.",
    "Owner fights self."
  ],
  [
    "Risk governance unexplained stress result jump",
    "Risk governance",
    "Risk governance unexplained stress result jump explains jumps in stress results between cycles with bridges.",
    "Jump from method change; bridged.",
    "Jump as reality."
  ],
  [
    "Limit framework product kill-switch test",
    "Risk governance",
    "Limit framework product kill-switch test tests product kill-switches that freeze risk taking on triggers.",
    "Kill-switch test fails; fixed.",
    "Kill-switch myth."
  ],
  [
    "Risk governance AI hallucination control use",
    "Risk governance",
    "Risk governance AI hallucination control use controls use of generative AI in risk papers with source requirements.",
    "AI draft without sources blocked.",
    "AI prose as evidence."
  ],
  [
    "Board risk appetite under recovery plan",
    "Risk governance",
    "Board risk appetite under recovery plan explains how appetite compresses under recovery plan stages.",
    "Stage chart to board; clearer votes.",
    "Appetite static in recovery."
  ],
  [
    "Risk governance third-party audit right use",
    "Risk governance",
    "Risk governance third-party audit right use tracks use of audit rights on material third parties.",
    "Rights unused 3y; exercise scheduled.",
    "Rights on paper."
  ],
  [
    "Enterprise risk MI reconciliation SLA",
    "Risk governance",
    "Enterprise risk MI reconciliation SLA sets SLAs for reconciling enterprise risk MI to sources before committees.",
    "SLA miss delays pack correctly.",
    "Unreconciled MI to board."
  ],
  [
    "Risk governance name concentration legal form",
    "Risk governance",
    "Risk governance name concentration legal form looks through legal form to economic name concentration.",
    "SPV look-through breach; cut.",
    "Legal form blinds."
  ],
  [
    "Desk risk limits in simulation environment",
    "Risk governance",
    "Desk risk limits in simulation environment tests limit enforcement in simulation before prod changes.",
    "Sim catch blocks bad encode.",
    "Prod as test."
  ],
  [
    "Risk governance climate transition product tilt",
    "Risk governance",
    "Risk governance climate transition product tilt governs product tilts under transition appetite metrics.",
    "Tilt approved with limits; monitored.",
    "Tilt as marketing."
  ],
  [
    "Material incident dual notification risk legal",
    "Risk governance",
    "Material incident dual notification risk legal dual-notifies risk and legal on material incidents within clock.",
    "Dual notify in 2h; evidenced.",
    "Risk learns late."
  ],
  [
    "Risk governance board pack version hash",
    "Risk governance",
    "Risk governance board pack version hash hashes board risk pack versions so substitutions are detectable.",
    "Hash mismatch caught; pack restored.",
    "Quiet page swap."
  ],
  [
    "Limit monitoring under cyber degraded mode",
    "Risk governance",
    "Limit monitoring under cyber degraded mode defines degraded-mode limit monitoring during cyber events.",
    "Degraded mode freezes new risk.",
    "Full trading in cyber fog."
  ],
  [
    "Risk governance customer remediation capital",
    "Risk governance",
    "Risk governance customer remediation capital links large remediations to capital and liquidity governance.",
    "Remediation £80m reserved; plans updated.",
    "Remediation P&L only."
  ],
  [
    "Enterprise risk strategy funding transparency",
    "Risk governance",
    "Enterprise risk strategy funding transparency transparently funds risk strategy initiatives versus BAU run cost.",
    "Funding line item stops hollow strategy.",
    "Unfunded strategy."
  ],
  [
    "Risk governance unexplained PD shift retail",
    "Risk governance",
    "Risk governance unexplained PD shift retail escalates unexplained retail PD shifts across segments.",
    "Shift → bureau+model review.",
    "PD weather."
  ],
  [
    "Board risk metrics scenario vs point estimate",
    "Risk governance",
    "Board risk metrics scenario vs point estimate presents key board risk metrics with scenario ranges not only points.",
    "Range presentation improves challenge.",
    "False precision points."
  ],
  [
    "Risk governance outsourcing concentration board",
    "Risk governance",
    "Risk governance outsourcing concentration board boards outsourcing concentration across critical services annually.",
    "Concentration paper; dual provider funded.",
    "Each deal isolated."
  ],
  [
    "Desk mandate risk factor stress inclusion",
    "Risk governance",
    "Desk mandate risk factor stress inclusion requires desk mandates to state which stress factors apply.",
    "Mandate stress list complete; desk clearer.",
    "Generic firm stress only."
  ],
  [
    "Risk governance immutable model approval record",
    "Risk governance",
    "Risk governance immutable model approval record keeps immutable model approval records with conditions.",
    "Condition lost; system now immutable.",
    "Editable approvals."
  ],
  [
    "Material risk take sunset clause default",
    "Risk governance",
    "Material risk take sunset clause default defaults material temporary risk takes to sunset clauses.",
    "Sunset fires; risk removed.",
    "Temporary eternal."
  ],
  [
    "Risk governance payment rail concentration",
    "Risk governance",
    "Risk governance payment rail concentration treats payment-rail concentration as a board-visible risk.",
    "Rail concentration amber; alternate rail plan.",
    "Banking ops detail only."
  ],
  [
    "Enterprise breach root cause board summary",
    "Risk governance",
    "Enterprise breach root cause board summary summarises breach root-cause themes for the board quarterly.",
    "Theme on change control; funded fix.",
    "Breach list without themes."
  ],
  [
    "Risk governance trading book banking book boundary",
    "Risk governance",
    "Risk governance trading book banking book boundary governs trading/banking book boundary decisions with evidence.",
    "Boundary move packed; MRC approved.",
    "Booking convenience boundary."
  ],
  [
    "Limit framework client specific special limits",
    "Risk governance",
    "Limit framework client specific special limits governs client-specific special limits with expiry and fairness check.",
    "Special limit expired; removed.",
    "VIP limits forever."
  ],
  [
    "Risk governance stress test independent replay",
    "Risk governance",
    "Risk governance stress test independent replay allows independent replay of official stress runs from locked inputs.",
    "Replay mismatch; bug found.",
    "Unreplayable stress."
  ],
  [
    "Board risk appetite link to remuneration",
    "Risk governance",
    "Board risk appetite link to remuneration evidences links from risk appetite outcomes to remuneration decisions.",
    "Link evidenced in rem committee pack.",
    "Pay ignores risk."
  ],
  [
    "Risk governance digital twin of limit system",
    "Risk governance",
    "Risk governance digital twin of limit system maintains a digital twin/test bed of the limit system for changes.",
    "Twin catches encode error.",
    "Change in prod."
  ],
  [
    "Material near-miss customer harm assess",
    "Risk governance",
    "Material near-miss customer harm assess assesses customer harm potential on material near-misses.",
    "Near-miss harm path closed with control.",
    "Near-miss internal only."
  ],
  [
    "Risk governance open regulatory issue ageing",
    "Risk governance",
    "Risk governance open regulatory issue ageing ages open regulatory risk issues into board MI.",
    "Issue >180 days board-visible.",
    "Issues age in Legal."
  ],
  [
    "Desk risk culture mystery shopping join",
    "Risk governance",
    "Desk risk culture mystery shopping join joins mystery-shopping results into desk risk culture oversight.",
    "Mystery shop fail elevates desk residual.",
    "Shopping in conduct silo."
  ],
  [
    "Risk governance capital contingency securities",
    "Risk governance",
    "Risk governance capital contingency securities lists contingent capital securities actions with execution constraints.",
    "Constraints documented; drill updates.",
    "Contingent capital myth."
  ],
  [
    "Enterprise risk MI owner pager duty",
    "Risk governance",
    "Enterprise risk MI owner pager duty assigns pager/on-call for critical risk MI failures pre-committee.",
    "Pager catches feed break night before.",
    "Morning surprise."
  ],
  [
    "Risk governance unexplained margin spike",
    "Risk governance",
    "Risk governance unexplained margin spike escalates unexplained IM/VM spikes to market and liquidity governance.",
    "Spike → basis and liquidity review.",
    "Margin as ops."
  ],
  [
    "Board risk pack conflict with press narrative",
    "Risk governance",
    "Board risk pack conflict with press narrative checks board risk narratives against external press for coherence risk.",
    "Conflict found; disclosure committee joins.",
    "Internal story only."
  ],
  [
    "Risk governance product complexity training",
    "Risk governance",
    "Risk governance product complexity training requires training before staff take risk on complex products.",
    "Training gate blocks booking.",
    "Learn in prod."
  ],
  [
    "Limit monitoring secondary channel outage",
    "Risk governance",
    "Limit monitoring secondary channel outage keeps a secondary channel for limit alerts if primary fails.",
    "Secondary SMS channel tested.",
    "Single channel hope."
  ],
  [
    "Risk governance franchise contagion playbook",
    "Risk governance",
    "Risk governance franchise contagion playbook playbooks franchise contagion across brands/entities.",
    "Contagion playbook used in drill.",
    "Entity isolation myth."
  ],
  [
    "Material risk data sovereign cloud choice",
    "Risk governance",
    "Material risk data sovereign cloud choice governs sovereign-cloud choices for material risk data.",
    "Choice packed; residual accepted dated.",
    "Cloud region by habit."
  ],
  [
    "Risk governance stress test ethics review",
    "Risk governance",
    "Risk governance stress test ethics review ethics-reviews stress narratives that could bias customer treatment decisions.",
    "Narrative softened where unfair; documented.",
    "Any narrative ok."
  ],
  [
    "Enterprise risk owner deputy drill annual",
    "Risk governance",
    "Enterprise risk owner deputy drill annual annually drills deputies acting as material risk owners.",
    "Drill fails access; fixed.",
    "Deputy on paper."
  ],
  [
    "Risk governance board metrics holiday publish",
    "Risk governance",
    "Risk governance board metrics holiday publish rules publishing board risk metrics across holidays without silent staleness.",
    "Holiday stale flag mandatory.",
    "Stale as fresh."
  ],
  [
    "Desk closure residual market risk runoff",
    "Risk governance",
    "Desk closure residual market risk runoff governs market-risk runoff after desk closure with limits.",
    "Runoff limit and hedge plan approved.",
    "Close and forget positions."
  ],
  [
    "Risk governance unexplained deposit outflow",
    "Risk governance",
    "Risk governance unexplained deposit outflow escalates unexplained deposit outflows into liquidity governance immediately.",
    "Outflow EWI → CFP stage assess.",
    "Outflow as seasonality always."
  ],
  [
    "Board risk appetite capacity education module",
    "Risk governance",
    "Board risk appetite capacity education module modules educate new directors on appetite versus capacity.",
    "Module in induction; fewer confusions.",
    "Terms used interchangeably."
  ],
  [
    "Risk governance model risk insurance captive",
    "Risk governance",
    "Risk governance model risk insurance captive assesses whether captives/insurance inappropriately mute model-risk ownership.",
    "Insurance not a substitute for validation; policy clarified.",
    "Insured = validated."
  ],
  [
    "Limit framework stress to hard limit bridge",
    "Risk governance",
    "Limit framework stress to hard limit bridge bridges stress exposures to hard limit reviews when chronic.",
    "Chronic stress excess → hard limit cut.",
    "Stress advisory forever."
  ],
  [
    "Risk governance customer duty appetite example",
    "Risk governance",
    "Risk governance customer duty appetite example examples how customer duty can bind tighter than financial appetite.",
    "Example used; product declined.",
    "Duty abstract."
  ],
  [
    "Enterprise risk MI cryptographic integrity",
    "Risk governance",
    "Enterprise risk MI cryptographic integrity optionally signs critical risk MI extracts for integrity.",
    "Signature mismatch caught tamper test.",
    "Editable extracts."
  ],
  [
    "Risk governance peer failure after-action",
    "Risk governance",
    "Risk governance peer failure after-action runs after-action reviews on peer failures for local controls.",
    "Peer failure → two local gaps closed.",
    "Peer news ignored."
  ],
  [
    "Material third-party concentration exit drill",
    "Risk governance",
    "Material third-party concentration exit drill drills exit from a material concentrated third party.",
    "Drill time 120 days vs 30 assumed; plan reset.",
    "Exit fantasy."
  ],
  [
    "Risk governance trading halt customer comms",
    "Risk governance",
    "Risk governance trading halt customer comms joins customer communications into trading-halt risk governance.",
    "Comms playbook approved with risk.",
    "Halt silent to customers."
  ],
  [
    "Board risk metrics decision log link",
    "Risk governance",
    "Board risk metrics decision log link links board decisions to the risk metrics that informed them.",
    "Decision log cites metric versions.",
    "Decisions without metric link."
  ],
  [
    "Risk governance unexplained haircut change",
    "Risk governance",
    "Risk governance unexplained haircut change escalates unexplained collateral haircut changes.",
    "Haircut change from vendor bug; reversed.",
    "Haircut weather."
  ],
  [
    "Desk risk strategy conflict with group",
    "Risk governance",
    "Desk risk strategy conflict with group detects desk strategies conflicting with group risk strategy.",
    "Conflict cut; desk rewritten.",
    "Local strategy wins."
  ],
  [
    "Risk governance recovery plan data room",
    "Risk governance",
    "Risk governance recovery plan data room keeps a ready data room for recovery plan execution evidence.",
    "Data room drill passes.",
    "Scramble in crisis."
  ],
  [
    "Enterprise appetite hard breach war room",
    "Risk governance",
    "Enterprise appetite hard breach war room stands up a war room template for hard appetite breaches.",
    "Template used; time-to-pack down.",
    "Ad-hoc scramble."
  ],
  [
    "Risk governance AI vendor model card demand",
    "Risk governance",
    "Risk governance AI vendor model card demand demands model cards from AI vendors used in risk processes.",
    "Model card gaps; vendor gated.",
    "Vendor magic."
  ],
  [
    "Limit monitoring clock skew multi-region",
    "Risk governance",
    "Limit monitoring clock skew multi-region handles clock skew across regions in limit timestamps.",
    "Skew false breach; clocks synced.",
    "Timestamp chaos."
  ],
  [
    "Risk governance climate physical branch risk",
    "Risk governance",
    "Risk governance climate physical branch risk governs physical climate risk to branches/critical sites in ERM.",
    "Site risk amber; relocation plan.",
    "Climate credit-only."
  ],
  [
    "Board risk pack single source extract time",
    "Risk governance",
    "Board risk pack single source extract time publishes a single official extract time for board risk numbers.",
    "Extract time 18:00 T-2 locked.",
    "Mixed vintage numbers."
  ],
  [
    "Risk governance unexplained CVA jump",
    "Risk governance",
    "Risk governance unexplained CVA jump escalates unexplained CVA/DVA jumps to CCR governance.",
    "Jump from mapping; fixed.",
    "XVA weather."
  ],
  [
    "Material risk take legal opinion ageing",
    "Risk governance",
    "Material risk take legal opinion ageing ages legal opinions that underpin material risk takes.",
    "Opinion >3y refreshed.",
    "Eternal opinions."
  ],
  [
    "Risk governance product bundling risk hide",
    "Risk governance",
    "Risk governance product bundling risk hide detects bundling that hides risk appetite breaches across products.",
    "Bundle split; breach visible; cut.",
    "Bundle camouflage."
  ],
  [
    "Enterprise risk culture survey triangulation",
    "Risk governance",
    "Enterprise risk culture survey triangulation triangulates culture surveys with outcomes and observations for governance.",
    "Triangulation finds survey/outcome clash.",
    "Survey-only culture."
  ],
  [
    "Risk governance stress test vendor lock",
    "Risk governance",
    "Risk governance stress test vendor lock assesses vendor lock-in risk in stress-testing platforms.",
    "Lock-in high; exit requirements added.",
    "Platform forever."
  ],
  [
    "Desk go-live customer outcome baseline",
    "Risk governance",
    "Desk go-live customer outcome baseline baselines customer outcomes before material desk/product go-live.",
    "Baseline enables later harm detect.",
    "Go-live without baseline."
  ],
  [
    "Risk governance board challenge minutes KPI",
    "Risk governance",
    "Risk governance board challenge minutes KPI KPIs board/risk-committee challenge quality via minutes coding.",
    "KPI low; chair coaching.",
    "Attendance as governance."
  ],
  [
    "Limit framework intra-day auto-deescalate",
    "Risk governance",
    "Limit framework intra-day auto-deescalate auto-deescalates temporary intraday elevations at session end.",
    "Elevation ends EOD; no drift.",
    "Intraday elevation sticks."
  ],
  [
    "Risk governance unexplained NSFR jump",
    "Risk governance",
    "Risk governance unexplained NSFR jump explains material NSFR jumps with factor bridges.",
    "Jump from RSF map bug; restated.",
    "NSFR weather."
  ],
  [
    "Material outsourcing risk exit KPI",
    "Risk governance",
    "Material outsourcing risk exit KPI tracks exit readiness KPIs for material outsourcing.",
    "KPI red; dual provider funded.",
    "Exit unmeasured."
  ],
  [
    "Risk governance crypto custody attestation",
    "Risk governance",
    "Risk governance crypto custody attestation requires periodic custody attestations for digital assets.",
    "Attestation fail; deposits halted.",
    "Custody trust."
  ],
  [
    "Board risk appetite under accounting change",
    "Risk governance",
    "Board risk appetite under accounting change reassesses appetite when accounting changes move volatility into P&L.",
    "Accounting change paper resets appetite.",
    "Accounting ignored by risk."
  ],
  [
    "Risk governance open model finding customer",
    "Risk governance",
    "Risk governance open model finding customer flags open model findings that may harm customers to conduct governance.",
    "Finding bridged; product gate.",
    "Model finding tech-only."
  ],
  [
    "Enterprise risk MI weekend freshness rule",
    "Risk governance",
    "Enterprise risk MI weekend freshness rule rules weekend freshness for continuously traded risk books.",
    "Weekend stale flag on crypto MI.",
    "Friday numbers Monday."
  ],
  [
    "Risk governance recovery indicator false calm",
    "Risk governance",
    "Risk governance recovery indicator false calm tests recovery indicators for false calm (lagging greens).",
    "Lagging indicator supplemented with leading.",
    "Green calm false."
  ],
  [
    "Desk mandate cross-asset contagion note",
    "Risk governance",
    "Desk mandate cross-asset contagion note requires mandates to note cross-asset contagion channels.",
    "Contagion note drives joint limits.",
    "Asset silo mandates."
  ],
  [
    "Risk governance unexplained ECR or capital jump",
    "Risk governance",
    "Risk governance unexplained ECR or capital jump escalates unexplained economic capital jumps.",
    "Jump from corr bug; fixed.",
    "EC weather."
  ],
  [
    "Material risk acceptance dual control",
    "Risk governance",
    "Material risk acceptance dual control dual-controls material residual acceptances above band.",
    "Single accept blocked; dual enforced.",
    "One signature any size."
  ],
  [
    "Risk governance board metrics cohort fairness",
    "Risk governance",
    "Risk governance board metrics cohort fairness reviews whether board risk metrics hide unfair cohort outcomes.",
    "Cohort appendix added for conduct metrics.",
    "Averages hide harm."
  ],
  [
    "Limit monitoring primary DR failover test",
    "Risk governance",
    "Limit monitoring primary DR failover test tests DR failover of limit monitoring systems on schedule.",
    "Failover test fail; fixed before rely.",
    "DR untested."
  ],
  [
    "Risk governance stress narrative version lock",
    "Risk governance",
    "Risk governance stress narrative version lock version-locks stress narratives used for official capital.",
    "Narrative drift caught; locked.",
    "Living narrative chaos."
  ],
  [
    "Enterprise risk owner geographic cover",
    "Risk governance",
    "Enterprise risk owner geographic cover ensures geographic cover for material risk owners across time zones.",
    "Cover gap APAC; rota filled.",
    "London-only ownership."
  ],
  [
    "Risk governance unexplained liquidity buffer use",
    "Risk governance",
    "Risk governance unexplained liquidity buffer use explains material draws on liquidity buffers within SLA.",
    "Draw unexplained 1 day; war room.",
    "Buffer use opaque."
  ],
  [
    "Board risk pack machine-readable archive",
    "Risk governance",
    "Board risk pack machine-readable archive archives board risk packs in machine-readable form for recon.",
    "Archive enables metric history recon.",
    "PDF only."
  ],
  [
    "Risk governance product risk rating public internal",
    "Risk governance",
    "Risk governance product risk rating public internal publishes internal product risk ratings to staff who sell/service.",
    "Rating visible; mis-sale down.",
    "Hidden product risk."
  ],
  [
    "Desk risk limits vs cleared inventory",
    "Risk governance",
    "Desk risk limits vs cleared inventory reconciles desk limits to cleared vs bilateral inventory risk.",
    "Cleared inventory under-limited; fixed.",
    "Ignore clearing location."
  ],
  [
    "Risk governance climate scenario board range",
    "Risk governance",
    "Risk governance climate scenario board range presents climate scenario impacts as ranges to the board.",
    "Range stops false precision.",
    "Single climate number."
  ],
  [
    "Material breach customer remediation join clock",
    "Risk governance",
    "Material breach customer remediation join clock clocks join between material breaches and customer remediation decisions.",
    "Join in 5 days; evidenced.",
    "Breach without remediation lens."
  ],
  [
    "Risk governance AI decision appeal path",
    "Risk governance",
    "Risk governance AI decision appeal path requires appeal paths when AI materially affects risk/customer decisions.",
    "Appeal used 20×; bias found.",
    "AI final."
  ],
  [
    "Enterprise risk MI schema change control",
    "Risk governance",
    "Enterprise risk MI schema change control change-controls schemas feeding enterprise risk MI.",
    "Schema change breaks metric; gated now.",
    "Silent schema edits."
  ],
  [
    "Risk governance unexplained variation margin",
    "Risk governance",
    "Risk governance unexplained variation margin attributes unexplained VM movements daily for material books.",
    "Unattributed VM → halt add risk.",
    "VM noise."
  ],
  [
    "Board risk appetite example decline library",
    "Risk governance",
    "Board risk appetite example decline library libraries examples of declines driven by appetite to teach binding.",
    "Decline examples improve executive clarity.",
    "Appetite never declines anything."
  ],
  [
    "Risk governance third-party fourth-party board",
    "Risk governance",
    "Risk governance third-party fourth-party board boards fourth-party concentration behind critical third parties annually.",
    "Fourth-party paper; alternate path funded.",
    "Tier-1 only forever."
  ],
  [
    "Limit framework special situation desk rules",
    "Risk governance",
    "Limit framework special situation desk rules special rules for special-situation/illiquid desks with enhanced governance.",
    "Special desk weekly risk committee.",
    "Same rules liquid desks."
  ],
  [
    "Risk governance stress test cohort leakage",
    "Risk governance",
    "Risk governance stress test cohort leakage prevents confidential stress assumptions leaking via broad distribution.",
    "Distribution tightened; watermarked.",
    "Stress assumptions viral."
  ],
  [
    "Material risk data cross-border transfer pack",
    "Risk governance",
    "Material risk data cross-border transfer pack packs cross-border transfers of material risk data with legal basis.",
    "Pack blocks non-compliant transfer.",
    "Transfer first."
  ],
  [
    "Risk governance unexplained overnight gap P&L",
    "Risk governance",
    "Risk governance unexplained overnight gap P&L escalates unexplained overnight gap P&L versus limits.",
    "Gap P&L unexplained; inventory cut.",
    "Gap as luck."
  ],
  [
    "Enterprise risk strategy mid-year reset rule",
    "Risk governance",
    "Enterprise risk strategy mid-year reset rule rules when strategy shocks force mid-year risk strategy reset.",
    "M&A triggers reset; board paper.",
    "Annual strategy only."
  ],
  [
    "Risk governance board metrics adversarial read",
    "Risk governance",
    "Risk governance board metrics adversarial read assigns an adversarial reader for board risk packs pre-circulation.",
    "Adversarial read catches inconsistency.",
    "Friendly packs only."
  ],
  [
    "Desk onboarding risk system encode proof",
    "Risk governance",
    "Desk onboarding risk system encode proof requires proof limits/appetite encoded before desk onboarding.",
    "Encode proof gate; go-live delayed correctly.",
    "Encode later."
  ],
  [
    "Risk governance payment finality stress",
    "Risk governance",
    "Risk governance payment finality stress stresses delayed finality in payment systems for risk limits.",
    "Finality stress cuts intraday credit.",
    "Instant finality."
  ],
  [
    "Board risk capacity reverse stress education",
    "Risk governance",
    "Board risk capacity reverse stress education educates the board using reverse-stress stories tied to capacity.",
    "Education tightens capacity questions.",
    "Reverse stress ignored."
  ],
  [
    "Risk governance crypto staking residual",
    "Risk governance",
    "Risk governance crypto staking residual governs staking/lock-up residuals on digital asset inventories.",
    "Staking residual limited; unlock ladder.",
    "Staked as free cash."
  ],
  [
    "Material near-miss systemic control fix fund",
    "Risk governance",
    "Material near-miss systemic control fix fund funds systemic control fixes from material near-miss themes.",
    "Theme funded; recurrence down.",
    "Near-miss without budget."
  ],
  [
    "Risk governance unexplained clearance margin",
    "Risk governance",
    "Risk governance unexplained clearance margin explains clearance margin changes for material CCPs.",
    "Margin unexplained → liquidity buffer review.",
    "CCP margin weather."
  ],
  [
    "Enterprise risk MI owner sign-off watermark",
    "Risk governance",
    "Enterprise risk MI owner sign-off watermark watermarks owner sign-off status on enterprise risk MI pages.",
    "Unsigned page blocked from board pack.",
    "Orphan pages."
  ],
  [
    "Risk governance trading authority emergency",
    "Risk governance",
    "Risk governance trading authority emergency defines emergency trading authority with tight time boxes.",
    "Emergency authority 4h max; logged.",
    "Emergency forever."
  ],
  [
    "Limit monitoring alert acknowledge SLA",
    "Risk governance",
    "Limit monitoring alert acknowledge SLA SLAs acknowledgement of material limit alerts.",
    "Unacked alert 30m escalates.",
    "Alerts unread."
  ],
  [
    "Risk governance stress test board non-results",
    "Risk governance",
    "Risk governance stress test board non-results reports what stress tests did not cover as clearly as results.",
    "Non-coverage section added; better humility.",
    "Results imply completeness."
  ],
  [
    "Board risk appetite multilingual hard terms",
    "Risk governance",
    "Board risk appetite multilingual hard terms locks hard-term translations for appetite so meaning cannot soften.",
    "Translation lock stops softening.",
    "Local soft rewrite."
  ],
  [
    "Risk governance customer harm scenario library",
    "Risk governance",
    "Risk governance customer harm scenario library maintains scenarios centred on customer harm for governance education.",
    "Library used in EXCO; residual uplift.",
    "Financial loss scenarios only."
  ],
  [
    "Desk risk residual acceptance product page",
    "Risk governance",
    "Desk risk residual acceptance product page surfaces accepted residuals on internal product pages for staff.",
    "Staff see residual; sales scripts adjust.",
    "Hidden residuals."
  ],
  [
    "Risk governance unexplained funding spread jump",
    "Risk governance",
    "Risk governance unexplained funding spread jump escalates unexplained funding spread jumps into liquidity governance.",
    "Jump → CFP EWI assess.",
    "Spread weather."
  ],
  [
    "Material model go-live customer notice assess",
    "Risk governance",
    "Material model go-live customer notice assess assesses customer notice needs on material model go-lives affecting outcomes.",
    "Notice assess triggers comms for score cutover.",
    "Silent model cutover."
  ],
  [
    "Risk governance enterprise action critical path",
    "Risk governance",
    "Risk governance enterprise action critical path marks critical-path risk actions for heightened governance.",
    "Critical path slip weekly EXCO.",
    "All actions equal."
  ],
  [
    "Board risk metrics confidence traffic separate",
    "Risk governance",
    "Board risk metrics confidence traffic separate separates metric value traffic from data-confidence traffic on packs.",
    "Confidence amber with green value; footnoted.",
    "One light hides DQ."
  ],
  [
    "Risk governance third-party concentration drill",
    "Risk governance",
    "Risk governance third-party concentration drill drills simultaneous stress of top concentrated third parties.",
    "Drill shows joint outage severity; dual plan.",
    "Single vendor drills only."
  ],
  [
    "Limit framework expired temporary elevates report",
    "Risk governance",
    "Limit framework expired temporary elevates report reports expired-but-still-active temporary elevations weekly.",
    "Report catches two zombies; killed.",
    "Elevation zombies."
  ],
  [
    "Risk governance unexplained settlement fail spike",
    "Risk governance",
    "Risk governance unexplained settlement fail spike escalates settlement-fail spikes to op and liquidity governance.",
    "Spike → joint war room.",
    "Fails as ops noise."
  ],
  [
    "Enterprise risk taxonomy board glossary",
    "Risk governance",
    "Enterprise risk taxonomy board glossary gives the board a short glossary of taxonomy terms used in packs.",
    "Glossary reduces colour debates.",
    "Jargon fog."
  ],
  [
    "Risk governance crypto venue outage playbook",
    "Risk governance",
    "Risk governance crypto venue outage playbook playbooks venue outages for digital asset desks.",
    "Outage playbook freezes transfers; tested.",
    "Improvise outage."
  ],
  [
    "Material risk owner incentive conflict test",
    "Risk governance",
    "Material risk owner incentive conflict test tests incentive conflicts for material risk owners annually.",
    "Conflict found; metrics redesigned.",
    "Incentives unchecked."
  ],
  [
    "Risk governance stress assumption public exam",
    "Risk governance",
    "Risk governance stress assumption public exam prepares stress assumptions for regulatory exam challenge packs.",
    "Exam pack ready; fewer surprises.",
    "Assumptions tribal."
  ],
  [
    "Board risk pack late data footnote rule",
    "Risk governance",
    "Board risk pack late data footnote rule requires footnotes when late data replaces official extract.",
    "Late data footnoted; AC informed.",
    "Silent late swaps."
  ],
  [
    "Risk governance unexplained ECL jump",
    "Risk governance",
    "Risk governance unexplained ECL jump bridges unexplained ECL jumps within SLA to finance and risk.",
    "Jump bridged to staging bug; fixed.",
    "ECL weather."
  ],
  [
    "Desk mandate prohibited strategy list",
    "Risk governance",
    "Desk mandate prohibited strategy list lists prohibited strategies per desk with system blocks where possible.",
    "Prohibited strategy blocked pre-trade.",
    "Honor system."
  ],
  [
    "Risk governance recovery option customer impact",
    "Risk governance",
    "Risk governance recovery option customer impact assesses customer impact of recovery options before inclusion.",
    "Option dropped for unfair customer harm.",
    "Recovery at any cost."
  ],
  [
    "Enterprise appetite unused headroom strategy",
    "Risk governance",
    "Enterprise appetite unused headroom strategy uses unused headroom maps to steer strategy away from crowded risks.",
    "Headroom map redirects growth to capacity.",
    "Breach-only management."
  ],
  [
    "Risk governance board deep-dive evidence vault",
    "Risk governance",
    "Risk governance board deep-dive evidence vault vaults evidence packs behind board deep-dives for follow-up.",
    "Vault used in next meeting; continuity up.",
    "Deep-dive slides lost."
  ],
  [
    "Limit monitoring multi-book netting ban default",
    "Risk governance",
    "Limit monitoring multi-book netting ban default defaults to ban multi-book netting unless governed approved.",
    "Unauthorized netting blocked.",
    "Net everywhere."
  ],
  [
    "Risk governance unexplained op loss spike",
    "Risk governance",
    "Risk governance unexplained op loss spike escalates unexplained op-loss spikes with taxonomy checks.",
    "Spike misclass credit→op; corrected.",
    "Spike ignored."
  ],
  [
    "Material third-party board residual accept",
    "Risk governance",
    "Material third-party board residual accept requires board/risk-committee residual acceptance for material third-party concentrates.",
    "Accept dated with exit milestone.",
    "Ops accepts concentration."
  ],
  [
    "Risk governance AI feature ban list",
    "Risk governance",
    "Risk governance AI feature ban list maintains a ban list of features/data for risk AI/models.",
    "Ban list blocks sensitive proxy; enforced.",
    "Any feature."
  ],
  [
    "Board risk metrics unit consistency check",
    "Risk governance",
    "Board risk metrics unit consistency check checks unit consistency (£, bps, %) across board risk metrics.",
    "Unit mix-up caught; corrected.",
    "Number soup."
  ],
  [
    "Risk governance stress test role conflict",
    "Risk governance",
    "Risk governance stress test role conflict removes conflicts where scenario owners mark their own severity final.",
    "Independent severity challenge mandatory.",
    "Self-severity."
  ],
  [
    "Desk go-live rollback risk criteria",
    "Risk governance",
    "Desk go-live rollback risk criteria defines rollback criteria if desk go-live risk signals breach.",
    "Rollback criteria hit; desk paused.",
    "Forward-only go-live."
  ],
  [
    "Risk governance franchise metric leading lag",
    "Risk governance",
    "Risk governance franchise metric leading lag balances leading and lagging franchise risk metrics for the board.",
    "Leading complaint theme metric added.",
    "Lagging NPS only."
  ],
  [
    "Enterprise risk MI parallel change freeze",
    "Risk governance",
    "Enterprise risk MI parallel change freeze freezes parallel changes to MI pipelines in committee week.",
    "Freeze stops break; pack stable.",
    "Change during pack week."
  ],
  [
    "Risk governance unexplained name concentration jump",
    "Risk governance",
    "Risk governance unexplained name concentration jump explains jumps in name concentration metrics quickly.",
    "Jump from look-through fix; communicated.",
    "Concentration weather."
  ],
  [
    "Material residual acceptance fairness cohort",
    "Risk governance",
    "Material residual acceptance fairness cohort requires cohort fairness view before accepting residuals affecting customers.",
    "Cohort view changes accept decision.",
    "Average residual."
  ],
  [
    "Risk governance payment system dual rail board",
    "Risk governance",
    "Risk governance payment system dual rail board boards dual-rail readiness for critical payment systems.",
    "Dual-rail gap; funded.",
    "Single rail hope."
  ],
  [
    "Limit framework venue and CCP specials",
    "Risk governance",
    "Limit framework venue and CCP specials special limit treatments by venue/CCP risk profiles.",
    "CCP special add-on activated; desk cut.",
    "Venue-blind limits."
  ],
  [
    "Risk governance board education near-miss",
    "Risk governance",
    "Risk governance board education near-miss includes near-miss case education in board risk curriculum.",
    "Case education improves questions.",
    "Loss cases only."
  ],
  [
    "Enterprise breach timeline customer duty join",
    "Risk governance",
    "Enterprise breach timeline customer duty join joins breach timelines to customer-duty assessment clocks.",
    "Duty assess started day 0 on hard breach.",
    "Duty late."
  ],
  [
    "Risk governance unexplained model PMA jump",
    "Risk governance",
    "Risk governance unexplained model PMA jump explains jumps in post-model adjustments with owners.",
    "PMA jump unjustified; removed.",
    "PMA plug."
  ],
  [
    "Desk risk culture consequence example pack",
    "Risk governance",
    "Desk risk culture consequence example pack packs anonymised consequence examples for desk risk culture training.",
    "Pack used; clarity up.",
    "Abstract culture."
  ],
  [
    "Risk governance stress test data privacy",
    "Risk governance",
    "Risk governance stress test data privacy enforces privacy controls on stress data sets with customer info.",
    "Privacy break blocked; synth data used.",
    "Prod data in stress freely."
  ],
  [
    "Board risk appetite capacity joint reset",
    "Risk governance",
    "Board risk appetite capacity joint reset jointly resets appetite and capacity after major strategy or capital events.",
    "Post-raise reset paper; coherent.",
    "Stale pair."
  ],
  [
    "Risk governance crypto hard fork accounting risk",
    "Risk governance",
    "Risk governance crypto hard fork accounting risk governs accounting and inventory risk on hard forks.",
    "Fork policy executed in test; inventory complete.",
    "Ignore fork tokens."
  ],
  [
    "Material risk take system encode deadline",
    "Risk governance",
    "Material risk take system encode deadline deadlines system encoding after committee approval of risk takes.",
    "Encode SLA 10 days; monitored.",
    "Approval without encode."
  ],
  [
    "Risk governance unexplained treasury exception",
    "Risk governance",
    "Risk governance unexplained treasury exception escalates unexplained treasury policy exceptions.",
    "Exception spike → liquidity review.",
    "Exceptions normal."
  ],
  [
    "Enterprise risk owner RACI public internal",
    "Risk governance",
    "Enterprise risk owner RACI public internal publishes material risk RACI internally for accountability.",
    "RACI public; pinging correct owners.",
    "Secret RACI."
  ],
  [
    "Risk governance board metrics adversarial scenario",
    "Risk governance",
    "Risk governance board metrics adversarial scenario includes an adversarial scenario page in board packs periodically.",
    "Adversarial page challenges green complacency.",
    "Comfort packs only."
  ],
  [
    "Limit monitoring acknowledge dual control high",
    "Risk governance",
    "Limit monitoring acknowledge dual control high dual-controls acknowledgement/closure of high limit breaches.",
    "Single close blocked.",
    "One person closes breach."
  ],
  [
    "Risk governance customer remediation risk capital",
    "Risk governance",
    "Risk governance customer remediation risk capital capitalises or reserves material remediation risk in planning.",
    "Remediation reserve in capital plan.",
    "Hope remediation small."
  ],
  [
    "Desk mandate market hours and gap rules",
    "Risk governance",
    "Desk mandate market hours and gap rules states market hours and gap rules inside desk mandates.",
    "Gap rules cut weekend inventory.",
    "Hours implicit."
  ],
  [
    "Risk governance unexplained clearing member jump",
    "Risk governance",
    "Risk governance unexplained clearing member jump explains jumps in clearing-member exposures.",
    "Jump from new client; limits checked.",
    "Exposure weather."
  ],
  [
    "Board risk pack provenance fail block",
    "Risk governance",
    "Board risk pack provenance fail block blocks board pack publication if provenance checks fail.",
    "Fail blocked pack; fixed then published.",
    "Publish anyway."
  ],
  [
    "Risk governance third-party ethics incident join",
    "Risk governance",
    "Risk governance third-party ethics incident join joins third-party ethics incidents into vendor risk governance.",
    "Ethics incident elevates residual; exit considered.",
    "Ethics silo."
  ]
];
