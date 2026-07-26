"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  pathShelf,
  shelvePaths,
  type PathShelf,
} from "@/lib/guide/flagship-paths";
import { coachActionHref } from "@/lib/guide/coach-actions";
import { pathLessonHref, rankPathsForLearner } from "@/lib/guide/recommend";
import { LEARNING_PATHS, loadLearningPaths } from "@/lib/guide/paths";
import { ALL_BODIES, type BodyId, type LearningPath } from "@/lib/guide/types";
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
import { BodyMark, bodyLabel } from "./BodyMark";
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

const SHELF_ORDER: PathShelf[] = [
  "yours",
  "flagship",
  "standards",
  "frm",
  "financial-analysis",
  "practice",
  "more",
];

const SHELF_FILTERS: { id: "all" | PathShelf; label: string }[] = [
  { id: "all", label: "All shelves" },
  { id: "yours", label: "Yours" },
  { id: "flagship", label: "Start here" },
  { id: "standards", label: "Standards" },
  { id: "frm", label: "FRM / risk" },
  { id: "financial-analysis", label: "Financial analysis" },
  { id: "practice", label: "Practice" },
  { id: "more", label: "More" },
];

type ProgressFilter = "all" | "not_started" | "in_progress" | "done";

const PROGRESS_FILTERS: { id: ProgressFilter; label: string }[] = [
  { id: "all", label: "Any progress" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
];

function matchesProgress(
  path: LearningPath,
  filter: ProgressFilter,
  recent: string[],
  saved: string[],
): boolean {
  if (filter === "all") return true;
  const progress = pathProgress(path, recent, saved);
  if (filter === "done") return progress.complete;
  if (filter === "not_started") return progress.opened === 0;
  return progress.opened > 0 && !progress.complete;
}

function matchesSearch(path: LearningPath, query: string): boolean {
  if (!query) return true;
  const haystack = `${path.title} ${path.summary}`.toLowerCase();
  return haystack.includes(query);
}

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
  paths: pathsProp,
}: {
  /** Optional override; defaults to light LEARNING_PATHS then hydrates packs. */
  paths?: LearningPath[];
  /** @deprecated unused — kept for call-site compatibility */
  cardIds?: string[];
}) {
  const { insights, track, ready } = useHabits();
  const { recent, saved, markJourney } = useGuideState();
  const { aiTier } = useEntitlements();
  const launchMode = launchModeFromAiTier(aiTier);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [customPaths, setCustomPaths] = useState<LearningPath[]>([]);
  const [packPaths, setPackPaths] = useState<LearningPath[]>(
    () => pathsProp ?? LEARNING_PATHS,
  );
  const [packsReady, setPacksReady] = useState(() => Boolean(pathsProp));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [shelfFilter, setShelfFilter] = useState<"all" | PathShelf>("all");
  const [bodyFilter, setBodyFilter] = useState<BodyId | "all">("all");
  const [progressFilter, setProgressFilter] =
    useState<ProgressFilter>("all");
  const searchTimer = useRef<number | null>(null);

  useEffect(() => {
    if (pathsProp) {
      setPackPaths(pathsProp);
      setPacksReady(true);
    }
    let cancelled = false;
    void loadLearningPaths().then((next) => {
      if (cancelled) return;
      // Prefer caller override only when it already includes heavy packs.
      if (
        pathsProp &&
        pathsProp.some(
          (path) =>
            path.id.startsWith("orphan-family-") ||
            path.id.startsWith("domain-shelf-"),
        )
      ) {
        setPackPaths(pathsProp);
      } else {
        setPackPaths(next);
      }
      setPacksReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathsProp]);

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

  useEffect(() => {
    if (!query.trim()) return;
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      track("search", query.trim());
    }, 700);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query, track]);

  const catalog = useMemo(
    () => [...customPaths, ...packPaths],
    [customPaths, packPaths],
  );
  const ranked = useMemo(
    () => (ready ? rankPathsForLearner(catalog, insights) : catalog),
    [catalog, insights, ready],
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filtersOn =
    shelfFilter !== "all" ||
    bodyFilter !== "all" ||
    progressFilter !== "all" ||
    Boolean(query.trim());
  const searchPending = query.trim() !== deferredQuery.trim();

  const filtered = useMemo(() => {
    return ranked.filter((path) => {
      if (shelfFilter !== "all" && pathShelf(path) !== shelfFilter) {
        return false;
      }
      if (bodyFilter !== "all" && !path.bodies.includes(bodyFilter)) {
        return false;
      }
      if (!matchesProgress(path, progressFilter, recent, saved)) {
        return false;
      }
      return matchesSearch(path, normalizedQuery);
    });
  }, [
    bodyFilter,
    normalizedQuery,
    progressFilter,
    ranked,
    recent,
    saved,
    shelfFilter,
  ]);

  const shelves = useMemo(() => shelvePaths(filtered), [filtered]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !ranked.some((path) => path.id === hash)) return;
    const timer = window.setTimeout(() => {
      setSelectedId(hash);
      if (hash.startsWith("custom-")) void touchCustomPath(hash);
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ranked]);

  const openId =
    selectedId ??
    shelves.yours[0]?.id ??
    shelves.flagship[0]?.id ??
    filtered[0]?.id ??
    "";

  const buildPathHref = coachActionHref("compose_path", {
    title: "your concepts",
    mode: launchMode,
  });

  const showYoursEmpty =
    !filtersOn &&
    (shelfFilter === "all" || shelfFilter === "yours") &&
    shelves.yours.length === 0;

  const shelfFilterLabel =
    SHELF_FILTERS.find((item) => item.id === shelfFilter)?.label ?? shelfFilter;
  const progressFilterLabel =
    PROGRESS_FILTERS.find((item) => item.id === progressFilter)?.label ??
    progressFilter;

  function clearFilters() {
    setQuery("");
    setShelfFilter("all");
    setBodyFilter("all");
    setProgressFilter("all");
  }

  return (
    <div className="screen-stack">
      <p className="screen-lead">
        Browse journeys offline. Live path training unlocks with AI Premium.
      </p>
      {!packsReady ? (
        <div className="empty-state path-packs-loading" aria-busy="true">
          <h2>Loading paths</h2>
          <p>Fetching practice shelves onto this device…</p>
        </div>
      ) : null}

      <div className="library-filters paths-filters">
        <div className="mobile-search">
          <label className="search-box">
            <span className="sr-only">Search paths</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              enterKeyHint="search"
              placeholder="Search paths"
            />
          </label>
          {filtersOn ? (
            <button type="button" className="chip-clear" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
        </div>

        <div className="chip-rail soft" aria-label="Shelf">
          {SHELF_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                shelfFilter === item.id ? "rail-chip active" : "rail-chip"
              }
              onClick={() => {
                setShelfFilter(item.id);
                if (item.id !== "all") track("topic_filter", item.id);
              }}
              aria-pressed={shelfFilter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="chip-rail" aria-label="Professional body">
          <button
            type="button"
            className={bodyFilter === "all" ? "rail-chip active" : "rail-chip"}
            onClick={() => setBodyFilter("all")}
            aria-pressed={bodyFilter === "all"}
          >
            All bodies
          </button>
          {ALL_BODIES.map((item) => (
            <button
              key={item}
              type="button"
              className={
                bodyFilter === item ? "rail-chip active" : "rail-chip"
              }
              onClick={() => {
                setBodyFilter(item);
                track("body_filter", item);
              }}
              aria-pressed={bodyFilter === item}
              aria-label={bodyLabel(item)}
            >
              <BodyMark body={item} />
            </button>
          ))}
        </div>

        <div className="chip-rail soft" aria-label="Progress">
          {PROGRESS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                progressFilter === item.id ? "rail-chip active" : "rail-chip"
              }
              onClick={() => setProgressFilter(item.id)}
              aria-pressed={progressFilter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="list-meta" role="status">
          {searchPending ? "Updating… · " : ""}
          {filtered.length.toLocaleString("en-GB")}{" "}
          {filtered.length === 1 ? "path" : "paths"}
          {shelfFilter === "all" ? "" : ` · ${shelfFilterLabel}`}
          {bodyFilter === "all" ? "" : ` · ${bodyLabel(bodyFilter)}`}
          {progressFilter === "all" ? "" : ` · ${progressFilterLabel}`}
        </div>
      </div>

      {packsReady && filtered.length === 0 && !showYoursEmpty ? (
        <div className="empty-state">
          <h2>No match</h2>
          <p>
            Clear filters, try a shorter search, or browse{" "}
            <Link href="/library/" className="inline-ml-link">
              Library
            </Link>{" "}
            concepts first.
          </p>
          <button type="button" className="path-continue" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : null}

      {SHELF_ORDER.map((shelf) => {
        const shelfPaths = shelves[shelf];
        const copy = SHELF_COPY[shelf];
        if (shelf === "yours" && showYoursEmpty) {
          return (
            <section key={shelf} className="path-shelf">
              <header className="path-shelf-head">
                <h2>{copy.title}</h2>
                <p>{copy.lead}</p>
              </header>
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
            </section>
          );
        }
        if (shelfPaths.length === 0) return null;
        return (
          <section key={shelf} className="path-shelf">
            <header className="path-shelf-head">
              <h2>{copy.title}</h2>
              <p>{copy.lead}</p>
            </header>
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
                      filtered,
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
