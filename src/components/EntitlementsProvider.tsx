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
  aiTierOf,
  canUseOnlineCoach,
  createIapAdapter,
  isGuideUnlocked,
  isNativeIos,
  lockedSnapshot,
  PREMIUM_FAIR_USE_DAILY,
  PREMIUM_FAIR_USE_WARN_RATIO,
  PREMIUM_HEAVY_FAIR_USE_DAILY,
  readEntitlements,
  refreshFromStoreKit,
  unlockedOfflineSnapshot,
  writeEntitlements,
  type AiTier,
  type EntitlementSnapshot,
  type PurchaseKind,
} from "@/lib/entitlements";
import { isHeavyCoachAsk } from "@/lib/guide/professor-mode";

const FAIR_USE_KEY = "mpg-ai-fair-use-v2";

type FairUseDay = {
  day: string;
  /** All live Premium API asks today (light + coach). */
  count: number;
  /** Multi-tab / judgement / board / stress / harder / implication today. */
  heavyCount: number;
};

export type FairUseGate = {
  allowed: boolean;
  reason?: "daily" | "heavy";
  message?: string;
  remaining: number;
  heavyRemaining: number;
};

type EntitlementsValue = {
  snapshot: EntitlementSnapshot;
  ready: boolean;
  unlocked: boolean;
  aiTier: AiTier;
  onlineCoach: boolean;
  nativeBilling: boolean;
  /** Asks used today (resets at local midnight UTC date key). */
  fairUseAskCount: number;
  fairUseHeavyCount: number;
  fairUseDailyCap: number;
  fairUseHeavyCap: number;
  /** True when nearing either daily bucket. */
  fairUseNearLimit: boolean;
  /** True when today's total live-ask bucket is exhausted. */
  fairUseExhausted: boolean;
  /** True when today's heavy coach bucket is exhausted (light Ask may still work). */
  fairUseHeavyExhausted: boolean;
  /** Check whether this question may call the live Premium API. */
  canUseLiveAsk: (question: string) => FairUseGate;
  purchase: (kind: PurchaseKind) => Promise<void>;
  restore: () => Promise<void>;
  cancelAi: () => Promise<void>;
  /** Record a successful live API ask; pass the question to count heavy. */
  recordOnlineAsk: (question?: string) => void;
};

const EntitlementsContext = createContext<EntitlementsValue | null>(null);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDay(): FairUseDay {
  return { day: todayKey(), count: 0, heavyCount: 0 };
}

function isFairUseDay(value: unknown): value is FairUseDay {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.day === "string" &&
    typeof row.count === "number" &&
    (typeof row.heavyCount === "number" || row.heavyCount === undefined)
  );
}

function readFairUse(): FairUseDay {
  if (typeof window === "undefined") return emptyDay();
  try {
    const raw = localStorage.getItem(FAIR_USE_KEY);
    if (!raw) {
      // Migrate legacy v1 counter if present.
      const legacy = localStorage.getItem("mpg-ai-fair-use-v1");
      if (legacy) {
        const parsed: unknown = JSON.parse(legacy);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "day" in parsed &&
          "count" in parsed &&
          typeof (parsed as { day: unknown }).day === "string" &&
          typeof (parsed as { count: unknown }).count === "number"
        ) {
          const day = (parsed as { day: string; count: number }).day;
          const count = (parsed as { day: string; count: number }).count;
          if (day === todayKey()) {
            return { day, count, heavyCount: 0 };
          }
        }
      }
      return emptyDay();
    }
    const parsed: unknown = JSON.parse(raw);
    if (isFairUseDay(parsed)) {
      if (parsed.day !== todayKey()) return emptyDay();
      return {
        day: parsed.day,
        count: parsed.count,
        heavyCount: Number(parsed.heavyCount) || 0,
      };
    }
  } catch {
    // Ignore.
  }
  return emptyDay();
}

function writeFairUse(value: FairUseDay): void {
  try {
    localStorage.setItem(FAIR_USE_KEY, JSON.stringify(value));
  } catch {
    // Ignore.
  }
}

function gateFor(question: string, state: FairUseDay): FairUseGate {
  const remaining = Math.max(0, PREMIUM_FAIR_USE_DAILY - state.count);
  const heavyRemaining = Math.max(
    0,
    PREMIUM_HEAVY_FAIR_USE_DAILY - state.heavyCount,
  );
  if (state.count >= PREMIUM_FAIR_USE_DAILY) {
    return {
      allowed: false,
      reason: "daily",
      message:
        "Today’s live coaching pace is resting until tomorrow. Library stays open — pace resets with the calendar day.",
      remaining: 0,
      heavyRemaining,
    };
  }
  if (isHeavyCoachAsk(question) && state.heavyCount >= PREMIUM_HEAVY_FAIR_USE_DAILY) {
    return {
      allowed: false,
      reason: "heavy",
      message:
        "Today’s heavy coach pace (board pack, judgement, stress-test) is resting until tomorrow. Try a lighter Ask, or continue tomorrow.",
      remaining,
      heavyRemaining: 0,
    };
  }
  return { allowed: true, remaining, heavyRemaining };
}

