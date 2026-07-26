/**
 * Merixa ML learning-circle worker (Cloudflare).
 *
 * Continuous upgrade loop:
 * - Loads published corpus + pipeline agenda/synthesis from R2
 * - Builds a fresh agenda from gaps, conflicts, weak cards, enrich failures
 * - Teacher stage: enriches the highest-priority cards
 * - Persists agenda + circle-state so the next cron continues the circle
 * - Local `npm run library:circle` still runs librarian/scholar/researcher
 *   against raw sources; this worker keeps the teacher loop live and carries
 *   unfinished stage work forward in the agenda
 *
 * Bindings:
 * - CORPUS_BUCKET (R2)
 * - OPENAI_API_KEY (secret)
 * - OPENAI_BASE_URL / OPENAI_MODEL (optional)
 *
 * R2 layout:
 * - published/index.json
 * - pipeline/agenda.json
 * - pipeline/synthesis.json (optional, uploaded from local circle)
 * - pipeline/circle-state.json
 * - drafts/{cardId}.json
 * - corpus/{cardId}.json
 * - reports/circle-{ts}.json
 */
import { validateEnrichmentDraft } from "./lib/enrich-validate.mjs";
import { buildLearningAgenda } from "./lib/learning-agenda.mjs";
import {
  ensureWeeklyTarget,
  focusAgendaOnWeeklyTarget,
  verifyWeeklyTarget,
} from "./lib/weekly-target.mjs";
import { verifyTutorSteps } from "./lib/body-web-verify.mjs";

const BATCH_SIZE = 12;
const TUTOR_PROBE_COUNT = 4;

const LEARN_SYSTEM = `You are Merixa ML learning-circle teacher.
Upgrade the card into a professional practitioner-guide teaching unit using ONLY the excerpt.
Return JSON only:
{"title":"...","body":"...","classification":{"domain":"...","topic":"...","contentType":"...","technicalLevel":"practitioner|advanced","confidence":0.9},"teachingSummary":"...","workedExample":"...","commonMistake":"...","checkQuestion":"...","sourceQuotes":[{"text":"...","sourcePath":"..."}],"workplaceTasks":[{"id":"...","label":"..."}]}
Rules:
- title: precise professional concept, not a page heading
- body: 2-4 coherent technical sentences for a working finance/risk professional
- teachingSummary, workedExample, commonMistake must be workplace-grounded
- Never invent IFRS/IAS numbers not present in the excerpt
- No exam tips`;

function chunkCard(card) {
  const chunks = [];
  const push = (text, kind, index) => {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    chunks.push({
      id: `${card.id}::${kind}::${index}`,
      cardId: card.id,
      title: card.title,
      text: cleaned,
      bodies: card.bodies,
      tags: card.tags,
      kind,
    });
  };

  const paragraphs = String(card.body || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const parts = paragraphs.length > 0 ? paragraphs : [card.body];
  parts.forEach((text, index) => push(text, "body", index));
  push(card.teachingSummary, "summary", 0);
  push(card.workedExample, "example", 0);
  push(card.commonMistake, "mistake", 0);
  return chunks;
}

function buildIndex(cards) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    cards,
    chunks: cards.flatMap(chunkCard),
  };
}

/** Derive a lightweight synthesis when R2 has no pipeline/synthesis.json. */
function synthesisFromCards(cards) {
  const topicCoverage = {};
  const conflicts = [];
  for (const card of cards) {
    const domain = card.classification?.domain || "Unknown";
    const topic = card.classification?.topic || "Unknown";
    const key = `${domain} | ${topic}`;
    topicCoverage[key] = (topicCoverage[key] ?? 0) + 1;
  }
  const researchGaps = Object.entries(topicCoverage)
    .filter(([, count]) => count < 3)
    .map(([topic, count]) => ({ topic, concepts: count }))
    .sort((left, right) => left.concepts - right.concepts);

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      concepts: cards.length,
      gaps: researchGaps.length,
      conflicts: conflicts.length,
      corroborated: cards.filter((card) => (card.sources?.length ?? 0) > 1)
        .length,
    },
    concepts: [],
    conflicts,
    topicCoverage,
    researchGaps,
  };
}

async function readJson(bucket, key) {
  const object = await bucket.get(key);
  if (!object) return null;
  return object.json();
}

