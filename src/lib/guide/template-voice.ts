/**
 * Detect title-stamped / “covers X in domain” filler that must not ship as teaching.
 */
export const TEMPLATE_COVERS_RE =
  /\bcovers\b[\s\S]{0,120}\bin\b[\s\S]{0,80}:\s*what it means,\s*how it is measured/i;

export const HEURISTIC_PAD_RE =
  /\bis a practitioner concept in\b|\bIt is used to produce decision-useful evidence\b|\bA senior treats\b/i;

/** True when text looks like offline shelf / template filler, not a workplace demo. */
export function isTemplateVoice(text: string): boolean {
  const t = String(text || "");
  if (!t.trim()) return false;
  if (TEMPLATE_COVERS_RE.test(t)) return true;
  if (HEURISTIC_PAD_RE.test(t) && t.length < 420) return true;
  return false;
}

/** At-work examples should carry at least one figure or money cue. */
export function hasWorkplaceNumbers(text: string): boolean {
  return /(?:£|€|\$|\b\d)/.test(String(text || ""));
}
