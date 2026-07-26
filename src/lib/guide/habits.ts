import type { BodyId } from "./types";

const HABITS_KEY = "mpg-habits-v1";

export type HabitEventKind =
  | "route"
  | "search"
  | "body_filter"
  | "topic_filter"
  | "card_open"
  | "card_save"
  | "ask"
  | "teach_continue"
  | "card_from_ask";

export type UsageHabits = {
  version: 1;
  updatedAt: string;
  routes: Record<string, number>;
  bodies: Partial<Record<BodyId, number>>;
  topics: Record<string, number>;
  searches: Record<string, number>;
  cards: Record<string, number>;
  askThemes: Record<string, number>;
  askCount: number;
  continueCount: number;
  sessionStarts: number;
};

const EMPTY_HABITS: UsageHabits = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  routes: {},
  bodies: {},
  topics: {},
  searches: {},
  cards: {},
  askThemes: {},
  askCount: 0,
  continueCount: 0,
  sessionStarts: 0,
};

function bump(map: Record<string, number>, key: string, amount = 1) {
  const next = key.trim().toLowerCase().slice(0, 64);
  if (!next) return;
  map[next] = (map[next] ?? 0) + amount;
}

function topKeys(map: Record<string, number>, limit = 3): string[] {
  return Object.entries(map)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function isHabits(value: unknown): value is UsageHabits {
  return (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version === 1
  );
}

export function readHabits(): UsageHabits {
  if (typeof window === "undefined") return { ...EMPTY_HABITS };
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HABITS_KEY) ?? "");
    if (!isHabits(parsed)) return { ...EMPTY_HABITS };
    return {
      ...EMPTY_HABITS,
      ...parsed,
      routes: parsed.routes ?? {},
      bodies: parsed.bodies ?? {},
      topics: parsed.topics ?? {},
      searches: parsed.searches ?? {},
      cards: parsed.cards ?? {},
      askThemes: parsed.askThemes ?? {},
    };
  } catch {
    return { ...EMPTY_HABITS };
  }
}

function writeHabits(habits: UsageHabits) {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch {
    // Private browsing should not break the app.
  }
}

export function recordHabit(
  kind: HabitEventKind,
  detail?: string,
): UsageHabits {
  const habits = readHabits();
  habits.updatedAt = new Date().toISOString();

  switch (kind) {
    case "route":
      if (detail) bump(habits.routes, detail);
      break;
    case "search":
      if (detail) bump(habits.searches, detail);
      break;
    case "body_filter":
      if (detail && detail !== "all") {
        bump(habits.bodies as Record<string, number>, detail);
      }
      break;
    case "topic_filter":
      if (detail && detail !== "all") bump(habits.topics, detail);
      break;
    case "card_open":
    case "card_save":
    case "card_from_ask":
      if (detail) bump(habits.cards, detail);
      break;
    case "ask":
      habits.askCount += 1;
      if (detail) {
        for (const token of detail
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((part) => part.length > 3)
          .slice(0, 6)) {
          bump(habits.askThemes, token);
        }
      }
      break;
    case "teach_continue":
      habits.continueCount += 1;
      break;
    default: {
      const _exhaustive: never = kind;
      void _exhaustive;
      break;
    }
  }

  writeHabits(habits);
  return habits;
}

export function markSessionStart(): UsageHabits {
  const habits = readHabits();
  habits.sessionStarts += 1;
  habits.updatedAt = new Date().toISOString();
  writeHabits(habits);
  return habits;
}

export type HabitInsights = {
  preferredBodies: BodyId[];
  preferredTopics: string[];
  askThemes: string[];
  askCount: number;
  pace: "reflective" | "steady" | "fast";
  primarySurface: "guide" | "ask" | "paths" | "saved" | "mixed";
  summaryForTutor: string;
  starters: string[];
  followUps: string[];
  welcome: string;
  statusLine: string;
};

