# App Privacy nutrition labels (P3)

Complete **App Store Connect → App Privacy** using these answers. Adjust if you
add analytics or accounts later.

## Data collection summary (v1)

| Data type | Collected by Merixa? | Linked to identity? | Used for tracking? | Notes |
|---|---|---|---|---|
| Contact info | No | — | — | Support email is outbound only |
| Health / fitness | No | — | — | |
| Financial info | No | — | — | User does not enter bank/card data in-app |
| Location | No | — | — | |
| Sensitive info | No | — | — | |
| Contacts | No | — | — | |
| User content | See below | No Merixa account | No | Chat/questions may be sent to live Tutor worker when AI subscribed — not stored as a profile |
| Browsing history | No | — | — | |
| Search history | No | — | — | On-device habits only |
| Identifiers | Purchase / device via Apple | Apple ID (Apple) | No (Merixa) | StoreKit + receipt verify |
| Purchases | Yes (Apple IAP) | Via Apple | No | Unlock + subscriptions |
| Usage data | On-device only | No | No | Habits/saved/recent stay on device |
| Diagnostics | No (v1) | — | — | Do not enable third-party crash analytics without updating this file |
| Surroundings | No | — | — | |
| Body | No | — | — | |
| Other data | Optional Google Translate | Per Google | Per Google | Only if user picks a non-English language |

## Recommended ASC declarations

1. **Purchases** — Yes (In-App Purchases). Purpose: App Functionality. Not used for tracking. Linked to identity: Apple handles; Merixa does not build a user profile.
2. **Product interaction / usage** — Prefer **Data Not Collected** for server-side analytics. On-device habits are not transmitted as a Merixa profile.
3. **Other user content** (optional if ASC asks about chat):
   - If declared: User Content → Other User Content
   - Purpose: App Functionality (live AI Tutor)
   - Not linked to user identity by Merixa; not used for tracking
   - Not used for third-party advertising
4. **Tracking** — **No** (do not use ATT / IDFA in v1).
5. **Privacy Policy URL** — required; must match live HTTPS policy.

## Third parties

| Party | When | What |
|---|---|---|
| Apple | Always on purchase | StoreKit billing |
| Merixa Cloudflare Workers | Live AI ask / IAP verify | Question + retrieved cards + receipt/JWS |
| OpenAI (via Merixa worker) | Live AI ask only | Prompt content for tutoring — no Merixa account map |
| Google Translate | Optional language ≠ English | Visible UI strings |

## Contact

`privacy@merixa.co.uk`
