#!/usr/bin/env node
/**
 * OpenAI deposit calculator — prepaid Premium Ask float (no API calls).
 *
 * Usage:
 *   node content/pipeline/openai-deposit-calculator.mjs
 *   node content/pipeline/openai-deposit-calculator.mjs --users=500
 *   node content/pipeline/openai-deposit-calculator.mjs --scenario=base --buffer=50
 *   node content/pipeline/openai-deposit-calculator.mjs --json
 *
 * Honesty: prepaid IAP revenue ≠ OpenAI deposit. Deposit covers API float
 * before renewals / Apple payout lag. Client expiry exists; server must still
 * reject Ask when entitlement is expired (see openai-deposit-plan.json).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAN_PATH = join(__dirname, "openai-deposit-plan.json");

/** @typedef {{ input: number, output: number }} TokenPair */
/** @typedef {{ input: number, output: number }} UsdPer1M */

const DEFAULTS = {
  priceGbpUnlock: 7.99,
  priceGbpPremiumMo: 7.99,
  dauRateAmongPremium: 0.25,
  asksPerDauPerDay: 3,
  heavyAskShare: 0.35,
  tokensPerAsk: {
    light: { input: 2800, output: 700 },
    coach: { input: 3200, output: 1400 },
  },
  usdPer1M: {
    gpt5: { input: 1.25, output: 10.0 },
    gpt5Mini: { input: 0.25, output: 2.0 },
  },
  retention: { d15: 0.55, d30: 0.4, d45: 0.18, d60: 0.12 },
  safetyBufferPct: 40,
  scenarios: {
    conservative: { cohortUsers: 50 },
    base: { cohortUsers: 200 },
    aggressive: { cohortUsers: 1000 },
  },
};

function loadPlanAssumptions() {
  try {
    const plan = JSON.parse(readFileSync(PLAN_PATH, "utf8"));
    const a = plan.assumptionsEditable;
    if (!a || typeof a !== "object") return { ...DEFAULTS };
    return {
      ...DEFAULTS,
      ...a,
      tokensPerAsk: { ...DEFAULTS.tokensPerAsk, ...(a.tokensPerAsk || {}) },
      usdPer1M: {
        gpt5: { ...DEFAULTS.usdPer1M.gpt5, ...(a.usdPer1M?.gpt5 || {}) },
        gpt5Mini: {
          ...DEFAULTS.usdPer1M.gpt5Mini,
          ...(a.usdPer1M?.gpt5Mini || {}),
        },
      },
      retention: { ...DEFAULTS.retention, ...(a.retention || {}) },
      scenarios: { ...DEFAULTS.scenarios, ...(a.scenarios || {}) },
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) {
      out[body] = true;
      continue;
    }
    out[body.slice(0, eq)] = body.slice(eq + 1);
  }
  return out;
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Piecewise-linear retention from known checkpoints.
 * After day 30, curve already encodes renew drop (OpenAI-entitled only).
 */
function retentionAtDay(day, retention) {
  const points = [
    [0, 1],
    [15, retention.d15],
    [30, retention.d30],
    [45, retention.d45],
    [60, retention.d60],
  ];
  if (day <= 0) return 1;
  if (day >= 60) return retention.d60;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [d0, r0] = points[i];
    const [d1, r1] = points[i + 1];
    if (day >= d0 && day <= d1) {
      const t = (day - d0) / (d1 - d0);
      return r0 + (r1 - r0) * t;
    }
  }
  return retention.d60;
}

/** @param {TokenPair} tokens @param {UsdPer1M} price */
function costPerAskUsd(tokens, price) {
  return (
    (tokens.input / 1_000_000) * price.input +
    (tokens.output / 1_000_000) * price.output
  );
}

function blendedAskCostUsd(assumptions) {
  const light = costPerAskUsd(
    assumptions.tokensPerAsk.light,
    assumptions.usdPer1M.gpt5Mini,
  );
  const coach = costPerAskUsd(
    assumptions.tokensPerAsk.coach,
    assumptions.usdPer1M.gpt5,
  );
  const h = clamp01(assumptions.heavyAskShare);
  return {
    lightUsd: light,
    coachUsd: coach,
    blendedUsd: light * (1 - h) + coach * h,
  };
}

function clamp01(x) {
  return Math.min(1, Math.max(0, Number(x) || 0));
}