const BODY_IDS: BodyId[] = [
  "IFRS",
  "FRC",
  "CFA",
  "FRM",
  "IIA",
  "CRMA",
  "ACCA",
  "CGMA",
  "COSO",
  "GARP",
];

function asBody(value: string): BodyId | null {
  const hit = BODY_IDS.find(
    (body) => body.toLowerCase() === value.toLowerCase(),
  );
  return hit ?? null;
}

export function getHabitInsights(habits = readHabits()): HabitInsights {
  const preferredBodies = topKeys(habits.bodies as Record<string, number>, 3)
    .map(asBody)
    .filter((body): body is BodyId => body !== null);

  const preferredTopics = topKeys(habits.topics, 3);
  const askThemes = topKeys(habits.askThemes, 4);

  const continueRatio =
    habits.askCount === 0 ? 0.5 : habits.continueCount / Math.max(habits.askCount, 1);
  const pace: HabitInsights["pace"] =
    continueRatio >= 1.4 ? "fast" : continueRatio <= 0.5 ? "reflective" : "steady";

  const routeEntries = Object.entries(habits.routes).sort(
    (left, right) => right[1] - left[1],
  );
  const topRoute = routeEntries[0]?.[0] ?? "";
  const primarySurface: HabitInsights["primarySurface"] =
    topRoute === "/" || topRoute.startsWith("/ask")
      ? "ask"
      : topRoute.startsWith("/library") || topRoute.startsWith("/guide")
        ? "guide"
        : topRoute.startsWith("/paths")
          ? "paths"
          : topRoute.startsWith("/saved")
            ? "saved"
            : "mixed";

  const bodyFocus = preferredBodies[0];
  const topicFocus = preferredTopics[0] ?? askThemes[0];

  const surfaceLabel =
    primarySurface === "ask"
      ? "Tutor"
      : primarySurface === "guide"
        ? "Library"
        : primarySurface;

  const summaryForTutor = [
    `Human teaching style required: warm, plain English, no jargon pile-ups.`,
    `Learner pace: ${pace} (${
      pace === "fast"
        ? "keep turns very short"
        : pace === "reflective"
          ? "one calm idea per turn, invite thinking"
          : "clear step-by-step teaching"
    }).`,
    `Most used area of the app: ${surfaceLabel}.`,
    preferredBodies.length
      ? `Preferred professional bodies: ${preferredBodies.join(", ")}.`
      : "No body preference yet — keep examples general and practical.",
    askThemes.length
      ? `Recent learner themes: ${askThemes.slice(0, 3).join(", ")}.`
      : "No ask themes yet.",
    "Teach specialist practitioner depth first. Mention Library only when coverage is thin or the learner pinned a card; mention Paths only when they are on a path step.",
    "End each teaching beat so the learner can ask a natural follow-up.",
    "Never dump bullet walls. Never invent standards text outside the cards.",
  ].join(" ");

  const starters = buildPersonalizedStarters({
    preferredBodies,
    preferredTopics,
    askThemes,
    sessionSeed: habits.sessionStarts + habits.askCount,
  });

  const followUps = buildFollowUps({ preferredBodies, askThemes });

  const welcome =
    habits.askCount === 0
      ? "Ask a concept, or what to learn next."
      : bodyFocus
        ? `Back. Focus looks like ${bodyFocus}${
            topicFocus ? ` / ${topicFocus}` : ""
          }.`
        : "Welcome back.";

  const statusLine =
    preferredBodies.length > 0
      ? preferredBodies.slice(0, 2).join(" · ")
      : habits.askCount > 0
        ? pace
        : "Ready";

  return {
    preferredBodies,
    preferredTopics,
    askThemes,
    askCount: habits.askCount,
    pace,
    primarySurface,
    summaryForTutor,
    starters,
    followUps,
    welcome,
    statusLine,
  };
}