async function putJson(bucket, key, value) {
  await bucket.put(key, JSON.stringify(value, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
}

async function enrichWithModel(card, env) {
  if (!env.OPENAI_API_KEY) return null;
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    "",
  );
  const model = env.OPENAI_MODEL || "gpt-4.1-mini";
  const sourcePath = card.sources?.[0]?.path || "unknown";
  const excerpt = String(card.body || "").slice(0, 1400);

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: LEARN_SYSTEM },
        {
          role: "user",
          content: `Title: ${card.title}\nSource: ${sourcePath}\nExcerpt:\n${excerpt}`,
        },
      ],
    }),
  });

  if (!upstream.ok) return null;
  const data = await upstream.json();
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

async function runLearningCircle(env) {
  const bucket = env.CORPUS_BUCKET;
  if (!bucket) {
    return { ok: false, error: "CORPUS_BUCKET binding missing" };
  }

  const published =
    (await readJson(bucket, "published/index.json")) ||
    (await readJson(bucket, "index.json"));
  if (!published?.cards || !Array.isArray(published.cards)) {
    return { ok: false, error: "published index missing" };
  }

  const previousAgenda = await readJson(bucket, "pipeline/agenda.json");
  const previousState = await readJson(bucket, "pipeline/circle-state.json");
  const enrichReport = await readJson(bucket, "pipeline/enrich-report.json");
  const previousWeekly = await readJson(bucket, "pipeline/weekly-target.json");
  const previousVerification = await readJson(
    bucket,
    "pipeline/weekly-verification.json",
  );
  const synthesis =
    (await readJson(bucket, "pipeline/synthesis.json")) ||
    synthesisFromCards(published.cards);
  const catalog = (await readJson(bucket, "pipeline/catalog.json")) || {
    entries: [],
  };
  const notebook = (await readJson(bucket, "pipeline/notes.json")) || {
    notes: [],
  };

  let weeklyTarget = ensureWeeklyTarget({
    existing: previousWeekly,
    index: published,
    synthesis,
    sustainReport: null,
  });

  let agenda = buildLearningAgenda({
    catalog,
    notebook,
    synthesis,
    index: published,
    enrichReport,
    previousAgenda,
  });
  agenda = focusAgendaOnWeeklyTarget(agenda, weeklyTarget, previousVerification);

  const byId = new Map(published.cards.map((card) => [card.id, card]));
  const focusIds = new Set(
    (agenda.stages.teacher ?? []).map((item) => item.cardId).filter(Boolean),
  );
  const candidates = published.cards
    .filter((card) => focusIds.has(card.id) || card.editorialStatus !== "model-reviewed")
    .sort((left, right) => {
      const leftFocus = focusIds.has(left.id) ? 1 : 0;
      const rightFocus = focusIds.has(right.id) ? 1 : 0;
      if (leftFocus !== rightFocus) return rightFocus - leftFocus;
      return (left.qualityScore ?? 0) - (right.qualityScore ?? 0);
    })
    .slice(0, BATCH_SIZE);

  const report = {
    ranAt: new Date().toISOString(),
    cycle: (previousState?.cycle ?? 0) + 1,
    considered: candidates.length,
    promoted: 0,
    rejected: [],
    agenda: agenda.summary,
    carriedStages: {
      librarian: agenda.stages.librarian.length,
      scholar: agenda.stages.scholar.length,
      researcher: agenda.stages.researcher.length,
    },
  };

  for (const card of candidates) {
    const draft = await enrichWithModel(card, env);
    if (!draft) {
      report.rejected.push({ id: card.id, reasons: ["model-unavailable"] });
      continue;
    }

    await putJson(bucket, `drafts/${card.id}.json`, {
      cardId: card.id,
      draft,
      createdAt: new Date().toISOString(),
      circle: true,
    });

    const result = validateEnrichmentDraft({ card, draft });
    if (!result.ok) {
      report.rejected.push({ id: card.id, reasons: result.reasons });
      continue;
    }

    byId.set(card.id, result.card);
    await putJson(bucket, `corpus/${card.id}.json`, result.card);
    report.promoted += 1;
  }

  const nextCards = [...byId.values()].sort((left, right) =>
    String(left.title).localeCompare(String(right.title)),
  );
  const nextIndex = buildIndex(nextCards);
  await putJson(bucket, "published/index.json", nextIndex);

  let nextAgenda = buildLearningAgenda({
    catalog,
    notebook,
    synthesis,
    index: nextIndex,
    enrichReport: report,
    previousAgenda: agenda,
  });

  const verification = verifyWeeklyTarget({
    weeklyTarget,
    index: nextIndex,
    synthesis,
    sustainReport: null,
  });
  weeklyTarget = {
    ...weeklyTarget,
    status: verification.passed ? "verified" : "active",
    verifiedAt: verification.passed
      ? verification.verifiedAt
      : weeklyTarget.verifiedAt,
    lastVerifiedAt: verification.verifiedAt,
  };
  nextAgenda = focusAgendaOnWeeklyTarget(nextAgenda, weeklyTarget, verification);

  await putJson(bucket, "pipeline/agenda.json", nextAgenda);
  await putJson(bucket, "pipeline/enrich-report.json", report);
  await putJson(bucket, "pipeline/weekly-target.json", weeklyTarget);
  await putJson(bucket, "pipeline/weekly-verification.json", verification);

  const state = {
    generatedAt: new Date().toISOString(),
    cycle: report.cycle,
    mode: "cloud-circle",
    weekId: weeklyTarget.weekId,
    weekly: {
      status: weeklyTarget.status,
      score: verification.score,
      passed: verification.passed,
      failed: verification.failed,
    },
    agendaBefore: agenda.summary,
    agendaAfter: nextAgenda.summary,
    teacher: {
      considered: report.considered,
      promoted: report.promoted,
      rejected: report.rejected.length,
    },
    pendingLocalStages: {
      librarian: nextAgenda.stages.librarian.slice(0, 12),
      scholar: nextAgenda.stages.scholar.slice(0, 12),
      researcher: nextAgenda.stages.researcher.slice(0, 12),
    },
    note: "Upload pipeline/{catalog,notes,synthesis}.json then run local library:week to pursue and fully verify librarian/scholar/researcher goals.",
  };
  await putJson(bucket, "pipeline/circle-state.json", state);
  await putJson(bucket, `reports/circle-${Date.now()}.json`, {
    report,
    state,
    verification,
  });

  return {
    ok: true,
    report,
    state,
    agenda: nextAgenda.summary,
    weekly: state.weekly,
  };
}

