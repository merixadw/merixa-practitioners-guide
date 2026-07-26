import type { GuideCard, GuideChunk, GuideIndex } from "./types";

function pushChunk(
  chunks: GuideChunk[],
  card: GuideCard,
  text: string | undefined,
  kind: GuideChunk["kind"],
  index: number,
) {
  const cleaned = text?.replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  chunks.push({
    id: `${card.id}::${kind ?? "body"}::${index}`,
    cardId: card.id,
    title: card.title,
    text: cleaned,
    bodies: card.bodies,
    tags: card.tags,
    kind,
  });
}

export function chunkCard(card: GuideCard): GuideChunk[] {
  const chunks: GuideChunk[] = [];
  const paragraphs = card.body
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const bodyParts = paragraphs.length > 0 ? paragraphs : [card.body];

  bodyParts.forEach((text, index) => {
    pushChunk(chunks, card, text, "body", index);
  });

  pushChunk(chunks, card, card.teachingSummary, "summary", 0);
  pushChunk(chunks, card, card.workedExample, "example", 0);
  pushChunk(chunks, card, card.commonMistake, "mistake", 0);

  return chunks;
}

export function buildGuideIndex(cards: GuideCard[]): GuideIndex {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    cards,
    chunks: cards.flatMap(chunkCard),
  };
}
