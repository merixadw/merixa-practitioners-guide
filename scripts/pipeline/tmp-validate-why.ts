import { readFileSync } from "node:fs";
import { loadGuideIndex } from "../../src/lib/guide/corpus";

const raw = JSON.parse(readFileSync("content/index.json", "utf8"));
console.log("raw index cards:", raw.cards.length);
const index = loadGuideIndex();
console.log("runtime cards:", index.cards.length);
const liveIds = new Set(index.cards.map((c) => c.id));

const probes = [
  "fa-abnormal-earnings",
  "frm-variance",
  "fa-ccc",
  "risk-enc-control-effectiveness-rating",
];
for (const id of probes) {
  const card = raw.cards.find((c: { id: string }) => c.id === id);
  if (!card) {
    console.log(id, "NOT IN RAW INDEX");
    continue;
  }
  console.log(
    id,
    "runtime:",
    liveIds.has(id),
    JSON.stringify({
      bodies: card.bodies,
      hasWorkplaceTasks: Array.isArray(card.workplaceTasks),
      hasSources: Array.isArray(card.sources),
      sourceKinds: (card.sources || []).map((s: { kind?: string }) => s.kind),
      classification: card.classification,
      editorialStatus: card.editorialStatus,
      sourceLabels: (card.sources || []).map((s: { label?: string; path?: string }) => `${s.label}|${s.path}`).slice(0, 3),
    }),
  );
}

// count failure reasons roughly
let noWT = 0, noSrc = 0, badClass = 0, merixaOnly = 0;
for (const card of raw.cards) {
  if (liveIds.has(card.id)) continue;
  if (!Array.isArray(card.workplaceTasks)) noWT += 1;
  if (!Array.isArray(card.sources)) noSrc += 1;
  const bodies = (card.bodies || []).filter((b: string) => b !== "Merixa");
  if (bodies.length === 0) merixaOnly += 1;
  if (card.classification && typeof card.classification.confidence !== "number") badClass += 1;
}
console.log({ notRuntime: raw.cards.length - (index.cards.length - 47), noWT, noSrc, merixaOnly, badClass });
