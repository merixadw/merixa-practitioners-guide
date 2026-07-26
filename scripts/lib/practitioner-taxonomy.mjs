export const DOMAINS = [
  "Financial reporting",
  "Management reporting",
  "Financial management",
  "Risk management",
  "Audit and assurance",
  "Governance and controls",
  "Strategy and performance",
  "Sustainability",
  "Project delivery",
];

const DOMAIN_RULES = [
  {
    domain: "Financial reporting",
    path: /\b(ifrs|financial reporting|\/bs\/|\/pl\/|group reporting|accounting)\b/i,
    terms:
      /\b(ifrs|ias|financial statements?|recognition|measurement|disclosure|consolidat|asset|liabilit|revenue|inventory|impairment|lease|provision)\b/i,
  },
  {
    domain: "Management reporting",
    path: /\bmanagement reporting\b/i,
    terms:
      /\b(management accounts?|budget|forecast|variance|kpi|margin|cost|profit|cash flow|working capital|performance report)\b/i,
  },
  {
    domain: "Audit and assurance",
    path: /\b(audit|assurance|iia)\b/i,
    terms:
      /\b(internal audit|audit evidence|assurance|engagement|audit plan|substantive test|material misstatement)\b/i,
  },
  {
    domain: "Governance and controls",
    path: /\b(control|governance|coso)\b/i,
    terms:
      /\b(internal control|control objective|segregation of duties|governance|oversight|authorization|reconciliation)\b/i,
  },
  {
    domain: "Risk management",
    path: /\b(risk|frm)\b/i,
    terms:
      /\b(risk|uncertaint|risk appetite|risk assessment|credit risk|market risk|liquidity risk|operational risk|risk response|risk register|inherent|residual|emerging risk)\b/i,
  },
  {
    domain: "Financial management",
    path: /\bfinancial management\b/i,
    terms:
      /\b(valuation|discount rate|capital structure|investment appraisal|net present value|funding|treasury|cost of capital)\b/i,
  },
  {
    domain: "Strategy and performance",
    path: /\bstrategic management\b/i,
    terms:
      /\b(strategy|strategic|business model|competitive|performance management|balanced scorecard|value driver)\b/i,
  },
  {
    domain: "Sustainability",
    path: /\b(sustainability|esg|climate)\b/i,
    terms:
      /\b(sustainability|esg|climate|emissions?|environmental|social|transition risk)\b/i,
  },
  {
    domain: "Project delivery",
    path: /\bproject management\b/i,
    terms:
      /\b(project charter|project plan|critical path|work breakdown|stakeholder|project risk|milestone|deliverable)\b/i,
  },
];

/**
 * Explicit standard references beat keyword frequency: a card that cites
 * IAS 2 is about inventory even if other terms appear more often in the body.
 */
const STANDARD_TOPICS = [
  [/\bIAS\s*1\b(?!\d)/i, "Presentation of financial statements"],
  [/\bIAS\s*2\b(?!\d)/i, "Inventory"],
  [/\bIAS\s*8\b(?!\d)/i, "Accounting policies and estimates"],
  [/\bIAS\s*10\b(?!\d)/i, "Events after the reporting period"],
  [/\bIAS\s*24\b/i, "Related party disclosures"],
  [/\bIAS\s*33\b/i, "Earnings per share"],
  [/\bIAS\s*34\b/i, "Interim reporting"],
  [/\bIAS\s*7\b(?!\d)/i, "Cash and liquidity"],
  [/\bIAS\s*12\b/i, "Tax"],
  [/\bIAS\s*(?:16|23|40)\b/i, "Property, plant and equipment"],
  [/\bIAS\s*19\b/i, "Employee benefits"],
  [/\bIAS\s*20\b/i, "Government grants"],
  [/\bIAS\s*21\b/i, "Foreign currency"],
  [/\bIAS\s*(?:27|28)\b/i, "Consolidation"],
  [/\bIAS\s*32\b/i, "Financial instruments"],
  [/\bIAS\s*36\b/i, "Impairment"],
  [/\bIAS\s*37\b/i, "Provisions and contingencies"],
  [/\bIAS\s*38\b/i, "Intangible assets"],
  [/\bIFRS\s*3\b(?!\d)/i, "Business combinations"],
  [/\bIFRS\s*5\b(?!\d)/i, "Assets held for sale"],
  [/\bIFRS\s*(?:7|9)\b(?!\d)/i, "Financial instruments"],
  [/\bIFRS\s*(?:10|11|12)\b/i, "Consolidation"],
  [/\bIFRS\s*13\b/i, "Valuation"],
  [/\bIFRS\s*15\b/i, "Revenue"],
  [/\bIFRS\s*16\b/i, "Leases"],
  [/\bIFRS\s*8\b(?!\d)/i, "Segment reporting"],
  [/\bFRS\s*104\b/i, "Interim reporting"],
];

