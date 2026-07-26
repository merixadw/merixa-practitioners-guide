"use client";

import { useCallback, useRef, useState } from "react";
import { FLIP_ENTER_MS } from "@/lib/ui/motion";

/** Marks message/card ids for a one-shot flip-up enter animation. */
export function useFlipEnter() {
  const [flipIds, setFlipIds] = useState<ReadonlySet<string>>(() => new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  const registerFlip = useCallback((id: string) => {
    setFlipIds((current) => new Set(current).add(id));
    const existing = timersRef.current.get(id);
    if (existing !== undefined) window.clearTimeout(existing);
    const timer = window.setTimeout(() => {
      setFlipIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      timersRef.current.delete(id);
    }, FLIP_ENTER_MS);
    timersRef.current.set(id, timer);
  }, []);

  const isFlipping = useCallback((id: string) => flipIds.has(id), [flipIds]);

  return { registerFlip, isFlipping };
}
