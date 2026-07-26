/**
 * Premium professor artefact modes + cost routing (gpt-5 vs gpt-5-mini).
 */

export type ProfessorArtefactMode =
  | "judgement"
  | "board"
  | "stress"
  | "harder"
  | "implication"
  | "demo";

/** Light lane → gpt-5-mini; coach lane → gpt-5. */
export type TutorCostLane = "light" | "coach";

export function detectProfessorMode(question: string): ProfessorArtefactMode {
  const q = question.toLowerCase();
  if (/implication drill|what breaks if ignored|real-world trigger/.test(q)) {
    return "implication";
  }
  if (/harder worked example|messier figures|harder example/.test(q)) {
    return "harder";
  }
  if (/stress-test|trap a weak answer|hard practitioner check/.test(q)) {
    return "stress";
  }
  if (
    /board-pack|board pack|pack-ready spreadsheet|owner, evidence, decision/.test(
      q,
    )
  ) {
    return "board";
  }
  if (/judgement call|competing options|what you would recommend/.test(q)) {
    return "judgement";
  }
  return "demo";
}

/** Multi-tab Working / Checks / Watch-fors — only these Premium modes. */
export function wantsMultiTabWorkbook(mode: ProfessorArtefactMode): boolean {
  switch (mode) {
    case "judgement":
    case "board":
    case "stress":
    case "harder":
    case "implication":
      return true;
    case "demo":
      return false;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** Harder + Implication always surface Save/Share as the primary artefact. */
export function alwaysAttachWorkbook(mode: ProfessorArtefactMode): boolean {
  return mode === "harder" || mode === "implication";
}

export function wantsBoardMemo(mode: ProfessorArtefactMode): boolean {
  return mode === "board";
}

/**
 * Plain Ask, quiz / Exam drill, and short go-deeper → light (gpt-5-mini).
 * Spreadsheet demo / board / stress / judgement / harder / implication / path sheets → coach (gpt-5).
 */
export function detectTutorCostLane(question: string): TutorCostLane {
  const q = question.toLowerCase();

  // Explicit light modes first (prompts may mention multi-tab only to forbid it).
  if (
    /exam drill|los-style|quiz me|go one level deeper|explain .+ in plain language|in plain language for a practitioner/.test(
      q,
    )
  ) {
    return "light";
  }

  const mode = detectProfessorMode(question);
  if (wantsMultiTabWorkbook(mode)) return "coach";

  if (
    /spreadsheet demo|live spreadsheet|step-through on a (?:live )?sheet|senior live spreadsheet|walk me through a working example step by step on a spreadsheet|multi-tab|\.xlsx|checksrows|watchforrows|paths journey|path journey|live path|senior live tutoring|live demonstration of “/.test(
      q,
    )
  ) {
    return "coach";
  }

  // Default free-form Ask
  return "light";
}

export function tutorMaxTokens(
  lane: TutorCostLane,
  mode: ProfessorArtefactMode,
): number {
  if (lane === "light") return 1_200;
  if (wantsMultiTabWorkbook(mode)) return 2_200;
  // Spreadsheet demo / path demo — Working sheet only
  return 1_800;
}

/** Heavy coach = multi-tab artefact modes (counts toward the daily heavy bucket). */
export function isHeavyCoachAsk(question: string): boolean {
  return wantsMultiTabWorkbook(detectProfessorMode(question));
}
