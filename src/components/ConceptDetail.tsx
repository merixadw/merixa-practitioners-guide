"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  residualTechnicalDetail,
  textOverlapRatio,
} from "@/lib/guide/card-dedupe";
import { distinctEvidenceQuotes } from "@/lib/guide/evidence-quotes";
import type { ConceptRelationKind, GuideCard, GuideIndex, OfficialReference } from "@/lib/guide/types";
import { buildLearningCycle } from "@/lib/guide/learning-cycle";
import { lessonHref, pathLessonHref } from "@/lib/guide/recommend";
import {
  coachActionHref,
} from "@/lib/guide/coach-actions";
import { useRetrieveGuideIndex } from "@/lib/guide/seamless-corpus";
import { fetchGuideCardDetail } from "@/lib/guide/detail-fetch";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { readTutorFocus, type TutorFocus } from "@/lib/guide/tutor-focus";
import { BodyMark } from "./BodyMark";
import { CoachActionStrip } from "./CoachActionStrip";
import { AiUpgradeSheet } from "./AiUpgradeSheet";
import { useEntitlements } from "./EntitlementsProvider";
import { useGuideState } from "./GuideState";
import { useHabits } from "./HabitsProvider";
import { QuickCheckPrompt } from "./QuickCheckPrompt";
import { ThemeToggle } from "./ThemeToggle";

