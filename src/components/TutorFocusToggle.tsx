"use client";

import { useEffect, useState } from "react";
import {
  readTutorFocus,
  writeTutorFocus,
  type TutorFocus,
} from "@/lib/guide/tutor-focus";

/** Workplace vs Exam drill preference — lives on Saved, read by Tutor. */
export function TutorFocusToggle({
  className,
}: {
  className?: string;
}) {
  const [focus, setFocus] = useState<TutorFocus>("workplace");

  useEffect(() => {
    setFocus(readTutorFocus());
  }, []);

  function choose(next: TutorFocus) {
    setFocus(writeTutorFocus(next));
  }

  return (
    <div className={className ?? "tutor-focus-panel"}>
      <p className="tutor-focus-label">Tutor focus</p>
      <div
        className="tutor-focus-toggle"
        role="group"
        aria-label="Tutor focus"
      >
        <button
          type="button"
          className={
            focus === "workplace" ? "tutor-focus-btn active" : "tutor-focus-btn"
          }
          onClick={() => choose("workplace")}
        >
          Workplace
        </button>
        <button
          type="button"
          className={
            focus === "exam" ? "tutor-focus-btn active" : "tutor-focus-btn"
          }
          onClick={() => choose("exam")}
        >
          Exam drill
        </button>
      </div>
      <p className="tutor-focus-hint">
        {focus === "exam"
          ? "Tutor opens in Exam drill mode for LOS-style checks."
          : "Tutor opens in Workplace coaching mode."}
      </p>
    </div>
  );
}
