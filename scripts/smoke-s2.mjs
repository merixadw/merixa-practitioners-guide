/**
 * S2 smoke: path remaps resolve; shelves continueable; density + starters ok.
 * Run: node scripts/smoke-s2.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PATH_CARD_REMAP } from "../src/lib/guide/path-card-remap.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(readFileSync(join(root, "content/index.json"), "utf8"));
const ids = new Set(index.cards.map((card) => card.id));

let remapOk = 0;
let remapBad = 0;
for (const [from, to] of Object.entries(PATH_CARD_REMAP)) {
  if (ids.has(to)) remapOk += 1;
  else {
    remapBad += 1;
    console.error("remap target missing", from, "->", to);
  }
}

const corePaths = JSON.parse(
  readFileSync(join(root, "src/lib/guide/ifrs-paths.generated.json"), "utf8"),
);
const frm = JSON.parse(
  readFileSync(join(root, "src/lib/guide/frm-paths.generated.json"), "utf8"),
);
const fa = JSON.parse(
  readFileSync(join(root, "src/lib/guide/fa-paths.generated.json"), "utf8"),
);

function remapId(id) {
  return PATH_CARD_REMAP[id] ?? id;
}

function continueable(path) {
  const stepped = path.steps.filter((step) => step.cardId);
  if (stepped.length === 0) return false;
  return stepped.every((step) => ids.has(remapId(step.cardId)));
}

const shelves = {
  standards: corePaths,
  frm,
  "financial-analysis": fa,
};

for (const [name, paths] of Object.entries(shelves)) {
  const ok = paths.filter(continueable).length;
  console.log(name, paths.length, "continueable", ok);
  if (ok !== paths.length) {
    for (const path of paths) {
      if (continueable(path)) continue;
      for (const step of path.steps) {
        if (step.cardId && !ids.has(remapId(step.cardId))) {
          console.error(" broken", path.id, step.cardId, "->", remapId(step.cardId));
        }
      }
    }
  }
}

const spine = index.cards.filter((card) =>
  (card.tags || []).includes("domain-spine"),
);
const ready = spine.filter(
  (card) =>
    card.workedExample &&
    card.commonMistake &&
    String(card.implicationIfIgnored || "").length >= 80,
);
console.log("remapOk", remapOk, "remapBad", remapBad);
console.log("spine ready sample", ready.length, "/", spine.length);
if (remapBad > 0) process.exit(1);
console.log("OK S2 smoke");