function buildFollowUps({
  preferredBodies,
  askThemes,
}: {
  preferredBodies: BodyId[];
  askThemes: string[];
}): string[] {
  const extras: string[] = [
    "Explain that with a workplace example",
    "What mistake should I avoid?",
    "Give me a one-line definition",
  ];
  if (preferredBodies.includes("IFRS")) {
    extras.unshift("How would this look in a disclosure note?");
  }
  if (askThemes.some((theme) => /cash|profit|liquidity/.test(theme))) {
    extras.unshift("Show me the cash impact");
  }
  return [...new Set(extras)].slice(0, 3);
}

function buildPersonalizedStarters({
  preferredBodies,
  preferredTopics,
  askThemes,
  sessionSeed = 0,
}: {
  preferredBodies: BodyId[];
  preferredTopics: string[];
  askThemes: string[];
  /** Rotate which preferred-body prompts surface across sessions. */
  sessionSeed?: number;
}): string[] {
  const defaults = [
    "Why can profit rise while cash falls?",
    "How do I test control design?",
    "What is IFRS 15 asking me to decide?",
  ];

  const byBody: Partial<Record<BodyId, string[]>> = {
    IFRS: [
      "Explain revenue recognition like I’m preparing a pack.",
      "Walk me through an impairment judgement with spreadsheet figures.",
      "How would this look in a disclosure note?",
    ],
    FRC: [
      "How does UK GAAP framing change this judgement vs IFRS?",
      "What would an FRC reviewer probe first on this topic?",
    ],
    CFA: [
      "Walk me through a ratio that links to valuation.",
      "Show a DCF check I can put on a sheet.",
      "How does this show up in equity vs credit analysis?",
    ],
    FRM: [
      "What makes a KRI useful on a risk dashboard?",
      "Map funding liquidity vs market liquidity with figures.",
      "Stress-test this risk with a before/after sheet.",
    ],
    IIA: [
      "Help me tell design effectiveness from operating effectiveness.",
      "What evidence would I ask for on this control?",
    ],
    CRMA: [
      "How do the three lines share ownership of this risk?",
      "Build a simple RCM row for this control objective.",
    ],
    ACCA: [
      "Teach this as if I’m closing the books this week.",
      "What workplace trap shows up in ACCA-style financial reporting?",
    ],
    CGMA: [
      "Walk me through a budget variance that needs a cash check.",
      "How would I brief a finance business partner on this?",
    ],
  };

  const personalized: string[] = [];
  const bodies =
    preferredBodies.length > 0 ? preferredBodies : (["IFRS", "FRM", "CFA"] as BodyId[]);

  for (const body of bodies) {
    const pool = byBody[body] ?? [];
    if (pool.length === 0) continue;
    const pick = pool[Math.abs(sessionSeed + body.length) % pool.length];
    if (pick) personalized.push(pick);
  }

  if (
    preferredTopics.includes("management") ||
    askThemes.some((theme) => /cash|profit|budget|forecast/.test(theme))
  ) {
    personalized.push("Walk me through why a budget variance needs a cash check.");
  }
  if (preferredTopics.includes("finance")) {
    personalized.push("Walk me through a ratio that links to valuation.");
  }
  if (preferredTopics.includes("reporting")) {
    personalized.push("Explain revenue recognition like I’m preparing a pack.");
  }
  if (preferredTopics.includes("risk")) {
    personalized.push("What makes a KRI useful on a risk dashboard?");
  }

  const rotatedDefaults = [
    ...defaults.slice(sessionSeed % defaults.length),
    ...defaults.slice(0, sessionSeed % defaults.length),
  ];

  return [...new Set([...personalized, ...rotatedDefaults])].slice(0, 3);
}

/** Soft bias for retrieval using on-device habits. */
export function habitRetrieveBody(
  insights: HabitInsights,
): BodyId | "all" {
  if (insights.preferredBodies.length === 1) return insights.preferredBodies[0];
  return "all";
}