const lockedBuild = process.env.NEXT_PUBLIC_GUIDE_PREVIEW_LOCKED === "true";

export function EntitlementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(lockedSnapshot);
  const [ready, setReady] = useState(false);
  const [nativeBilling, setNativeBilling] = useState(false);
  const [fairUse, setFairUse] = useState<FairUseDay>(emptyDay);
  const iap = useMemo(() => createIapAdapter(), []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const native = isNativeIos();
      if (!cancelled) setNativeBilling(native);
      if (!cancelled) setFairUse(readFairUse());

      if (native) {
        try {
          const synced = await refreshFromStoreKit();
          if (!cancelled) setSnapshot(synced);
        } catch {
          if (!cancelled) setSnapshot(readEntitlements());
        }
        if (!cancelled) setReady(true);
        return;
      }

      if (lockedBuild) {
        if (!cancelled) {
          setSnapshot(readEntitlements());
          setReady(true);
        }
        return;
      }

      const stored = readEntitlements();
      if (stored.guide.status === "unlocked") {
        if (!cancelled) setSnapshot(stored);
      } else {
        const open = unlockedOfflineSnapshot("preview");
        writeEntitlements(open);
        if (!cancelled) setSnapshot(open);
      }
      if (!cancelled) setReady(true);
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const purchase = useCallback(
    async (kind: PurchaseKind) => {
      const next = await iap.purchase(kind);
      setSnapshot(next);
    },
    [iap],
  );

  const restore = useCallback(async () => {
    const next = await iap.restore();
    setSnapshot(next);
  }, [iap]);

  const cancelAi = useCallback(async () => {
    const next = await iap.cancelAi();
    setSnapshot(next);
  }, [iap]);

  const canUseLiveAsk = useCallback((question: string): FairUseGate => {
    return gateFor(question, readFairUse());
  }, []);

  const recordOnlineAsk = useCallback((question?: string) => {
    const current = readFairUse();
    const base =
      current.day === todayKey() ? current : emptyDay();
    const heavy = question ? isHeavyCoachAsk(question) : false;
    const next: FairUseDay = {
      day: todayKey(),
      count: base.count + 1,
      heavyCount: base.heavyCount + (heavy ? 1 : 0),
    };
    writeFairUse(next);
    setFairUse(next);
  }, []);

  const value = useMemo<EntitlementsValue>(() => {
    const unlocked = isGuideUnlocked(snapshot);
    const aiTier = aiTierOf(snapshot);
    const nearTotal =
      fairUse.count >= PREMIUM_FAIR_USE_DAILY * PREMIUM_FAIR_USE_WARN_RATIO;
    const nearHeavy =
      fairUse.heavyCount >=
      PREMIUM_HEAVY_FAIR_USE_DAILY * PREMIUM_FAIR_USE_WARN_RATIO;
    const exhausted = fairUse.count >= PREMIUM_FAIR_USE_DAILY;
    const heavyExhausted =
      fairUse.heavyCount >= PREMIUM_HEAVY_FAIR_USE_DAILY;
    return {
      snapshot,
      ready,
      unlocked,
      aiTier,
      onlineCoach: canUseOnlineCoach(snapshot),
      nativeBilling,
      fairUseAskCount: fairUse.count,
      fairUseHeavyCount: fairUse.heavyCount,
      fairUseDailyCap: PREMIUM_FAIR_USE_DAILY,
      fairUseHeavyCap: PREMIUM_HEAVY_FAIR_USE_DAILY,
      fairUseNearLimit: aiTier === "premium" && (nearTotal || nearHeavy),
      fairUseExhausted: aiTier === "premium" && exhausted,
      fairUseHeavyExhausted: aiTier === "premium" && heavyExhausted,
      canUseLiveAsk,
      purchase,
      restore,
      cancelAi,
      recordOnlineAsk,
    };
  }, [
    cancelAi,
    canUseLiveAsk,
    fairUse.count,
    fairUse.heavyCount,
    nativeBilling,
    purchase,
    ready,
    recordOnlineAsk,
    restore,
    snapshot,
  ]);

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsValue {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used inside EntitlementsProvider");
  }
  return context;
}
