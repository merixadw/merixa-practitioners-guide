/**
 * Tutor focus preference — Workplace coaching vs Exam drill.
 * Managed on the Saved tab; Tutor reads it for chip order and welcome copy.
 */
const FOCUS_KEY = "mpg-tutor-focus-v1";

export type TutorFocus = "workplace" | "exam";

export function readTutorFocus(): TutorFocus {
  if (typeof window === "undefined") return "workplace";
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    if (raw === "exam" || raw === "workplace") return raw;
  } catch {
    // ignore
  }
  return "workplace";
}

export function writeTutorFocus(focus: TutorFocus): TutorFocus {
  try {
    localStorage.setItem(FOCUS_KEY, focus);
  } catch {
    // ignore
  }
  return focus;
}
