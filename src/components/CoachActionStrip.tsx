"use client";

import Link from "next/link";
import {
  coachActionHref,
  coachActionsForMode,
  isHeavyCoachAction,
  type CoachActionId,
} from "@/lib/guide/coach-actions";
import type { TutorLaunchMode } from "@/lib/guide/recommend";
import type { TutorFocus } from "@/lib/guide/tutor-focus";

type CoachActionStripProps = {
  mode: TutorLaunchMode;
  title: string;
  cardId?: string;
  pathId?: string;
  pathTitle?: string;
  stepId?: string;
  /** When set, actions run in-Tutor via callback instead of navigation. */
  onAction?: (prompt: string, actionId: CoachActionId) => void;
  /** Offline users: tap locked Premium chips to open the upgrade sheet. */
  onPremiumUpsell?: () => void;
  /** Premium: today's heavy coach pace is used — lock multi-tab chips. */
  heavyPaceLocked?: boolean;
  /** Called when a heavy chip is tapped while heavyPaceLocked. */
  onHeavyPaceBlocked?: () => void;
  compact?: boolean;
  include?: CoachActionId[];
  exclude?: CoachActionId[];
  /** Prefer Exam drill first when learner opted into exam focus. */
  focus?: TutorFocus;
  className?: string;
};

/**
 * Same Accruals-ratio chip strip for Offline and Premium.
 * Premium-only chips stay visible offline but locked (AI upsell).
 */
export function CoachActionStrip({
  mode,
  title,
  cardId,
  pathId,
  pathTitle,
  stepId,
  onAction,
  onPremiumUpsell,
  heavyPaceLocked = false,
  onHeavyPaceBlocked,
  compact = false,
  include,
  exclude,
  focus = "workplace",
  className,
}: CoachActionStripProps) {
  let actions = coachActionsForMode(mode);
  if (include && include.length > 0) {
    actions = actions.filter((action) => include.includes(action.id));
  }
  if (exclude && exclude.length > 0) {
    actions = actions.filter((action) => !exclude.includes(action.id));
  }
  if (!pathId) {
    actions = actions.filter((action) => action.id !== "continue_path");
  }
  if (focus === "exam") {
    const exam = actions.filter((action) => action.id === "exam_drill");
    const rest = actions.filter((action) => action.id !== "exam_drill");
    actions = [...exam, ...rest];
  }
  if (actions.length === 0) {
    return null;
  }

  const live = mode === "premium";

  return (
    <div
      className={
        [
          "coach-action-strip",
          compact ? "compact" : "",
          live ? "live" : "",
          mode === "premium" ? "premium" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")
      }
      aria-label={
        mode === "premium"
          ? "Premium coaching actions"
          : "Learning-cycle lesson actions"
      }
    >
      {actions.flatMap((action) => {
        const locked =
          mode === "offline" && Boolean(action.premiumOnly) && onPremiumUpsell;

        if (mode === "offline" && action.premiumOnly && !onPremiumUpsell) {
          return [];
        }

        if (locked) {
          return [
            <button
              key={action.id}
              type="button"
              className="coach-action-chip locked"
              title="AI Premium — live assisted coaching"
              onClick={onPremiumUpsell}
            >
              {action.label}
            </button>,
          ];
        }

        if (live && heavyPaceLocked && isHeavyCoachAction(action.id)) {
          return [
            <button
              key={action.id}
              type="button"
              className="coach-action-chip locked"
              title="Today’s heavy coach pace is resting — continues tomorrow"
              onClick={onHeavyPaceBlocked}
              disabled={!onHeavyPaceBlocked}
            >
              {action.label}
            </button>,
          ];
        }

        const href = coachActionHref(action.id, {
          title,
          cardId,
          pathId,
          pathTitle,
          stepId,
          mode,
        });
        if (onAction) {
          const params = new URLSearchParams(href.split("?")[1] ?? "");
          const prompt = params.get("q") ?? "";
          return [
            <button
              key={action.id}
              type="button"
              className="coach-action-chip"
              title={action.hint}
              onClick={() => onAction(prompt, action.id)}
            >
              {action.label}
            </button>,
          ];
        }
        return [
          <Link
            key={action.id}
            href={href}
            className="coach-action-chip"
            title={action.hint}
          >
            {action.label}
          </Link>,
        ];
      })}
    </div>
  );
}
