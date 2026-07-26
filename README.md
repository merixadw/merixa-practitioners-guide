# Merixa Practitioner’s Guide

Mobile-first multi-body learning app owned by **Merixa ML**:
Tutor (home) → Library → Paths → Saved, all feeding the same coach.

## Product

| Item | Value |
|---|---|
| Guide unlock | £7.99 / €8.99 / $9.99 once — full Library / Paths / Saved |
| AI Premium | £7.99 / €8.99 / $9.99 mo — live coach (`gpt-5` / `gpt-5-mini`), ~10 asks/day · ≤5 heavy |
| Unlock product | `uk.co.merixa.practitionersguide.unlock` |
| Premium product | `uk.co.merixa.practitionersguide.ai.premium.monthly` |
| Legacy Lite (not sold) | `uk.co.merixa.practitionersguide.ai.lite.monthly` — restore/verify only |
| Billing | iOS StoreKit 2 via Capacitor + `@capgo/native-purchases` |
| Bodies | IFRS, CFA, FRM, IIA, CRMA, ACCA, CGMA |
| Not | Exam prep / mocks / tuition LMS |

### iOS billing (P0)

Native shell uses Capacitor (`capacitor.config.ts`, app id
`uk.co.merixa.practitionersguide`). Purchases go through StoreKit 2; entitlements
are written only after the IAP verify worker accepts the receipt/JWS.

```bash
# Deploy verify worker (secrets via wrangler)
npx wrangler secret put APPLE_ISSUER_ID --config wrangler.iap.toml
npx wrangler secret put APPLE_KEY_ID --config wrangler.iap.toml
npx wrangler secret put APPLE_PRIVATE_KEY --config wrangler.iap.toml
# optional legacy: APPLE_IAP_SHARED_SECRET
npm run iap:deploy

# On a Mac with Xcode:
npm run ios:sync          # next export → out/ → cap sync ios
npx cap add ios           # once, if ios/ missing
npx cap open ios
```

Point the app at the worker:

```bash
NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL=https://your-iap-verify.workers.dev
```

Local StoreKit Configuration file: `storekit/Products.storekit`
(attach in Xcode scheme for sandbox-free UI testing). For that path only, you may
set `ALLOW_JWS_CLAIMS_ONLY=true` on the worker and/or
`NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true` in the app — never in production.

## Screens

| Tab | Role |
|---|---|
| Tutor (`/`) | Merixa ML home — teach in short chat steps |
| Library | Concept browse, ranked from on-device habits |
| Paths | Workplace routes Merixa orders for you |
| Saved | On-device bookmarks + review with Merixa |

`/ask/` still opens Tutor (same chat). Concept detail lives under `/guide/[id]/`.

## Local commands

```bash
npm run extract          # PDF/DOCX/HTML text from allowlisted Codex roots
npm run library:rebuild  # Four-stage backline → content/index.json + agenda
npm run library:circle   # Continuous upgrade cycle across all 4 stages
npm run library:sustain  # Fetch/attach official professional-body websites
npm run library:week     # Plan weekly target, pursue, and fully verify
npm run library:verify   # Re-measure live corpus against this week's goals
npm run library:circle -- --cycles=3
npm run library:review   # Model editorial pass when OPENAI_API_KEY is set
npm run ingest:full      # extract + ingest + enrich
npm run dev
npm run build
```

`extract` reads sibling Codex / glossary sources and writes `content/raw-cache/`.
Pirate / commercial study-system paths are blocked.

`library:rebuild` runs the four-stage ML backline (`scripts/pipeline/run.mjs`).
Each stage writes a persistent artifact under `content/pipeline/`:

1. **Librarian** (`catalog.json`) — parses every source, records provenance,
   classifies the document, and rejects excluded or exam material.
2. **PhD student** (`notes.json`) — deep-reads each cataloged source into
   structured study notes: key sentences, standards cited, defined terms,
   evidence quote, and a study score. Garbled or weak sections are graded out.
3. **Researcher** (`synthesis.json`) — merges notes about the same concept
   across sources, raises confidence on corroboration, flags classification
   conflicts, and reports topic coverage gaps for the background regime.
4. **Teacher** — publishes teaching cards (summary, worked workplace example,
   common mistake, check question, cited quotes) to `content/corpus/` and
   `content/index.json`.

Rebuild also seeds `content/pipeline/agenda.json` — the work queue for the
learning circle.

