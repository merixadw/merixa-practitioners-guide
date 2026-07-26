/**
 * Daily OpenAI token budget for Guide pipelines.
 * Default: 200_000 tokens/day with a safety reserve and job allocations.
 *
 * Env:
 *   OPENAI_DAILY_TOKEN_BUDGET=200000
 *   OPENAI_DAILY_TOKEN_RESERVE=10000   // never spend this slice
 *   OPENAI_TOKEN_BUDGET_DISABLED=1    // bypass gates
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const DEFAULT_DAILY_BUDGET = 200_000;
export const DEFAULT_RESERVE = 10_000;

/** Job keys used by pipelines + daily spend orchestrator */
export const JOBS = Object.freeze({
  enrich: "library_enrich",
  shelves: "encyclopedia_shelves",
  generate: "cross_body_generate",
  deepen: "deepen_content",
  tutor: "tutor_consistency",
  continuous: "continuous_improvement",
});

/**
 * Target mix of the *spendable* budget (budget − reserve).
 * Tuned for thin heuristic shelf cards after offline 500-card fill.
 */
export const DEFAULT_ALLOCATION = Object.freeze({
  [JOBS.enrich]: 0.62,
  [JOBS.shelves]: 0.12,
  [JOBS.tutor]: 0.12,
  [JOBS.generate]: 0.07,
  [JOBS.deepen]: 0.04,
  [JOBS.continuous]: 0.03,
});

