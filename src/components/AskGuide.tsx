"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  askTutor,
  composeCustomPath,
  isComposePathAsk,
  type ChatTurn,
  type TutorJourney,
} from "@/lib/guide/ask";
import type { RetrieveHit } from "@/lib/guide/retrieve";
import type { BodyWebVerification } from "@/lib/guide/body-web-verify";
import { sessionCoachPrompts } from "@/lib/guide/coach-actions";
import { resolveTutorJourney } from "@/lib/guide/journey";
import type { LearningStep } from "@/lib/guide/learning";
import { LEARNING_PATHS, loadLearningPaths } from "@/lib/guide/paths";
import type { GuideCard } from "@/lib/guide/types";
import { useRetrieveGuideIndex } from "@/lib/guide/seamless-corpus";
import {
  readTutorFocus,
  type TutorFocus,
} from "@/lib/guide/tutor-focus";
import {
  buildTutorChrome,
  pickRelatedCards,
  shouldShowLibraryChips,
  shouldShowLibraryInvite,
  shouldShowPathsInvite,
  type TutorChromeOptions,
} from "@/lib/guide/tutor-relevance";
import { useFlipEnter } from "@/hooks/useFlipEnter";
import {
  afterFlipEnter,
  scrollContainerToEnd,
} from "@/lib/ui/motion";
import {
  getCoachInventory,
  listCoachInventory,
  maybeSweepCoachInventory,
  putCoachInventory,
} from "@/lib/guide/coach-inventory";
import {
  loadCustomPaths,
  saveCustomPath,
} from "@/lib/guide/custom-paths";
import { AiTierChip, AiUpgradeSheet } from "./AiUpgradeSheet";
import { bodyLabel } from "./BodyMark";
import { CoachActionStrip } from "./CoachActionStrip";
import { useEntitlements } from "./EntitlementsProvider";
import { launchModeFromAiTier } from "@/lib/entitlements";
import { useGuideState } from "./GuideState";
import { useHabits } from "./HabitsProvider";
import { TutorVisuals } from "./TutorVisuals";
import { CorpusBadge, WhatsNewSheet } from "./WhatsNewSheet";

type TutorMessage = {
  id: string;
  role: "tutor";
  step: LearningStep;
  related?: GuideCard[];
  pendingMore: boolean;
  verification?: BodyWebVerification;
  journey?: TutorJourney;
  coverage?: "rich" | "mixed" | "thin";
  chrome?: TutorChromeOptions;
};

type UserMessage = {
  id: string;
  role: "user";
  text: string;
};

