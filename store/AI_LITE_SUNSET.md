# AI Lite sunset — Offline + Premium only

**Decision:** Remove AI Lite from sale. Commercial offer is:

1. **Offline** — included with Guide unlock (on-device paced Tutor)
2. **AI Premium** — only online / live subscription

## Migration map (Lite → Offline / Premium)

| Former Lite surface | Destination |
|---|---|
| Live demo / At work / Challenge / Go deeper (live) | **AI Premium** coach actions + ask worker prompt |
| Paced lesson / quick check / worked example | **Offline** (already present; Go deeper added offline) |
| `gpt-5-mini` Lite model | Removed — online uses Premium model only |
| Upgrade sheet mid-tier | Removed — Offline vs Premium only |
| Product ID `…ai.lite.monthly` | **Legacy** — verify/restore only; not sold in-app |
| Active Lite receipts | Grandfathered as **Premium** entitlement until period ends |
| Client `tier: "lite"` | Ask worker aliases to Premium during sunset |

## Code touchpoints

- `src/lib/entitlements/*` — catalog, types, store, StoreKit
- `src/lib/guide/coach-actions.ts`, `ask.ts`, `recommend.ts`
- `src/components/AiUpgradeSheet.tsx`, `CoachActionStrip.tsx`, Tutor surfaces
- `workers/ask.js`, `wrangler.ask.toml`
- Legal: privacy / terms / support
- ASC: remove Lite from sale / set unavailable when renewals allow

## Ops

1. App Store Connect: stop selling Lite (remove from group or set unavailable for new buys)
2. Keep Lite product ID in IAP verify allowlist until last renewal ends
3. Redeploy ask worker after merge
4. Update listing screenshots/copy that mention three tiers
