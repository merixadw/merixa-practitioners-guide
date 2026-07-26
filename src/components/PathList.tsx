"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  shelvePaths,
  type PathShelf,
} from "@/lib/guide/flagship-paths";
import { coachActionHref } from "@/lib/guide/coach-actions";
import { pathLessonHref, rankPathsForLearner } from "@/lib/guide/recommend";
import type { LearningPath } from "@/lib/guide/types";
import {
  loadCustomPaths,
  touchCustomPath,
} from "@/lib/guide/custom-paths";
import {
  finishThisWeekSuggestion,
  nextRecommendedPath,
  pathProgress,
  pathProgressLabel,
  stepOpened,
} from "@/lib/guide/path-progress";
import { BodyMark } from "./BodyMark";
import { AiUpgradeSheet } from "./AiUpgradeSheet";
import { useEntitlements } from "./EntitlementsProvider";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { useGuideState } from "./GuideState";
import { useHabits } from "./HabitsProvider";

const SHELF_COPY: Record<
  PathShelf,
  { title: string; lead: string }
> = {
  yours: {
    title: "Yours",
    lead: "Custom paths you built with Premium Tutor — cached on this device.",
  },
  flagship: {
    title: "Start here",
    lead: "Cross-body journeys — more routes added over time.",
  },
  standards: {
    title: "Standards",
    lead: "One path per IFRS/IAS standard.",
  },
  frm: {
    title: "FRM / risk",
    lead: "Risk journeys from foundations to toolkit.",
  },
  "financial-analysis": {
    title: "Financial analysis",
    lead: "Statements, cash, valuation, credit.",
  },
  practice: {
    title: "Practice shelves",
    lead: "Domain shelf drills — secondary to Start here and Standards.",
  },
  more: {
    title: "More",
    lead: "Additional practitioner routes.",
  },
};

