"use client";

/**
 * Shared progressive corpus hydrate — catalog first, retrieve + IDB in background.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isCatalogIndex } from "./catalog-utils";
import {
  readLibraryCache,
  writeLibraryCache,
} from "./library-cache";
import {
  CATALOG_URL,
  RETRIEVE_INDEX_URL,
} from "./seamless-paths";
import type { CatalogIndex, GuideIndex } from "./types";

export type CorpusHydrationState = {
  catalog: CatalogIndex | null;
  catalogReady: boolean;
  catalogError: string | null;
  retrieve: GuideIndex | null;
  retrieveReady: boolean;
  offlineReady: boolean;
  statusLine: string;
};

const EMPTY: CorpusHydrationState = {
  catalog: null,
  catalogReady: false,
  catalogError: null,
  retrieve: null,
  retrieveReady: false,
  offlineReady: false,
  statusLine: "Preparing library…",
};

const SeamlessCorpusContext = createContext<CorpusHydrationState>(EMPTY);

function isGuideIndex(value: unknown): value is GuideIndex {
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

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${url} → ${response.status}`);
  }
  return response.json();
}

function statusFromState(state: {
  catalog: CatalogIndex | null;
  catalogReady: boolean;
  catalogError: string | null;
  retrieveReady: boolean;
  offlineReady: boolean;
}): string {
  if (state.catalogError && !state.catalog) {
    return "Library catalog unavailable — run library:seamless";
  }
  if (state.catalogReady && !state.retrieveReady) {
    return "Library ready · loading Tutor index…";
  }
  if (state.retrieveReady && state.offlineReady) {
    return "Library ready offline";
  }
  if (state.retrieveReady) {
    return "Tutor index ready";
  }
  if (state.catalogReady) {
    return "Library catalog ready";
  }
  return "Preparing library…";
}

export function SeamlessCorpusProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogIndex | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [retrieve, setRetrieve] = useState<GuideIndex | null>(null);
  const [retrieveReady, setRetrieveReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void (async () => {
      try {
        const value = await fetchJson(CATALOG_URL, controller.signal);
        if (cancelled) return;
        if (!isCatalogIndex(value)) {
          setCatalogError("Catalog format invalid");
          setCatalogReady(true);
          return;
        }
        setCatalog(value);
        setCatalogReady(true);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setCatalogError(
          error instanceof Error ? error.message : "Catalog unavailable",
        );
        setCatalogReady(true);
      }

      const cached = await readLibraryCache();
      if (!cancelled && cached) {
        setRetrieve(cached.index);
        setRetrieveReady(true);
        setOfflineReady(true);
      }

      const corpusUrl =
        process.env.NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL?.trim();

      try {
        const value = await fetchJson(RETRIEVE_INDEX_URL, controller.signal);
        if (cancelled) return;
        if (!isGuideIndex(value)) return;

        const baseline = cached?.index;
        if (!baseline || isNewerOrEqual(value, baseline)) {
          setRetrieve(value);
          setRetrieveReady(true);
          const written = await writeLibraryCache(value);
          if (!cancelled) {
            setOfflineReady(written.persisted || Boolean(cached));
          }
        }
      } catch {
        // Run `npm run library:seamless` in local dev if public/corpus is missing.
      }

      if (!corpusUrl || cancelled) return;

      try {
        const value = await fetchJson(corpusUrl, controller.signal);
        if (cancelled || !isGuideIndex(value)) return;
        const local = cached?.index;
        if (local && !isNewerOrEqual(value, local)) return;
        setRetrieve(value);
        setRetrieveReady(true);
        const written = await writeLibraryCache(value);
        if (!cancelled) setOfflineReady(written.persisted || true);
      } catch {
        // Keep catalog + device cache offline
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const value = useMemo<CorpusHydrationState>(() => {
    const partial = {
      catalog,
      catalogReady,
      catalogError,
      retrieveReady,
      offlineReady,
    };
    return {
      catalog,
      catalogReady,
      catalogError,
      retrieve,
      retrieveReady,
      offlineReady,
      statusLine: statusFromState(partial),
    };
  }, [
    catalog,
    catalogReady,
    catalogError,
    retrieve,
    retrieveReady,
    offlineReady,
  ]);

  return (
    <SeamlessCorpusContext.Provider value={value}>
      {children}
    </SeamlessCorpusContext.Provider>
  );
}

export function useSeamlessCorpus(): CorpusHydrationState {
  return useContext(SeamlessCorpusContext);
}

export function useRetrieveGuideIndex(): {
  index: GuideIndex | null;
  ready: boolean;
  offlineReady: boolean;
  statusLine: string;
} {
  const state = useSeamlessCorpus();
  return {
    index: state.retrieve,
    ready: state.retrieveReady,
    offlineReady: state.offlineReady,
    statusLine: state.statusLine,
  };
}

export function useCatalogIndex(): {
  catalog: CatalogIndex | null;
  ready: boolean;
  error: string | null;
  statusLine: string;
  offlineReady: boolean;
} {
  const state = useSeamlessCorpus();
  return {
    catalog: state.catalog,
    ready: state.catalogReady,
    error: state.catalogError,
    statusLine: state.statusLine,
    offlineReady: state.offlineReady,
  };
}
