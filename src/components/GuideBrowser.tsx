"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { BodyId, CatalogCard, GuideCard, GuideDomain } from "@/lib/guide/types";
import { ALL_BODIES } from "@/lib/guide/types";
import { catalogCardAsListCard } from "@/lib/guide/catalog-utils";
import { useCatalogIndex } from "@/lib/guide/seamless-corpus";
import { prefetchGuideCardDetail } from "@/lib/guide/detail-fetch";
import { rankCardsForLearner } from "@/lib/guide/recommend";
import { isVisibleInLibraryBrowse } from "@/lib/guide/publishable";
import { BodyMark, bodyLabel } from "./BodyMark";
import { GuideCardTile } from "./GuideCardTile";
import { useHabits } from "./HabitsProvider";

const PAGE_SIZE = 24;
/** Habit ranking is O(n log n); skip it on wide unfiltered 14k result sets. */
const RANK_CAP = 480;

/**
 * Topic chips map to workplace categories.
 * Specialty encyclopedias (tax, IFRS, FA, …) sit under their category — not a
 * catch-all "Encyclopedia" dump.
 */
const TOPICS: {
  id: string;
  label: string;
  domains: GuideDomain[];
  tags: string[];
  mode: "all" | "tax" | "domain-or-tag" | "finance" | "strategy";
}[] = [
  { id: "all", label: "All", domains: [], tags: [], mode: "all" },
  {
    id: "tax",
    label: "Tax",
    domains: [],
    tags: [
      "tax-encyclopedia",
      "tax-uk",
      "tax-us",
      "tax-eu",
      "tax-jurisdiction-uk",
      "tax-jurisdiction-us",
      "tax-jurisdiction-eu",
      "uk-gaap-tax",
      "us-gaap-tax",
      "european-gaap-tax",
    ],
    mode: "tax",
  },
  {
    id: "reporting",
    label: "Reporting",
    domains: ["Financial reporting"],
    tags: ["ifrs-ias-path", "ifrs-encyclopedia", "ifrs"],
    mode: "domain-or-tag",
  },
  {
    id: "management",
    label: "Management",
    domains: ["Management reporting"],
    tags: ["management-accounting", "ma-encyclopedia", "ma-formulas"],
    mode: "domain-or-tag",
  },
  {
    id: "finance",
    label: "Finance",
    domains: ["Financial management"],
    tags: [
      "fa-encyclopedia",
      "financial-analysis",
      "fa-formulas",
      "fa-formula-bank",
      "cfa",
    ],
    mode: "finance",
  },
  {
    id: "risk",
    label: "Risk",
    domains: ["Risk management", "Governance and controls"],
    tags: [
      "frm-encyclopedia",
      "risk-encyclopedia",
      "risk-formulas",
      "coso-encyclopedia",
      "governance-encyclopedia",
      "internal-controls",
      "COSO",
    ],
    mode: "domain-or-tag",
  },
  {
    id: "assurance",
    label: "Assurance",
    domains: ["Audit and assurance"],
    tags: ["crma-encyclopedia", "audit-encyclopedia", "assurance-formulas"],
    mode: "domain-or-tag",
  },
  {
    id: "sustainability",
    label: "ESG",
    domains: ["Sustainability"],
    tags: ["sustainability-encyclopedia"],
    mode: "domain-or-tag",
  },
  {
    id: "strategy",
    label: "Strategy",
    domains: ["Strategy and performance", "Project delivery"],
    tags: [
      "strategy-encyclopedia",
      "project-encyclopedia",
      "uk-corporate-governance",
      "uk-cg-code",
      "sox",
      "sox-governance",
      "sapin-ii",
      "anti-corruption",
    ],
    mode: "strategy",
  },
];

type TopicId = (typeof TOPICS)[number]["id"];

const FINANCE_TOPIC_RE =
  /\b(financial analysis|valuation|cost of capital|wacc|dcf|ratio analysis|working capital|capital structure|portfolio|equity|fixed income|derivatives|credit analysis|lease vs buy)\b/i;

const STRATEGY_GOV_RE =
  /\b(uk corporate governance code|corporate governance code|comply or explain|sarbanes[\s-]?oxley|\bsox\b|section 404|section 302|section 906|wates principles|sapin\s*ii|french anti-corruption|afa)\b/i;