function PathArticle({
  path,
  open,
  onToggle,
  recent,
  saved,
  launchMode,
  onJourney,
  onPremiumUpsell,
  nextRecommended,
  onSelectPath,
  weekHint,
}: {
  path: LearningPath;
  open: boolean;
  onToggle: () => void;
  recent: string[];
  saved: string[];
  launchMode: "offline" | "premium";
  onJourney: (input: {
    pathId: string;
    pathTitle: string;
    stepId?: string;
    stepTitle?: string;
    cardId?: string;
  }) => void;
  onPremiumUpsell?: () => void;
  nextRecommended?: LearningPath | null;
  onSelectPath?: (pathId: string) => void;
  weekHint?: string | null;
}) {
  const progress = pathProgress(path, recent, saved);
  const pathComplete = progress.complete;
  const nextStep = progress.nextStep;
  const live = launchMode === "premium";

  return (
    <article
      id={path.id}
      className={open ? "path-card open" : "path-card"}
    >
      <button
        type="button"
        className="path-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="path-head-copy">
          <span className="body-row tight">
            {path.bodies
              .filter((body) => body !== "Merixa")
              .map((body) => (
                <span key={body} className="body-chip tiny">
                  <BodyMark body={body} />
                </span>
              ))}
          </span>
          <strong>{path.title}</strong>
          <small>{path.summary}</small>
          <span className="path-progress">{pathProgressLabel(progress)}</span>
          {weekHint ? (
            <span className="path-week-hint">{weekHint}</span>
          ) : null}
        </span>
        <span className="path-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open ? (
        <>
          <ol className="path-steps motion-flip-up">
            {path.steps.map((step, index) => {
              const done = stepOpened(step.cardId, recent, saved);
              return (
                <li
                  key={step.id}
                  className={done ? "path-step done" : "path-step"}
                >
                  <span className="step-number">{index + 1}</span>
                  <div>
                    {step.cardId ? (
                      <Link href={`/guide/${step.cardId}/`}>
                        {step.title}
                      </Link>
                    ) : (
                      <strong>{step.title}</strong>
                    )}
                    <p>{step.summary}</p>
                    {live && step.cardId ? (
                      <Link
                        className="task-link"
                        href={coachActionHref("live_demo", {
                          title: step.title,
                          cardId: step.cardId,
                          pathId: path.id,
                          pathTitle: path.title,
                          stepId: step.id,
                          mode: launchMode,
                        })}
                        onClick={() =>
                          onJourney({
                            pathId: path.id,
                            pathTitle: path.title,
                            stepId: step.id,
                            stepTitle: step.title,
                            cardId: step.cardId,
                          })
                        }
                      >
                        See it live →
                      </Link>
                    ) : null}
                    {step.taskLabel ? (
                      step.href ? (
                        <a className="task-link" href={step.href}>
                          {step.taskLabel} →
                        </a>
                      ) : (
                        <span className="task-link muted">
                          {step.taskLabel}
                        </span>
                      )
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
          {pathComplete ? (
            <div className="path-complete-hint">
              <p>Journey complete — every step opened on this device.</p>
              {nextRecommended ? (
                <Link
                  className="path-continue"
                  href={`/paths/#${nextRecommended.id}`}
                  onClick={() => onSelectPath?.(nextRecommended.id)}
                >
                  Try next: {nextRecommended.title} →
                </Link>
              ) : (
                <Link className="path-continue" href="/paths/">
                  Browse more paths →
                </Link>
              )}
            </div>
          ) : live ? (
            <Link
              className="path-continue"
              href={pathLessonHref(
                {
                  id: path.id,
                  title: path.title,
                  fromStepId: nextStep?.id,
                  fromCardId: nextStep?.cardId,
                },
                launchMode,
              )}
              onClick={() =>
                onJourney({
                  pathId: path.id,
                  pathTitle: path.title,
                  stepId: nextStep?.id,
                  stepTitle: nextStep?.title,
                  cardId: nextStep?.cardId,
                })
              }
            >
              Live path demo →
            </Link>
          ) : (
            <button
              type="button"
              className="path-continue"
              onClick={onPremiumUpsell}
            >
              Unlock live path training →
            </button>
          )}
        </>
      ) : null}
    </article>
  );
}

export function PathList({
  paths,
}: {
  paths: LearningPath[];
  /** @deprecated unused — kept for call-site compatibility */
  cardIds?: string[];
}) {
  const { insights, ready } = useHabits();
  const { recent, saved, markJourney } = useGuideState();
  const { aiTier } = useEntitlements();
  const launchMode = launchModeFromAiTier(aiTier);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [customPaths, setCustomPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    const refresh = () => {
      void loadCustomPaths().then(setCustomPaths);
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("mpg-custom-paths-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("mpg-custom-paths-changed", refresh);
    };
  }, []);

  const catalog = useMemo(
    () => [...customPaths, ...paths],
    [customPaths, paths],
  );
  const ranked = useMemo(
    () => (ready ? rankPathsForLearner(catalog, insights) : catalog),
    [catalog, insights, ready],
  );
  const shelves = useMemo(() => shelvePaths(ranked), [ranked]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && ranked.some((path) => path.id === hash)) {
      setSelectedId(hash);
      if (hash.startsWith("custom-")) void touchCustomPath(hash);
      const node = document.getElementById(hash);
      node?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [ranked]);

  const openId =
    selectedId ??
    shelves.yours[0]?.id ??
    shelves.flagship[0]?.id ??
    ranked[0]?.id ??
    "";
  const shelfOrder: PathShelf[] = [
    "yours",
    "flagship",
    "standards",
    "frm",
    "financial-analysis",
    "practice",
    "more",
  ];

  const buildPathHref = coachActionHref("compose_path", {
    title: "your concepts",
    mode: launchMode,
  });

  return (
    <div className="screen-stack">
      <p className="screen-lead">
        Browse journeys offline. Live path training unlocks with AI Premium.
      </p>
      {shelfOrder.map((shelf) => {
        const shelfPaths = shelves[shelf];
        const copy = SHELF_COPY[shelf];
        if (shelf !== "yours" && shelfPaths.length === 0) return null;
        return (
          <section key={shelf} className="path-shelf">
            <header className="path-shelf-head">
              <h2>{copy.title}</h2>
              <p>{copy.lead}</p>
            </header>
            {shelf === "yours" && shelfPaths.length === 0 ? (
              <div className="path-empty yours-empty">
                <p>No custom paths on this device yet.</p>
                {launchMode === "premium" ? (
                  <Link className="path-continue" href={buildPathHref}>
                    Build with Tutor →
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="path-continue"
                    onClick={() => setUpgradeOpen(true)}
                  >
                    Unlock Premium to build paths →
                  </button>
                )}
              </div>
            ) : (
              <div className="path-stack">
                {shelfPaths.map((path) => {
                  const progress = pathProgress(path, recent, saved);
                  const weekHint = finishThisWeekSuggestion(
                    progress,
                    insights.pace,
                  );
                  return (
                  <PathArticle
                    key={path.id}
                    path={path}
                    open={path.id === openId}
                    onToggle={() => {
                      setSelectedId(path.id === openId ? "" : path.id);
                      if (path.id.startsWith("custom-")) {
                        void touchCustomPath(path.id);
                      }
                    }}
                    recent={recent}
                    saved={saved}
                    launchMode={launchMode}
                    onJourney={markJourney}
                    onPremiumUpsell={() => setUpgradeOpen(true)}
                    nextRecommended={nextRecommendedPath(
                      ranked,
                      path.id,
                      recent,
                      saved,
                    )}
                    onSelectPath={(pathId) => {
                      setSelectedId(pathId);
                      if (pathId.startsWith("custom-")) {
                        void touchCustomPath(pathId);
                      }
                    }}
                    weekHint={weekHint}
                  />
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      <AiUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
