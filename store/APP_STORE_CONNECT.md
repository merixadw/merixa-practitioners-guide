# App Store Connect — listing pack (P3)

Fill these fields in App Store Connect. Host privacy / terms / support on a
public HTTPS URL before submission (routes already exist: `/privacy/`,
`/terms/`, `/support/`).

Suggested host paths (match Management Micro pattern):

| Field | URL |
|---|---|
| Privacy Policy | `https://merixa.co.uk/apps/practitioners-guide/privacy/` |
| Terms of Use (EULA) | `https://merixa.co.uk/apps/practitioners-guide/terms/` |
| Support | `https://merixa.co.uk/apps/practitioners-guide/support/` |

## App identity

| Field | Value |
|---|---|
| Name | Merixa Practitioner's Guide |
| Subtitle | Finance concepts, live Tutor |
| Bundle ID | `uk.co.merixa.practitionersguide` |
| SKU | `merixa-practitioners-guide` |
| Primary language | English (U.K.) |
| Category | Education |
| Secondary | Finance (optional) |
| Age rating | 4+ |

## Pricing (locked)

| Item | GBP | EUR | USD | Product ID |
|---|---|---|---|---|
| Guide unlock (non-consumable) | £7.99 once | €8.99 | $9.99 | `uk.co.merixa.practitionersguide.unlock` |
| AI Lite (legacy — stop selling) | — | — | — | `uk.co.merixa.practitionersguide.ai.lite.monthly` |
| AI Premium (auto-renewable, monthly) | £7.99/mo | €8.99 | $9.99 | `uk.co.merixa.practitionersguide.ai.premium.monthly` |

**Subscription group:** `Merixa AI Coach`  
(Lite = lower level, Premium = higher level — Apple handles upgrade/downgrade.)

Local StoreKit Configuration: `storekit/Products.storekit`

## Description (U.K. English)

```
Merixa Practitioner's Guide is a mobile learning app for finance practitioners — not exam tuition.

Unlock once for the full Guide:
• Tutor — paced offline lessons from Guide cards
• Library — concepts with Definition → Technical note → At work → Watch for → Quick check → Source
• Paths — ordered workplace journeys across IFRS, ACCA, CGMA, CFA, FRM, IIA/CRMA
• Saved — on-device shelf for review
• Corpus updates over the air while you stay offline-capable

Guide unlock includes AI Premium for 30 days. After that month, subscribe to keep live coaching — or stay on the offline Guide with no pressure.

Optional AI Premium (Apple subscription):
• Live assisted training — spreadsheet demos, board pack, stress-test, judgement
• Daily pace (~10 live asks · up to 5 heavy) that resets tomorrow — not a monthly burn
• Library stays open when today’s pace is used

AI always reconnects you to Library and Paths. No Merixa account — restore with your Apple ID. Manage or cancel AI subscriptions in iOS Settings → Apple ID → Subscriptions.
```

## Keywords (100 character max, comma-separated)

```
finance,IFRS,CFA,FRM,ACCA,CGMA,audit,practitioner,tutor,spreadsheet,cash,controls
```

## Promotional text (170 chars, editable anytime)

```
Unlock once for offline Tutor, Library, and Paths — AI Premium included for 30 days. Then subscribe for live coaching, or keep the offline Guide.
```

## What's New (1.0)

```
First release: offline Tutor + Library + Paths, OTA corpus growth, Guide unlock with 30 days of AI Premium included, then optional AI Premium for live spreadsheet coaching.
```

## App Review notes

Paste into **App Review Information → Notes**:

```
No Merixa user accounts. Entitlements are Apple ID + StoreKit restore after server verify.

Commercial offer:
• Guide Unlock (non-consumable uk.co.merixa.practitionersguide.unlock) — offline Library/Paths/Saved + AI Premium included for 30 days from unlock.
• AI Premium (uk.co.merixa.practitionersguide.ai.premium.monthly) — only online coach sold after the included month.
• Legacy AI Lite (uk.co.merixa.practitionersguide.ai.lite.monthly) — not sold; restore/verify only for existing subscribers.

Demo path (Sandbox Apple ID):
1. Launch → Unlock Guide (or Restore).
2. Tutor: paced offline lesson works without a paid subscription after unlock.
3. During the included Premium month (or after subscribing Premium): Library → concept → Spreadsheet demo / Board pack / Judgement chips.
4. Subscribe AI Premium if the included month has ended.
5. Cancel Premium only via iOS Settings → Apple ID → Subscriptions (by design). Guide unlock remains.

Privacy / Terms / Support URLs are on the paywall and Support page.
IAP receipts are verified with Apple before unlock; live AI asks require an active Premium entitlement (or included unlock month).
```

## Copyright

```
2026 Merixa
```

## Contact (App Review)

| Field | Value |
|---|---|
| Email | `support@merixa.co.uk` |
| Phone | *(your Apple Developer contact phone)* |
| Demo account | Leave blank — no Merixa login |