function isTopicId(value: string): value is TopicId {
  return TOPICS.some((topic) => topic.id === value);
}

function matchesTopic(
  card: CatalogCard | GuideCard,
  selectedTopic: (typeof TOPICS)[number],
) {
  const cardTags = card.tags.map((item) => item.toLowerCase());
  const domainMatch =
    selectedTopic.domains.length > 0 &&
    card.classification &&
    selectedTopic.domains.includes(card.classification.domain);
  const tagMatch =
    selectedTopic.tags.length > 0 &&
    selectedTopic.tags.some((tag) => cardTags.includes(tag.toLowerCase()));
  const id = String(card.id || "");
  const topicText = `${card.title} ${card.classification?.topic ?? ""}`;

  if (selectedTopic.mode === "all") return true;

  if (selectedTopic.mode === "tax") {
    return (
      tagMatch ||
      id.startsWith("tax-") ||
      cardTags.includes("tax")
    );
  }

  if (selectedTopic.mode === "finance") {
    if (domainMatch || tagMatch || id.startsWith("fa-")) return true;
    const hasCfa = card.bodies.includes("CFA");
    if (!hasCfa) return false;
    return (
      card.classification?.domain === "Financial management" ||
      FINANCE_TOPIC_RE.test(topicText) ||
      cardTags.includes("financial-analysis")
    );
  }

  if (selectedTopic.mode === "strategy") {
    if (
      domainMatch ||
      tagMatch ||
      id.startsWith("strategy-enc-") ||
      id.startsWith("project-")
    ) {
      return true;
    }
    return STRATEGY_GOV_RE.test(topicText);
  }

  if (selectedTopic.mode === "domain-or-tag") {
    return domainMatch || tagMatch;
  }

  return domainMatch || tagMatch;
}