function relationLabel(kind: ConceptRelationKind): string {
  switch (kind) {
    case "prerequisite":
      return "Before this";
    case "consequence":
      return "Leads to";
    case "related":
      return "Related";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function uniqueOfficialReferences(
  refs: OfficialReference[],
): OfficialReference[] {
  const seen = new Set<string>();
  const homeBodies = new Set<string>();
  const out: OfficialReference[] = [];
  for (const ref of refs) {
    const url = String(ref.url || "")
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "")
      .split("?")[0];
    const body = String(ref.body || "").toLowerCase();
    let host = "";
    let isHome = false;
    try {
      const parsed = new URL(ref.url);
      host = parsed.hostname.replace(/^www\./, "");
      const path = parsed.pathname.replace(/\/+$/, "") || "/";
      isHome = path === "/";
    } catch {
      // keep raw url key
    }
    const key = url || `${body}:${ref.label}`;
    if (seen.has(key)) continue;
    if (isHome) {
      const homeKey = body || host;
      if (homeBodies.has(homeKey)) continue;
      homeBodies.add(homeKey);
    }
    seen.add(key);
    out.push(ref);
  }
  return out;
}

export function ConceptDetail({
  card,
}: {
  card: GuideCard;
}) {
  const router = useRouter();
  const touchStartX = useRef<number | null>(null);
  const { index: publishedIndex } = useRetrieveGuideIndex();
  const [liveCard, setLiveCard] = useState(card);
  const { saved, ready, toggleSaved, markRecent, markJourney } = useGuideState();
  const { track } = useHabits();
  const { aiTier, fairUseHeavyExhausted } = useEntitlements();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [tutorFocus, setTutorFocus] = useState<TutorFocus>("workplace");
  const launchMode = launchModeFromAiTier(aiTier);
  const isSaved = saved.includes(card.id);

  useEffect(() => {
    setTutorFocus(readTutorFocus());
  }, []);

  useEffect(() => {
    setLiveCard(card);
    const controller = new AbortController();
    void (async () => {
      // Prefer hydrated retrieve index, else fetch detail shard
      const fromIndex = publishedIndex?.cards.find((item) => item.id === card.id);
      if (fromIndex) {
        setLiveCard(fromIndex);
        return;
      }
      try {
        const detail = await fetchGuideCardDetail(card.id, controller.signal);
        if (detail && !controller.signal.aborted) setLiveCard(detail);
      } catch {
        /* keep SSR card */
      }
    })();
    return () => controller.abort();
  }, [card, publishedIndex]);

  const emptyIndex: GuideIndex = {
    version: 1,
    generatedAt: card.enrichedAt ?? new Date(0).toISOString(),
    cards: [liveCard],
    chunks: [],
  };
  const cycleIndex = publishedIndex ?? emptyIndex;

  const cycle = useMemo(
    () => buildLearningCycle(liveCard, cycleIndex),
    [liveCard, cycleIndex],
  );
  const evidenceQuotes = useMemo(
    () => distinctEvidenceQuotes(liveCard.sourceQuotes, liveCard),
    [liveCard],
  );
  const exampleVerified = liveCard.exampleVerification?.status === "verified";
  const workflowTasks = liveCard.workplaceTasks ?? [];
  const primaryPath = cycle.primaryPath;
  const pathStepId = primaryPath?.steps.find(
    (step) => step.cardId === liveCard.id,
  )?.id;
  const technicalDetail = useMemo(
    () =>
      residualTechnicalDetail({
        body: liveCard.body,
        teachingSummary: liveCard.teachingSummary,
        formula: cycle.formula || liveCard.formula,
      }),
    [liveCard.body, liveCard.teachingSummary, liveCard.formula, cycle.formula],
  );
  const showTechnicalNote = useMemo(() => {
    if (!technicalDetail) return false;
    if (textOverlapRatio(technicalDetail, cycle.definition) >= 0.55) {
      return false;
    }
    if (
      /\b(practitioner concept in|sustained with|not as exam jargon)\b/i.test(
        technicalDetail,
      )
    ) {
      return false;
    }
    // Narrow foreign-topic gate (tariffs / groupthink pasted onto unrelated cards).
    const foreignClusters: Array<{ id: string; re: RegExp }> = [
      { id: "tariffs", re: /\b(tariffs?|duties|trade war)\b/i },
      {
        id: "groupthink",
        re: /\b(groupthink|stereotyping|group polarization|wells fargo)\b/i,
      },
    ];
    const conceptText = `${liveCard.title} ${cycle.definition}`;
    const conceptTopics = new Set(
      foreignClusters
        .filter((cluster) => cluster.re.test(conceptText))
        .map((cluster) => cluster.id),
    );
    const noteTopics = foreignClusters
      .filter((cluster) => cluster.re.test(technicalDetail))
      .map((cluster) => cluster.id);
    if (noteTopics.some((id) => !conceptTopics.has(id))) {
      return false;
    }
    const titleBits = String(liveCard.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3);
    const noteBits = technicalDetail.toLowerCase();
    const titleHits = titleBits.filter((token) => noteBits.includes(token));
    const titleHitRatio =
      titleBits.length === 0 ? 0 : titleHits.length / titleBits.length;
    const shared = textOverlapRatio(
      technicalDetail,
      `${liveCard.title} ${cycle.definition}`,
    );
    return titleHitRatio >= 0.25 || shared >= 0.2;
  }, [technicalDetail, cycle.definition, liveCard.title]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      markRecent(liveCard.id);
      track("card_open", liveCard.id);
      if (primaryPath && !cycle.pathSuggested) {
        const step = primaryPath.steps.find(
          (item) => item.cardId === liveCard.id,
        );
        markJourney({
          pathId: primaryPath.id,
          pathTitle: primaryPath.title,
          stepId: step?.id,
          stepTitle: step?.title ?? liveCard.title,
          cardId: liveCard.id,
        });
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [
    liveCard.id,
    liveCard.title,
    markJourney,
    markRecent,
    primaryPath,
    cycle.pathSuggested,
    track,
  ]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/library/");
  }

  const seeItLabel =
    launchMode === "premium" ? "See it live" : "Unlock live coaching";

  const pathDemoLabel =
    launchMode === "premium"
      ? primaryPath
        ? `Live path demo: ${primaryPath.title}`
        : "Live path demo: choose a journey"
      : primaryPath
        ? `Browse path: ${primaryPath.title}`
        : "Browse Paths";

  return (
    <div
      className="detail-screen"
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        touchStartX.current = touch?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const touch = event.changedTouches[0];
        touchStartX.current = null;
        if (start === null || !touch) return;
        if (start < 48 && touch.clientX - start > 80) goBack();
      }}
    >
      <header className="detail-topbar">
        <button type="button" className="back-button" onClick={goBack}>
          ← Library
        </button>
        <div className="detail-topbar-actions">
          <button
            type="button"
            className={isSaved ? "bookmark-btn saved" : "bookmark-btn"}
            onClick={() => {
              toggleSaved(liveCard.id);
              if (!isSaved) track("card_save", liveCard.id);
            }}
            aria-label={isSaved ? "Unsave" : "Save"}
            aria-pressed={isSaved}
            disabled={!ready}
          >
            {isSaved ? "★" : "☆"}
          </button>
          <ThemeToggle compact />
        </div>
      </header>

      <article className="detail-body">
        <p className="ml-owned-label">Practitioner concept</p>
        <div className="body-row" aria-label="Professional bodies">
          {liveCard.bodies.map((body) => (
            <span key={body} className="body-chip small">
              <BodyMark body={body} />
            </span>
          ))}
        </div>
        {liveCard.classification ? (
          <p className="detail-classification">
            {liveCard.classification.domain} · {liveCard.classification.topic}
            {liveCard.classification.technicalLevel === "advanced"
              ? " · advanced"
              : ""}
            {liveCard.editorialStatus === "editor-approved"
              ? " · editor approved"
              : ""}
          </p>
        ) : null}
        <h1>{liveCard.title}</h1>

        {/* Accruals-ratio learning cycle — always present */}
        <section className="teach-block definition-block">
          <p className="section-label">Definition</p>
          <p className="concept-body concept-body-rich">
            {cycle.definition ||
              `Practitioner framing for “${liveCard.title}” — open Tutor to deepen this card.`}
          </p>
        </section>

        {showTechnicalNote ? (
          <section className="teach-block">
            <p className="section-label">Technical note</p>
            <p className="concept-body concept-body-rich">{technicalDetail}</p>
          </section>
        ) : null}

        {cycle.formula ? (
          <section
            className="teach-block formula-block notranslate"
            translate="no"
          >
            <p className="section-label">Formula</p>
            <p className="formula-line notranslate" translate="no">
              {cycle.formula}
            </p>
          </section>
        ) : null}

        {!cycle.atWorkEmpty ? (
          <section className="teach-block example-block">
            <p className="section-label">At work</p>
            <p className="concept-body-rich">{cycle.atWork}</p>
            {exampleVerified ? (
              <p className="at-work-meta example-verified">
                ✓ Example verified against professional-body sources
              </p>
            ) : null}
            {cycle.atWorkNeedsFigures ? (
              <p className="at-work-meta">
                Needs concrete figures — open a live board pack to stress the
                numbers.
              </p>
            ) : null}
          </section>
        ) : (
          <section className="teach-block example-block at-work-empty">
            <p className="section-label">At work</p>
            <p className="concept-body-rich at-work-empty-copy">
              No workplace example with figures on this card yet.
            </p>
          </section>
        )}

        {workflowTasks.length > 0 ? (
          <section className="teach-block" aria-label="In your workflow">
            <p className="section-label">In your workflow</p>
            <ul className="task-list">
              {workflowTasks.map((task) => (
                <li key={task.id}>
                  {task.href ? (
                    task.href.startsWith("/") ? (
                      <Link href={task.href}>{task.label}</Link>
                    ) : (
                      <a href={task.href} target="_blank" rel="noreferrer">
                        {task.label}
                      </a>
                    )
                  ) : (
                    task.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {launchMode === "premium" ? (
          <Link
            className="detail-cta board-pack-cta"
            href={coachActionHref("workplace", {
              title: liveCard.title,
              cardId: liveCard.id,
              pathId: primaryPath?.id,
              pathTitle: primaryPath?.title,
              stepId: pathStepId,
              mode: launchMode,
            })}
          >
            <span>Show me in a board pack</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <button
            type="button"
            className="detail-cta board-pack-cta"
            onClick={() => setUpgradeOpen(true)}
          >
            <span>Show me in a board pack</span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        <section className="teach-block awareness-block" aria-label="Watch for">
          <p className="section-label">Watch for</p>
          <p className="concept-body-rich">{cycle.watchFor}</p>
          {cycle.trigger ? (
            <p className="awareness-trigger">
              <span>Trigger</span> {cycle.trigger}
            </p>
          ) : null}
        </section>

        {cycle.implication && cycle.implication !== cycle.watchFor ? (
          <section className="teach-block">
            <p className="section-label">If you ignore this</p>
            <p className="concept-body-rich">{cycle.implication}</p>
          </section>
        ) : null}

        <QuickCheckPrompt cardId={liveCard.id} question={cycle.quickCheck} />

        {liveCard.commonMistake &&
        liveCard.commonMistake.trim() !== cycle.watchFor ? (
          <section className="teach-block">
            <p className="section-label">Common trap</p>
            <p className="concept-body-rich">{liveCard.commonMistake}</p>
          </section>
        ) : null}

        {cycle.relations.length > 0 ? (
          <section className="teach-block">
            <p className="section-label">Concept links</p>
            <ul className="relation-list">
              {cycle.relations.map((relation) => (
                <li key={`${relation.kind}-${relation.card.id}`}>
                  <span className="relation-kind">
                    {relationLabel(relation.kind)}
                  </span>
                  <Link href={`/guide/${relation.card.id}/`}>
                    {relation.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(liveCard.officialReferences?.length ?? 0) > 0 ? (
          <section className="teach-block">
            <p className="section-label">Source</p>
            <ul className="path-appear-list">
              {uniqueOfficialReferences(liveCard.officialReferences!)
                .slice(0, 4)
                .map((ref) => (
                <li key={`${ref.body}-${ref.url}`}>
                  <a href={ref.url} target="_blank" rel="noreferrer">
                    {ref.label}
                  </a>
                  <span className="source-kind"> — {ref.body}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {evidenceQuotes.length > 0 ? (
          <details className="teach-block concept-explore">
            <summary>Evidence from sources</summary>
            <ul className="source-list">
              {evidenceQuotes.map((quote) => (
                <li key={quote.text.slice(0, 48)}>
                  “{quote.text}”
                  {quote.sourcePath ? (
                    <span className="source-kind">
                      {" "}
                      — {quote.sourcePath.split("/").pop()}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {cycle.paths.length > 0 ? (
          <section className="teach-block">
            <p className="section-label">
              {cycle.pathSuggested ? "Suggested paths" : "Appears in paths"}
            </p>
            <ul className="path-appear-list">
              {cycle.paths.map((path) => (
                <li key={path.id}>
                  <Link href={`/paths/#${path.id}`}>{path.title}</Link>
                  <span className="source-kind"> — {path.summary}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="teach-block">
            <p className="section-label">Appears in paths</p>
            <p className="concept-body-rich">
              <Link href="/paths/">Browse Paths</Link>
              <span className="source-kind">
                {" "}
                — pick a journey that matches this concept’s domain.
              </span>
            </p>
          </section>
        )}

        {launchMode === "premium" ? (
          <Link
            className="detail-cta"
            href={lessonHref(
              {
                title: liveCard.title,
                id: liveCard.id,
                pathId: primaryPath?.id,
                stepId: pathStepId,
              },
              launchMode,
            )}
          >
            <span>{seeItLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <button
            type="button"
            className="detail-cta"
            onClick={() => setUpgradeOpen(true)}
          >
            <span>{seeItLabel}</span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        <CoachActionStrip
          mode={launchMode}
          title={liveCard.title}
          cardId={liveCard.id}
          pathId={primaryPath?.id}
          pathTitle={primaryPath?.title}
          stepId={pathStepId}
          exclude={["live_demo", "quiz"]}
          focus={tutorFocus}
          onPremiumUpsell={
            launchMode === "offline" ? () => setUpgradeOpen(true) : undefined
          }
          heavyPaceLocked={fairUseHeavyExhausted}
        />

        {launchMode === "premium" ? (
          <Link
            className="detail-secondary"
            href={coachActionHref("compose_path", {
              title: liveCard.title,
              cardId: liveCard.id,
              pathId: primaryPath?.id,
              pathTitle: primaryPath?.title,
              stepId: pathStepId,
              mode: launchMode,
            })}
          >
            Build a path from here
          </Link>
        ) : (
          <button
            type="button"
            className="detail-secondary"
            onClick={() => setUpgradeOpen(true)}
          >
            Build a path from here
          </button>
        )}

        {cycle.nextConcept ? (
          <Link
            className="detail-secondary"
            href={`/guide/${cycle.nextConcept.id}/`}
          >
            Next concept: {cycle.nextConcept.title}
          </Link>
        ) : null}

        {launchMode === "premium" && primaryPath ? (
          <Link
            className="detail-secondary"
            href={pathLessonHref(
              {
                id: primaryPath.id,
                title: primaryPath.title,
                fromCardId: liveCard.id,
                fromStepId: pathStepId,
              },
              launchMode,
            )}
          >
            {pathDemoLabel}
          </Link>
        ) : primaryPath ? (
          <Link
            className="detail-secondary"
            href={`/paths/#${primaryPath.id}`}
          >
            {pathDemoLabel}
          </Link>
        ) : (
          <Link className="detail-secondary" href="/paths/">
            {pathDemoLabel}
          </Link>
        )}

        {launchMode === "offline" ? (
          <button
            type="button"
            className="detail-secondary"
            onClick={() => setUpgradeOpen(true)}
          >
            Unlock training: board pack · stress-test · go deeper
          </button>
        ) : null}

        {primaryPath && !cycle.nextConcept ? (
          <Link
            className="detail-secondary"
            href={`/paths/#${primaryPath.id}`}
          >
            See journey: {primaryPath.title}
          </Link>
        ) : null}

        {cycle.paths.length > 1 ? (
          <Link
            className="detail-secondary"
            href={`/paths/#${cycle.paths[1].id}`}
          >
            Also in: {cycle.paths[1].title}
          </Link>
        ) : null}

        <p className="boundary-note">
          Verify current standards before decisions.
        </p>
      </article>
      <AiUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