function pickProbeCards(index, count = TUTOR_PROBE_COUNT) {
  const cards = Array.isArray(index?.cards) ? index.cards : [];
  const sorted = [...cards].sort(
    (left, right) => (right.qualityScore ?? 0) - (left.qualityScore ?? 0),
  );
  return sorted.slice(0, count);
}

function tutorProbesFromCards(cards) {
  return cards.map((card) => ({
    question: `Explain ${card.title} with a practitioner spreadsheet walkthrough and one decision risk.`,
    cardId: card.id,
  }));
}

function scoreTutorShape(payload, coverage) {
  const answerOk = typeof payload?.answer === "string" && payload.answer.trim().length > 60;
  const visuals = Array.isArray(payload?.visuals) ? payload.visuals : [];
  const visualsOk = visuals.length >= 1;
  const fromLibrary = Array.isArray(payload?.fromLibrary) ? payload.fromLibrary : [];
  const fromLibraryOk = fromLibrary.length >= 1;
  const hasLibraryInvite = typeof payload?.libraryInvite === "string" && payload.libraryInvite.trim().length > 0;
  const hasPathsInvite = typeof payload?.pathsInvite === "string" && payload.pathsInvite.trim().length > 0;
  const invitePolicyOk =
    coverage === "thin"
      ? true
      : !hasLibraryInvite && !hasPathsInvite;
  const scoreParts = [answerOk, visualsOk, fromLibraryOk, invitePolicyOk];
  const score = scoreParts.filter(Boolean).length / scoreParts.length;
  return {
    answerOk,
    visualsOk,
    fromLibraryOk,
    invitePolicyOk,
    score: Number(score.toFixed(3)),
  };
}

