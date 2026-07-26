import type { TutorLaunchMode } from "./recommend";

export type CoachActionId =
  | "live_demo"
  | "go_deeper"
  | "workplace"
  | "challenge"
  | "judgement"
  | "harder_example"
  | "implication_drill"
  | "exam_drill"
  | "quiz"
  | "continue_path"
  | "compose_path"
  | "plain";

export type CoachAction = {
  id: CoachActionId;
  label: string;
  /** Shown under chips / secondary CTAs */
  hint?: string;
  /**
   * Requires AI Premium (live assisted training).
   * Offline Library cards stay readable; these chips lock to upsell.
   */
  premiumOnly?: boolean;
};

/**
 * Accruals-ratio learning-cycle strip — same labels Offline and Premium.
 * Offline: information is on the Library card; every training action locks to Premium.
 * Premium: live AI coach on every chip.
 */
const LEARNING_CYCLE_ACTIONS: CoachAction[] = [
  {
    id: "live_demo",
    label: "See it",
    hint: "Live assisted lesson with spreadsheet demo",
    premiumOnly: true,
  },
  {
    id: "judgement",
    label: "Judgement call",
    hint: "Trade-offs a senior would weigh",
    premiumOnly: true,
  },
  {
    id: "harder_example",
    label: "Harder example",
    hint: "Messier figures, same concept",
    premiumOnly: true,
  },
  {
    id: "implication_drill",
    label: "Implication drill",
    hint: "What breaks if you ignore this",
    premiumOnly: true,
  },
  {
    id: "workplace",
    label: "Board pack view",
    hint: "How this lands in a pack or memo",
    premiumOnly: true,
  },
  {
    id: "challenge",
    label: "Stress-test me",
    hint: "Harder check with the trap",
    premiumOnly: true,
  },
  {
    id: "exam_drill",
    label: "Exam drill",
    hint: "LOS-style check — stem, trap, model answer",
    premiumOnly: true,
  },
  {
    id: "go_deeper",
    label: "Go deeper",
    hint: "Richer demonstration",
    premiumOnly: true,
  },
  {
    id: "continue_path",
    label: "Next path step",
    hint: "Stay on the journey with live coaching",
    premiumOnly: true,
  },
  {
    id: "compose_path",
    label: "Build a path",
    hint: "Connect concepts into a custom journey",
    premiumOnly: true,
  },
];

