/**
 * Official professional-body websites used to enrich and sustain concepts.
 * Only public landing / standards-list / certification overview pages —
 * never paywalled exam banks or commercial study kits.
 */

export const PROFESSIONAL_BODIES = {
  IFRS: {
    id: "IFRS",
    name: "IFRS Foundation",
    home: "https://www.ifrs.org",
    domains: ["Financial reporting", "Sustainability"],
    topics: [
      "Revenue",
      "Leases",
      "Financial instruments",
      "Impairment",
      "Consolidation",
      "Business combinations",
      "Intangible assets",
      "Inventory",
      "Provisions and contingencies",
      "Employee benefits",
      "Presentation of financial statements",
      "Sustainability reporting",
    ],
    pages: [
      {
        title: "IFRS Foundation — home",
        url: "https://www.ifrs.org/home/",
      },
      {
        title: "IFRS Accounting Standards — list of standards",
        url: "https://www.ifrs.org/issued-standards/list-of-standards/",
      },
      {
        title: "IFRS Sustainability Standards",
        url: "https://www.ifrs.org/issued-standards/ifrs-sustainability-standards-navigator/",
      },
    ],
  },
  FRC: {
    id: "FRC",
    name: "Financial Reporting Council",
    home: "https://www.frc.org.uk",
    domains: ["Financial reporting", "Governance and controls", "Audit and assurance"],
    topics: [
      "UK GAAP framework",
      "Reporting framework",
      "Governance",
      "Audit evidence",
    ],
    pages: [
      {
        title: "Financial Reporting Council — home",
        url: "https://www.frc.org.uk/",
      },
      {
        title: "FRC accounting and reporting standards",
        url: "https://www.frc.org.uk/library/standards-codes-policy/accounting-and-reporting/",
      },
    ],
  },
  ACCA: {
    id: "ACCA",
    name: "Association of Chartered Certified Accountants",
    home: "https://www.accaglobal.com",
    domains: [
      "Financial reporting",
      "Management reporting",
      "Audit and assurance",
      "Governance and controls",
      "Financial management",
    ],
    topics: [
      "Tax",
      "Income Taxes",
      "Government grants",
      "Revenue",
      "Audit evidence",
      "Internal control",
    ],
    pages: [
      {
        title: "ACCA Global — home",
        url: "https://www.accaglobal.com/gb/en.html",
      },
      {
        title: "ACCA professional insights",
        url: "https://www.accaglobal.com/gb/en/professional-insights.html",
      },
      {
        title: "ACCA technical activities — tax",
        url: "https://www.accaglobal.com/gb/en/professional-insights/technical-activities/tax.html",
      },
      {
        title: "ACCA technical activities — financial reporting",
        url: "https://www.accaglobal.com/gb/en/professional-insights/technical-activities/financial-reporting.html",
      },
    ],
  },
  CGMA: {
    id: "CGMA",
    name: "AICPA & CIMA (CGMA)",
    home: "https://www.aicpa-cima.com",
    domains: [
      "Management reporting",
      "Strategy and performance",
      "Project delivery",
      "Financial reporting",
    ],
    topics: [
      "Budgeting and forecasting",
      "Variance analysis",
      "Performance measurement",
      "Cost and profitability",
      "Management accounting",
      "Cost behaviour",
      "Performance reporting",
    ],
    pages: [
      {
        title: "CGMA designation overview",
        url: "https://www.aicpa-cima.com/resources/landing/becoming-a-cgma",
      },
      {
        title: "AICPA & CIMA resources",
        url: "https://www.aicpa-cima.com/resources",
      },
      {
        title: "CGMA Magazine / insights",
        url: "https://www.aicpa-cima.com/resources/article",
      },
      {
        title: "CIMA — home",
        url: "https://www.cimaglobal.com/",
      },
    ],
  },
  CFA: {
    id: "CFA",
    name: "CFA Institute",
    home: "https://www.cfainstitute.org",
    domains: ["Financial management", "Strategy and performance", "Sustainability"],
    topics: [
      "Investment appraisal",
      "Valuation",
      "Performance measurement",
      "FSA",
      "Corporate",
      "Quant",
      "Fixed income",
      "Portfolio",
      "Economics",
    ],
    pages: [
      {
        title: "CFA Institute — home",
        url: "https://www.cfainstitute.org/",
      },
      {
        title: "CFA Institute Research and Policy Center",
        url: "https://rpc.cfainstitute.org/",
      },
      {
        title: "CFA Institute Financial Analysis resources",
        url: "https://www.cfainstitute.org/insights",
      },
      {
        title: "CFA Institute Ethics & Standards",
        url: "https://www.cfainstitute.org/en/ethics-standards",
      },
    ],
  },
  FRM: {
    id: "FRM",
    name: "GARP — Financial Risk Manager",
    home: "https://www.garp.org/frm",
    domains: ["Risk management", "Financial management"],
    topics: ["Risk assessment", "Cash and liquidity", "Valuation"],
    pages: [
      {
        title: "GARP FRM certification",
        url: "https://www.garp.org/frm",
      },
      {
        title: "GARP — home",
        url: "https://www.garp.org/",
      },
    ],
  },
  IIA: {
    id: "IIA",
    name: "The Institute of Internal Auditors",
    home: "https://www.theiia.org",
    domains: ["Audit and assurance", "Governance and controls", "Risk management"],
    topics: ["Audit evidence", "Internal control", "Governance", "Risk assessment"],
    pages: [
      {
        title: "The IIA — home",
        url: "https://www.theiia.org/",
      },
      {
        title: "IIA certifications overview",
        url: "https://www.theiia.org/en/certifications/",
      },
    ],
  },
  CRMA: {
    id: "CRMA",
    name: "IIA — Certification in Risk Management Assurance",
    home: "https://www.theiia.org/en/certifications/crma/",
    domains: ["Risk management", "Audit and assurance", "Governance and controls"],
    topics: ["Risk assessment", "Internal control", "Governance"],
    pages: [
      {
        title: "CRMA certification",
        url: "https://www.theiia.org/en/certifications/crma/",
      },
    ],
  },
};