async function runTutorConsistencyCheck(env, published) {
  const askUrl = typeof env.ASK_WORKER_URL === "string" ? env.ASK_WORKER_URL.trim() : "";
  if (!askUrl) {
    return {
      ok: false,
      skipped: true,
      reason: "ASK_WORKER_URL not configured",
      probes: [],
      score: 0,
    };
  }

  const probeCards = pickProbeCards(published, TUTOR_PROBE_COUNT);
  const probes = tutorProbesFromCards(probeCards);
  const outcomes = [];

  for (const probe of probes) {
    const card = probeCards.find((item) => item.id === probe.cardId);
    if (!card) continue;
    const cards = [card];
    const response = await fetch(`${askUrl.replace(/\/$/, "")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "premium",
        question: probe.question,
        cards,
        allowedCardIds: cards.map((item) => item.id),
        coverage: "mixed",
      }),
    });
    if (!response.ok) {
      outcomes.push({
        cardId: card.id,
        ok: false,
        status: response.status,
        score: 0,
      });
      continue;
    }
    const payload = await response.json();
    const shape = scoreTutorShape(payload, "mixed");
    outcomes.push({
      cardId: card.id,
      ok: true,
      score: shape.score,
      checks: shape,
    });
  }

  const mean =
    outcomes.length === 0
      ? 0
      : outcomes.reduce((sum, item) => sum + (item.score ?? 0), 0) / outcomes.length;
  return {
    ok: true,
    skipped: false,
    probes: outcomes,
    score: Number(mean.toFixed(3)),
    pass: mean >= 0.8,
  };
}

async function runContinuousImprovement(env) {
  const bucket = env.CORPUS_BUCKET;
  if (!bucket) {
    return { ok: false, error: "CORPUS_BUCKET binding missing" };
  }

  const startedAt = new Date().toISOString();
  const published =
    (await readJson(bucket, "published/index.json")) ||
    (await readJson(bucket, "index.json"));
  if (!published?.cards || !Array.isArray(published.cards)) {
    return { ok: false, error: "published index missing" };
  }

  const tutorConsistency = await runTutorConsistencyCheck(env, published);
  const learningCircle = await runLearningCircle(env);
  const weekly = await readJson(bucket, "pipeline/weekly-target.json");
  const weeklyVerification = await readJson(bucket, "pipeline/weekly-verification.json");

  const result = {
    ok: Boolean(learningCircle?.ok),
    startedAt,
    finishedAt: new Date().toISOString(),
    jobs: {
      tutorConsistency,
      expansion: learningCircle,
      continuity: {
        weeklyStatus: weekly?.status || "unknown",
        weeklyScore: weeklyVerification?.score ?? null,
      },
    },
  };

  await putJson(bucket, "pipeline/continuous-ops-state.json", result);
  await putJson(bucket, `reports/continuous-ops-${Date.now()}.json`, result);
  return result;
}

const worker = {
  async scheduled(_event, env) {
    return runContinuousImprovement(env);
  },

  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    if (url.pathname === "/corpus" && request.method === "GET") {
      if (!env.CORPUS_BUCKET) {
        return json({ error: "CORPUS_BUCKET binding missing" }, 503);
      }
      const corpus = await env.CORPUS_BUCKET.get("published/index.json");
      if (!corpus) return json({ error: "Published corpus missing" }, 404);
      return new Response(corpus.body, {
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
          ETag: corpus.httpEtag,
        },
      });
    }

    if (url.pathname === "/agenda" && request.method === "GET") {
      const agenda = await readJson(env.CORPUS_BUCKET, "pipeline/agenda.json");
      if (!agenda) return json({ error: "Agenda missing" }, 404);
      return json(agenda);
    }

    if (url.pathname === "/verify" && request.method === "POST") {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const cards = Array.isArray(payload?.cards) ? payload.cards : [];
      const claim =
        typeof payload?.claim === "string" ? payload.claim.trim() : "";
      const steps = Array.isArray(payload?.steps)
        ? payload.steps
        : claim
          ? [{ body: claim }]
          : [];
      if (steps.length === 0) {
        return json({ error: "steps or claim required" }, 400);
      }
      const verification = await verifyTutorSteps({
        steps,
        cards,
        bucket: env.CORPUS_BUCKET || null,
      });
      return json({ ok: true, verification });
    }

    if (url.pathname === "/weekly" && request.method === "GET") {
      const weekly = await readJson(
        env.CORPUS_BUCKET,
        "pipeline/weekly-target.json",
      );
      const verification = await readJson(
        env.CORPUS_BUCKET,
        "pipeline/weekly-verification.json",
      );
      if (!weekly) return json({ error: "Weekly target missing" }, 404);
      return json({ weekly, verification });
    }

    if (url.pathname === "/circle-state" && request.method === "GET") {
      const state = await readJson(
        env.CORPUS_BUCKET,
        "pipeline/circle-state.json",
      );
      if (!state) return json({ error: "Circle state missing" }, 404);
      return json(state);
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "merixa-ml-learn", mode: "learning-circle" });
    }

    if (url.pathname === "/circle" && request.method === "POST") {
      const result = await runLearningCircle(env);
      return json(result, result.ok ? 200 : 500);
    }

    if (url.pathname === "/continuous/run" && request.method === "POST") {
      const result = await runContinuousImprovement(env);
      return json(result, result.ok ? 200 : 500);
    }

    if (url.pathname === "/continuous/state" && request.method === "GET") {
      const state = await readJson(
        env.CORPUS_BUCKET,
        "pipeline/continuous-ops-state.json",
      );
      if (!state) return json({ error: "Continuous state missing" }, 404);
      return json(state);
    }

    // Back-compat with earlier enrich-only runner.
    if (url.pathname === "/run" && request.method === "POST") {
      const result = await runLearningCircle(env);
      return json(result, result.ok ? 200 : 500);
    }

    return json({ error: "Not found" }, 404);
  },
};

export default worker;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}
