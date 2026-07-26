/**
 * Offline spine awareness fill (S2).
 * For domain-spine cards that already have At work + Watch for, synthesise
 * implicationIfIgnored + realWorldTrigger from existing fields — no OpenAI.
 *
 * Run: node scripts/pipeline/fill-spine-awareness.mjs
 * Optional: --limit=40 --dry-run
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { safeWriteIndex } from "../lib/safe-index-write.mjs";
import { withIndexHolder } from "./index-holder.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const indexPath = join(root, "content", "index.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) || 40 : 40;

function clip(text, max) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function needsAwareness(card) {
  const implication = String(card.implicationIfIgnored || "").trim();
  const trigger = String(card.realWorldTrigger || "").trim();
  return implication.length < 80 || trigger.length < 40;
}

function isSpine(card) {
  return (
    Array.isArray(card.tags) &&
    (card.tags.includes("domain-spine") ||
      card.tags.includes("fa-encyclopedia") ||
      card.tags.includes("ma-encyclopedia") ||
      card.tags.includes("frm-encyclopedia") ||
      card.tags.includes("crma-encyclopedia") ||
      card.tags.includes("coso-encyclopedia") ||
      card.tags.includes("ifrs-ias-path"))
  );
}

function fillAwareness(card) {
  const title = card.title || "This concept";
  const trap = String(card.commonMistake || "").trim();
  const example = String(card.workedExample || "").trim();
  const summary = String(card.teachingSummary || card.body || "").trim();

  const implication =
    String(card.implicationIfIgnored || "").trim().length >= 80
      ? card.implicationIfIgnored
      : clip(
          [
            `If ${title} is ignored in the period, decisions land on incomplete evidence`,
            trap
              ? `— teams often fall into this trap: ${trap}`
              : "— owners miss the control or reporting consequence until close or a review.",
            example
              ? ` Use the workplace picture already on this card to brief the owner before the number moves.`
              : ` Tie the next pack or dashboard to an owner, evidence, and a watch item.`,
          ].join(" "),
          520,
        );

  const trigger =
    String(card.realWorldTrigger || "").trim().length >= 40
      ? card.realWorldTrigger
      : clip(
          [
            `Raise this when a pack, covenant, board ask, or control test touches ${title.toLowerCase()}`,
            summary ? ` — especially where ${clip(summary, 160)}` : ".",
          ].join(""),
          280,
        );

  return {
    ...card,
    implicationIfIgnored: implication,
    realWorldTrigger: trigger,
    tags: Array.from(
      new Set([...(card.tags || []), "spine-awareness-filled"]),
    ),
  };
}

await withIndexHolder("fill-spine-awareness", async () => {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  const candidates = index.cards
    .filter(
      (card) =>
        isSpine(card) &&
        String(card.workedExample || "").trim().length >= 80 &&
        String(card.commonMistake || "").trim().length >= 40 &&
        needsAwareness(card),
    )
    .slice(0, limit);

  let updated = 0;
  const byId = new Map(index.cards.map((card) => [card.id, card]));
  for (const card of candidates) {
    const next = fillAwareness(card);
    const kept = preferImprovedCard(card, next).card;
    byId.set(kept.id, kept);
    updated += 1;
  }

  const cards = [...byId.values()];
  const remaining = cards.filter(
    (card) => isSpine(card) && needsAwareness(card),
  ).length;

  if (!dryRun) {
    safeWriteIndex(indexPath, cards, {
      buildIndex: (merged) => ({
        ...index,
        cards: merged,
        generatedAt: new Date().toISOString(),
      }),
    });
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        updated,
        remainingSpineNeedingAwareness: remaining,
        sample: candidates.slice(0, 5).map((card) => card.id),
      },
      null,
      2,
    ),
  );
});