### Learning circle (continuous upgrade)

`library:circle` runs one or more upgrade cycles through **all four stages**,
then sustains concepts from official professional-body websites:

```
gaps/conflicts/weak cards
        ↓
   build agenda
        ↓
 librarian → scholar → researcher → teacher → sustain bodies
        ↓
  write agenda + circle-state  →  next cycle continues
```

- Agenda items come from research gaps, classification conflicts, weak quality
  scores, enrichment failures, and body-sustain needs.
- `library:sustain` fetches public pages from IFRS, FRC, ACCA, CGMA, CFA, GARP,
  IIA, and CRMA into `content/raw-cache/` and attaches living website references
  to published cards.
- Unfinished work is carried into the next cycle at reduced priority.
- State lives in `content/pipeline/circle-state.json`.

### Weekly ML target (learn + fully verify)

Each ISO week Merixa ML gets a measurable target in
`content/pipeline/weekly-target.json`, then must **fully verify** it against
the live corpus (`content/pipeline/weekly-verification.json`).

Default weekly goals:
1. Close the top 3 research-gap topics to ≥ 3 concepts each
2. Reduce open classification conflicts to ≤ 5
3. Upgrade ≥ 20 weak cards to quality ≥ 0.78
4. Keep ≥ 85% of cards sustained with official body website references
5. Increase corroborated (multi-source) concepts by ≥ 2
6. Keep ≥ 4 professional bodies attached across the corpus

```bash
npm run library:week                 # plan + pursue (up to 5 cycles) + verify
npm run library:week -- --plan       # create/refresh this week's target only
npm run library:week -- --verify     # verify only (exit 1 if not met)
npm run library:week -- --cycles=3   # pursue with a cycle cap
```

Verification passes only when **every** goal passes. The learning circle and
Cloudflare worker both focus agenda work on failed weekly goals and record
weekly score in circle-state.

`library:review` upgrades machine-reviewed cards through Merixa ML. It rewrites titles
and context at practitioner level, then rejects drafts that fail citation, overlap,
length, or invented-standard checks.

Seed cards in `src/lib/guide/seed-cards.ts` are always merged at runtime.

## Merixa ML

### Tutor (live chat)
Set:

```bash
NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL=https://your-ask-worker.example
NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL=https://your-learn-worker.example/corpus
NEXT_PUBLIC_MERIXA_GUIDE_VERIFY_URL=https://your-learn-worker.example/verify
```

Worker: `workers/ask.js` (`npm run ask:deploy`, needs `OPENAI_API_KEY`).

Live asks require an **AI Premium** entitlement. The client sends
`tier: "premium"`; the worker returns a **direct answer** with visuals.
(Offline Tutor uses on-device paced lessons — no ask worker.)

### Online coach (P1)

| Mode | Role |
|---|---|
| Offline | Paced Library-style Tutor steps (included with Guide unlock) |
| AI Premium | Online coach — spreadsheet demos + judgement / board / stress modes |

Live replies use structured `visuals` (never prose-only). Prefer
`kind: "spreadsheet"` with coach steps the learner advances cell by cell.
Client renders them in Tutor via `TutorVisuals`; the ask worker requires and
sanitizes the schema. Offline users see locked Online chips that open the
upgrade sheet. See `store/AI_LITE_SUNSET.md` for the Lite removal map.

### Real workbooks (S0)

Spreadsheet demos export as real `.xlsx` (Working + Coach sheets). Use
**Save .xlsx** / **Share** on the sheet chrome — offline-safe, opens in
Excel/Numbers. See `store/WORKBOOKS.md` for Files-app Info.plist keys.

### Library-fed live answers (S1)

Live asks always retrieve Guide cards (and merge path focus when present).
The ask worker gets a coverage note + allowed card IDs; replies clamp
`cardId` / `pathId` to real Library and Paths IDs. Tutor shows **From Library**
chips on every live reply, plus Library + Paths journey invites. What’s new
offers a one-tap **Live demo** into Tutor for each new card.

### Breadth battle (S2)

Path shelves remap broken step IDs so flagship / IFRS / FRM / FA journeys stay
continueable. New flagship **Liquidity across bodies** stitches cash ↔ FRM
liquidity ↔ runway. Library shows body/domain density; weak/quarantined cards
stay hidden. Tutor starters rotate by preferred bodies. Spine awareness fill:
`npm run library:spine-awareness` (implication + trigger from At work / Watch for).