/**
 * Whole-framework standards (FRS 100–103, 105). FRS 104 is interim-specific
 * and is handled in STANDARD_TOPICS above.
 */
const FRAMEWORK_STANDARDS = /(?<!I)\bFRS\s*10(?:0|1|2|3|5)\b|\buk gaap\b|\bifrs for smes\b/i;

const TOPIC_RULES = [
  ["Interim reporting", /\b(interim financial|interim report|interim period|interim statement)\b/i],
  ["Cash and liquidity", /\b(cash and cash equivalents|cash flow|cash management|bank account|liquidity|working capital|treasury|dso|dpo)\b/i],
  ["Revenue", /\b(revenue|contract asset|performance obligation|customer contract)\b/i],
  ["Property, plant and equipment", /\b(ppe|property, plant|fixed asset|depreciat|capital expenditure|capitalis|capitalize)\b/i],
  ["Intangible assets", /\b(intangible|development cost|software asset|amortisation|amortization)\b/i],
  ["Inventory", /\b(inventor|stock count|net realisable|net realizable)\b/i],
  ["Impairment", /\b(impairment|recoverable amount|cash-generating unit|cgu|expected credit loss)\b/i],
  ["Leases", /\b(lease|right-of-use|lease liability)\b/i],
  ["Consolidation", /\b(consolidat|subsidiary|associate|joint arrangement|intercompany|non-controlling)\b/i],
  ["Business combinations", /\b(business combination|goodwill|acquiree|acquirer|purchase price allocation)\b/i],
  ["Financial instruments", /\b(financial instruments?|derivative|hedge accounting|hedging|amortised cost|amortized cost|fair value through|expected credit loss)\b/i],
  ["Provisions and contingencies", /\b(provision|contingent|constructive obligation)\b/i],
  ["Employee benefits", /\b(employee benefit|pension|defined benefit|defined contribution)\b/i],
  ["Foreign currency", /\b(foreign currency|exchange difference|functional currency)\b/i],
  ["Tax", /\b(deferred tax|current tax|tax expense|tax liability)\b/i],
  ["Budgeting and forecasting", /\b(budget|forecast|planning cycle|scenario planning|rolling forecast)\b/i],
  ["Variance analysis", /\b(variance|price variance|volume variance|mix variance|flex budget)\b/i],
  ["Cost and profitability", /\b(cost allocation|cost driver|contribution margin|gross margin|profitability|break-even)\b/i],
  ["Performance measurement", /\b(kpi|performance measure|scorecard|benchmark)\b/i],
  ["Internal control", /\b(internal control|control objective|control activity|segregation of duties|authorization|reconciliation)\b/i],
  ["Audit evidence", /\b(audit evidence|substantive (?:test|procedure|analytical)|tests? of controls?|working papers?|audit sampling)\b/i],
  ["Risk assessment", /\b(risk assessment|risk appetite|risk register|inherent risk|residual risk|emerging risk|risk event|risk response|stress test)\b/i],
  ["Investment appraisal", /\b(net present value|npv|internal rate of return|irr|payback period|investment appraisal)\b/i],
  ["Valuation", /\b(valuation|fair value|discounted cash flow|terminal value)\b/i],
  ["Governance", /\b(governance|board of directors|audit committee|oversight|accountability)\b/i],
  ["Sustainability reporting", /\b(sustainability report|esg|climate disclosure|emissions?)\b/i],
  ["Project controls", /\b(project plan|critical path|milestone|project risk|work breakdown|earned value)\b/i],
];

