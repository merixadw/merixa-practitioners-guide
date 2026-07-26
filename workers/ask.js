/**
 * Merixa ML tutor worker — human teaching over Guide cards, verified
 * against official professional-body web sources.
 *
 * Env:
 * - OPENAI_API_KEY (required for live answers)
 * - OPENAI_BASE_URL (optional)
 * - OPENAI_MODEL_PREMIUM (optional, default gpt-5) — heavy coach lane
 * - OPENAI_MODEL_PREMIUM_LIGHT (optional, default gpt-5-mini) — plain Ask / quiz / Exam drill / short go-deeper
 * - OPENAI_MODEL (optional fallback for Premium coach)
 * - CORPUS_BUCKET (optional R2) — caches fetched body pages
 *
 * Online coach is Premium only. Legacy client tier "lite" aliases to Premium.
 */
import {
  formatEvidenceForPrompt,
  verifyTutorSteps,
} from "./lib/body-web-verify.mjs";

/**
 * Stable system prompt — keep this string byte-stable so OpenAI prompt caching
 * can reuse the prefix across turns (message[0] must stay identical).
 */
const PREMIUM_SYSTEM_PROMPT = `You are Merixa AI Premium — a senior training professor for the Practitioner's Guide (the only online coach tier).

Job
- Answer the learner's question directly and immediately, with professor-level depth and judgement.
- DEMONSTRATE with owners, numbers, and decisions — do NOT redefine the concept as a dictionary entry or restatement of the Library card.
- Do NOT run a paced Library lesson (no Definition → Technical note → At work → Watch for → Quick check → Source arc).
- When the learner arrives from Paths, deliver a professor-level live demonstration of that step — show the magic of live tutoring with visuals a senior would put on a whiteboard or in a pack.
- Match the coaching mode implied by the ask:
  • Plain Ask / quiz / Exam drill / short go deeper → clear answer WITH a compact visual (small table or one Working spreadsheet). Do NOT invent Checks/Watch-fors tabs.
  • Exam drill → LOS-style check: stem, what a weak answer chooses, model answer and why. Compact visual only. Not a board pack. Workplace brand stays workplace — this is an optional Premium drill mode.
  • Live demo / Spreadsheet demo / path demo → step-by-step Working spreadsheet (cells, figures, formula). Working sheet only unless multi-tab is required below.
  • Go deeper → one practical level further WITH a comparison table or compact Working sheet (no Checks/Watch-fors tabs).
  • Judgement call → competing options; recommendation in prose; REQUIRED spreadsheet with checksRows + watchForRows (multi-tab).
  • Board pack → pack-ready mini-artefact: REQUIRED spreadsheet (Working / Checks / Watch-fors) PLUS boardMemo (3–5 sentences a CFO could paste). Owner, evidence, decision, and one reverse-trigger. Never a prose-only paragraph.
  • Stress-test → trap shown before/after; REQUIRED checksRows + watchForRows.
  • Harder example / Implication drill → REQUIRED spreadsheet + checksRows + watchForRows (learner will Save/Share the .xlsx).
- Teach specialist depth in the answer. Only mention Library when coverage is thin; only mention Paths when path context is active.
- Retention loop (required): every reply must leave the learner one click deeper — end with a concrete next concept title or next path step. Put that next move in "suggest".

Refuse template voice
- If a Guide card uses filler like "covers X in domain: what it means, how it is measured…" or "is a practitioner concept in…", IGNORE that prose entirely.
- Never regurgitate template definitions. When Library text is thin or templated, say so briefly, then produce a fresh numbered demonstration grounded in the card title and any real traps/triggers supplied.
- fromLibrary / cardId MUST cite the supplied Guide card id(s) you actually used — never invent ids.

Visual demonstration (required — never prose-only)
- Every reply MUST include a "visuals" array with 1 item (2 only if a chart truly adds value).
- Prefer kind "spreadsheet" with at most 6 data rows and 3–6 coach steps.
- Multi-tab checksRows + watchForRows: ONLY for judgement, board pack, stress-test, harder example, and implication drill. Never for plain Ask, quiz, go deeper, or standard spreadsheet demo.
- Numbers may be illustrative; caption "Illustrative — adapt to your figures."
- Ground visuals in supplied Guide cards; do not invent standards absent from them.

Grounding
- Use ONLY supplied Guide cards and official body excerpts. Never invent standards or IFRS/IAS/FRS numbers absent from them.
- cardId MUST be one of the supplied Guide card ids. pathId must match the path context when provided.
- When relevant, fold implication-if-ignored and real-world triggers into the answer — do not turn them into separate lesson chapters.
- If cards are thin, say what Library has, then teach — never silently invent body numbers.

Voice
- Calm senior colleague: precise, professional, trade-offs and "what good looks like".
- No bullet walls. Prefer concrete owners, numbers, and decisions — shown visually. Exam drill is the only mode that uses LOS-style exam language; otherwise avoid exam marketing fluff.

Output
Return JSON only:
{"answer":"...","visuals":[...],"suggest":"...","cardId":"...","pathId":"...","libraryInvite":"...optional","pathsInvite":"...optional","fromLibrary":["card-id-1"],"boardMemo":"...optional for board pack..."}

answer: fuller specialist answer (up to ~180 words light / ~220 words coach) that answers first and frames the visual(s). Never a template definition restatement.
fromLibrary: 1–3 supplied card ids you actually used (required).
boardMemo: for board-pack asks only — 3–5 sentence memo (omit otherwise).
visuals: REQUIRED. For multi-tab modes only, include checksRows and watchForRows on the spreadsheet object.
suggest: one follow-up that keeps the learning cycle moving.
cardId / pathId: grounding only. libraryInvite / pathsInvite: omit unless coverage is thin or path context is active.

If you must use steps, return at most 2 — never the Library storyline titles — and attach visuals to the first step.`;