type ChatMessage = UserMessage | TutorMessage;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function AskGuide() {
  const {
    index: publishedIndex,
    ready: corpusReady,
    statusLine: corpusStatus,
  } = useRetrieveGuideIndex();
  const { insights, track, ready } = useHabits();
  const { refreshCorpus, markJourney, saved } = useGuideState();
  const {
    aiTier,
    recordOnlineAsk,
    fairUseNearLimit,
    fairUseExhausted,
    fairUseHeavyExhausted,
    fairUseAskCount,
    fairUseDailyCap,
    fairUseHeavyCount,
    fairUseHeavyCap,
    canUseLiveAsk,
  } = useEntitlements();
  const [inventoryNotice, setInventoryNotice] = useState<string | null>(null);
  const [inventoryPreviews, setInventoryPreviews] = useState<
    Awaited<ReturnType<typeof listCoachInventory>>
  >([]);
  const launchMode = launchModeFromAiTier(aiTier);
  const [tutorFocus, setTutorFocus] = useState<TutorFocus>("workplace");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [queue, setQueue] = useState<LearningStep[]>([]);
  const [related, setRelated] = useState<GuideCard[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [lastFocus, setLastFocus] = useState<{
    title?: string;
    cardId?: string;
  } | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const [verification, setVerification] = useState<BodyWebVerification | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [continuePulse, setContinuePulse] = useState(false);
  const [lastChrome, setLastChrome] = useState<TutorChromeOptions | null>(null);
  const { registerFlip, isFlipping } = useFlipEnter();
  const prefillHandled = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollThread = useCallback((smooth = true) => {
    afterFlipEnter(() => scrollContainerToEnd(listRef.current, smooth));
  }, []);

  useEffect(() => {
    if (publishedIndex) refreshCorpus(publishedIndex);
  }, [publishedIndex, refreshCorpus]);

  useEffect(() => {
    void loadCustomPaths();
  }, []);

  useEffect(() => {
    void loadLearningPaths();
  }, []);

  useEffect(() => {
    setTutorFocus(readTutorFocus());
  }, []);

  useEffect(() => {
    if (aiTier !== "premium") return;
    let cancelled = false;
    void (async () => {
      const report = await maybeSweepCoachInventory({ savedCardIds: saved });
      if (cancelled) return;
      if (report.ran && report.removed > 0) {
        setInventoryNotice(
          `Inventory refreshed — freed space for new coaching. Your Saved-linked notes stayed.`,
        );
      }
      const previews = await listCoachInventory(6);
      if (!cancelled) setInventoryPreviews(previews);
    })();
    return () => {
      cancelled = true;
    };
  }, [aiTier, saved]);

  const starters = insights.starters;
  const askWorkerConfigured = Boolean(
    process.env.NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL?.trim(),
  );
  const statusLine = !ready
    ? "…"
    : !corpusReady
      ? corpusStatus
      : aiTier === "premium"
        ? !askWorkerConfigured
          ? "Premium · live coach offline"
          : tutorFocus === "exam"
            ? "Premium · Exam drill"
            : "Premium · Workplace"
        : corpusStatus.includes("offline")
          ? "Offline · library ready"
          : "Offline coach";
  const showFollowUps =
    !busy && queue.length === 0 && messages.some((m) => m.role === "tutor");

  // Keep focus in sync when returning from Saved (preference lives there).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        setTutorFocus(readTutorFocus());
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  function welcomeCopy(): { title: string; body: string } {
    if (tutorFocus === "exam" && aiTier === "premium") {
      return {
        title: "Exam drill ready",
        body: "LOS-style checks on Guide cards — stem, trap, model answer. Workplace coaching stays one tap away.",
      };
    }
    if (aiTier === "premium" && !askWorkerConfigured) {
      return {
        title: "Library-first",
        body: "Live Premium coach needs a configured ask worker. Browse Library and Paths offline — answers still ground in your on-device cards.",
      };
    }
    if (aiTier === "offline") {
      return {
        title: "Ask away",
        body: "Offline coach uses your on-device library. Open Library or Paths anytime — unlock Premium for live answers when online.",
      };
    }
    return { title: "Ready", body: insights.welcome };
  }

  useEffect(() => {
    scrollThread(messages.length <= 2);
  }, [messages, busy, queue, followUps, scrollThread]);

  useEffect(() => {
    if (!ready || welcomed || prefillHandled.current) return;
    const timeout = window.setTimeout(() => {
      const welcomeId = uid("welcome");
      const { title, body } = welcomeCopy();
      registerFlip(welcomeId);
      setMessages([
        {
          id: welcomeId,
          role: "tutor",
          step: {
            id: "welcome",
            title,
            body,
          },
          pendingMore: false,
        },
      ]);
      setFollowUps(
        sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(0, 3)
          .length > 0
          ? sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(0, 3)
          : [
              "Teach me a core concept",
              insights.starters[0] ?? "What should I learn next?",
            ],
      );
      setWelcomed(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [
    aiTier,
    insights.starters,
    insights.welcome,
    launchMode,
    ready,
    welcomed,
    registerFlip,
    tutorFocus,
  ]);

  const publishTutorStep = useCallback(
    (
      step: LearningStep,
      rest: LearningStep[],
      hits: RetrieveHit[],
      cards: GuideCard[],
      bodyVerification?: BodyWebVerification | null,
      journey?: TutorJourney,
      coverage?: "rich" | "mixed" | "thin",
      chrome?: TutorChromeOptions,
    ) => {
      const messageId = uid("tutor");
      registerFlip(messageId);
      const relatedCards = pickRelatedCards(hits, cards, chrome ?? { coverage });
      setMessages((current) => [
        ...current,
        {
          id: messageId,
          role: "tutor",
          step,
          related: relatedCards,
          pendingMore: rest.length > 0,
          verification:
            rest.length === 0 ? bodyVerification ?? undefined : undefined,
          journey: rest.length === 0 ? journey : undefined,
          coverage: rest.length === 0 ? coverage : undefined,
          chrome: rest.length === 0 ? chrome : undefined,
        },
      ]);
      setQueue(rest);
      setRelated(cards);
      scrollThread(true);
    },
    [registerFlip, scrollThread],
  );

  const send = useCallback(
    async (
      raw?: string,
      pathContext?: {
        pathId?: string;
        cardId?: string;
        stepId?: string;
        compose?: boolean;
      },
    ) => {
      const text = (raw ?? draft).trim();
      if (!text || busy) return;
      if (!publishedIndex) {
        const waitId = uid("corpus-wait");
        registerFlip(waitId);
        setMessages((current) => [
          ...current,
          {
            id: waitId,
            role: "tutor" as const,
            step: {
              id: "corpus-wait",
              title: "Still loading",
              body: "The Tutor index is still loading. Try again in a moment — Library browse may already be ready.",
            },
            pendingMore: false,
          },
        ]);
        return;
      }

      // Inventory replay is free — check before daily pace gate.
      if (aiTier === "premium") {
        const cached = await getCoachInventory(text);
        if (cached) {
          track("ask", text);
          setDraft("");
          setBusy(true);
          setQueue([]);
          setRelated([]);
          setFollowUps([]);
          setVerification(null);
          setWelcomed(true);
          setMessages((current) => [
            ...current.filter(
              (message) =>
                !(message.role === "tutor" && message.step.id === "welcome"),
            ),
            (() => {
              const userId = uid("user");
              registerFlip(userId);
              return { id: userId, role: "user" as const, text };
            })(),
          ]);
          try {
            const [first, ...rest] = cached.payload.steps;
            if (!first) return;
            const focusCardId =
              cached.payload.journey?.cardId ??
              first.cardId ??
              cached.record.cardIds[0];
            const libraryCards = focusCardId
              ? publishedIndex.cards.filter((card) => card.id === focusCardId)
              : [];
            const chrome = buildTutorChrome({
              coverage: cached.payload.coverage,
              pathContext,
            });
            setLastChrome(chrome);
            setLastFocus({
              title: first.title,
              cardId: focusCardId,
            });
            const hits: RetrieveHit[] = libraryCards.map((card) => ({
              card,
              score: 1,
              chunk: {
                id: `${card.id}:cache`,
                cardId: card.id,
                title: card.title,
                text: card.body,
                bodies: card.bodies,
                tags: card.tags,
                kind: "body" as const,
              },
            }));
            publishTutorStep(
              {
                ...first,
                title: first.title.startsWith("Saved")
                  ? first.title
                  : `From inventory · ${first.title}`,
              },
              rest,
              hits,
              libraryCards,
              null,
              cached.payload.journey,
              cached.payload.coverage,
              chrome,
            );
            setFollowUps(cached.payload.followUps.slice(0, 5));
            void listCoachInventory(6).then(setInventoryPreviews);
          } finally {
            setBusy(false);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }
          return;
        }
      }

      if (aiTier === "premium") {
        const gate = canUseLiveAsk(text);
        if (!gate.allowed) {
          const paceId = uid("pace");
          registerFlip(paceId);
          setMessages((current) => [
            ...current.filter(
              (message) =>
                !(message.role === "tutor" && message.step.id === "welcome"),
            ),
            {
              id: uid("user"),
              role: "user" as const,
              text,
            },
            {
              id: paceId,
              role: "tutor" as const,
              step: {
                id: "pace",
                title: "Pace for today",
                body:
                  gate.message ??
                  "Today’s live coaching pace is resting until tomorrow. Library stays open — pace resets with the calendar day.",
              },
              pendingMore: false,
            },
          ]);
          setDraft("");
          setWelcomed(true);
          setFollowUps([]);
          return;
        }
      }

      track("ask", text);
      setDraft("");
      setBusy(true);
      setQueue([]);
      setRelated([]);
      setFollowUps([]);
      setVerification(null);
      setWelcomed(true);

      const history: ChatTurn[] = messages
        .filter(
          (message) =>
            !(message.role === "tutor" && message.step.id === "welcome"),
        )
        .slice(-8)
        .map((message) =>
          message.role === "user"
            ? { role: "user" as const, text: message.text }
            : {
                role: "tutor" as const,
                text: `${message.step.title}: ${message.step.body}`,
              },
        );

      setMessages((current) => [
        ...current.filter(
          (message) =>
            !(message.role === "tutor" && message.step.id === "welcome"),
        ),
        (() => {
          const userId = uid("user");
          registerFlip(userId);
          return { id: userId, role: "user" as const, text };
        })(),
      ]);

      try {
        const activePathContext =
          pathContext?.pathId || pathContext?.cardId ? pathContext : undefined;
        const wantsCompose =
          pathContext?.compose === true || isComposePathAsk(text);

        if (wantsCompose) {
          if (aiTier !== "premium") {
            setUpgradeOpen(true);
            const upsellId = uid("compose-upsell");
            registerFlip(upsellId);
            setMessages((current) => [
              ...current,
              {
                id: upsellId,
                role: "tutor" as const,
                step: {
                  id: "compose-upsell",
                  title: "Custom paths",
                  body: "Building a custom path needs AI Premium (or your unlock-included month). Library Paths stay open offline.",
                },
                pendingMore: false,
              },
            ]);
            return;
          }
          const composed = await composeCustomPath({
            index: publishedIndex,
            question: text,
            cardIds: pathContext?.cardId ? [pathContext.cardId] : undefined,
            aiTier,
          });
          await saveCustomPath({
            path: composed.path,
            sourceCardIds: composed.cards.map((card) => card.id),
            question: text,
          });
          window.dispatchEvent(new Event("mpg-custom-paths-changed"));
          recordOnlineAsk(text);
          const stepList = composed.path.steps
            .map((step, index) => `${index + 1}. ${step.title}`)
            .join("\n");
          const composeStep: LearningStep = {
            id: `compose-path:${composed.path.id}`,
            title: composed.path.title,
            body: `${composed.path.summary}\n\n${stepList}\n\nSaved on this device under Paths → Yours. Replay does not use today’s live pace.`,
            suggest: "Open this path in Paths",
            cardId: composed.path.steps[0]?.cardId,
          };
          void putCoachInventory({
            question: text,
            payload: {
              steps: [composeStep],
              followUps: [
                `Continue the path “${composed.path.title}”`,
                "Build another custom path from related concepts",
              ],
              journey: {
                cardId: composed.path.steps[0]?.cardId,
                fromLibrary: composed.cards.map((card) => card.id).slice(0, 3),
              },
            },
            cardIds: composed.cards.map((card) => card.id),
            savedCardIds: saved,
          }).then(() => listCoachInventory(6).then(setInventoryPreviews));
          setLastFocus({
            title: composed.path.title,
            cardId: composed.path.steps[0]?.cardId,
          });
          setFollowUps([
            "Build another path connecting related concepts",
            `Teach me the first step: “${composed.path.steps[0]?.title ?? composed.path.title}”`,
          ]);
          publishTutorStep(
            composeStep,
            [],
            [],
            composed.cards,
            null,
            {
              cardId: composed.path.steps[0]?.cardId,
              fromLibrary: composed.cards.map((c) => c.id).slice(0, 3),
            },
            undefined,
            undefined,
          );
          return;
        }

        const reply = await askTutor({
          index: publishedIndex,
          question: text,
          history,
          insights,
          aiTier,
          pathContext:
            activePathContext?.pathId || activePathContext?.cardId
              ? {
                  pathId: activePathContext.pathId,
                  cardId: activePathContext.cardId,
                  stepId: activePathContext.stepId,
                }
              : undefined,
        });
        if (reply.mode === "api") {
          recordOnlineAsk(text);
          void putCoachInventory({
            question: text,
            payload: {
              steps: reply.steps,
              followUps: reply.followUps,
              journey: reply.journey,
              coverage: reply.coverage,
            },
            cardIds: [
              reply.journey?.cardId,
              ...reply.hits.map((hit) => hit.card.id),
            ].filter((id): id is string => Boolean(id)),
            savedCardIds: saved,
          }).then(() => listCoachInventory(6).then(setInventoryPreviews));
        }
        const [first, ...rest] = reply.steps;
        if (!first) return;
        const focusCard = reply.hits[0]?.card;
        const libraryCards = reply.hits.map((hit) => hit.card);
        const chrome = buildTutorChrome({
          coverage: reply.coverage,
          pathContext: activePathContext,
        });
        setLastChrome(chrome);
        const journey =
          reply.journey ??
          resolveTutorJourney({
            proposed: { cardId: focusCard?.id },
            cards: libraryCards,
            index: publishedIndex,
            coverage: reply.coverage,
            pathActive: Boolean(activePathContext?.pathId),
            pinnedCardId: activePathContext?.cardId,
          });
        setLastFocus({
          title: focusCard?.title ?? first.title,
          cardId: journey.cardId ?? focusCard?.id ?? first.cardId,
        });
        setVerification(reply.verification ?? null);
        publishTutorStep(
          first,
          rest,
          reply.hits,
          libraryCards,
          rest.length === 0 ? reply.verification : null,
          journey,
          reply.coverage,
          chrome,
        );
        const coachFollowUps =
          reply.mode === "api"
            ? sessionCoachPrompts(launchMode, {
                title: focusCard?.title,
                cardId: journey.cardId ?? focusCard?.id,
                focus: tutorFocus,
              })
            : [];
        setFollowUps(
          [...new Set([...reply.followUps, ...coachFollowUps])].slice(0, 5),
        );
      } finally {
        setBusy(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    },
    [
      aiTier,
      busy,
      canUseLiveAsk,
      draft,
      insights,
      launchMode,
      messages,
      publishTutorStep,
      publishedIndex,
      recordOnlineAsk,
      registerFlip,
      saved,
      scrollThread,
      track,
      tutorFocus,
    ],
  );

  const showPaceNotice = (body: string) => {
    const paceId = uid("pace");
    registerFlip(paceId);
    setMessages((current) => [
      ...current,
      {
        id: paceId,
        role: "tutor" as const,
        step: {
          id: "pace",
          title: "Pace for today",
          body,
        },
        pendingMore: false,
      },
    ]);
  };

  useEffect(() => {
    if (prefillHandled.current) return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const prefilled = params.get("q");
      if (!prefilled?.trim()) return;
      prefillHandled.current = true;
      setWelcomed(true);
      const pathId = params.get("path") ?? undefined;
      const cardId = params.get("card") ?? undefined;
      const stepId = params.get("step") ?? undefined;
      const compose = params.get("compose") === "1";
      if (pathId) {
        const path = LEARNING_PATHS.find((item) => item.id === pathId);
        const step = path?.steps.find(
          (item) => item.id === stepId || item.cardId === cardId,
        );
        markJourney({
          pathId,
          pathTitle: path?.title ?? pathId,
          stepId: step?.id ?? stepId ?? undefined,
          stepTitle: step?.title,
          cardId: step?.cardId ?? cardId ?? undefined,
        });
      }
      void send(prefilled.trim(), {
        pathId: pathId ?? undefined,
        cardId: cardId ?? undefined,
        stepId: stepId ?? undefined,
        compose,
      });
    }, 40);
    return () => window.clearTimeout(timeout);
  }, [send]);

  function teachMore() {
    const [next, ...rest] = queue;
    if (!next || !publishedIndex) return;
    setContinuePulse(true);
    window.setTimeout(() => setContinuePulse(false), 380);
    track("teach_continue");
    publishTutorStep(
      next,
      rest,
      [],
      related,
      rest.length === 0 ? verification : null,
      rest.length === 0
        ? resolveTutorJourney({
            proposed: { cardId: next.cardId ?? related[0]?.id },
            cards: related,
            index: publishedIndex,
            coverage: lastChrome?.coverage,
            pathActive: lastChrome?.pathActive,
            pinnedCardId: lastChrome?.pinnedCardId,
          })
        : undefined,
      lastChrome?.coverage,
      lastChrome ?? undefined,
    );
  }

  function resetChat() {
    const welcomeId = uid("welcome");
    const { title, body } = welcomeCopy();
    registerFlip(welcomeId);
    setMessages([
      {
        id: welcomeId,
        role: "tutor",
        step: {
          id: "welcome",
          title,
          body,
        },
        pendingMore: false,
      },
    ]);
    setQueue([]);
    setRelated([]);
    setLastFocus(null);
    setLastChrome(null);
    setVerification(null);
    setFollowUps(
      sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(0, 3)
        .length > 0
        ? sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(0, 3)
        : [
            "Teach me a core concept",
            insights.starters[0] ?? "What should I learn next?",
          ],
    );
    setDraft("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const pendingMore = queue.length > 0;
  const canSend =
    !busy &&
    draft.trim().length >= 2 &&
    !(aiTier === "premium" && fairUseExhausted);
  const empty = messages.length === 0;
  const emptyWelcome = empty && !busy ? welcomeCopy() : null;

  return (
    <div className="chat-shell">
      <header className="chat-topbar">
        <div className="chat-topbar-brand">
          <span className="chat-avatar" aria-hidden="true">
            M
          </span>
          <div className="chat-brand-copy">
            <strong className="chat-brand-title">
              <span className="chat-brand-mark">Merixa</span>
              <span className="chat-brand-sep" aria-hidden="true">
                ·
              </span>
              <span className="chat-brand-product">Practitioner&apos;s Guide</span>
            </strong>
            <small className="chat-brand-status">{statusLine}</small>
          </div>
        </div>
        <div className="chat-topbar-actions">
          <CorpusBadge onOpen={() => setWhatsNewOpen(true)} />
          <AiTierChip />
          {!empty ? (
            <button type="button" className="chat-icon-btn" onClick={resetChat}>
              New
            </button>
          ) : null}
        </div>
      </header>
      <AiUpgradeSheet
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
      <WhatsNewSheet
        open={whatsNewOpen}
        onClose={() => setWhatsNewOpen(false)}
        index={publishedIndex}
      />

      <div className="chat-thread" ref={listRef} aria-live="polite">
        {emptyWelcome ? (
          <div className="chat-empty">
            <p className="chat-empty-title">{emptyWelcome.title}</p>
            <p className="chat-empty-copy">{emptyWelcome.body}</p>
            <nav className="chat-home-links" aria-label="Start here">
              <Link href="/library/" className="chat-home-link">
                Browse Library
              </Link>
              <Link href="/paths/" className="chat-home-link">
                Open Paths
              </Link>
            </nav>
            {aiTier === "premium" && !askWorkerConfigured ? (
              <p className="chat-empty-copy">
                Premium is unlocked on-device, but the live ask worker URL is not
                set — Tutor stays extractive from your library until it is.
              </p>
            ) : null}
            {fairUseExhausted ? (
              <p className="chat-empty-copy">
                Today&apos;s live pace is resting ({fairUseAskCount}/
                {fairUseDailyCap}). Library stays open — pace resets tomorrow.
                Inventory replays still work.
              </p>
            ) : fairUseNearLimit ? (
              <p className="chat-empty-copy">
                Pace check: {fairUseAskCount}/{fairUseDailyCap} live asks
                {fairUseHeavyCap > 0
                  ? ` · ${fairUseHeavyCount}/${fairUseHeavyCap} heavy`
                  : ""}{" "}
                today. Resets tomorrow.
              </p>
            ) : null}
            {inventoryNotice ? (
              <p className="chat-empty-copy">{inventoryNotice}</p>
            ) : null}
            {aiTier === "premium" && inventoryPreviews.length > 0 ? (
              <div className="chat-quick" aria-label="From your inventory">
                {inventoryPreviews.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="chat-quick-chip"
                    title="Replay from inventory (does not use today’s pace)"
                    onClick={() => void send(item.question)}
                  >
                    {item.questionPreview}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {messages.map((message) =>
          message.role === "user" ? (
            <div
              key={message.id}
              className={
                isFlipping(message.id)
                  ? "chat-row user motion-flip-up"
                  : "chat-row user"
              }
            >
              <div className="chat-bubble user">
                <p>{message.text}</p>
              </div>
            </div>
          ) : (
            <div
              key={message.id}
              className={
                isFlipping(message.id)
                  ? "chat-row tutor motion-flip-up"
                  : "chat-row tutor"
              }
            >
              <span className="chat-avatar sm" aria-hidden="true">
                M
              </span>
              <div
                className={
                  [
                    "chat-bubble tutor",
                    message.step.visuals && message.step.visuals.length > 0
                      ? "has-visuals"
                      : "",
                    message.step.shellKind
                      ? `shell-block shell-${message.step.shellKind}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                }
              >
                {message.step.id !== "welcome" ? (
                  <p className="chat-step-label">{message.step.title}</p>
                ) : null}
                <p>{message.step.body}</p>
                {message.step.id.startsWith("compose-path:") ? (
                  <Link
                    className="task-link"
                    href={`/paths/#${message.step.id.slice("compose-path:".length)}`}
                  >
                    Open in Paths → Yours
                  </Link>
                ) : null}
                {message.step.visuals && message.step.visuals.length > 0 ? (
                  <TutorVisuals
                    visuals={message.step.visuals}
                    professor={aiTier === "premium"}
                    professorMode={message.step.professorMode ?? "demo"}
                    boardMemo={message.step.boardMemo}
                  />
                ) : null}
                {message.verification ? (
                  <div
                    className={
                      message.verification.verified
                        ? "chat-verify ok"
                        : "chat-verify warn"
                    }
                  >
                    <p className="chat-verify-label">
                      {message.verification.verified
                        ? "Verified against professional-body sources"
                        : "Partially checked against professional-body sources"}
                      <span>
                        {" "}
                        · {Math.round(message.verification.score * 100)}%
                      </span>
                    </p>
                    {message.verification.bodies.length > 0 ? (
                      <p className="chat-verify-bodies">
                        {message.verification.bodies.join(" · ")}
                      </p>
                    ) : null}
                    {message.verification.steps
                      .flatMap((step) => step.citations)
                      .slice(0, 2)
                      .map((citation) =>
                        /^https?:\/\//i.test(citation.url) ? (
                          <a
                            key={`${citation.url}-${citation.label}`}
                            className="chat-verify-link"
                            href={citation.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {citation.label}
                          </a>
                        ) : (
                          <span
                            key={`${citation.url}-${citation.label}`}
                            className="chat-verify-link"
                          >
                            {citation.label}
                          </span>
                        ),
                      )}
                  </div>
                ) : null}
                {message.coverage === "thin" ? (
                  <p className="chat-coverage thin" role="status">
                    Thin Library coverage here — teaching from what we have while
                    breadth expands.
                  </p>
                ) : null}
                {message.related &&
                shouldShowLibraryChips(
                  message.related,
                  message.chrome ?? { coverage: message.coverage },
                ) ? (
                  <div className="chat-related">
                    <p className="chat-related-label">From Library</p>
                    {message.related.map((card) => (
                      <Link
                        key={card.id}
                        href={`/guide/${card.id}/`}
                        className="chat-card-chip"
                        onClick={() => track("card_from_ask", card.id)}
                      >
                        <span>{card.title}</span>
                        <small>
                          {card.bodies
                            .map((body) => bodyLabel(body))
                            .join(" · ")}
                        </small>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {message.journey &&
                (shouldShowLibraryInvite(
                  message.journey.libraryInvite,
                  message.chrome ?? { coverage: message.coverage },
                ) ||
                  shouldShowPathsInvite(
                    message.journey.pathsInvite,
                    message.chrome ?? { coverage: message.coverage },
                  )) ? (
                  <div className="chat-journey" aria-label="Continue learning">
                    {shouldShowLibraryInvite(
                      message.journey.libraryInvite,
                      message.chrome ?? { coverage: message.coverage },
                    ) ? (
                      <Link
                        href={
                          message.journey.cardId
                            ? `/guide/${message.journey.cardId}/`
                            : "/library/"
                        }
                        className="chat-journey-link"
                        onClick={() =>
                          track(
                            "card_from_ask",
                            message.journey?.cardId ?? "library",
                          )
                        }
                      >
                        {message.journey.libraryInvite}
                      </Link>
                    ) : null}
                    {shouldShowPathsInvite(
                      message.journey.pathsInvite,
                      message.chrome ?? { coverage: message.coverage },
                    ) ? (
                      <Link
                        href={
                          message.journey.pathId
                            ? `/paths/#${message.journey.pathId}`
                            : "/paths/"
                        }
                        className="chat-journey-link"
                      >
                        {message.journey.pathsInvite}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}

        {busy ? (
          <div className="chat-row tutor motion-flip-up">
            <span className="chat-avatar sm" aria-hidden="true">
              M
            </span>
            <div className="chat-bubble tutor typing" role="status">
              <span className="typing-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              Thinking…
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-dock">
        {pendingMore ? (
          <button
            type="button"
            className={
              continuePulse ? "chat-continue continue-pulse" : "chat-continue"
            }
            onClick={teachMore}
          >
            Continue lesson →
          </button>
        ) : null}

        {showFollowUps && !empty && lastFocus?.title ? (
          <CoachActionStrip
            compact
            mode={launchMode}
            title={lastFocus.title}
            cardId={lastFocus.cardId}
            onAction={(prompt) => void send(prompt)}
            onPremiumUpsell={
              aiTier === "offline" ? () => setUpgradeOpen(true) : undefined
            }
            heavyPaceLocked={fairUseHeavyExhausted}
            onHeavyPaceBlocked={() =>
              showPaceNotice(
                "Today’s heavy coach pace (board pack, judgement, stress-test) is resting until tomorrow. Try a lighter Ask, or continue tomorrow.",
              )
            }
            exclude={["live_demo", "continue_path", "quiz", "compose_path"]}
            focus={tutorFocus}
          />
        ) : null}

        {(empty || showFollowUps) && followUps.length > 0 && !busy ? (
          <div className="chat-quick" aria-label="Suggested replies">
            {(empty
              ? sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(
                  0,
                  3,
                ).length > 0
                ? sessionCoachPrompts(launchMode, { focus: tutorFocus }).slice(
                    0,
                    3,
                  )
                : starters
              : followUps
            ).map((item) => (
              <button
                key={item}
                type="button"
                className="chat-quick-chip"
                onClick={() => void send(item)}
              >
                {item.length > 56 ? `${item.slice(0, 54)}…` : item}
              </button>
            ))}
          </div>
        ) : null}

        <form
          className="chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor="tutor-input" className="sr-only">
            Message the tutor
          </label>
          <textarea
            ref={inputRef}
            id="tutor-input"
            value={draft}
            rows={1}
            disabled={aiTier === "premium" && fairUseExhausted}
            placeholder={
              aiTier === "premium" && fairUseExhausted
                ? "Pace resumes tomorrow…"
                : "Ask away…"
            }
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="submit"
            className="chat-send"
            disabled={!canSend}
            aria-label="Send"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  );
}
