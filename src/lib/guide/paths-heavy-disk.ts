/**
 * Server/build-time disk readers for heavy path packs.
 * Never import this from client components — use paths-heavy.ts fetchers.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { HeavyPathPacks } from "./paths-heavy";
import type { LearningPath } from "./types";

const PACK_DIR = join(process.cwd(), "public", "path-packs");

function readPack(fileName: string): LearningPath[] {
  const path = join(PACK_DIR, fileName);
  if (!existsSync(path)) {
    const srcPath = join(
      process.cwd(),
      "src",
      "lib",
      "guide",
      fileName.replace(/\.json$/, ".generated.json"),
    );
    if (!existsSync(srcPath)) return [];
    try {
      const value: unknown = JSON.parse(readFileSync(srcPath, "utf8"));
      return Array.isArray(value) ? (value as LearningPath[]) : [];
    } catch {
      return [];
    }
  }
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(value) ? (value as LearningPath[]) : [];
  } catch {
    return [];
  }
}

export function loadHeavyPathPacksSync(): HeavyPathPacks {
  return {
    domainShelf: readPack("domain-shelf-paths.json"),
    orphanFamily: readPack("orphan-family-paths.json"),
  };
}