/** Topics that unambiguously belong to one domain, used to correct the domain vote. */
const TOPIC_HOME_DOMAIN = {
  Revenue: "Financial reporting",
  "Property, plant and equipment": "Financial reporting",
  "Intangible assets": "Financial reporting",
  Inventory: "Financial reporting",
  Impairment: "Financial reporting",
  Leases: "Financial reporting",
  Consolidation: "Financial reporting",
  "Business combinations": "Financial reporting",
  "Financial instruments": "Financial reporting",
  "Provisions and contingencies": "Financial reporting",
  "Employee benefits": "Financial reporting",
  "Foreign currency": "Financial reporting",
  Tax: "Financial reporting",
  "Segment reporting": "Financial reporting",
  "Assets held for sale": "Financial reporting",
  "Presentation of financial statements": "Financial reporting",
  "Accounting policies and estimates": "Financial reporting",
  "Events after the reporting period": "Financial reporting",
  "Related party disclosures": "Financial reporting",
  "Earnings per share": "Financial reporting",
  "Interim reporting": "Financial reporting",
  "Government grants": "Financial reporting",
  "UK GAAP framework": "Financial reporting",
  "Variance analysis": "Management reporting",
  "Budgeting and forecasting": "Management reporting",
  "Cost and profitability": "Management reporting",
  "Investment appraisal": "Financial management",
  "Audit evidence": "Audit and assurance",
  "Internal control": "Governance and controls",
  "Sustainability reporting": "Sustainability",
  "Project controls": "Project delivery",
};

/** Used when no topic pattern produces a confident, distinguishing match. */
const DOMAIN_DEFAULT_TOPIC = {
  "Financial reporting": "Reporting framework",
  "Management reporting": "Performance reporting",
  "Financial management": "Corporate finance",
  "Risk management": "Risk assessment",
  "Audit and assurance": "Assurance engagements",
  "Governance and controls": "Internal control",
  "Strategy and performance": "Strategy execution",
  Sustainability: "Sustainability reporting",
  "Project delivery": "Project controls",
};

const BODY_RULES = [
  ["IFRS", /\b(ifrs|ias|ifric|sic)\s*\d*/i],
  ["FRC", /\b(frc|frs\s*\d+|financial reporting council|uk gaap)\b/i],
  ["ACCA", /\bacca\b/i],
  ["CGMA", /\b(cgma|cima|management accounting)\b/i],
  ["CFA", /\b(cfa|portfolio|investment analysis)\b/i],
  ["FRM", /\b(frm|financial risk|market risk|credit risk)\b/i],
  ["IIA", /\b(iia|internal audit|ippf)\b/i],
  ["CRMA", /\b(crma|risk management assurance)\b/i],
];

const DOMAIN_BODIES = {
  "Financial reporting": ["IFRS", "FRC", "ACCA", "CGMA"],
  "Management reporting": ["CGMA", "ACCA"],
  "Financial management": ["CFA", "ACCA", "FRM"],
  "Risk management": ["FRM", "CRMA", "IIA"],
  "Audit and assurance": ["IIA", "ACCA", "CRMA", "FRC"],
  "Governance and controls": ["IIA", "CRMA", "ACCA", "FRC"],
  "Strategy and performance": ["CGMA", "CFA"],
  Sustainability: ["CFA", "CRMA", "IFRS"],
  "Project delivery": ["CGMA"],
};

const CONTENT_RULES = [
  ["definition", /\b(definition|defined as|means|is a|are assets|refers to)\b/i],
  ["requirement", /\b(shall|must|required|is recognised|is recognized|should be)\b/i],
  ["procedure", /\b(procedure|process|steps?|how to|review|reconcile|prepare|calculate)\b/i],
  ["control", /\b(control|approval|authori[sz]|segregation|evidence|reconciliation)\b/i],
  ["disclosure", /\b(disclos|present|financial statements|annual report)\b/i],
  ["analysis", /\b(analy[sz]|interpret|variance|ratio|indicator|assess)\b/i],
];

