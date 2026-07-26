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

Optional AI coaching (Apple subscription):
• AI Premium — live assisted training with spreadsheet demos, board pack, stress-test, judgement
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
Unlock the Guide once for offline Tutor, Library, and Paths. Add AI Lite or Premium for live spreadsheet coaching — managed in Apple Subscriptions.
```

## What's New (1.0)

```
First release: offline Tutor + Library + Paths, OTA corpus growth, AI Lite and AI Premium with spreadsheet walkthroughs, What’s new, and continue-path home.
```

## App Review notes

Paste into **App Review Information → Notes**:

```
No Merixa user accounts. Entitlements are Apple ID + StoreKit restore after server verify.

Demo path (Sandbox Apple ID):
1. Launch app → Unlock Guide with product uk.co.merixa.practitionersguide.unlock (or Restore).
2. Tutor: ask for a paced offline lesson (works without AI sub).
3. Library → open a concept → Spreadsheet demo requires AI Lite or Premium.
4. Subscribe AI Lite (uk.co.merixa.practitionersguide.ai.lite.monthly) → ask for a live spreadsheet walkthrough.
5. Upgrade to AI Premium (uk.co.merixa.practitionersguide.ai.premium.monthly) in the same subscription group → Judgement / Harder example / Implication drill.
6. Downgrade Lite ↔ Premium and cancel only via iOS Settings → Apple ID → Subscriptions (by design).

Privacy / Terms / Support URLs are on the paywall and Support page.
IAP receipts are verified with Apple before unlock; AI asks require an active Lite/Premium entitlement.
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
