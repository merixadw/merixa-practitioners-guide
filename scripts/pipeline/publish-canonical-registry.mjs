/**
 * Publish alias → canonical id map for redirects and path remaps.
 *
 * Usage: npm run library:canonical
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX_PATH = join(ROOT, "content", "index.json");
const RECOVERED_PATH = join(ROOT, "content", "pipeline", "recovered-aliases.json");
const OUT_JSON = join(ROOT, "content", "pipeline", "canonical-registry.json");
const OUT_TS = join(ROOT, "src", "lib", "guide", "canonical-registry.generated.json");

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  if (!existsSync(INDEX_PATH)) throw new Error("Missing content/index.json");
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const cards = Array.isArray(index.cards) ? index.cards : [];

  const idToCanonical = {};
  const titleToCanonical = {};
  const groups = [];

  for (const card of cards) {
    idToCanonical[card.id] = card.id;
    const titleKey = normalizeTitle(card.title);
    if (titleKey) titleToCanonical[titleKey] = card.id;
    for (const alias of card.aliases ?? []) {
      const key = normalizeTitle(alias);
      if (key) titleToCanonical[key] = card.id;
    }
    for (const fromId of card.mergedFrom ?? []) {
      idToCanonical[fromId] = card.id;
    }
    if ((card.mergedFrom?.length ?? 0) > 0 || (card.aliases?.length ?? 0) > 0) {
      groups.push({
        canonicalId: card.id,
        title: card.title,
        aliases: card.aliases ?? [],
        mergedFrom: card.mergedFrom ?? [],
      });
    }
  }

  // Collapse remaining same-title duplicates without deleting yet (registry only).
  const byTitle = new Map();
  for (const card of cards) {
    const key = normalizeTitle(card.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(card);
  }
  let duplicateTitles = 0;
  for (const [title, group] of byTitle.entries()) {
    if (group.length < 2) continue;
    duplicateTitles += 1;
    const preferred = [...group].sort((a, b) => {
      const score = (card) => {
        let value = (card.qualityScore ?? 0.5) * 100;
        if (/^(fa|ma|frm|crma|coso)-/.test(card.id)) value += 50;
        if (card.id.startsWith("enc-")) value += 35;
        if (card.id.startsWith("ifrs-")) value += 30;
        return value;
      };
      return score(b) - score(a);
    })[0];
    titleToCanonical[title] = preferred.id;
    for (const card of group) {
      idToCanonical[card.id] = preferred.id;
    }
  }

  // Path-repair recovered dead ids → live canonicals (after 2026-07-23 dedupe).
  let recoveredAliases = 0;
  if (existsSync(RECOVERED_PATH)) {
    const recovered = JSON.parse(readFileSync(RECOVERED_PATH, "utf8"));
    const live = new Set(cards.map((card) => card.id));
    for (const [fromId, toId] of Object.entries(recovered.idToCanonical ?? {})) {
      if (!fromId || !toId || !live.has(toId)) continue;
      if (idToCanonical[fromId] === toId) continue;
      idToCanonical[fromId] = toId;
      recoveredAliases += 1;
    }
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    cards: cards.length,
    aliasIds: Object.keys(idToCanonical).length - cards.length,
    aliasTitles: Object.keys(titleToCanonical).length,
    duplicateTitles,
    recoveredAliases,
    groupsWithMerge: groups.length,
    idToCanonical,
    titleToCanonical,
    groups: groups.slice(0, 200),
  };

  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  writeFileSync(OUT_TS, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  console.log(
    `canonical registry: cards=${registry.cards} aliasIds=${registry.aliasIds} duplicateTitles=${duplicateTitles} recoveredAliases=${recoveredAliases} -> ${OUT_TS}`,
  );
}

main();
