/**
 * Client/local verification of tutor claims against Guide cards and
 * attached professional-body website references.
 *
 * When NEXT_PUBLIC_MERIXA_GUIDE_VERIFY_URL (or the learn /verify endpoint)
 * is configured, the live worker fetches official body pages. Offline, we
 * score against card text + officialReferences metadata already on cards.
 */

import type { GuideCard } from "./types";
import type { LearningStep } from "./learning";

export type BodyWebCitation = {
  body: string;
  label: string;
  url: string;
  kind?: string;
  overlap: number;
  excerpt?: string;
};

export type StepVerification = {
  index: number;
  title?: string;
  cardId?: string;
  verified: boolean;
  confidence: number;
  strength?: "strong" | "supported" | "weak";
  reason?: string;
  citations: BodyWebCitation[];
};

export type BodyWebVerification = {
  verifiedAt: string;
  bodies: string[];
  pagesFetched?: number;
  evidenceCount?: number;
  steps: StepVerification[];
  verified: boolean;
  score: number;
};

const VERIFY_OVERLAP = 0.28;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function claimOverlap(claim: string, sourceText: string): number {
  const claimTokens = tokens(claim);
  if (claimTokens.length === 0) return 0;
  const hay = new Set(tokens(sourceText));
  const hits = claimTokens.filter((token) => hay.has(token)).length;
  return hits / claimTokens.length;
}

function inventsStandardIds(claim: string, evidenceText: string): boolean {
  const ids = claim.match(/\b(?:IFRS|IAS|IFRIC|SIC|FRS|ISA)\s?\d+[A-Z]?\b/gi) ?? [];
  if (ids.length === 0) return false;
  const hay = evidenceText.toUpperCase().replace(/\s+/g, " ");
  return ids.some((id) => {
    const normalized = id.toUpperCase().replace(/\s+/g, " ");
    const compact = normalized.replace(/\s+/g, "");
    return (
      !hay.includes(normalized) &&
      !hay.replace(/\s+/g, "").includes(compact)
    );
  });
}

function evidenceFromCards(cards: GuideCard[]) {
  const items: Array<{
    body: string;
    label: string;
    url: string;
    kind: string;
    text: string;
  }> = [];

  for (const card of cards.slice(0, 6)) {
    const text = [
      card.title,
      card.teachingSummary,
      card.body,
      card.workedExample,
      card.commonMistake,
      ...(card.sourceQuotes ?? []).map((quote) => quote.text),
    ]
      .filter(Boolean)
      .join("\n");

    items.push({
      body: card.bodies[0] ?? "Guide",
      label: card.title,
      url: card.sources[0]?.path ?? `guide://${card.id}`,
      kind: "guide-card",
      text,
    });

    for (const ref of card.officialReferences ?? []) {
      items.push({
        body: ref.body,
        label: ref.label,
        url: ref.url,
        kind: "official-reference",
        text: `${ref.label}\n${ref.url}\n${text.slice(0, 1200)}`,
      });
    }
  }

  return items;
}

function verifyClaimLocal(
  claim: string,
  evidence: ReturnType<typeof evidenceFromCards>,
): Omit<StepVerification, "index"> {
  const text = claim.trim();
  if (!text) {
    return {
      verified: false,
      confidence: 0,
      reason: "empty-claim",
      citations: [],
    };
  }

  const scored = evidence
    .map((item) => {
      const overlap = claimOverlap(text, item.text);
      return {
        body: item.body,
        label: item.label,
        url: item.url,
        kind: item.kind,
        overlap: Number(overlap.toFixed(3)),
        excerpt: item.text.replace(/\s+/g, " ").trim().slice(0, 220),
      };
    })
    .filter((item) => item.overlap >= 0.12)
    .sort((left, right) => right.overlap - left.overlap);

  const best = scored[0];
  const combined = evidence.map((item) => item.text).join("\n");
  const invented = inventsStandardIds(text, combined);
  const confidence = best?.overlap ?? 0;
  const verified = !invented && Boolean(best) && confidence >= VERIFY_OVERLAP;

  return {
    verified,
    confidence: Number(confidence.toFixed(3)),
    strength:
      confidence >= 0.45 ? "strong" : confidence >= VERIFY_OVERLAP ? "supported" : "weak",
    reason: invented
      ? "invented-standard-id"
      : verified
        ? "supported-by-card-or-body-ref"
        : "insufficient-overlap",
    citations: scored.slice(0, 3),
  };
}

/** Offline verification using Guide cards + attached body website refs. */
export function verifyStepsLocally({
  steps,
  cards,
}: {
  steps: LearningStep[];
  cards: GuideCard[];
}): BodyWebVerification {
  const evidence = evidenceFromCards(cards);
  const bodies = [
    ...new Set([
      ...cards.flatMap((card) => card.bodies),
      ...cards.flatMap((card) =>
        (card.officialReferences ?? []).map((ref) => ref.body),
      ),
    ]),
  ];

  const checked = steps.map((step, index) => ({
    index,
    title: step.title,
    cardId: step.cardId,
    ...verifyClaimLocal(step.body, evidence),
  }));

  const verifiedCount = checked.filter((item) => item.verified).length;
  return {
    verifiedAt: new Date().toISOString(),
    bodies,
    evidenceCount: evidence.length,
    steps: checked,
    verified: checked.length > 0 && verifiedCount === checked.length,
    score:
      checked.length === 0
        ? 0
        : Number((verifiedCount / checked.length).toFixed(3)),
  };
}

function isBodyWebVerification(value: unknown): value is BodyWebVerification {
  if (typeof value !== "object" || value === null) return false;
  if (!("steps" in value) || !Array.isArray(value.steps)) return false;
  if (!("verified" in value) || typeof value.verified !== "boolean") return false;
  if (!("score" in value) || typeof value.score !== "number") return false;
  return true;
}

/** Live verify via learn/ask worker when configured. */
export async function verifyStepsRemote({
  steps,
  cards,
}: {
  steps: LearningStep[];
  cards: GuideCard[];
}): Promise<BodyWebVerification | null> {
  const verifyUrl =
    process.env.NEXT_PUBLIC_MERIXA_GUIDE_VERIFY_URL?.trim() ||
    (process.env.NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL
      ? `${process.env.NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL.replace(/\/corpus\/?$/, "")}/verify`
      : "") ||
    (process.env.NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL
      ? process.env.NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL.trim()
      : "");

  if (!verifyUrl) return null;

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "verify",
        steps: steps.map((step) => ({
          title: step.title,
          body: step.body,
          cardId: step.cardId,
        })),
        cards: cards.map((card) => ({
          id: card.id,
          title: card.title,
          body: card.body,
          bodies: card.bodies,
          teachingSummary: card.teachingSummary,
          workedExample: card.workedExample,
          commonMistake: card.commonMistake,
          sourceQuotes: card.sourceQuotes,
          sources: card.sources,
          officialReferences: card.officialReferences,
          classification: card.classification,
        })),
      }),
    });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (
      typeof value === "object" &&
      value !== null &&
      "verification" in value &&
      isBodyWebVerification(value.verification)
    ) {
      return value.verification;
    }
    if (isBodyWebVerification(value)) return value;
  } catch {
    return null;
  }
  return null;
}

export async function verifyTutorTeaching({
  steps,
  cards,
}: {
  steps: LearningStep[];
  cards: GuideCard[];
}): Promise<BodyWebVerification> {
  const remote = await verifyStepsRemote({ steps, cards });
  if (remote) return remote;
  return verifyStepsLocally({ steps, cards });
}