/** Conservative fallback when API omits usage */
export const ESTIMATE_PER_CALL = Object.freeze({
  [JOBS.enrich]: 2_800,
  [JOBS.shelves]: 3_200,
  [JOBS.generate]: 2_400,
  [JOBS.deepen]: 2_600,
  [JOBS.tutor]: 1_800,
  [JOBS.continuous]: 1_200,
});

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function emptyDay(day, budget, reserve) {
  return {
    day,
    budget,
    reserve,
    spendable: Math.max(0, budget - reserve),
    used: 0,
    byJob: {},
    calls: 0,
    stoppedReason: null,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveBudgetConfig(env = process.env) {
  const budget = Math.max(
    1_000,
    Number(env.OPENAI_DAILY_TOKEN_BUDGET || DEFAULT_DAILY_BUDGET) ||
      DEFAULT_DAILY_BUDGET,
  );
  const reserve = Math.max(
    0,
    Math.min(
      budget - 1_000,
      Number(env.OPENAI_DAILY_TOKEN_RESERVE || DEFAULT_RESERVE) ||
        DEFAULT_RESERVE,
    ),
  );
  return {
    budget,
    reserve,
    spendable: budget - reserve,
    disabled: env.OPENAI_TOKEN_BUDGET_DISABLED === "1",
  };
}

export function budgetStatePath(pipelineDir) {
  return join(pipelineDir, "openai-daily-token-budget.json");
}

export function loadBudgetState(pipelineDir, env = process.env) {
  const { budget, reserve, spendable, disabled } = resolveBudgetConfig(env);
  const path = budgetStatePath(pipelineDir);
  const day = utcDayKey();
  if (!existsSync(path)) {
    return { path, state: emptyDay(day, budget, reserve), disabled };
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (raw?.day !== day) {
      return { path, state: emptyDay(day, budget, reserve), disabled };
    }
    return {
      path,
      disabled,
      state: {
        ...emptyDay(day, budget, reserve),
        ...raw,
        budget,
        reserve,
        spendable,
        byJob: raw.byJob && typeof raw.byJob === "object" ? raw.byJob : {},
      },
    };
  } catch {
    return { path, state: emptyDay(day, budget, reserve), disabled };
  }
}

export function saveBudgetState(path, state) {
  ensureDir(path);
  writeFileSync(
    path,
    `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

export function remainingSpendable(state) {
  return Math.max(0, (state.spendable || 0) - (state.used || 0));
}

export function jobUsed(state, job) {
  return Number(state.byJob?.[job] || 0);
}

export function jobAllocationTokens(state, job, allocation = DEFAULT_ALLOCATION) {
  const share = allocation[job] ?? 0;
  return Math.floor((state.spendable || 0) * share);
}

export function jobRemaining(state, job, allocation = DEFAULT_ALLOCATION) {
  return Math.max(
    0,
    jobAllocationTokens(state, job, allocation) - jobUsed(state, job),
  );
}

/**
 * How many more API calls of this job are allowed under daily + job caps.
 */
export function maxCallsAllowed(state, job, opts = {}) {
  const {
    disabled = false,
    estimatePerCall = ESTIMATE_PER_CALL[job] || 2_500,
    allocation = DEFAULT_ALLOCATION,
    respectJobCap = true,
  } = opts;
  if (disabled) return Number.POSITIVE_INFINITY;
  const globalLeft = remainingSpendable(state);
  const jobLeft = respectJobCap
    ? jobRemaining(state, job, allocation)
    : globalLeft;
  const left = Math.min(globalLeft, jobLeft);
  if (left < estimatePerCall * 0.55) return 0;
  return Math.floor(left / estimatePerCall);
}

export function canAfford(state, job, opts = {}) {
  return maxCallsAllowed(state, job, opts) > 0;
}

export function extractUsageTokens(apiJson) {
  const u = apiJson?.usage;
  if (!u || typeof u !== "object") return null;
  const total = Number(u.total_tokens);
  if (Number.isFinite(total) && total > 0) return Math.floor(total);
  const prompt = Number(u.prompt_tokens) || 0;
  const completion = Number(u.completion_tokens) || 0;
  const sum = prompt + completion;
  return sum > 0 ? sum : null;
}

/**
 * Record spend after a successful (or billed) API call.
 * Uses real usage when present; otherwise estimate.
 */
export function recordSpend(pipelineDir, job, tokensOrNull, env = process.env) {
  const { path, state, disabled } = loadBudgetState(pipelineDir, env);
  if (disabled) {
    return { path, state, recorded: 0, disabled: true };
  }
  const tokens = Math.max(
    0,
    Math.floor(
      Number(tokensOrNull) || ESTIMATE_PER_CALL[job] || 2_500,
    ),
  );
  state.used = (state.used || 0) + tokens;
  state.calls = (state.calls || 0) + 1;
  state.byJob = state.byJob || {};
  state.byJob[job] = (state.byJob[job] || 0) + tokens;
  if (remainingSpendable(state) <= 0) {
    state.stoppedReason = "daily_spendable_exhausted";
  }
  saveBudgetState(path, state);
  return { path, state, recorded: tokens, disabled: false };
}

export function budgetSnapshot(pipelineDir, env = process.env) {
  const { path, state, disabled } = loadBudgetState(pipelineDir, env);
  const rem = remainingSpendable(state);
  const jobs = {};
  for (const job of Object.values(JOBS)) {
    const alloc = jobAllocationTokens(state, job);
    const used = jobUsed(state, job);
    jobs[job] = {
      allocated: alloc,
      used,
      remaining: Math.max(0, alloc - used),
      maxCallsLeft: maxCallsAllowed(state, job, { disabled }),
      estimatePerCall: ESTIMATE_PER_CALL[job],
    };
  }
  return {
    path,
    disabled,
    day: state.day,
    budget: state.budget,
    reserve: state.reserve,
    spendable: state.spendable,
    used: state.used,
    remaining: rem,
    utilizationPct: state.spendable
      ? Math.round((state.used / state.spendable) * 1000) / 10
      : 0,
    calls: state.calls,
    stoppedReason: state.stoppedReason,
    jobs,
    updatedAt: state.updatedAt,
  };
}

export function formatBudgetLine(snap) {
  if (snap.disabled) return "token-budget: DISABLED";
  return (
    `token-budget day=${snap.day} used=${snap.used}/${snap.spendable}` +
    ` (${snap.utilizationPct}%) reserve=${snap.reserve}` +
    ` remaining=${snap.remaining} calls=${snap.calls}`
  );
}
