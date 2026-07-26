import { pathsContainingCard } from "./flagship-paths";
import { LEARNING_PATHS } from "./paths";
import { getCachedCustomPaths } from "./custom-paths";
import type { GuideCard, GuideIndex, LearningPath } from "./types";

function allKnownPaths(): LearningPath[] {
  return [...getCachedCustomPaths(), ...LEARNING_PATHS];
}

export type TutorJourney = {
  cardId?: string;
  pathId?: string;
  /** Related Library card ids when composing / grounding a path. */
  fromLibrary?: string[];
  /** Shown only when Library coverage is thin or ask is card-pinned. */
  libraryInvite?: string;
  /** Shown only when the learner is on an active Path step. */
  pathsInvite?: string;
};

/** How substantive the retrieved Library pack is for grounding. */
export type LibraryCoverage = "rich" | "mixed" | "thin";

export function isThinCard(card: GuideCard): boolean {
  const core = (card.teachingSummary || card.body || "").trim();
  const hasWorked = Boolean(card.workedExample?.trim());
  return core.length < 140 || !hasWorked;
}

export function libraryCoverage(cards: GuideCard[]): LibraryCoverage {
  if (cards.length === 0) return "thin";
  const thinCount = cards.filter(isThinCard).length;
  if (thinCount === 0) return "rich";
  if (thinCount === cards.length) return "thin";
  return "mixed";
}

/** Prompt block for the ask worker — same grounding for Lite and Premium. */
export function coveragePromptBlock(
  coverage: LibraryCoverage,
  cards: GuideCard[],
): string {
  const titles = cards
    .slice(0, 5)
    .map((card) => `“${card.title}” (${card.id})`)
    .join("; ");
  switch (coverage) {
    case "rich":
      return `Library coverage: rich. Ground internally in: ${titles}. Teach specialist practitioner depth in your answer — do not send the learner to Library unless they ask for the paced card.`;
    case "mixed":
      return `Library coverage: mixed. Prefer richer cards among: ${titles}. Teach directly; only mention Library if a specific card is essential. Never invent body numbers.`;
    case "thin":
      return `Library coverage: thin. Say briefly what Library has (${titles || "little"}), then teach carefully from those cards only. You may offer one Library link — do not pad the answer with navigation.`;
    default: {
      const _exhaustive: never = coverage;
      return _exhaustive;
    }
  }
}

export function bestPathForCard(cardId: string | undefined): LearningPath | undefined {
  if (!cardId) return allKnownPaths()[0];
  const containing = pathsContainingCard(cardId, allKnownPaths());
  if (containing[0]) return containing[0];
  return allKnownPaths().find((path) =>
    path.steps.some((step) => step.cardId === cardId),
  );
}

/**
 * Clamp model journey IDs to real Library / Paths IDs so chips always resolve.
 */
export function resolveTutorJourney({
  proposed,
  cards,
  path,
  index,
  coverage = "mixed",
  pathActive = false,
  pinnedCardId,
}: {
  proposed?: Partial<TutorJourney> | null;
  cards: GuideCard[];
  path?: LearningPath;
  index: GuideIndex;
  coverage?: LibraryCoverage;
  pathActive?: boolean;
  pinnedCardId?: string;
}): TutorJourney {
  const cardIds = new Set(index.cards.map((card) => card.id));
  const knownPaths = allKnownPaths();
  const pathIds = new Set(knownPaths.map((item) => item.id));

  let cardId =
    proposed?.cardId && cardIds.has(proposed.cardId)
      ? proposed.cardId
      : cards.find((card) => cardIds.has(card.id))?.id;

  if (!cardId && cards[0]) cardId = cards[0].id;

  let pathId =
    proposed?.pathId && pathIds.has(proposed.pathId)
      ? proposed.pathId
      : path?.id && pathIds.has(path.id)
        ? path.id
        : bestPathForCard(cardId)?.id;

  const focusTitle =
    (cardId
      ? index.cards.find((card) => card.id === cardId)?.title
      : undefined) ?? cards[0]?.title;

  const pathTitle = pathId
    ? knownPaths.find((item) => item.id === pathId)?.title
    : undefined;

  const libraryInvite =
    coverage === "thin" || pinnedCardId
      ? proposed?.libraryInvite?.trim().slice(0, 180) ||
        (coverage === "thin" && focusTitle
          ? `Library has a thin note on “${focusTitle}” — open the card if you want the paced version.`
          : pinnedCardId && focusTitle
            ? `Open “${focusTitle}” in Library for the paced card.`
            : undefined)
      : undefined;

  const pathsInvite = pathActive
    ? proposed?.pathsInvite?.trim().slice(0, 180) ||
      (pathTitle
        ? `Next on “${pathTitle}” when you are ready.`
        : undefined)
    : undefined;

  return {
    cardId,
    pathId,
    ...(libraryInvite ? { libraryInvite } : {}),
    ...(pathsInvite ? { pathsInvite } : {}),
  };
}

/** Dedupe cards with focus / path cards first, then retrieve fillers. */
export function mergeLibraryCards(
  primary: GuideCard[],
  fillers: GuideCard[],
  limit = 5,
): GuideCard[] {
  const out: GuideCard[] = [];
  const seen = new Set<string>();
  for (const card of [...primary, ...fillers]) {
    if (!card?.id || seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
    if (out.length >= limit) break;
  }
  return out;
}
