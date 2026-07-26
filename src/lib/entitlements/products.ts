/** StoreKit product catalogue — iOS-only billing for v1.
 *
 * Commercial offer:
 *   1. Guide unlock (£7.99 once) → Offline Library / Paths / Saved
 *      + AI Premium included for 30 days from unlock
 *   2. After the included month → subscribe AI Premium (£7.99/mo) to keep
 *      live coach, or stay on Offline Library (done — no pressure).
 *
 * Legacy AI Lite SKU remains in LEGACY_PRODUCT_IDS for receipt verify /
 * grandfathering until renewals end — not sold in-app.
 */

export const PRODUCT_IDS = {
  unlock: "uk.co.merixa.practitionersguide.unlock",
  aiPremium: "uk.co.merixa.practitionersguide.ai.premium.monthly",
} as const;

/** Days of AI Premium included with Guide unlock (from unlockedAt). */
export const UNLOCK_PREMIUM_TRIAL_DAYS = 30;

/** Deprecated — do not sell. Still accepted on restore/verify. */
export const LEGACY_PRODUCT_IDS = {
  aiLite: "uk.co.merixa.practitionersguide.ai.lite.monthly",
} as const;

export type ProductId =
  | (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS]
  | (typeof LEGACY_PRODUCT_IDS)[keyof typeof LEGACY_PRODUCT_IDS];

export type DisplayPrice = {
  gbp: string;
  eur: string;
  usd: string;
};

export type CatalogProduct = {
  id: (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];
  kind: "non_consumable" | "auto_renewable";
  label: string;
  blurb: string;
  price: DisplayPrice;
  /** Short bullets for paywall / upgrade comparison. */
  features: readonly string[];
};

export const CATALOG = {
  unlock: {
    id: PRODUCT_IDS.unlock,
    kind: "non_consumable",
    label: "Guide unlock",
    blurb:
      "Full Library, Paths, and Saved offline — plus AI Premium included for 30 days.",
    price: { gbp: "£7.99", eur: "€8.99", usd: "$9.99" },
    features: [
      "Library, Paths, and Saved on one device",
      "Full concept detail: Definition · At work · Watch for · Quick check",
      "Concept links and path membership for browsing",
      "OTA corpus growth when online",
      "AI Premium included for 30 days from unlock",
      "Then subscribe — or keep Offline Library",
    ],
  },
  aiPremium: {
    id: PRODUCT_IDS.aiPremium,
    kind: "auto_renewable",
    label: "AI Premium",
    blurb:
      "Keep live assisted training after the included month — spreadsheet demos, board pack, stress-test, and judgement.",
    price: { gbp: "£7.99", eur: "€8.99", usd: "$9.99" },
    features: [
      "Live coaching with gpt-5 / gpt-5-mini routing",
      "Spreadsheet demo · Board pack · Stress-test · Go deeper",
      "Judgement call · Harder example · Implication drill",
      "Exam drill — LOS-style checks on Guide cards (light pace)",
      "Custom learning paths via Tutor",
      "Compressed inventory — heavy coach kept first (replay free)",
      "Daily pace that resets tomorrow (not monthly burn)",
      "About 10 live asks / day · up to 5 heavy coach",
    ],
  },
} as const satisfies Record<string, CatalogProduct>;

/**
 * Daily Premium pace (local calendar day). Resets every day so users
 * stay active all month — not a monthly pool that can burn in a week.
 */
export const PREMIUM_FAIR_USE_DAILY = 10;
/** Multi-tab / judgement / board / stress / harder / implication per day. */
export const PREMIUM_HEAVY_FAIR_USE_DAILY = 5;
/** Warn when either bucket reaches this fraction of its daily cap. */
export const PREMIUM_FAIR_USE_WARN_RATIO = 0.8;

/** @deprecated Use PREMIUM_FAIR_USE_DAILY — kept for older imports. */
export const PREMIUM_FAIR_USE_SOFT_DAILY = PREMIUM_FAIR_USE_DAILY;

/** Premium training actions shown locked on Offline (upsell). */
export const PREMIUM_UPSELL_LABELS = [
  "Spreadsheet demo",
  "Board pack view",
  "Stress-test me",
  "Exam drill",
  "Go deeper",
  "Judgement call",
  "Harder example",
  "Implication drill",
] as const;

/** All product IDs the verify worker / restore must recognise. */
export const ALL_KNOWN_PRODUCT_IDS = [
  PRODUCT_IDS.unlock,
  PRODUCT_IDS.aiPremium,
  LEGACY_PRODUCT_IDS.aiLite,
] as const;