const PROMPT_CACHE_KEY = "merixa-premium-system-v4";

const TEMPLATE_VOICE_RE =
  /\bcovers\b[\s\S]{0,120}\bin\b[\s\S]{0,80}:\s*what it means,\s*how it is measured|\bis a practitioner concept in\b/i;

function looksLikeTemplateVoice(text) {
  return TEMPLATE_VOICE_RE.test(String(text || ""));
}

function scrubTemplateAnswer(answer, professorMode) {
  if (!looksLikeTemplateVoice(answer)) return answer;
  if (professorMode === "board") {
    return "Library text for this concept is thin or templated. Here is a fresh board-ready demonstration instead — use the spreadsheet and memo below; adapt the figures to your pack.";
  }
  return "Library text for this concept is thin or templated. Here is a fresh workplace demonstration instead — use the visual below and adapt the figures.";
}

function detectProfessorMode(question) {
  const q = String(question || "").toLowerCase();
  if (/implication drill|what breaks if ignored|real-world trigger/.test(q)) {
    return "implication";
  }
  if (/harder worked example|messier figures|harder example/.test(q)) {
    return "harder";
  }
  if (/stress-test|trap a weak answer|hard practitioner check/.test(q)) {
    return "stress";
  }
  if (
    /board-pack|board pack|pack-ready spreadsheet|owner, evidence, decision/.test(
      q,
    )
  ) {
    return "board";
  }
  if (/judgement call|competing options|what you would recommend/.test(q)) {
    return "judgement";
  }
  return "demo";
}

function wantsMultiTab(mode) {
  return (
    mode === "judgement" ||
    mode === "board" ||
    mode === "stress" ||
    mode === "harder" ||
    mode === "implication"
  );
}

function detectTutorCostLane(question) {
  const q = String(question || "").toLowerCase();
  if (
    /exam drill|los-style|quiz me|go one level deeper|explain .+ in plain language|in plain language for a practitioner/.test(
      q,
    )
  ) {
    return "light";
  }
  const mode = detectProfessorMode(question);
  if (wantsMultiTab(mode)) return "coach";
  if (
    /spreadsheet demo|live spreadsheet|step-through on a (?:live )?sheet|senior live spreadsheet|walk me through a working example step by step on a spreadsheet|multi-tab|\.xlsx|checksrows|watchforrows|paths journey|path journey|live path|senior live tutoring|live demonstration of “|live demonstration of "/.test(
      q,
    )
  ) {
    return "coach";
  }
  return "light";
}

function tutorMaxTokens(lane, mode) {
  if (lane === "light") return 1200;
  if (wantsMultiTab(mode)) return 2200;
  return 1800;
}

function resolveModel(env, lane) {
  if (lane === "light") {
    return (
      env.OPENAI_MODEL_PREMIUM_LIGHT ||
      env.OPENAI_MODEL_LIGHT ||
      "gpt-5-mini"
    );
  }
  return env.OPENAI_MODEL_PREMIUM || env.OPENAI_MODEL || "gpt-5";
}