export function classifyResource({ sourcePath, title, text }) {
  const sample = `${sourcePath}\n${title}\n${text.slice(0, 5000)}`;
  let bestDomain = "Strategy and performance";
  let bestDomainScore = 0;

  for (const rule of DOMAIN_RULES) {
    let score = 0;
    if (rule.path.test(sourcePath)) score += 2.5;
    const matches = sample.match(new RegExp(rule.terms.source, "gi")) ?? [];
    score += Math.min(matches.length, 6);
    if (score > bestDomainScore) {
      bestDomain = rule.domain;
      bestDomainScore = score;
    }
  }
  const riskSignals =
    sample.match(/\b(risk|uncertaint|inherent|residual|risk appetite)\b/gi) ??
    [];
  const auditSpecific =
    /\b(audit committee|audit evidence|external auditor|internal audit|audit engagement)\b/i.test(
      `${title}\n${text.slice(0, 2500)}`,
    );
  const riskLedSource =
    /\b(risks?|uncertaint|risk management|risk assessment)\b/i.test(
      `${sourcePath}\n${title}`,
    );
  if (riskLedSource && (riskSignals.length >= 2 || !auditSpecific)) {
    bestDomain = "Risk management";
  }

  const titleSample = `${sourcePath}\n${title}`;
  const bodySample = text.slice(0, 5000);

  let topic = null;
  let topicScore = 0;

  for (const [pattern, standardTopic] of STANDARD_TOPICS) {
    if (pattern.test(titleSample)) {
      topic = standardTopic;
      topicScore = 8;
      break;
    }
  }

  if (!topic) {
    for (const [candidate, pattern] of TOPIC_RULES) {
      const titleMatches =
        titleSample.match(new RegExp(pattern.source, "gi")) ?? [];
      const bodyMatches =
        bodySample.match(new RegExp(pattern.source, "gi")) ?? [];
      const score = titleMatches.length * 3 + Math.min(bodyMatches.length, 5);
      if (score > topicScore) {
        topic = candidate;
        topicScore = score;
      }
    }
    if (topicScore < 2) {
      topic = null;
      topicScore = 0;
    }
  }

  if (!topic) {
    for (const [pattern, standardTopic] of STANDARD_TOPICS) {
      if (pattern.test(bodySample)) {
        topic = standardTopic;
        topicScore = 3;
        break;
      }
    }
  }

  if (!topic && FRAMEWORK_STANDARDS.test(titleSample)) {
    topic = "UK GAAP framework";
    topicScore = 4;
    bestDomain = "Financial reporting";
  }

  if (!topic) {
    topic = DOMAIN_DEFAULT_TOPIC[bestDomain] ?? bestDomain;
  } else if (topicScore >= 4 && TOPIC_HOME_DOMAIN[topic]) {
    bestDomain = TOPIC_HOME_DOMAIN[topic];
  }
  if (bestDomain === "Risk management" && topicScore < 4) {
    topic = "Risk assessment";
  }

  // Title overrides for recurring misfiles.
  if (/\b(business law|ethics corner)\b/i.test(titleSample)) {
    bestDomain = "Strategy and performance";
    topic = "Strategy execution";
    topicScore = Math.max(topicScore, 6);
  } else if (/\b(cash flows?|statement of cash flows)\b/i.test(titleSample)) {
    topic = "Cash and liquidity";
    bestDomain = "Financial reporting";
    topicScore = Math.max(topicScore, 7);
  } else if (/\b(frs\s*104|ias\s*34|interim financial)\b/i.test(titleSample)) {
    topic = "Interim reporting";
    bestDomain = "Financial reporting";
    topicScore = Math.max(topicScore, 8);
  } else if (
    /\b(working capital|liquidity management|short[- ]term finance|treasury)\b/i.test(
      titleSample,
    ) &&
    !/\b(impairment|cash-generating|cgu)\b/i.test(titleSample)
  ) {
    topic = "Cash and liquidity";
    topicScore = Math.max(topicScore, 5);
  }

  const bodies = new Set(DOMAIN_BODIES[bestDomain] ?? []);
  for (const [body, pattern] of BODY_RULES) {
    if (pattern.test(sample)) bodies.add(body);
  }

  let contentType = "guidance";
  let contentScore = 0;
  for (const [candidate, pattern] of CONTENT_RULES) {
    const matches = sample.match(new RegExp(pattern.source, "gi")) ?? [];
    if (matches.length > contentScore) {
      contentType = candidate;
      contentScore = matches.length;
    }
  }

  const advancedSignals =
    sample.match(
      /\b(judgement|estimate|sensitivity|valuation|impairment|derivative|consolidat|deferred tax|risk model)\b/gi,
    ) ?? [];

  return {
    domain: bestDomain,
    topic,
    contentType,
    technicalLevel: advancedSignals.length >= 3 ? "advanced" : "practitioner",
    confidence: Math.min(0.99, 0.45 + bestDomainScore * 0.06 + topicScore * 0.025),
    bodies: [...bodies],
  };
}