export function listProfessionalBodies() {
  return Object.values(PROFESSIONAL_BODIES);
}

/** Bodies that can sustain a domain/topic pair from the research agenda. */
export function bodiesForTopic(domain, topic) {
  return listProfessionalBodies().filter((body) => {
    if (body.domains.includes(domain)) return true;
    if (topic && body.topics.includes(topic)) return true;
    return false;
  });
}

/** Bodies already attached to a card, resolved to registry entries. */
export function resolveCardBodies(card) {
  const ids = Array.isArray(card?.bodies) ? card.bodies : [];
  return ids
    .map((id) => PROFESSIONAL_BODIES[id])
    .filter(Boolean);
}

/**
 * Official sustaining references for a concept/card: home + matching pages.
 * Used by the teacher to keep published concepts tied to living body sites.
 */
export function sustainingReferences({ domain, topic, bodies }) {
  const selected = new Map();
  for (const id of bodies ?? []) {
    const body = PROFESSIONAL_BODIES[id];
    if (body) selected.set(body.id, body);
  }
  for (const body of bodiesForTopic(domain, topic)) {
    selected.set(body.id, body);
  }

  const references = [];
  for (const body of selected.values()) {
    references.push({
      body: body.id,
      label: body.name,
      url: body.home,
      kind: "official-open",
    });
    for (const page of body.pages.slice(0, 2)) {
      references.push({
        body: body.id,
        label: page.title,
        url: page.url,
        kind: "official-open",
      });
    }
  }
  return references.slice(0, 6);
}

export function isOfficialBodyHost(urlOrPath) {
  const value = String(urlOrPath || "").toLowerCase();
  return listProfessionalBodies().some((body) => {
    try {
      const host = new URL(body.home).hostname.replace(/^www\./, "");
      return value.includes(host);
    } catch {
      return value.includes(body.id.toLowerCase());
    }
  });
}
