"use client";

import { useEffect, useState } from "react";
import {
  readCheckStreak,
  recordCheckResult,
  type CheckStreak,
} from "@/lib/guide/check-streak";

/**
 * Interactive Quick check — records a proof-of-learning streak (not login).
 */
export function QuickCheckPrompt({
  cardId,
  question,
}: {
  cardId: string;
  question: string;
}) {
  const [streak, setStreak] = useState<CheckStreak>({ current: 0, best: 0 });
  const [answered, setAnswered] = useState<"got_it" | "missed" | null>(null);

  useEffect(() => {
    setStreak(readCheckStreak());
    setAnswered(null);
  }, [cardId]);

  function answer(result: "got_it" | "missed") {
    const next = recordCheckResult(cardId, result);
    setStreak(next);
    setAnswered(result);
  }

  return (
    <section className="teach-block quick-check-block" aria-label="Quick check">
      <p className="section-label">Quick check</p>
      <p className="concept-body-rich">{question}</p>
      {answered ? (
        <p className="quick-check-result" role="status">
          {answered === "got_it"
            ? `Nice — check streak ${streak.current}${
                streak.best > streak.current ? ` (best ${streak.best})` : ""
              }.`
            : "No worry — reopen the definition, then try again later."}
        </p>
      ) : (
        <div className="quick-check-actions">
          <button
            type="button"
            className="quick-check-got"
            onClick={() => answer("got_it")}
          >
            I got it
          </button>
          <button
            type="button"
            className="quick-check-miss"
            onClick={() => answer("missed")}
          >
            Not yet
          </button>
        </div>
      )}
      {!answered && streak.current > 0 ? (
        <p className="quick-check-streak-hint">
          Check streak: {streak.current}
          {streak.best > streak.current ? ` · best ${streak.best}` : ""}
        </p>
      ) : null}
    </section>
  );
}
