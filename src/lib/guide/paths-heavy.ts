/**
 * Heavy path packs (~5MB) are served from public/path-packs/ so the bundler
 * never statically imports them into the app compile graph.
 * (public/corpus/ is gitignored for the large seamless catalog.)
 */
import type { LearningPath } from "./types";

export type HeavyPathPacks = {
  domainShelf: LearningPath[];
  orphanFamily: LearningPath[];
};

const EMPTY: HeavyPathPacks = { domainShelf: [], orphanFamily: [] };

function asPathArray(value: unknown): LearningPath[] {
  return Array.isArray(value) ? (value as LearningPath[]) : [];
}

async function fetchPack(fileName: string): Promise<LearningPath[]> {
  const response = await fetch(`/path-packs/${fileName}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return [];
  return asPathArray(await response.json());
}

/** Browser: fetch packs from /public. Server callers should use paths-heavy-disk. */
export async function loadHeavyPathPacks(): Promise<HeavyPathPacks> {
  if (typeof window === "undefined") {
    return EMPTY;
  }
  const [domainShelf, orphanFamily] = await Promise.all([
    fetchPack("domain-shelf-paths.json"),
    fetchPack("orphan-family-paths.json"),
  ]);
  return { domainShelf, orphanFamily };
}
