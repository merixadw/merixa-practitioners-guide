import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SEED_CARDS } from "../../src/lib/guide/seed-cards.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "content", "pipeline", "seed-cards.json");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    { generatedAt: new Date().toISOString(), cards: SEED_CARDS },
    null,
    2,
  )}\n`,
  "utf8",
);
console.log(`exported ${SEED_CARDS.length} seeds -> ${OUT}`);