function money(n) {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 100) return `$${n.toFixed(0)}`;
  if (a >= 10) return `$${n.toFixed(1)}`;
  if (a >= 1) return `$${n.toFixed(2)}`;
  if (a >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

function pct(n) {
  return `${(n * 100).toFixed(0)}%`;
}

function projectScenario(name, cohortUsers, assumptions) {
  const askCosts = blendedAskCostUsd(assumptions);
  const dailySpend = [];
  let cumulative = 0;

  for (let day = 1; day <= 60; day += 1) {
    const active = cohortUsers * retentionAtDay(day, assumptions.retention);
    const asks =
      active *
      assumptions.dauRateAmongPremium *
      assumptions.asksPerDauPerDay;
    const spend = asks * askCosts.blendedUsd;
    cumulative += spend;
    dailySpend.push({
      day,
      activePremiumUsers: active,
      estimatedAsks: asks,
      spendUsd: spend,
      cumulativeUsd: cumulative,
    });
  }

  const checkpoints = [15, 30, 45, 60].map((d) => {
    const row = dailySpend[d - 1];
    return {
      day: d,
      retention: retentionAtDay(d, assumptions.retention),
      activePremiumUsers: row.activePremiumUsers,
      cumulativeSpendUsd: row.cumulativeUsd,
      daySpendUsd: row.spendUsd,
    };
  });

  // Peak contiguous 30-day burn in the 60-day window.
  let peakMonthSpendUsd = 0;
  let peakMonthStartDay = 1;
  for (let start = 0; start <= 30; start += 1) {
    let sum = 0;
    for (let i = start; i < start + 30; i += 1) sum += dailySpend[i].spendUsd;
    if (sum > peakMonthSpendUsd) {
      peakMonthSpendUsd = sum;
      peakMonthStartDay = start + 1;
    }
  }

  const first30DayBurnUsd = dailySpend
    .slice(0, 30)
    .reduce((s, r) => s + r.spendUsd, 0);
  const bufferMult = 1 + assumptions.safetyBufferPct / 100;
  const recommendedDepositUsd =
    Math.max(peakMonthSpendUsd, first30DayBurnUsd) * bufferMult;

  // Illustrative prepaid gross (list, not Apple net) — NOT the deposit.
  const illustrativeGrossGbp =
    cohortUsers * assumptions.priceGbpUnlock;

  return {
    scenario: name,
    cohortUsers,
    askCosts,
    checkpoints,
    first30DayBurnUsd,
    peakMonthSpendUsd,
    peakMonthStartDay,
    cumulative60DayUsd: cumulative,
    safetyBufferPct: assumptions.safetyBufferPct,
    recommendedDepositUsd,
    illustrativeGrossGbp,
  };
}

function applyCliOverrides(base, args) {
  const next = structuredClone(base);
  if (args.dau != null) next.dauRateAmongPremium = num(args.dau, next.dauRateAmongPremium);
  if (args.asks != null) next.asksPerDauPerDay = num(args.asks, next.asksPerDauPerDay);
  if (args.heavy != null) next.heavyAskShare = num(args.heavy, next.heavyAskShare);
  if (args.buffer != null) next.safetyBufferPct = num(args.buffer, next.safetyBufferPct);
  if (args.r15 != null) next.retention.d15 = num(args.r15, next.retention.d15);
  if (args.r30 != null) next.retention.d30 = num(args.r30, next.retention.d30);
  if (args.r45 != null) next.retention.d45 = num(args.r45, next.retention.d45);
  if (args.r60 != null) next.retention.d60 = num(args.r60, next.retention.d60);
  if (args.users != null) {
    const n = Math.max(1, Math.round(num(args.users, 0)));
    if (n > 0) {
      next.scenarios = {
        custom: { cohortUsers: n },
        ...next.scenarios,
      };
    }
  }
  return next;
}

function printMarkdown(assumptions, results, focusScenario) {
  const sample = results[0];
  const lines = [];
  lines.push("# OpenAI deposit plan — prepaid Premium (full treatment)");
  lines.push("");
  lines.push(
    "**Honesty:** prepaid unlock/subscription revenue is not the OpenAI deposit. Deposit = API float (peak concurrent burn × buffer) before renewals and payout lag.",
  );
  lines.push("");
  lines.push("## Model");
  lines.push("");
  lines.push("| Knob | Default |");
  lines.push("|---|---|");
  lines.push(
    `| Unlock / Premium list | £${assumptions.priceGbpUnlock} once · £${assumptions.priceGbpPremiumMo}/mo |`,
  );
  lines.push(
    `| Product policy | Prepaid → **full Premium** (gpt-5-mini light + gpt-5 coach); after ~30d without renew → offline |`,
  );
  lines.push(
    `| Fair-use caps (client) | ${10} live/day · ${5} heavy/day (pace UX, not wallet) |`,
  );
  lines.push(
    `| Worker models / max_tokens | light gpt-5-mini ≤1200 · coach gpt-5 ≤1800 (multi-tab ≤2200) |`,
  );
  lines.push(
    `| DAU among Premium | ${pct(assumptions.dauRateAmongPremium)} |`,
  );
  lines.push(
    `| Asks / DAU / day | ${assumptions.asksPerDauPerDay} |`,
  );
  lines.push(
    `| Heavy ask share | ${pct(assumptions.heavyAskShare)} → gpt-5; rest → gpt-5-mini |`,
  );
  lines.push(
    `| Tokens/ask (in/out) | light ${assumptions.tokensPerAsk.light.input}/${assumptions.tokensPerAsk.light.output} · coach ${assumptions.tokensPerAsk.coach.input}/${assumptions.tokensPerAsk.coach.output} |`,
  );
  lines.push(
    `| $/1M in·out | gpt-5 $${assumptions.usdPer1M.gpt5.input}/$${assumptions.usdPer1M.gpt5.output} · mini $${assumptions.usdPer1M.gpt5Mini.input}/$${assumptions.usdPer1M.gpt5Mini.output} |`,
  );
  lines.push(
    `| Blended $/ask | ${money(sample.askCosts.blendedUsd)} (light ${money(sample.askCosts.lightUsd)} · coach ${money(sample.askCosts.coachUsd)}) |`,
  );
  lines.push(
    `| Retention d15/d30/d45/d60 | ${pct(assumptions.retention.d15)} / ${pct(assumptions.retention.d30)} / ${pct(assumptions.retention.d45)} / ${pct(assumptions.retention.d60)} |`,
  );
  lines.push(
    `| Safety buffer | ${assumptions.safetyBufferPct}% |`,
  );
  lines.push(
    `| Deposit formula | max(peak 30-day burn, first-30-day burn) × (1 + buffer) |`,
  );
  lines.push("");
  lines.push(
    "Retention after **d30** is renewers only for OpenAI (prepaid month ended → offline unless subscribed).",
  );
  lines.push("");
  const ceilingAskUsd =
    sample.askCosts.lightUsd * 0.5 + sample.askCosts.coachUsd * 0.5;
  const ceilingPerUserMonth =
    10 * 30 * ceilingAskUsd; /* fair-use 10/day, 50/50 light/heavy */
  lines.push(
    `**Fair-use ceiling stress (not the base case):** if one Premium user hits 10 asks/day for 30 days at ~50% heavy, OpenAI ≈ ${money(ceilingPerUserMonth)}/user/month. Base deposit uses DAU×asks intensity (${pct(assumptions.dauRateAmongPremium)} × ${assumptions.asksPerDauPerDay}/day), not the cap.`,
  );
  lines.push("");

  lines.push("## Active Premium users by day");
  lines.push("");
  lines.push(
    "| Scenario | Cohort N | Active d15 | Active d30 | Active d45 | Active d60 |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const r of results) {
    const by = Object.fromEntries(r.checkpoints.map((c) => [c.day, c]));
    lines.push(
      `| ${r.scenario} | ${r.cohortUsers} | ${Math.round(by[15].activePremiumUsers)} | ${Math.round(by[30].activePremiumUsers)} | ${Math.round(by[45].activePremiumUsers)} | ${Math.round(by[60].activePremiumUsers)} |`,
    );
  }
  lines.push("");

  lines.push("## OpenAI $ spend — cumulative & peak month");
  lines.push("");
  lines.push(
    "| Scenario | Cum. @15d | Cum. @30d | Cum. @45d | Cum. @60d | Peak 30d burn | Peak window |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---|");
  for (const r of results) {
    const by = Object.fromEntries(r.checkpoints.map((c) => [c.day, c]));
    lines.push(
      `| ${r.scenario} | ${money(by[15].cumulativeSpendUsd)} | ${money(by[30].cumulativeSpendUsd)} | ${money(by[45].cumulativeSpendUsd)} | ${money(by[60].cumulativeSpendUsd)} | ${money(r.peakMonthSpendUsd)} | d${r.peakMonthStartDay}–${r.peakMonthStartDay + 29} |`,
    );
  }
  lines.push("");

  lines.push("## Recommended deposit bands (USD)");
  lines.push("");
  lines.push(
    "| Scenario | First-30d burn | Peak-month burn | Buffer | **Recommended deposit** | Illustrative unlock gross (GBP, not deposit) |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const r of results) {
    const mark =
      focusScenario && r.scenario === focusScenario ? " ← focus" : "";
    lines.push(
      `| ${r.scenario}${mark} | ${money(r.first30DayBurnUsd)} | ${money(r.peakMonthSpendUsd)} | ${r.safetyBufferPct}% | **${money(r.recommendedDepositUsd)}** | £${r.illustrativeGrossGbp.toFixed(0)} |`,
    );
  }
  lines.push("");

  lines.push("## Entitlement auto-cease OpenAI");
  lines.push("");
  lines.push("| Layer | Status |");
  lines.push("|---|---|");
  lines.push(
    "| Client `expireAiIfNeeded` → `ai.kind=offline` after `expiresAt` | **Exists** (`store.ts`) |",
  );
  lines.push(
    "| Client stops offering live Ask when offline | **Exists** (EntitlementsProvider / Ask UI) |",
  );
  lines.push(
    "| Worker rejects Ask when entitlement expired | **Must build** — today only checks client-sent `tier:premium` (402 if missing); no `expiresAt` / session token |",
  );
  lines.push(
    "| Server daily caps / kill switch | **Must build** (see `premium-trial-cost-controls-plan.json`) |",
  );
  lines.push("");
  lines.push(
    "Until the server rejects expired entitlements, deposit math is a planning ceiling — abuse can still exceed it.",
  );
  lines.push("");

  lines.push("## Re-run with your own N users");
  lines.push("");
  lines.push("```bash");
  lines.push("node content/pipeline/openai-deposit-calculator.mjs");
  lines.push("node content/pipeline/openai-deposit-calculator.mjs --users=500");
  lines.push(
    "node content/pipeline/openai-deposit-calculator.mjs --users=500 --dau=0.3 --asks=4 --heavy=0.4 --buffer=50",
  );
  lines.push(
    "node content/pipeline/openai-deposit-calculator.mjs --r15=0.6 --r30=0.45 --r45=0.2 --r60=0.15",
  );
  lines.push("node content/pipeline/openai-deposit-calculator.mjs --json");
  lines.push("```");
  lines.push("");
  lines.push(
    "Edit defaults in `content/pipeline/openai-deposit-plan.json` → `assumptionsEditable`.",
  );
  lines.push("");

  return lines.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log(`OpenAI deposit calculator (no API calls)

Usage:
  node content/pipeline/openai-deposit-calculator.mjs [flags]

Flags:
  --users=N          Add/focus a custom cohort size (also keeps cons/base/agg)
  --scenario=name    Only print that scenario (conservative|base|aggressive|custom)
  --dau=0.25         DAU rate among active Premium
  --asks=3           Asks per DAU per day
  --heavy=0.35       Share of asks on gpt-5 coach lane
  --buffer=40        Safety buffer percent
  --r15= --r30= --r45= --r60=   Retention fractions
  --json             Emit JSON instead of markdown
  --help             This help
`);
    return;
  }

  const assumptions = applyCliOverrides(loadPlanAssumptions(), args);
  const scenarioNames = Object.keys(assumptions.scenarios);
  const focus = typeof args.scenario === "string" ? args.scenario : null;
  const names = focus
    ? scenarioNames.filter((n) => n === focus)
    : scenarioNames;

  if (names.length === 0) {
    console.error(
      `Unknown scenario "${focus}". Choose: ${scenarioNames.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  // If --users set, put custom first for readability.
  const ordered = [...names].sort((a, b) => {
    if (a === "custom") return -1;
    if (b === "custom") return 1;
    const order = { conservative: 0, base: 1, aggressive: 2 };
    return (order[a] ?? 9) - (order[b] ?? 9);
  });

  const results = ordered.map((name) =>
    projectScenario(name, assumptions.scenarios[name].cohortUsers, assumptions),
  );

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          assumptions,
          results,
          honesty:
            "prepaid revenue ≠ OpenAI deposit; deposit = peak/first-30 burn × buffer",
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(printMarkdown(assumptions, results, focus || (args.users ? "custom" : null)));
}

main();