export function GuideBrowser() {
  const { catalog, ready: catalogReady, error: catalogError, statusLine, offlineReady } =
    useCatalogIndex();
  const cards = catalog?.cards ?? [];
  const { insights, track, ready } = useHabits();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [body, setBody] = useState<BodyId | "all">("all");
  const [topic, setTopic] = useState<TopicId>("all");
  const [shown, setShown] = useState(PAGE_SIZE);
  const searchTimer = useRef<number | null>(null);

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

  useEffect(() => {
    setShown(PAGE_SIZE);
  }, [deferredQuery, body, topic]);

  const catalogSize = useMemo(
    () => cards.filter((card) => isVisibleInLibraryBrowse(card)).length,
    [cards],
  );

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const selectedTopic = TOPICS.find((item) => item.id === topic) ?? TOPICS[0];

    const matched = cards.filter((card) => {
      if (!isVisibleInLibraryBrowse(card, { query: normalized })) return false;
      if (body !== "all" && !card.bodies.includes(body)) return false;
      if (!matchesTopic(card, selectedTopic)) return false;

      // Catalog browse — keep haystack light (no full body) for 14k cards.
      if (!normalized) return true;
      const haystack = [
        card.title,
        "teaser" in card ? card.teaser : "",
        card.classification?.domain ?? "",
        card.classification?.topic ?? "",
        card.tags.join(" "),
        (card.aliases ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });

    const asGuide = matched.map((card) => catalogCardAsListCard(card));
    const byQuality = () =>
      [...asGuide].sort((left, right) => {
        const quality =
          (right.qualityScore ?? 0.5) - (left.qualityScore ?? 0.5);
        return quality !== 0 ? quality : left.title.localeCompare(right.title);
      });

    if (ready && asGuide.length > 0 && asGuide.length <= RANK_CAP) {
      return rankCardsForLearner(asGuide, insights);
    }
    return byQuality();
  }, [body, cards, deferredQuery, insights, ready, topic]);

  const visible = filtered.slice(0, shown);
  const filtersOn = body !== "all" || topic !== "all" || Boolean(query.trim());
  const searchPending = query.trim() !== deferredQuery.trim();

  useEffect(() => {
    // Prefetch detail shards for the next Show more page
    for (const card of filtered.slice(shown, shown + PAGE_SIZE)) {
      prefetchGuideCardDetail(card.id);
    }
  }, [filtered, shown]);

  function resetResults() {
    setShown(PAGE_SIZE);
  }

  if (!catalogReady) {
    return (
      <div className="screen-stack library-browse">
        <div className="empty-state" aria-busy="true">
          <h2>Preparing library</h2>
          <p>{statusLine || "Loading the on-device catalog…"}</p>
        </div>
      </div>
    );
  }

  if (catalogError && cards.length === 0) {
    return (
      <div className="screen-stack library-browse">
        <div className="empty-state">
          <h2>Library unavailable</h2>
          <p>
            The on-device catalog did not load
            {catalogError ? ` (${catalogError})` : ""}. Reload the app, or open{" "}
            <Link href="/paths/" className="inline-ml-link">
              Paths
            </Link>{" "}
            if you already have journeys cached.
          </p>
          <p className="list-meta">
            Developers: run <code>npm run library:seamless</code> then rebuild.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-stack library-browse">
      <p className="screen-lead">
        {catalogSize.toLocaleString("en-GB")} workplace concepts — tax,
        reporting, finance, risk, governance, strategy, and delivery.
        {offlineReady ? " Ready offline." : ""}
      </p>

      <div className="library-filters">
      <div className="mobile-search">
        <label className="search-box">
          <span className="sr-only">Search concepts</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetResults();
            }}
            type="search"
            enterKeyHint="search"
            placeholder="Search concepts"
          />
        </label>
        {filtersOn ? (
          <button
            type="button"
            className="chip-clear"
            onClick={() => {
              setBody("all");
              setTopic("all");
              setQuery("");
              resetResults();
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="chip-rail" aria-label="Professional body">
        <button
          type="button"
          className={body === "all" ? "rail-chip active" : "rail-chip"}
          onClick={() => {
            setBody("all");
            resetResults();
          }}
          aria-pressed={body === "all"}
        >
          All bodies
        </button>
        {ALL_BODIES.map((item) => (
          <button
            key={item}
            type="button"
            className={body === item ? "rail-chip active" : "rail-chip"}
            onClick={() => {
              setBody(item);
              track("body_filter", item);
              resetResults();
            }}
            aria-pressed={body === item}
            aria-label={bodyLabel(item)}
          >
            <BodyMark body={item} />
          </button>
        ))}
      </div>

      <div className="chip-rail soft" aria-label="Topic">
        {TOPICS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={topic === item.id ? "rail-chip active" : "rail-chip"}
            onClick={() => {
              if (isTopicId(item.id)) {
                setTopic(item.id);
                track("topic_filter", item.id);
              }
              resetResults();
            }}
            aria-pressed={topic === item.id}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="list-meta" role="status">
        {searchPending ? "Updating… · " : ""}
        {filtered.length.toLocaleString("en-GB")}{" "}
        {filtered.length === 1 ? "concept" : "concepts"}
        {body === "all" ? "" : ` · ${bodyLabel(body)}`}
        {topic === "all"
          ? ""
          : ` · ${TOPICS.find((item) => item.id === topic)?.label ?? topic}`}
      </div>
      </div>

      <section
        className="list-stack library-list"
        aria-label="Concepts"
        aria-busy={searchPending}
      >
        {visible.map((card, index) => (
          <GuideCardTile
            key={card.id}
            card={card}
            motionIndex={index % 14}
          />
        ))}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <h2>No match</h2>
            <p>
              Clear filters, or browse{" "}
              <Link href="/paths/" className="inline-ml-link">
                Paths
              </Link>{" "}
              for a guided route.
            </p>
            {filtersOn ? (
              <button
                type="button"
                className="path-continue"
                onClick={() => {
                  setBody("all");
                  setTopic("all");
                  setQuery("");
                  resetResults();
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {shown < filtered.length ? (
        <button
          type="button"
          className="load-more"
          onClick={() => {
            const next = shown + PAGE_SIZE;
            for (const card of filtered.slice(shown, next + PAGE_SIZE)) {
              prefetchGuideCardDetail(card.id);
            }
            setShown(next);
          }}
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}
