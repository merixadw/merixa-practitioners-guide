/**
 * Merixa ML learning circle — continuous upgrade across all four stages.
 *
 * Each cycle:
 *   1. Build an agenda from gaps, conflicts, weak cards, and prior failures
 *   2. Librarian reclassifies focused sources
 *   3. Scholar deepens study notes for gap/conflict sources
 *   4. Researcher re-synthesizes with conflict resolution + gap boost
 *   5. Teacher republishes cards, then upgrades focused teaching units
 *   6. Writes agenda + circle-state so the next cycle continues
 *
 * Usage:
 *   npm run library:circle
 *   npm run library:circle -- --cycles=3
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLearningAgenda,
  agendaConflictResolutions,
  agendaFocusCardIds,
  agendaFocusSourceIds,
  agendaGapTopicKeys,
} from "./agenda.mjs";
import { reclassifyLibrarian } from "./librarian.mjs";
import { deepenScholar } from "./scholar.mjs";
import { runResearcher } from "./researcher.mjs";
import { buildIndexFromCards, runTeacher } from "./teacher.mjs";
import {
  heuristicEnrichDraft,
  validateEnrichmentDraft,
} from "../../workers/lib/enrich-validate.mjs";
import { preferImprovedCard } from "../lib/improvement-guardrails.mjs";
import { slugify } from "../lib/source-study.mjs";
import { loadEnvFiles } from "../lib/load-env.mjs";
import { runSustainBodies } from "./sustain-bodies.mjs";
import {
  ensureWeeklyTarget,
  focusAgendaOnWeeklyTarget,
  verifyWeeklyTarget,
} from "./weekly-target.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
loadEnvFiles(ROOT);
const CONTENT_DIR = join(ROOT, "content");
const PIPELINE_DIR = join(CONTENT_DIR, "pipeline");
const STATE_PATH = join(PIPELINE_DIR, "circle-state.json");
const AGENDA_PATH = join(PIPELINE_DIR, "agenda.json");
const WEEKLY_PATH = join(PIPELINE_DIR, "weekly-target.json");
const WEEKLY_VERIFY_PATH = join(PIPELINE_DIR, "weekly-verification.json");
const DRAFT_DIR = join(CONTENT_DIR, "enrich-drafts");

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseCycles(argv) {
  const flag = argv.find((arg) => arg.startsWith("--cycles="));
  if (!flag) return 1;
  const value = Number(flag.split("=")[1]);
  return Number.isFinite(value) && value > 0 ? Math.min(Math.floor(value), 12) : 1;
}

async function enrichWithModel(card, env) {
  if (!env.OPENAI_API_KEY) return null;
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const sourcePath = card.sources?.[0]?.path || "unknown";
  const excerpt = String(card.body || "").slice(0, 1800);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are Merixa ML learning-circle teacher.
Upgrade the card into a professional practitioner-guide teaching unit using ONLY the excerpt.
Return JSON only:
{"title":"...","body":"...","classification":{"domain":"...","topic":"...","contentType":"...","technicalLevel":"practitioner|advanced","confidence":0.9},"teachingSummary":"...","workedExample":"...","commonMistake":"...","checkQuestion":"...","sourceQuotes":[{"text":"...","sourcePath":"..."}],"workplaceTasks":[{"id":"...","label":"..."}]}
Rules:
- title: precise professional concept
- body: 2-4 coherent technical sentences
- teachingSummary, workedExample, commonMistake must be workplace-grounded
- Never invent IFRS/IAS numbers absent from the excerpt
- No exam tips`,
        },
        {
          role: "user",
          content: `Title: ${card.title}\nSource: ${sourcePath}\nExcerpt:\n${excerpt}`,
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

async function upgradeTeacherCards({ index, focusCardIds, focusTitles, env }) {
  mkdirSync(DRAFT_DIR, { recursive: true });
  const byId = new Map(index.cards.map((card) => [card.id, card]));
  const byTitle = new Map(
    index.cards.map((card) => [slugify(card.title), card]),
  );

  const targets = [];
  for (const id of focusCardIds) {
    const card = byId.get(id);
    if (card) targets.push(card);
  }
  for (const title of focusTitles) {
    const card = byTitle.get(slugify(title));
    if (card && !targets.some((item) => item.id === card.id)) {
      targets.push(card);
    }
  }

  const report = {
    considered: targets.length,
    promoted: 0,
    rejected: [],
    mode: env.OPENAI_API_KEY ? "api" : "heuristic",
  };

  for (const card of targets.slice(0, 24)) {
    const modelDraft = await enrichWithModel(card, env);
    const usedModel = Boolean(modelDraft);
    const draft = modelDraft ?? heuristicEnrichDraft(card);
    writeFileSync(
      join(DRAFT_DIR, `${card.id}.json`),
      `${JSON.stringify({ cardId: card.id, draft, circle: true }, null, 2)}\n`,
      "utf8",
    );
    const result = validateEnrichmentDraft({ card, draft });
    if (!result.ok) {
      report.rejected.push({ id: card.id, reasons: result.reasons });
      continue;
    }
    const promoted = usedModel
      ? result.card
      : {
          ...result.card,
          editorialStatus: "machine-reviewed",
          qualityScore: Math.max(Number(card.qualityScore || 0), 0.78),
        };
    const kept = preferImprovedCard(card, promoted).card;
    byId.set(kept.id, kept);
    writeFileSync(
      join(CONTENT_DIR, "corpus", `${kept.id}.json`),
      `${JSON.stringify(kept, null, 2)}\n`,
      "utf8",
    );
    report.promoted += 1;
  }

  const nextCards = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  const nextIndex = buildIndexFromCards(nextCards);
  writeFileSync(
    join(CONTENT_DIR, "index.json"),
    `${JSON.stringify(nextIndex, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(CONTENT_DIR, "enrich-report.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), ...report }, null, 2)}\n`,
    "utf8",
  );
  return { report, index: nextIndex };
}

async function runOneCycle({ cycle, previousState, env }) {
  mkdirSync(PIPELINE_DIR, { recursive: true });

  let catalog = readJson(join(PIPELINE_DIR, "catalog.json"));
  let notebook = readJson(join(PIPELINE_DIR, "notes.json"));
  let synthesis = readJson(join(PIPELINE_DIR, "synthesis.json"));
  let index = readJson(join(CONTENT_DIR, "index.json"));
  const enrichReport = readJson(join(CONTENT_DIR, "enrich-report.json"));
  const previousAgenda = readJson(AGENDA_PATH);

  if (!catalog || !notebook || !synthesis || !index) {
    throw new Error(
      "Learning circle needs a prior library:rebuild (catalog, notes, synthesis, index).",
    );
  }

  let agenda = buildLearningAgenda({
    catalog,
    notebook,
    synthesis,
    index,
    enrichReport,
    previousAgenda,
  });

  const sustainReport = readJson(join(PIPELINE_DIR, "sustain-report.json"));
  let weeklyTarget = ensureWeeklyTarget({
    existing: readJson(WEEKLY_PATH),
    index,
    synthesis,
    sustainReport,
  });
  const priorVerification = readJson(WEEKLY_VERIFY_PATH);
  agenda = focusAgendaOnWeeklyTarget(agenda, weeklyTarget, priorVerification);
  writeFileSync(AGENDA_PATH, `${JSON.stringify(agenda, null, 2)}\n`, "utf8");
  writeFileSync(WEEKLY_PATH, `${JSON.stringify(weeklyTarget, null, 2)}\n`, "utf8");

  // Prefer weekly gap topics when present.
  const weeklyGapTopics = new Set(
    (weeklyTarget.goals ?? [])
      .filter((goal) => goal.kind === "fill-gap")
      .map((goal) => goal.topicKey)
      .filter(Boolean),
  );
  const focusSources = agendaFocusSourceIds(agenda);
  const gapTopics =
    weeklyGapTopics.size > 0 ? weeklyGapTopics : agendaGapTopicKeys(agenda);
  const resolutions = agendaConflictResolutions(agenda);
  const focusCards = agendaFocusCardIds(agenda);
  const focusTitles = (agenda.stages.teacher ?? [])
    .map((item) => item.title)
    .filter(Boolean);

  console.log(
    `circle ${cycle}: week=${weeklyTarget.weekId} agenda librarian=${agenda.summary.librarian} scholar=${agenda.summary.scholar} researcher=${agenda.summary.researcher} teacher=${agenda.summary.teacher}`,
  );

  // 1. Librarian
  catalog = reclassifyLibrarian({
    contentDir: CONTENT_DIR,
    catalog,
    focusSourceIds: focusSources,
  });
  console.log(
    `  librarian: reclassified=${catalog.stats.circleReclassified ?? 0}`,
  );

  // 2. Scholar
  notebook = deepenScholar({
    contentDir: CONTENT_DIR,
    catalog,
    notebook,
    focusSourceIds: focusSources,
  });
  console.log(
    `  scholar: added=${notebook.stats.circle?.notesAdded ?? 0} upgraded=${notebook.stats.circle?.notesUpgraded ?? 0} notes=${notebook.stats.notesTaken}`,
  );

  // 3. Researcher
  synthesis = runResearcher({
    contentDir: CONTENT_DIR,
    notebook,
    conflictResolutions: resolutions,
    gapTopicKeys: gapTopics,
  });
  console.log(
    `  researcher: concepts=${synthesis.stats.concepts} conflicts=${synthesis.stats.conflicts} resolved=${synthesis.stats.resolvedConflicts ?? 0} gaps=${synthesis.stats.gaps}`,
  );

  // 4. Teacher republish + focused upgrade
  const published = runTeacher({
    contentDir: CONTENT_DIR,
    synthesis,
    previousIndex: index,
  });
  const upgrade = await upgradeTeacherCards({
    index: published.index,
    focusCardIds: focusCards,
    focusTitles,
    env,
  });
  console.log(
    `  teacher: cards=${published.cards} enriched=${upgrade.report.promoted}/${upgrade.report.considered} mode=${upgrade.report.mode}`,
  );

  // 5. Sustain from official professional-body websites
  const sustain = await runSustainBodies({
    contentDir: CONTENT_DIR,
    limit: 12,
  });
  console.log(
    `  sustain: fetched=${sustain.fetched.length} failed=${sustain.failed.length} cardsUpdated=${sustain.cardsUpdated}`,
  );

  // Reload index after sustain so the next agenda sees official references.
  const sustainedIndex = readJson(join(CONTENT_DIR, "index.json")) ?? upgrade.index;

  // Next agenda for unfinished work / newly discovered gaps.
  let nextAgenda = buildLearningAgenda({
    catalog,
    notebook,
    synthesis,
    index: sustainedIndex,
    enrichReport: upgrade.report,
    previousAgenda: agenda,
  });

  const verification = verifyWeeklyTarget({
    weeklyTarget,
    index: sustainedIndex,
    synthesis,
    sustainReport: sustain,
  });
  weeklyTarget = {
    ...weeklyTarget,
    status: verification.passed ? "verified" : "active",
    verifiedAt: verification.passed ? verification.verifiedAt : weeklyTarget.verifiedAt,
    lastVerifiedAt: verification.verifiedAt,
  };
  nextAgenda = focusAgendaOnWeeklyTarget(nextAgenda, weeklyTarget, verification);
  writeFileSync(AGENDA_PATH, `${JSON.stringify(nextAgenda, null, 2)}\n`, "utf8");
  writeFileSync(WEEKLY_PATH, `${JSON.stringify(weeklyTarget, null, 2)}\n`, "utf8");
  writeFileSync(
    WEEKLY_VERIFY_PATH,
    `${JSON.stringify(verification, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `  weekly: ${verification.weekId} ${verification.passed ? "VERIFIED" : "in progress"} score=${(verification.score * 100).toFixed(0)}% failed=${verification.failed.join(",") || "none"}`,
  );

  const state = {
    generatedAt: new Date().toISOString(),
    cycle,
    previousCycle: previousState?.cycle ?? 0,
    weekId: weeklyTarget.weekId,
    weekly: {
      status: weeklyTarget.status,
      score: verification.score,
      passed: verification.passed,
      failed: verification.failed,
    },
    agendaBefore: agenda.summary,
    agendaAfter: nextAgenda.summary,
    librarian: { reclassified: catalog.stats.circleReclassified ?? 0 },
    scholar: notebook.stats.circle ?? {},
    researcher: synthesis.stats,
    teacher: {
      cards: published.cards,
      enrich: upgrade.report,
    },
    sustain: {
      fetched: sustain.fetched.length,
      failed: sustain.failed.length,
      cardsUpdated: sustain.cardsUpdated,
    },
    openGaps: synthesis.researchGaps?.slice(0, 12) ?? [],
    openConflicts: synthesis.conflicts?.slice(0, 12) ?? [],
  };
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  writeFileSync(
    join(CONTENT_DIR, "ingest-report.json"),
    `${JSON.stringify(
      {
        generatedAt: state.generatedAt,
        mode: "learning-circle",
        cycle,
        librarian: catalog.stats,
        scholar: notebook.stats,
        researcher: synthesis.stats,
        teacher: { cards: published.cards, enrich: upgrade.report },
        researchGaps: synthesis.researchGaps,
        conflicts: synthesis.conflicts,
        agenda: nextAgenda.summary,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return state;
}

async function main() {
  const cycles = parseCycles(process.argv.slice(2));
  let previous = readJson(STATE_PATH);
  let startCycle = (previous?.cycle ?? 0) + 1;

  for (let offset = 0; offset < cycles; offset += 1) {
    const cycle = startCycle + offset;
    previous = await runOneCycle({
      cycle,
      previousState: previous,
      env: process.env,
    });
  }

  console.log(
    `Learning circle complete: cycles=${cycles} last=${previous.cycle} openGaps=${previous.openGaps?.length ?? 0} openConflicts=${previous.openConflicts?.length ?? 0}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
