/**
 * S1 smoke: journey IDs resolve to real Library/Paths; coverage notes behave.
 * Run: npx tsx scripts/smoke-journey.mjs
 */
import {
  coveragePromptBlock,
  libraryCoverage,
  resolveTutorJourney,
} from "../src/lib/guide/journey.ts";
import { LEARNING_PATHS } from "../src/lib/guide/paths.ts";

const fakeIndex = {
  generatedAt: new Date().toISOString(),
  cards: [
    {
      id: "cash-conversion-cycle",
      title: "Cash conversion cycle",
      body: "x".repeat(200),
      teachingSummary: "y".repeat(200),
      workedExample: "DIO + DSO − DPO",
      bodies: ["Merixa"],
      tags: [],
      sources: [],
    },
    {
      id: "thin-card",
      title: "Thin concept",
      body: "Short.",
      teachingSummary: "Short.",
      bodies: ["Merixa"],
      tags: [],
      sources: [],
    },
  ],
  chunks: [],
};

const path = LEARNING_PATHS[0];
const cards = fakeIndex.cards;

const good = resolveTutorJourney({
  proposed: {
    cardId: "invented-id",
    pathId: "also-fake",
    libraryInvite: "Open Library",
    pathsInvite: "Open Paths",
  },
  // @ts-expect-error smoke fixtures are intentionally partial
  cards,
  path,
  // @ts-expect-error smoke fixtures are intentionally partial
  index: fakeIndex,
});

if (good.cardId !== "cash-conversion-cycle") {
  throw new Error(`expected clamped cardId, got ${good.cardId}`);
}
if (path && good.pathId !== path.id) {
  throw new Error(`expected path ${path.id}, got ${good.pathId}`);
}

// @ts-expect-error partial fixture
const coverage = libraryCoverage([cards[1]]);
if (coverage !== "thin") throw new Error(`expected thin, got ${coverage}`);
// @ts-expect-error partial fixture
const note = coveragePromptBlock(coverage, [cards[1]]);
if (!/thin/i.test(note)) throw new Error("thin note missing");

console.log("OK journey clamp + coverage", {
  cardId: good.cardId,
  pathId: good.pathId,
  coverage,
});
