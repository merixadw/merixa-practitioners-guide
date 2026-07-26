"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  acknowledgeCorpusUpdate,
  formatCorpusUpdatedAt,
  summarizeCorpusUpdate,
  syncCorpusBaseline,
  type CorpusUpdateSummary,
} from "@/lib/guide/corpus-updates";
import type { GuideIndex } from "@/lib/guide/types";
import {
  readJourneyProgress,
  writeJourneyProgress,
  type JourneyProgress,
} from "@/lib/guide/journey-progress";

const SAVED_KEY = "mpg-saved-v1";
const RECENT_KEY = "mpg-recent-v1";
const MAX_RECENT = 12;

type GuideStateValue = {
  saved: string[];
  recent: string[];
  ready: boolean;
  toggleSaved: (cardId: string) => void;
  markRecent: (cardId: string) => void;
  journey: JourneyProgress | null;
  markJourney: (progress: Omit<JourneyProgress, "updatedAt">) => void;
  corpus: CorpusUpdateSummary | null;
  corpusLabel: string | null;
  refreshCorpus: (index: GuideIndex) => void;
  acknowledgeWhatsNew: (index: GuideIndex) => void;
};

const GuideStateContext = createContext<GuideStateValue | null>(null);

function readIds(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (
      Array.isArray(parsed) &&
      parsed.every((value) => typeof value === "string")
    ) {
      return [...new Set(parsed)];
    }
  } catch {
    // Corrupt storage should not block the guide.
  }
  return [];
}

function writeIds(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Private browsing or full storage should not block reading.
  }
}

export function GuideStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [saved, setSaved] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [journey, setJourney] = useState<JourneyProgress | null>(null);
  const [corpus, setCorpus] = useState<CorpusUpdateSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSaved(readIds(SAVED_KEY));
      setRecent(readIds(RECENT_KEY));
      setJourney(readJourneyProgress());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const toggleSaved = useCallback((cardId: string) => {
    setSaved((current) => {
      const next = current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [cardId, ...current];
      writeIds(SAVED_KEY, next);
      return next;
    });
  }, []);

  const markRecent = useCallback((cardId: string) => {
    setRecent((current) => {
      const next = [cardId, ...current.filter((id) => id !== cardId)].slice(
        0,
        MAX_RECENT,
      );
      writeIds(RECENT_KEY, next);
      return next;
    });
  }, []);

  const markJourney = useCallback(
    (progress: Omit<JourneyProgress, "updatedAt">) => {
      const next = writeJourneyProgress(progress);
      setJourney(next);
    },
    [],
  );

  const refreshCorpus = useCallback((index: GuideIndex) => {
    syncCorpusBaseline(index);
    setCorpus(summarizeCorpusUpdate(index));
  }, []);

  const acknowledgeWhatsNew = useCallback((index: GuideIndex) => {
    acknowledgeCorpusUpdate(index);
    setCorpus(summarizeCorpusUpdate(index));
  }, []);

  const corpusLabel = corpus
    ? `Updated ${formatCorpusUpdatedAt(corpus.generatedAt)} · ${corpus.cardCount} concepts`
    : null;

  const value = useMemo(
    () => ({
      saved,
      recent,
      ready,
      toggleSaved,
      markRecent,
      journey,
      markJourney,
      corpus,
      corpusLabel,
      refreshCorpus,
      acknowledgeWhatsNew,
    }),
    [
      saved,
      recent,
      ready,
      toggleSaved,
      markRecent,
      journey,
      markJourney,
      corpus,
      corpusLabel,
      refreshCorpus,
      acknowledgeWhatsNew,
    ],
  );

  return (
    <GuideStateContext.Provider value={value}>
      {children}
    </GuideStateContext.Provider>
  );
}

export function useGuideState(): GuideStateValue {
  const context = useContext(GuideStateContext);
  if (!context) {
    throw new Error("useGuideState must be used inside GuideStateProvider");
  }
  return context;
}
