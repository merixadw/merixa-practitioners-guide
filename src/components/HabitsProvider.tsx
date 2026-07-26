"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  getHabitInsights,
  markSessionStart,
  readHabits,
  recordHabit,
  type HabitEventKind,
  type HabitInsights,
  type UsageHabits,
} from "@/lib/guide/habits";

type HabitsValue = {
  habits: UsageHabits;
  insights: HabitInsights;
  ready: boolean;
  track: (kind: HabitEventKind, detail?: string) => void;
};

const HabitsContext = createContext<HabitsValue | null>(null);

export function HabitsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [habits, setHabits] = useState<UsageHabits>(() => readHabits());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      markSessionStart();
      setHabits(readHabits());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;
    const timeout = window.setTimeout(() => {
      setHabits(recordHabit("route", pathname));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname, ready]);

  const track = useCallback((kind: HabitEventKind, detail?: string) => {
    setHabits(recordHabit(kind, detail));
  }, []);

  const insights = useMemo(() => getHabitInsights(habits), [habits]);

  const value = useMemo(
    () => ({ habits, insights, ready, track }),
    [habits, insights, ready, track],
  );

  return (
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
}

export function useHabits(): HabitsValue {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error("useHabits must be used inside HabitsProvider");
  }
  return context;
}
