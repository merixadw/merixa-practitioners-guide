"use client";

/**
 * Bundled index first → device compressed Library cache → OTA corpus.
 *
 * Standard: Library ≤ 50 MB compressed. Compress to retain; never skim cards.
 */

import { useEffect, useState } from "react";
import { LIBRARY_MAX_BYTES, LIBRARY_WARN_BYTES } from "./cache-budgets";
import {
  readLibraryCache,
  writeLibraryCache,
  type LibraryCacheMeta,
} from "./library-cache";
import type { GuideIndex } from "./types";

export { LIBRARY_MAX_BYTES, LIBRARY_WARN_BYTES };
export type { LibraryCacheMeta };

function isPublishedGuideIndex(value: unknown): value is GuideIndex {
  if (typeof value !== "object" || value === null) return false;
  return (
    "version" in value &&
    value.version === 1 &&
    "generatedAt" in value &&
    typeof value.generatedAt === "string" &&
    "cards" in value &&
    Array.isArray(value.cards) &&
    "chunks" in value &&
    Array.isArray(value.chunks)
  );
}

function isNewerOrEqual(candidate: GuideIndex, current: GuideIndex): boolean {
  if (candidate.cards.length < current.cards.length) return false;
  if (candidate.cards.length > current.cards.length) return true;
  return candidate.generatedAt >= current.generatedAt;
}

/**
 * Uses the bundled index immediately, then adopts device cache / R2 corpus
 * when available and at least as complete as the bundled library.
 */
export function usePublishedGuideIndex(initialIndex: GuideIndex): GuideIndex {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const corpusUrl =
      process.env.NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL?.trim();
    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      // 1) Device compressed cache (offline-capable continuity).
      const cached = await readLibraryCache();
      if (
        !cancelled &&
        cached &&
        isNewerOrEqual(cached.index, initialIndex)
      ) {
        setIndex(cached.index);
      }

      const baseline =
        cached && isNewerOrEqual(cached.index, initialIndex)
          ? cached.index
          : initialIndex;

      // Persist bundled/baseline if nothing on device yet and it fits.
      if (!cached) {
        void writeLibraryCache(baseline);
      }

      if (!corpusUrl) return;

      // 2) OTA published corpus (browser may already gunzip Content-Encoding).
      try {
        const response = await fetch(corpusUrl, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (!isPublishedGuideIndex(value)) return;
        if (!isNewerOrEqual(value, baseline)) return;
        if (cancelled) return;

        setIndex(value);
        // Compress-to-retain under 50 MB — never skim the adopted index.
        void writeLibraryCache(value);
      } catch {
        // Bundled / device cache remain available offline.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialIndex]);

  return index;
}
