import type { BodyId, GuideCard, GuideChunk, GuideIndex } from "./types";
import { isVisibleToTutor } from "./publishable";

export type RetrieveHit = {
  chunk: GuideChunk;
  card: GuideCard;
  score: number;
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function wantsWorkplace(query: string): boolean {
  return /\b(work|workplace|practice|example|pack|apply|demonstrat|scenario|at work|how (do|would) i)\b/i.test(
    query,
  );
}

function teachingBoost(card: GuideCard, chunk: GuideChunk, workplace: boolean): number {
  let boost = 0;
  if (card.workedExample) boost += workplace ? 1.4 : 0.45;
  if (card.teachingSummary) boost += 0.35;
  if (card.commonMistake) boost += 0.25;
  if (card.implicationIfIgnored) boost += workplace ? 0.55 : 0.3;
  if (card.realWorldTrigger) boost += workplace ? 0.35 : 0.15;
  if ((card.workplaceTasks?.length ?? 0) > 0) boost += workplace ? 0.6 : 0.2;
  if (chunk.kind === "example" && workplace) boost += 0.8;
  if (chunk.kind === "summary") boost += 0.25;
  if (chunk.kind === "mistake" && workplace) boost += 0.35;
  if (chunk.kind === "implication") boost += workplace ? 0.7 : 0.4;
  if (chunk.kind === "trigger" && workplace) boost += 0.5;
  return boost;
}

export function retrieve({
  index,
  query,
  limit = 6,
  body = "all",
}: {
  index: GuideIndex;
  query: string;
  limit?: number;
  body?: BodyId | "all";
}): RetrieveHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const cardById = new Map(index.cards.map((card) => [card.id, card]));
  const documentCount = Math.max(index.chunks.length, 1);
  const workplace = wantsWorkplace(query);
  const hits: RetrieveHit[] = [];

  // Precompute document frequency once per query term (not per chunk).
  const documentFrequencyByTerm = new Map<string, number>();
  for (const term of terms) {
    let count = 0;
    for (const candidate of index.chunks) {
      const hay =
        `${candidate.title} ${candidate.text} ${candidate.tags.join(" ")}`.toLowerCase();
      if (hay.includes(term)) count += 1;
    }
    documentFrequencyByTerm.set(term, count);
  }

  for (const chunk of index.chunks) {
    if (body !== "all" && !chunk.bodies.includes(body)) continue;
    const card = cardById.get(chunk.cardId);
    if (!card || !isVisibleToTutor(card)) continue;

    const title = chunk.title.toLowerCase();
    const haystack =
      `${chunk.title} ${chunk.text} ${chunk.tags.join(" ")} ${card.classification?.domain ?? ""} ${card.classification?.topic ?? ""} ${card.workedExample ?? ""} ${card.teachingSummary ?? ""} ${(card.aliases ?? []).join(" ")}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (!haystack.includes(term)) continue;
      const documentFrequency = documentFrequencyByTerm.get(term) ?? 0;
      const inverseFrequency = Math.log(
        1 +
          (documentCount - documentFrequency + 0.5) /
            (documentFrequency + 0.5),
      );
      const termFrequency = haystack.split(term).length - 1;
      score += inverseFrequency * (termFrequency / (termFrequency + 1.2));
      if (title.includes(term)) score += 0.35;
      if (card.tags.some((tag) => tag.toLowerCase().includes(term))) {
        score += 0.15;
      }
    }

    if (score > 0) {
      hits.push({
        chunk,
        card,
        score: score + teachingBoost(card, chunk, workplace),
      });
    }
  }

  hits.sort((left, right) => right.score - left.score);
  const seen = new Set<string>();
  const unique: RetrieveHit[] = [];

  for (const hit of hits) {
    if (seen.has(hit.card.id)) continue;
    seen.add(hit.card.id);
    unique.push(hit);
    if (unique.length >= limit) break;
  }

  return unique;
}

export function extractiveAnswer({
  query,
  hits,
}: {
  query: string;
  hits: RetrieveHit[];
}): string {
  if (hits.length === 0) {
    return `No Guide cards matched “${query.trim()}”. Try another term or browse by professional body.`;
  }

  return hits
    .slice(0, 2)
    .map((hit) => {
      if (hit.card.teachingSummary) return firstSentence(hit.card.teachingSummary);
      return firstSentence(hit.chunk.text);
    })
    .filter(Boolean)
    .join(" ");
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const match = cleaned.match(/[^.!?]+[.!?]?/);
  return (match?.[0] ?? cleaned).trim().slice(0, 220);
}