export function coachActionsForMode(mode: TutorLaunchMode): CoachAction[] {
  switch (mode) {
    case "premium":
      return LEARNING_CYCLE_ACTIONS.map((action) =>
        action.id === "live_demo"
          ? {
              ...action,
              label: "Spreadsheet demo",
              hint: "Step-through on a live sheet",
              premiumOnly: false,
            }
          : { ...action, premiumOnly: false },
      );
    case "offline":
      return LEARNING_CYCLE_ACTIONS;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

/** In-chat chips after an answer (no path-only / duplicate See-it). */
export function tutorSessionActions(
  mode: TutorLaunchMode,
  focus: "workplace" | "exam" = "workplace",
): CoachAction[] {
  const actions = coachActionsForMode(mode).filter(
    (action) =>
      action.id !== "continue_path" &&
      action.id !== "live_demo" &&
      action.id !== "compose_path",
  );
  if (focus !== "exam") return actions;
  const exam = actions.filter((action) => action.id === "exam_drill");
  const rest = actions.filter((action) => action.id !== "exam_drill");
  return [...exam, ...rest];
}

/** Multi-tab coach modes that count toward the daily heavy pace bucket. */
export function isHeavyCoachAction(action: CoachActionId): boolean {
  switch (action) {
    case "judgement":
    case "harder_example":
    case "implication_drill":
    case "workplace":
    case "challenge":
      return true;
    case "live_demo":
    case "go_deeper":
    case "continue_path":
    case "compose_path":
    case "exam_drill":
    case "quiz":
    case "plain":
      return false;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function buildCoachPrompt(
  action: CoachActionId,
  input: {
    title: string;
    cardId?: string;
    pathId?: string;
    pathTitle?: string;
    stepId?: string;
    mode: TutorLaunchMode;
  },
): string {
  const cardHint = input.cardId
    ? ` Ground every claim in Guide card ${input.cardId}.`
    : "";
  const pathHint = input.pathId
    ? ` This sits in path ${input.pathId}${
        input.pathTitle ? ` (“${input.pathTitle}”)` : ""
      }${input.stepId ? ` at step ${input.stepId}` : ""}.`
    : "";
  /** Keep the learner inside Definition → At work → Watch for → Check → next. */
  const cycleHint =
    " End by naming the next concept or path step they should open, so they stay in the learning cycle.";
  const premium = input.mode === "premium";
  const live = input.mode === "premium";

  switch (action) {
    case "workplace":
      return premium
        ? `Show “${input.title}” as a board-pack mini-artefact I can paste: owner, evidence, decision, reverse-trigger, and figures on a Working sheet. REQUIRED: kind spreadsheet plus checksRows and watchForRows, and boardMemo (3–5 sentences). Multi-tab = Working / Checks / Watch-fors / Memo. Demonstrate — do not redefine the concept.${cardHint}${pathHint}${cycleHint}`
        : `Show “${input.title}” as a worked workplace example from the Guide card — owner, evidence, decision.${cardHint}${pathHint}${cycleHint}`;
    case "challenge":
      return premium
        ? `Stress-test me on “${input.title}”: one hard practitioner check, then the trap a weak answer falls into. REQUIRED spreadsheet with checksRows and watchForRows for a multi-tab .xlsx (Working / Checks / Watch-fors). Cite Guide card ${input.cardId || "id"}; demonstrate — do not redefine.${cardHint}${pathHint}${cycleHint}`
        : `Challenge me on “${input.title}” with one quick check from the Guide card, then the trap to avoid.${cardHint}${pathHint}${cycleHint}`;
    case "live_demo":
      if (!live) {
        return `Teach me “${input.title}” as a full practitioner lesson using the Accruals-ratio card pattern: Definition, At work, Watch for, Quick check, then point to Before this / Leads to and the path to continue.${cardHint}${pathHint}${cycleHint}`;
      }
      return `Give a senior live spreadsheet demonstration of “${input.title}”. Walk me through a working example step by step on a spreadsheet (cells, figures, formula) — do not replay the Library paced storyline or regurgitate template definitions.${cardHint}${pathHint}${cycleHint}`;
    case "go_deeper":
      return premium
        ? `Go one level deeper on “${input.title}”: what a senior would still worry about after the first answer. Demonstrate — do not redefine.${cardHint}${pathHint}${cycleHint}`
        : `Go one level deeper on “${input.title}” using only the Guide card: one extra nuance, one workplace implication, then a sharper check.${cardHint}${pathHint}${cycleHint}`;
    case "judgement":
      return `Make the judgement call on “${input.title}”: competing options, what you would recommend, and what you would watch next period. REQUIRED: spreadsheet visual with checksRows and watchForRows so I can Save a multi-tab workbook (Working / Checks / Watch-fors). Senior depth, still a direct answer.${cardHint}${pathHint}${cycleHint}`;
    case "harder_example":
      return `Give a harder worked example of “${input.title}”: messier figures, one ambiguity, and the clean way a senior would still resolve it on a spreadsheet. REQUIRED: attach a spreadsheet visual with checksRows and watchForRows — I will Save/Share the multi-tab .xlsx without leaving Tutor.${cardHint}${pathHint}${cycleHint}`;
    case "implication_drill":
      return `Implication drill on “${input.title}”: what breaks if ignored this period, the real-world trigger that it is in play, and what I should watch next. REQUIRED spreadsheet with checksRows and watchForRows for Save/Share multi-tab workbook — stay direct.${cardHint}${pathHint}${cycleHint}`;
    case "exam_drill":
      return live
        ? `Exam drill on “${input.title}”: one LOS-style check (clear stem, what a weak answer chooses, then the model answer and why). Use the Guide card’s checkQuestion when present. Direct answer with a compact visual — not a board pack and not a spreadsheet demo. Do not rename this as workplace coaching.${cardHint}${pathHint}${cycleHint}`
        : `Exam drill on “${input.title}” from the Guide card: one LOS-style check, then the trap to avoid.${cardHint}${cycleHint}`;
    case "quiz":
      // Legacy Saved/quiz deep-links — same light Exam drill behaviour.
      return buildCoachPrompt("exam_drill", input);
    case "continue_path":
      return premium
        ? `I am continuing the Paths journey${
            input.pathTitle ? ` “${input.pathTitle}”` : ""
          }. Give a senior spreadsheet walkthrough of the next step from “${input.title}”. Close by naming the following concept so I stay on the path.${cardHint}${pathHint}`
        : `Continue my Paths journey from “${input.title}” as a paced offline lesson on the next step, then name what comes after.${cardHint}${pathHint}`;
    case "compose_path":
      return `Build me a custom practitioner learning path connecting “${input.title}” with the most relevant related Guide concepts. Order the steps the way a senior tutor would teach the link — foundations, bridge, then judgement. Use only Guide cards; cache this as an ordinary path I can reopen in Paths.${cardHint}${pathHint}`;
    case "plain":
      return `Explain “${input.title}” in plain language for a practitioner, then give one At-work cue and one Watch-for trap.${cardHint}${pathHint}${cycleHint}`;
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function coachActionHref(
  action: CoachActionId,
  input: {
    title: string;
    cardId?: string;
    pathId?: string;
    pathTitle?: string;
    stepId?: string;
    mode: TutorLaunchMode;
  },
): string {
  const params = new URLSearchParams();
  params.set("q", buildCoachPrompt(action, input));
  if (input.pathId) params.set("path", input.pathId);
  if (input.cardId) params.set("card", input.cardId);
  if (input.stepId) params.set("step", input.stepId);
  if (action === "compose_path") params.set("compose", "1");
  return `/?${params.toString()}`;
}

/** Default follow-up chip texts for an active Tutor session. */
export function sessionCoachPrompts(
  mode: TutorLaunchMode,
  context?: {
    title?: string;
    cardId?: string;
    focus?: "workplace" | "exam";
  },
): string[] {
  const title = context?.title ?? "what we just covered";
  const base = {
    title,
    cardId: context?.cardId,
    mode,
  };
  return tutorSessionActions(mode, context?.focus ?? "workplace")
    .filter((action) => mode === "premium" || !action.premiumOnly)
    .map((action) => buildCoachPrompt(action.id, base));
}