export function taxonomyTags(classification, text) {
  const tags = new Set([
    classification.domain.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    classification.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    classification.contentType,
  ]);

  for (const [topic, pattern] of TOPIC_RULES) {
    if (pattern.test(text)) {
      tags.add(topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  }

  return [...tags].slice(0, 8);
}

const EXAMPLE_BY_TOPIC = [
  {
    pattern: /\bCash and liquidity\b/i,
    example:
      "Reconcile bank to ledger, clear timing items and restrictions, then state available liquidity before the pack goes out.",
    mistake:
      "Reporting the ledger balance as available cash while uncleared items, overdrafts, or restrictions remain untested.",
    task: "Reconcile cash or working capital and document exceptions",
  },
  {
    pattern: /\bProperty, plant and equipment\b/i,
    example:
      "Split purchase price and directly attributable installation from training, start-up losses, and general overhead before capitalising.",
    mistake:
      "Capitalising every project cost instead of testing whether each cost brings the asset into use.",
    task: "Challenge the capitalised cost components on one project",
  },
  {
    pattern: /\bRevenue\b/i,
    example:
      "Map the contract’s promised goods or services, decide when control transfers, and tie recognised revenue to that evidence.",
    mistake:
      "Recognising revenue on invoice date without testing the performance obligation and transfer of control.",
    task: "Trace one revenue entry to contract and performance evidence",
  },
  {
    pattern: /\bInventory\b/i,
    example:
      "Compare cost with expected selling price less completion and selling costs; write down slow or damaged lines with a named owner.",
    mistake:
      "Relying on standard cost without testing obsolescence, NRV, or abnormal production.",
    task: "Document the NRV assessment on aged inventory",
  },
  {
    pattern: /\bImpairment\b/i,
    example:
      "Identify the CGU, challenge forecast and discount-rate assumptions, run a downside sensitivity, and record headroom.",
    mistake:
      "Accepting an optimistic forecast that does not reconcile to approved plans.",
    task: "Challenge one impairment assumption and record the sensitivity",
  },
  {
    pattern: /\bInterim reporting\b/i,
    example:
      "Build the interim pack to the minimum components, apply the same policies as year-end, and explain material events since the last annual report.",
    mistake:
      "Treating the interim as a shorter annual report or changing policies mid-year without restating comparatives.",
    task: "Check one interim pack against minimum components and policy consistency",
  },
  {
    pattern: /\bBudgeting and forecasting|Variance analysis|Performance measurement\b/i,
    example:
      "Reconcile actuals to baseline, separate volume from rate, and assign the residual variance to an owner and action.",
    mistake:
      "Publishing a percentage variance with no driver, baseline quality, or decision.",
    task: "Explain one material variance by driver, owner, and action",
  },
  {
    pattern: /\bInternal control|Audit evidence|Governance\b/i,
    example:
      "Link the control objective to the control performed, keep the evidence, name the reviewer, and close exceptions.",
    mistake:
      "Saying a control exists without frequency, owner, evidence, review criteria, or exception handling.",
    task: "Walk one control from objective through evidence and exceptions",
  },
  {
    pattern: /\bFinancial instruments\b/i,
    example:
      "Document contractual cash flows and business model, pick the measurement category, and evidence ECL staging.",
    mistake:
      "Defaulting every instrument to amortised cost without the cash-flow or business-model tests.",
    task: "Challenge the measurement category on one instrument memo",
  },
  {
    pattern: /\bConsolidation|Business combinations\b/i,
    example:
      "Test control via voting and substantive rights, allocate purchase price to identifiable items, and reconcile goodwill.",
    mistake:
      "Consolidating on ownership percentage alone without power over relevant activities.",
    task: "Confirm the control assessment for one investee",
  },
  {
    pattern: /\bRisk assessment\b/i,
    example:
      "State event, cause, and consequence; score inherent risk; record the control response and residual escalation threshold.",
    mistake:
      "Using broad risk labels that cannot link to cause, consequence, control, or owner.",
    task: "Rewrite one risk as event, cause, consequence, control, owner",
  },
];

export function workplaceGuidance(classification) {
  const match = EXAMPLE_BY_TOPIC.find((item) =>
    item.pattern.test(classification.topic),
  );
  if (match) return match;

  return {
    example:
      "Trace the rule to source evidence, record the judgement, name the decision owner, and write the conclusion on the working paper.",
    mistake:
      "Restating the technical rule without evidence, judgement, ownership, or a decision.",
    task: "Apply the concept on one live working paper and document the conclusion",
  };
}