### Professor artefacts (S3)

Premium judgement / board / stress / harder / implication builds a **multi-tab
.xlsx** (Working / Checks / Watch-fors; board adds Memo). Harder example and
Implication drill always surface Save/Share. Lite stays on single Working+Coach
workbook — Premium chips remain upsell-gated.

### Expand Library + Paths together

Single orchestrator publishes encyclopedia cards and path JSON, optionally
drafts new cross-body routes with OpenAI, then enriches **path-linked** cards
first:

```bash
# .env.local: OPENAI_API_KEY=...
npm run library:expand
npm run library:expand -- --generate=2 --enrich-limit=80 --until-done
```

Edit `content/pipeline/expansion-agenda.json` for new cross-body path topics.
Reports: `content/pipeline/expand-library-paths-report.json`.

### Retention richness (P2)

| Feature | Behaviour |
|---|---|
| OTA What’s new | Corpus badge on Tutor; sheet lists new concepts since last open |
| Continue path | Tutor home resumes last path + step (offline or live demo) |
| Professor actions | Premium: Judgement, Harder example, Implication drill, Board pack, Stress-test |
| Soft fair-use | Premium daily pace reminder (client-side; not hard credits) |

Journey progress is stored on-device when opening Path steps or path-linked
Library cards. Corpus sighting uses `generatedAt` + known card ids.

### Polish / ship (P3)

App Store ship pack lives in `store/`:

| Doc | Purpose |
|---|---|
| `store/ASC_SETUP.md` | Bundle ID, app record, IAP + subscription group setup |
| `store/APP_STORE_CONNECT.md` | Listing copy, review notes, product IDs, prices |
| `store/SCREENSHOTS.md` | Device sizes + capture scenes (Mac Simulator) |
| `store/PRIVACY_NUTRITION.md` | App Privacy questionnaire answers |
| `store/SUBSCRIPTION_TESTS.md` | Unlock / Lite / Premium upgrade·downgrade·cancel QA |
| `store/WORKBOOKS.md` | S0 real `.xlsx` Save/Share + Files visibility |

**On Windows (done in-repo):** listing pack, privacy answers, StoreKit config,
legal copy aligned to daily Premium pace (not monthly burn).

**On a Mac + App Store Connect (you):**

```bash
npx cap add ios          # once
npm run ios:sync
npx cap open ios         # attach storekit/Products.storekit to scheme
```

Then create ASC products, capture screenshots, run `SUBSCRIPTION_TESTS.md`,
upload binary, submit.

The Tutor verifies teaching steps against official professional-body web sources
(IFRS, FRC, ACCA, CGMA, CFA, GARP/FRM, IIA, CRMA). Live workers fetch and cache
public body pages; offline mode scores against Guide cards and attached
`officialReferences`. Results appear under the final teaching step.

Without the worker, Tutor falls back to on-device retrieval + paced teaching steps that prefer workplace example fields.

### Learning circle (Cloudflare)

Scheduled learning circle owns continuous teaching upgrades — not chat fine-tuning.

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler r2 object put merixa-guide-corpus/published/index.json --file=content/index.json
npx wrangler r2 object put merixa-guide-corpus/pipeline/synthesis.json --file=content/pipeline/synthesis.json
npx wrangler r2 object put merixa-guide-corpus/pipeline/agenda.json --file=content/pipeline/agenda.json
npm run learn:deploy
```

Worker: `workers/learn.js` + `wrangler.toml` (cron every 6 hours).

Each cloud cycle:
1. Builds/refreshes the agenda from gaps, conflicts, weak cards, and failures
2. Runs the **teacher** upgrade on the highest-priority cards (draft → quality gate → publish)
3. Persists `pipeline/agenda.json` + `pipeline/circle-state.json` with unfinished
   librarian/scholar/researcher work carried forward for the next local
   `npm run library:circle`

Endpoints: `GET /corpus`, `GET /agenda`, `GET /circle-state`, `GET /weekly`, `POST /verify`, `POST /circle`.

`POST /verify` accepts `{ claim|steps, cards }` and returns body-web verification
citations from official professional-body pages (cached in R2 when available).

Usage habits (routes, filters, cards, ask themes) stay on-device and personalise
Library ranking, Paths order, starters, and retrieval over time.
