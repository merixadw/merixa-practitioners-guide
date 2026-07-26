# Subscription group tests (P3)

Test in **Sandbox** (StoreKit Configuration file and/or Sandbox Apple ID) before
submit. Product IDs must match `src/lib/entitlements/products.ts`.

**Group:** Merixa AI Coach  
**Levels:** AI Lite (lower) → AI Premium (higher)

## Prerequisites

- [ ] `npx cap add ios` done on a Mac; `npm run ios:sync`
- [ ] Xcode scheme → StoreKit Configuration = `storekit/Products.storekit`
- [ ] OR Sandbox tester on device with ASC products Created/Ready to Submit
- [ ] `NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL` points at deployed verify worker
- [ ] For local StoreKit-only QA you may use `NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true` — **never** in production builds

## A. Unlock (non-consumable)

| Step | Action | Expect |
|---|---|---|
| A1 | Fresh install → paywall | Unlock CTA shown |
| A2 | Purchase Guide Unlock | AccessGate dismisses; Tutor/Library/Paths open |
| A3 | Kill app → relaunch | Still unlocked |
| A4 | Delete app → reinstall → Restore | Unlock restored with same Apple ID |

## B. AI Lite

| Step | Action | Expect |
|---|---|---|
| B1 | Offline coach chip → AI Lite | Purchase succeeds; tier chip shows Lite |
| B2 | Ask a live question | Spreadsheet/visual answer; no 402 |
| B3 | Lite coach chips | Live demo / At work / Challenge / Go deeper |
| B4 | Locked Premium chips | Open upgrade sheet |

## C. Upgrade / downgrade (same group)

| Step | Action | Expect |
|---|---|---|
| C1 | From Lite → purchase AI Premium | Tier becomes Premium; professor chips appear |
| C2 | Ask live question | Richer answer / dual visuals OK |
| C3 | Downgrade Premium → Lite (Settings or StoreKit) | After period rules, app shows Lite; Premium chips locked again |
| C4 | Fair-use | After many Premium asks same day, soft pace warning may appear (not a hard block) |

## D. Cancel

| Step | Action | Expect |
|---|---|---|
| D1 | iOS Settings → Apple ID → Subscriptions → cancel AI | Access continues until period end (Apple rules) |
| D2 | After expiry (accelerate in StoreKit config if available) | App returns to Offline coach; Guide unlock still held |
| D3 | No in-app “manage subscription” required | Review notes state Settings-only manage/cancel |

## E. Restore matrix

| State | Restore |
|---|---|
| Unlock only | Guide open, AI offline |
| Unlock + Lite | Lite live |
| Unlock + Premium | Premium live |
| Expired AI, unlock kept | Offline coach |

## Sign-off

| Tester | Date | Sandbox / StoreKit | Pass |
|---|---|---|---|
| | | | |

Failures: note product ID, tier shown, verify worker status code, and device/OS.
