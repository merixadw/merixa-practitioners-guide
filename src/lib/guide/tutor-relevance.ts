import type { RetrieveHit } from "./retrieve";
import type { GuideCard } from "./types";
import type { LibraryCoverage } from "./journey";

/** Minimum retrieve score to surface a Library card chip in Tutor. */
export const LIBRARY_CHIP_SCORE = 0.68;

export type TutorChromeOptions = {
  coverage?: LibraryCoverage;
  /** Learner arrived from a Path step. */
  pathActive?: boolean;
  /** URL-pinned Library card for this ask. */
  pinnedCardId?: string;
};

export function buildTutorChrome(input: {
  coverage?: LibraryCoverage;
  pathContext?: { pathId?: string; cardId?: string };
}): TutorChromeOptions {
  return {
    coverage: input.coverage,
    pathActive: Boolean(input.pathContext?.pathId),
    pinnedCardId: input.pathContext?.cardId,
  };
}

/** At most one Library card in chat — only when grounding is strong or thin. */
export function pickRelatedCards(
  hits: RetrieveHit[],
  cards: GuideCard[],
  options: TutorChromeOptions,
): GuideCard[] {
  const { coverage, pinnedCardId } = options;

  if (pinnedCardId) {
    const pinned =
      cards.find((card) => card.id === pinnedCardId) ??
      hits.find((hit) => hit.card.id === pinnedCardId)?.card;
    return pinned ? [pinned] : [];
  }

  const retrieved = hits.filter(
    (hit) => !(hit.chunk.kind === "summary" && hit.score === 1),
  );

  if (coverage === "thin") {
    const best = retrieved[0]?.card ?? cards[0];
    return best ? [best] : [];
  }

  const top = retrieved[0];
  if (!top || top.score < LIBRARY_CHIP_SCORE) return [];

  return [top.card];
}

export function shouldShowLibraryChips(
  related: GuideCard[],
  options: TutorChromeOptions,
): boolean {
  if (related.length === 0) return false;
  if (options.pinnedCardId) return true;
  if (options.coverage === "thin") return true;
  return related.length > 0;
}

export function shouldShowLibraryInvite(
  invite: string | undefined,
  options: TutorChromeOptions,
): boolean {
  if (!invite?.trim()) return false;
  return options.coverage === "thin" || Boolean(options.pinnedCardId);
}

export function shouldShowPathsInvite(
  invite: string | undefined,
  options: TutorChromeOptions,
): boolean {
  if (!invite?.trim()) return false;
  return Boolean(options.pathActive);
}