const worker = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    const question =
      typeof payload?.question === "string" ? payload.question.trim() : "";
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    const habits =
      typeof payload?.habits === "string" ? payload.habits.trim() : "";
    const pace = typeof payload?.pace === "string" ? payload.pace.trim() : "";
    const history = Array.isArray(payload?.history) ? payload.history : [];
    const verifyOnly = payload?.mode === "verify";
    const tierRaw = typeof payload?.tier === "string" ? payload.tier : "";
    // Premium only; legacy "lite" aliases to Premium during grandfathering.
    const tier =
      tierRaw === "premium" || tierRaw === "lite" ? "premium" : null;

    if (verifyOnly) {
      const claim =
        typeof payload?.claim === "string" ? payload.claim.trim() : "";
      const steps = Array.isArray(payload?.steps)
        ? payload.steps
        : claim
          ? [{ body: claim }]
          : [];
      if (steps.length === 0 || cards.length === 0) {
        return json({ error: "steps/claim and cards are required" }, 400);
      }
      const verification = await verifyTutorSteps({
        steps,
        cards,
        bucket: env.CORPUS_BUCKET || null,
      });
      return json({ ok: true, verification });
    }

    if (!tier) {
      return json(
        {
          error: "AI Premium subscription required",
          detail: "Send tier: premium",
        },
        402,
      );
    }

    // Premium custom path composition — returns ordinary LearningPath JSON.
    if (payload?.mode === "compose_path") {
      if (!question || cards.length < 2) {
        return json(
          { error: "compose_path needs question and at least 2 cards" },
          400,
        );
      }
      if (!env.OPENAI_API_KEY) {
        return json({ error: "OPENAI_API_KEY not configured" }, 503);
      }
      const allowedCardIds = Array.isArray(payload?.allowedCardIds)
        ? payload.allowedCardIds.map((id) => String(id)).filter(Boolean)
        : cards.map((card) => String(card?.id || "")).filter(Boolean);
      const allowedSet = new Set(allowedCardIds);
      const catalog = cards
        .filter((card) => allowedSet.has(String(card?.id || "")))
        .slice(0, 6)
        .map((card, index) => {
          return [
            `[${index + 1}] id=${card.id}`,
            `title=${card.title}`,
            `bodies=${Array.isArray(card.bodies) ? card.bodies.join(",") : ""}`,
            String(card.teachingSummary || card.body || "").slice(0, 420),
          ].join("\n");
        })
        .join("\n\n");
      const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
        /\/$/,
        "",
      );
      const model =
        env.OPENAI_MODEL_PREMIUM_LIGHT ||
        env.OPENAI_MODEL_PREMIUM ||
        env.OPENAI_MODEL ||
        "gpt-5-mini";
      const composeSystem = `You are Merixa AI Premium path composer for the Practitioner's Guide.
Build ONE learning path that connects the learner's concepts in a senior practitioner teaching order.
Return JSON only:
{"path":{"id":"custom-kebab-id","title":"...","summary":"...","bodies":["IFRS"],"steps":[{"id":"s1","title":"...","summary":"...","cardId":"..."}]}}
Rules:
- Use ONLY cardId values from the allowed list.
- 3–7 steps; each step one cardId; no invented cardIds.
- Order = how a tutor would teach the connection (foundations → bridge → judgement).
- title/summary are workplace-facing, not exam marketing.
- Prefer bodies drawn from the supplied cards.`;
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          max_tokens: 1200,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: composeSystem },
            {
              role: "user",
              content: [
                `Learner ask: ${question}`,
                `Allowed cardId values: ${allowedCardIds.join(", ")}`,
                "Guide concepts:",
                catalog,
              ].join("\n\n"),
            },
          ],
        }),
      });
      if (!upstream.ok) {
        const detail = await upstream.text();
        return json(
          { error: "compose_path upstream failed", detail: detail.slice(0, 400) },
          502,
        );
      }
      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content || "";
      let parsed;
      try {
        parsed = JSON.parse(
          String(content)
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim(),
        );
      } catch {
        return json({ error: "compose_path returned non-JSON" }, 502);
      }
      const draft = parsed?.path;
      if (!draft || !Array.isArray(draft.steps)) {
        return json({ error: "compose_path missing path.steps" }, 502);
      }
      const steps = [];
      const seen = new Set();
      for (const [index, step] of draft.steps.entries()) {
        const cardId = String(step?.cardId || "");
        if (!allowedSet.has(cardId) || seen.has(cardId)) continue;
        seen.add(cardId);
        steps.push({
          id: String(step?.id || `s${index + 1}`).slice(0, 48),
          title: String(step?.title || cardId).slice(0, 120),
          summary: String(step?.summary || "").slice(0, 280),
          cardId,
        });
      }
      if (steps.length < 2) {
        return json({ error: "compose_path produced fewer than 2 valid steps" }, 502);
      }
      return json({
        ok: true,
        path: {
          id: String(draft.id || "").startsWith("custom-")
            ? String(draft.id)
            : `custom-${String(draft.title || "path")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 40)}`,
          title: String(draft.title || "Custom path").slice(0, 120),
          summary: String(draft.summary || "").slice(0, 320),
          bodies: Array.isArray(draft.bodies)
            ? draft.bodies.map(String).slice(0, 4)
            : ["Merixa"],
          steps,
        },
      });
    }

    if (!question || cards.length === 0) {
      return json({ error: "question and cards are required" }, 400);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY not configured" }, 503);
    }

    const professorMode =
      payload?.professorMode === "judgement" ||
      payload?.professorMode === "board" ||
      payload?.professorMode === "stress" ||
      payload?.professorMode === "harder" ||
      payload?.professorMode === "implication" ||
      payload?.professorMode === "demo"
        ? payload.professorMode
        : detectProfessorMode(question);
    const costLane =
      payload?.costLane === "light" || payload?.costLane === "coach"
        ? payload.costLane
        : detectTutorCostLane(question);
    const multiTab = wantsMultiTab(professorMode);
    const maxTokens = tutorMaxTokens(costLane, professorMode);
    const model = resolveModel(env, costLane);

    const preVerify = await verifyTutorSteps({
      steps: cards.slice(0, 3).map((card) => ({
        body: String(card.teachingSummary || card.body || "").slice(0, 360),
        cardId: card.id,
        title: card.title,
      })),
      cards,
      bucket: env.CORPUS_BUCKET || null,
    });
    const officialBlock = formatEvidenceForPrompt(preVerify);

    const context = cards
      .slice(0, costLane === "light" ? 3 : 5)
      .map((card, index) => {
        const defMax = costLane === "light" ? 500 : 900;
        const exMax = costLane === "light" ? 400 : 900;
        const parts = [
          `[${index + 1}] id=${card.id} ${card.title}`,
          String(card.teachingSummary || card.body || "").slice(0, defMax),
        ];
        if (card.workedExample) {
          parts.push(
            `Workplace example: ${String(card.workedExample).slice(0, exMax)}`,
          );
        }
        if (card.commonMistake) {
          parts.push(
            `Common mistake: ${String(card.commonMistake).slice(0, 480)}`,
          );
        }
        if (card.checkQuestion) {
          parts.push(
            `Check question: ${String(card.checkQuestion).slice(0, 220)}`,
          );
        }
        if (card.implicationIfIgnored) {
          parts.push(
            `If ignored: ${String(card.implicationIfIgnored).slice(0, 360)}`,
          );
        }
        if (card.realWorldTrigger) {
          parts.push(
            `Real-world trigger: ${String(card.realWorldTrigger).slice(0, 280)}`,
          );
        }
        if (Array.isArray(card.sourceQuotes) && card.sourceQuotes[0]) {
          parts.push(
            `Quote: ${String(card.sourceQuotes[0].text || "").slice(0, 400)}`,
          );
        }
        if (Array.isArray(card.workplaceTasks) && card.workplaceTasks.length > 0) {
          parts.push(
            `Tasks: ${card.workplaceTasks
              .map((task) => task?.label)
              .filter(Boolean)
              .slice(0, 3)
              .join("; ")}`,
          );
        }
        if (Array.isArray(card.sources) && card.sources[0]) {
          parts.push(`Source: ${card.sources[0].label || card.sources[0].path}`);
        }
        if (Array.isArray(card.officialReferences) && card.officialReferences[0]) {
          parts.push(
            `Official body: ${card.officialReferences
              .slice(0, 2)
              .map((ref) => `${ref.body} ${ref.url}`)
              .join("; ")}`,
          );
        }
        return parts.join("\n");
      })
      .join("\n\n");

    const prior = history
      .slice(costLane === "light" ? -4 : -8)
      .map((turn) => {
        const role = turn?.role === "tutor" ? "Tutor" : "Learner";
        const text = typeof turn?.text === "string" ? turn.text.trim() : "";
        return text ? `${role}: ${text}` : "";
      })
      .filter(Boolean)
      .join("\n");

    const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
      /\/$/,
      "",
    );
    const systemPrompt = PREMIUM_SYSTEM_PROMPT;
    const maxSteps = 2;
    const maxBody = costLane === "light" ? 900 : 1200;
    const maxVisuals = costLane === "light" ? 1 : 2;
    const closing = multiTab
      ? `Coach mode=${professorMode}. REQUIRED: visuals[] with kind spreadsheet including checksRows and watchForRows (multi-tab Working / Checks / Watch-fors). Max 6 data rows. Prefer JSON {"answer","visuals","suggest","cardId","pathId","fromLibrary"${professorMode === "board" ? ',"boardMemo"' : ""}}. Stay consistent with official excerpts.`
      : costLane === "light"
        ? `Light mode=${professorMode}. REQUIRED: visuals[] with ONE compact visual (small table or Working spreadsheet, max 6 rows). Do NOT include checksRows or watchForRows. Prefer JSON {"answer","visuals","suggest","cardId","pathId","fromLibrary"}. Stay consistent with official excerpts.`
        : `Coach demo mode=${professorMode}. REQUIRED: visuals[] with a Working spreadsheet (max 6 rows, 3–6 steps). Do NOT include checksRows or watchForRows. Prefer JSON {"answer","visuals","suggest","cardId","pathId","fromLibrary"}. Stay consistent with official excerpts.`;

    const pathCtx =
      payload?.pathContext && typeof payload.pathContext === "object"
        ? payload.pathContext
        : null;
    const pathBlock = pathCtx
      ? [
          "Path journey context (live demonstration of this step — optional pathsInvite only):",
          typeof pathCtx.pathId === "string" ? `pathId=${pathCtx.pathId}` : "",
          typeof pathCtx.pathTitle === "string"
            ? `pathTitle=${pathCtx.pathTitle}`
            : "",
          typeof pathCtx.cardId === "string"
            ? `focusCardId=${pathCtx.cardId}`
            : "",
          typeof pathCtx.stepId === "string" ? `stepId=${pathCtx.stepId}` : "",
          typeof pathCtx.stepTitle === "string"
            ? `stepTitle=${pathCtx.stepTitle}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const allowedCardIds = Array.isArray(payload?.allowedCardIds)
      ? payload.allowedCardIds.map((id) => String(id)).filter(Boolean)
      : cards.map((card) => String(card?.id || "")).filter(Boolean);
    const coverageNote =
      typeof payload?.coverageNote === "string" && payload.coverageNote.trim()
        ? payload.coverageNote.trim()
        : "";
    const allowedBlock = allowedCardIds.length
      ? `Allowed cardId values (pick one for cardId; list used ids in fromLibrary): ${allowedCardIds.join(", ")}`
      : "";

    const coverage =
      payload?.coverage === "rich" ||
      payload?.coverage === "mixed" ||
      payload?.coverage === "thin"
        ? payload.coverage
        : "mixed";
    const pathActive = Boolean(pathCtx?.pathId);

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: costLane === "light" ? 0.35 : 0.4,
        max_tokens: maxTokens,
        prompt_cache_key: PROMPT_CACHE_KEY,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              habits ? `Learner profile (on-device, anonymous):\n${habits}` : "",
              pace ? `Pace preference: ${pace}` : "",
              prior ? `Recent conversation:\n${prior}` : "",
              pathBlock,
              coverageNote,
              allowedBlock,
              `Learner just asked:\n${question}`,
              `Guide cards you may teach from:\n${context}`,
              officialBlock
                ? `Official professional-body web excerpts for verification:\n${officialBlock}`
                : "",
              closing,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json(
        { error: "Upstream model failure", detail: detail.slice(0, 500) },
        502,
      );
    }

    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return json({ error: "Empty model response" }, 502);

    const cleaned = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      const journey = readJourney(parsed, {
        allowedCardIds,
        pathId:
          typeof pathCtx?.pathId === "string" ? pathCtx.pathId : undefined,
        focusCardId:
          typeof pathCtx?.cardId === "string"
            ? pathCtx.cardId
            : allowedCardIds[0],
        coverage,
        pathActive,
        pinnedCardId:
          typeof pathCtx?.cardId === "string" ? pathCtx.cardId : undefined,
      });
      const topVisuals = sanitizeVisuals(parsed?.visuals, maxVisuals, {
        multiTab,
      });
      if (typeof parsed?.answer === "string" && parsed.answer.trim()) {
        const answer = scrubTemplateAnswer(
          String(parsed.answer).trim().slice(0, maxBody),
          professorMode,
        );
        const suggest =
          typeof parsed.suggest === "string"
            ? String(parsed.suggest).slice(0, 160)
            : undefined;
        const cardId = journey.cardId;
        const boardMemo =
          multiTab &&
          professorMode === "board" &&
          typeof parsed?.boardMemo === "string"
            ? String(parsed.boardMemo).trim().slice(0, 900)
            : multiTab && professorMode === "board"
              ? "Owner: [name]. Evidence: [appendix / working]. Decision: keep / escalate / remediate. Reverse trigger: [what would change the call this period]."
              : undefined;
        const steps = [
          {
            title: "Answer",
            body: answer,
            suggest,
            cardId,
            visuals: topVisuals,
            professorMode,
            ...(boardMemo ? { boardMemo } : {}),
          },
        ];
        const verification = await verifyTutorSteps({
          steps,
          cards,
          bucket: env.CORPUS_BUCKET || null,
        });
        return json({
          answer,
          visuals: topVisuals,
          steps,
          verification,
          tier,
          model,
          costLane,
          professorMode,
          maxTokens,
          coverage: payload?.coverage || undefined,
          fromLibrary: journey.fromLibrary,
          usage: data?.usage ?? null,
          ...(boardMemo ? { boardMemo } : {}),
          ...journey,
          cardId,
        });
      }
      if (Array.isArray(parsed?.steps) && parsed.steps.length > 0) {
        const boardMemo =
          multiTab &&
          professorMode === "board" &&
          typeof parsed?.boardMemo === "string"
            ? String(parsed.boardMemo).trim().slice(0, 900)
            : undefined;
        const steps = parsed.steps.slice(0, maxSteps).map((step, index) => {
          const stepVisuals =
            index === 0
              ? sanitizeVisuals(step.visuals || topVisuals, maxVisuals, {
                  multiTab,
                })
              : sanitizeVisuals(step.visuals, 1, { multiTab });
          const stepCard =
            step.cardId && allowedCardIds.includes(String(step.cardId))
              ? String(step.cardId).slice(0, 80)
              : journey.cardId;
          return {
            title: String(
              step.title || (index === 0 ? "Answer" : "Going deeper"),
            ).slice(0, 64),
            body: String(step.body || "").slice(0, maxBody),
            suggest: step.suggest
              ? String(step.suggest).slice(0, 160)
              : undefined,
            cardId: stepCard,
            visuals: stepVisuals,
            professorMode,
            ...(index === 0 && boardMemo ? { boardMemo } : {}),
          };
        });
        const verification = await verifyTutorSteps({
          steps,
          cards,
          bucket: env.CORPUS_BUCKET || null,
        });
        return json({
          steps,
          visuals: steps[0]?.visuals || [],
          verification,
          tier,
          model,
          costLane,
          professorMode,
          maxTokens,
          coverage: payload?.coverage || undefined,
          fromLibrary: journey.fromLibrary,
          usage: data?.usage ?? null,
          ...(boardMemo ? { boardMemo } : {}),
          ...journey,
        });
      }
    } catch {
      // Fall through to plain answer for client-side handling.
    }

    const fallbackJourney = readJourney(
      {},
      {
        allowedCardIds,
        pathId:
          typeof pathCtx?.pathId === "string" ? pathCtx.pathId : undefined,
        focusCardId: allowedCardIds[0],
        coverage,
        pathActive,
        pinnedCardId:
          typeof pathCtx?.cardId === "string" ? pathCtx.cardId : undefined,
      },
    );
    const verification = await verifyTutorSteps({
      steps: [{ body: cleaned.slice(0, maxBody) }],
      cards,
      bucket: env.CORPUS_BUCKET || null,
    });
    return json({
      answer: cleaned.slice(0, maxBody),
      steps: [
        {
          title: "Answer",
          body: cleaned.slice(0, maxBody),
          cardId: fallbackJourney.cardId,
        },
      ],
      verification,
      tier,
      model,
      ...fallbackJourney,
    });
  },
};

export default worker;

function readJourney(parsed, opts = {}) {
  const allowed = Array.isArray(opts.allowedCardIds)
    ? opts.allowedCardIds.map(String)
    : [];
  const coverage =
    opts.coverage === "rich" ||
    opts.coverage === "mixed" ||
    opts.coverage === "thin"
      ? opts.coverage
      : "mixed";
  const pathActive = Boolean(opts.pathActive);
  const pinnedCardId =
    typeof opts.pinnedCardId === "string" ? opts.pinnedCardId : undefined;
  const focus =
    typeof opts.focusCardId === "string" && allowed.includes(opts.focusCardId)
      ? opts.focusCardId
      : allowed[0];
  const rawCard =
    typeof parsed?.cardId === "string" ? String(parsed.cardId).slice(0, 80) : "";
  const cardId = allowed.includes(rawCard) ? rawCard : focus;

  const rawPath =
    typeof parsed?.pathId === "string" ? String(parsed.pathId).slice(0, 80) : "";
  const pathId =
    typeof opts.pathId === "string" && opts.pathId
      ? opts.pathId
      : rawPath || undefined;

  const fromRaw = Array.isArray(parsed?.fromLibrary) ? parsed.fromLibrary : [];
  const fromLibrary = [
    ...new Set(
      fromRaw
        .map((id) => String(id))
        .filter((id) => allowed.includes(id))
        .slice(0, 3),
    ),
  ];
  if (fromLibrary.length === 0 && cardId) fromLibrary.push(cardId);
  for (const id of allowed) {
    if (fromLibrary.length >= 3) break;
    if (!fromLibrary.includes(id)) fromLibrary.push(id);
  }

  const libraryInvite =
    coverage === "thin" || pinnedCardId
      ? typeof parsed?.libraryInvite === "string"
        ? String(parsed.libraryInvite).slice(0, 180)
        : coverage === "thin"
          ? "Library has a thin note here — open the card for the paced version."
          : undefined
      : undefined;

  const pathsInvite = pathActive
    ? typeof parsed?.pathsInvite === "string"
      ? String(parsed.pathsInvite).slice(0, 180)
      : "Next on this path when you are ready."
    : undefined;

  return {
    cardId,
    pathId,
    fromLibrary: fromLibrary.slice(0, 3),
    ...(libraryInvite ? { libraryInvite } : {}),
    ...(pathsInvite ? { pathsInvite } : {}),
  };
}

function clipStr(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function asNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.replace(/,/g, "").trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Cap and validate model visuals before returning to the client. */
function sanitizeVisuals(raw, max = 2, options = {}) {
  const multiTab = Boolean(options.multiTab);
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;
    const kind = clipStr(item.kind || item.type, 24).toLowerCase();
    if (kind === "table") {
      const title = clipStr(item.title, 80);
      const headers = (Array.isArray(item.headers) ? item.headers : [])
        .map((h) => clipStr(h, 72))
        .filter(Boolean)
        .slice(0, 5);
      if (!title || headers.length < 2) continue;
      const rows = [];
      for (const row of (Array.isArray(item.rows) ? item.rows : []).slice(0, 6)) {
        if (!Array.isArray(row)) continue;
        const cells = row
          .map((c) => clipStr(c, 72) || "—")
          .slice(0, headers.length);
        while (cells.length < headers.length) cells.push("—");
        rows.push(cells);
      }
      if (rows.length === 0) continue;
      const caption = clipStr(item.caption, 160);
      out.push({
        kind: "table",
        title,
        headers,
        rows,
        ...(caption ? { caption } : {}),
      });
      continue;
    }
    if (
      kind === "chart" ||
      kind === "bar" ||
      kind === "line" ||
      kind === "waterfall" ||
      kind === "compare"
    ) {
      const title = clipStr(item.title, 80);
      if (!title) continue;
      const chartType =
        kind === "line" || kind === "waterfall" || kind === "compare"
          ? kind
          : item.chartType === "line" ||
              item.chartType === "waterfall" ||
              item.chartType === "compare"
            ? item.chartType
            : "bar";
      const pointsRaw = Array.isArray(item.points)
        ? item.points
        : Array.isArray(item.series)
          ? item.series
          : [];
      const points = [];
      for (const point of pointsRaw.slice(0, 8)) {
        if (!point || typeof point !== "object") continue;
        const label = clipStr(point.label || point.name, 48);
        const value = asNum(point.value ?? point.amount);
        if (!label || value === null) continue;
        const note = clipStr(point.note, 100);
        points.push({
          label,
          value,
          ...(note ? { note } : {}),
        });
      }
      if (points.length < 2) continue;
      const unit = clipStr(item.unit, 24);
      const caption = clipStr(item.caption, 160);
      out.push({
        kind: "chart",
        title,
        chartType,
        points,
        ...(unit ? { unit } : {}),
        ...(caption ? { caption } : {}),
      });
      continue;
    }
    if (kind === "worksheet" || kind === "working" || kind === "example") {
      const title = clipStr(item.title, 80);
      if (!title) continue;
      const lines = [];
      for (const line of (Array.isArray(item.lines) ? item.lines : []).slice(
        0,
        10,
      )) {
        if (!line || typeof line !== "object") continue;
        const label = clipStr(line.label, 48);
        if (!label) continue;
        const amount = clipStr(line.amount ?? line.value, 32) || "—";
        const note = clipStr(line.note, 100);
        lines.push({
          label,
          amount,
          ...(note ? { note } : {}),
        });
      }
      if (lines.length < 2) continue;
      const result =
        clipStr(item.result ?? item.total, 72) ||
        "Illustrative working — adapt to your figures.";
      const caption = clipStr(item.caption, 160);
      out.push({
        kind: "worksheet",
        title,
        lines,
        result,
        ...(caption ? { caption } : {}),
      });
      continue;
    }
    if (
      kind === "spreadsheet" ||
      kind === "sheet" ||
      kind === "excel" ||
      kind === "workbook"
    ) {
      const title = clipStr(item.title, 80);
      const columns = (
        Array.isArray(item.columns)
          ? item.columns
          : Array.isArray(item.headers)
            ? item.headers
            : []
      )
        .map((c) => clipStr(c, 72))
        .filter(Boolean)
        .slice(0, 5);
      if (!title || columns.length < 2) continue;
      const rows = [];
      for (const row of (Array.isArray(item.rows) ? item.rows : []).slice(0, 8)) {
        if (!Array.isArray(row)) continue;
        const cells = row
          .map((c) => clipStr(c, 72) || "—")
          .slice(0, columns.length);
        while (cells.length < columns.length) cells.push("—");
        rows.push(cells);
      }
      if (rows.length < 2) continue;
      const steps = [];
      for (const step of (Array.isArray(item.steps) ? item.steps : []).slice(
        0,
        8,
      )) {
        if (!step || typeof step !== "object") continue;
        const coach = clipStr(step.coach || step.narration || step.label, 200);
        if (!coach) continue;
        const revealRaw = asNum(step.revealThrough ?? step.reveal ?? step.rows);
        const revealThrough = Math.min(
          rows.length,
          Math.max(1, Math.round(revealRaw ?? steps.length + 1)),
        );
        const highlightRaw = asNum(step.highlightRow ?? step.row);
        const highlightRow =
          highlightRaw === null
            ? revealThrough - 1
            : Math.min(rows.length - 1, Math.max(0, Math.round(highlightRaw)));
        const formula = clipStr(step.formula, 64);
        steps.push({
          coach,
          revealThrough,
          highlightRow,
          ...(formula ? { formula } : {}),
        });
      }
      const resolvedSteps =
        steps.length >= 2
          ? steps
          : rows.map((row, index) => ({
              coach: `Enter ${row[0] || `row ${index + 1}`} into the sheet.`,
              revealThrough: index + 1,
              highlightRow: index,
            }));
      const caption = clipStr(item.caption, 160);
      const sideSheet = (rawRows) => {
        if (!Array.isArray(rawRows) || rawRows.length === 0) return null;
        const sheetOut = [];
        for (const row of rawRows.slice(0, 6)) {
          if (!Array.isArray(row)) continue;
          const cells = row.map((c) => clipStr(c, 72) || "—").slice(0, 4);
          while (cells.length < 2) cells.push("—");
          sheetOut.push(cells);
        }
        return sheetOut.length >= 2 ? sheetOut : null;
      };
      const checks = multiTab
        ? sideSheet(item.checks || item.checksRows)
        : null;
      const watchFors = multiTab
        ? sideSheet(item.watchFors || item.watchForRows)
        : null;
      out.push({
        kind: "spreadsheet",
        title,
        columns,
        rows,
        steps: resolvedSteps.slice(0, 6),
        ...(caption ? { caption } : {}),
        ...(checks ? { checks, checksRows: checks } : {}),
        ...(watchFors ? { watchFors, watchForRows: watchFors } : {}),
      });
    }
  }
  return out;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
