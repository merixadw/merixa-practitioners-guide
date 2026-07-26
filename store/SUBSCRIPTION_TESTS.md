# Subscription / IAP tests (P-Store)

Test in **Sandbox** (StoreKit Configuration file and/or Sandbox Apple ID) before
submit. Product IDs must match `src/lib/entitlements/products.ts`
(`npm run store:verify`).

**Sold in v1**

| Product | ID | Kind |
|---------|-----|------|
| Guide Unlock | `uk.co.merixa.practitionersguide.unlock` | Non-consumable |
| AI Premium | `uk.co.merixa.practitionersguide.ai.premium.monthly` | Auto-renewable |

**Legacy (restore only — not sold)**

| Product | ID |
|---------|-----|
| AI Lite | `uk.co.merixa.practitionersguide.ai.lite.monthly` |

**Subscription group:** Merixa AI Coach  
Unlock includes **30 days of AI Premium** from `unlockedAt` (`UNLOCK_PREMIUM_TRIAL_DAYS`).

## Prerequisites

- [ ] `npx cap add ios` done on a Mac; `npm run ios:sync`
- [ ] Xcode scheme → StoreKit Configuration = `storekit/Products.storekit`
- [ ] OR Sandbox tester on device with ASC products Created/Ready to Submit
- [ ] `NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL` points at deployed verify worker
- [ ] For local StoreKit-only QA you may use `NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true` — **never** in production / TestFlight external builds
- [ ] Production worker must **not** set `ALLOW_JWS_CLAIMS_ONLY=true`

## A. Unlock (non-consumable)

| Step | Action | Expect |
|---|---|---|
| A1 | Fresh install → paywall | Unlock CTA shown |
| A2 | Purchase Guide Unlock | AccessGate dismisses; Tutor/Library/Paths open |
| A3 | Immediately after unlock | AI tier behaves as Premium (included month) when clock allows |
| A4 | Kill app → relaunch | Still unlocked |
| A5 | Delete app → reinstall → Restore | Unlock restored with same Apple ID |

## B. AI Premium (sold)

| Step | Action | Expect |
|---|---|---|
| B1 | After included month ends (or force expiry in tests) → upgrade sheet | Premium CTA; Lite not offered for new purchase |
| B2 | Purchase AI Premium | Tier chip shows Premium |
| B3 | Ask a live question | Spreadsheet/visual answer when ask worker configured |
| B4 | Premium coach chips | Board pack / Judgement / Stress-test / etc. |
| B5 | Fair-use | Soft pace warning near ~10 asks / 5 heavy; Library stays open |

## C. Legacy Lite restore (optional)

| Step | Action | Expect |
|---|---|---|
| C1 | Device with historical Lite receipt → Restore | App grants online access per grandfathering rules; Lite not shown as a buy CTA |
| C2 | ASC: Lite unavailable for new purchases | Confirmed in ASC (`AI_LITE_SUNSET.md`) |

## D. Cancel

| Step | Action | Expect |
|---|---|---|
| D1 | iOS Settings → Apple ID → Subscriptions → cancel Premium | Access continues until period end (Apple rules) |
| D2 | After expiry | Offline coach; Guide unlock still held |
| D3 | No in-app “manage subscription” required | Review notes state Settings-only manage/cancel |

## E. Restore matrix

| State | Restore |
|---|---|
| Unlock only (included month active) | Guide open + Premium online |
| Unlock only (included month ended) | Guide open, AI offline until subscribe |
| Unlock + Premium sub | Premium live |
| Unlock + legacy Lite | Online per grandfathering |
| Expired AI, unlock kept | Offline coach |

## Sign-off

| Tester | Date | Sandbox / StoreKit | Pass |
|---|---|---|---|
| | | | |

Failures: note product ID, tier shown, verify worker status code, and device/OS.
