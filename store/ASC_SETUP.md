# App Store Connect setup (P3)

Do this in a browser — no Mac required for the ASC record. Keep
`store/APP_STORE_CONNECT.md` open for copy/paste.

## Before you start

- [ ] Apple Developer Program membership active
- [ ] Legal URLs live HTTPS (`/privacy/`, `/terms/`, `/support/`)
- [ ] Bundle ID ready: `uk.co.merixa.practitionersguide`
- [ ] IAP verify worker deployed (`npm run iap:deploy`) with Apple API secrets
- [ ] Ask worker deployed (`npm run ask:deploy`) for live AI

## 1. Register the Bundle ID

1. [developer.apple.com/account](https://developer.apple.com/account) → **Identifiers** → **+**
2. **App IDs** → **App**
3. Description: `Merixa Practitioner's Guide`
4. Bundle ID → Explicit → `uk.co.merixa.practitionersguide`
5. Capabilities → enable **In-App Purchase**
6. Register

## 2. Create the app record

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**
2. Platforms: **iOS**
3. Name: `Merixa Practitioner's Guide`
4. Primary language: **English (U.K.)**
5. Bundle ID: `uk.co.merixa.practitionersguide`
6. SKU: `merixa-practitioners-guide`
7. User Access: Full Access

## 3. App Information

| Field | Value |
|---|---|
| Subtitle | Finance concepts, live Tutor |
| Category | Education (secondary Finance optional) |
| Privacy Policy URL | from `APP_STORE_CONNECT.md` |
| Support URL | from `APP_STORE_CONNECT.md` |
| Age rating | 4+ |
| App Privacy | see `store/PRIVACY_NUTRITION.md` |

## 4. In-App Purchases

### Non-consumable — Guide unlock

1. **Monetization** → **In-App Purchases** → **+** → **Non-Consumable**
2. Product ID: `uk.co.merixa.practitionersguide.unlock` *(must match code)*
3. Reference name: `Guide Unlock`
4. Price: £7.99 / €8.99 / $9.99 (Apple price tiers closest match)
5. Localization (en_GB + en_US):
   - Display name: `Guide Unlock`
   - Description: `Full Practitioner's Guide with offline Library, Paths, and Saved. Corpus updates over the air.`

### Subscription group — Merixa AI Coach

1. **Monetization** → **Subscriptions** → create group **Merixa AI Coach**
2. **AI Lite — stop selling** (legacy product ID may remain for renewals):
   - Product ID: `uk.co.merixa.practitionersguide.ai.lite.monthly`
   - Set unavailable for new purchases when ASC allows
   - See `store/AI_LITE_SUNSET.md`
3. Add **AI Premium** (only online coach for sale):
   - Product ID: `uk.co.merixa.practitionersguide.ai.premium.monthly`
   - Duration: 1 month
   - Price: £7.99 / €8.99 / $9.99
   - Display name: `AI Premium`
   - Description: `Live coach with daily pace (~10 asks / up to 5 heavy). Spreadsheet demos, board pack, judgement, stress-test.`
4. Single paid subscription level (Premium). Lite SKU not for new sale.
5. No free trial required for v1
6. Submit IAPs with the first binary

## 5. Version 1.0 listing

1. Paste Description, Keywords, Promotional Text, What's New from `APP_STORE_CONNECT.md`
2. Copyright: `2026 Merixa`
3. Terms of Use (EULA) URL
4. Screenshots: see `store/SCREENSHOTS.md` (Mac capture)
5. App Review Notes: paste from `APP_STORE_CONNECT.md`
6. Contact email/phone; demo account blank

## 6. Export compliance

- Uses HTTPS only; typically **No** for proprietary encryption beyond standard HTTPS
- Confirm with current Apple questionnaire wording

## 7. After Mac binary exists

1. Archive in Xcode → Upload to App Store Connect
2. Attach build to 1.0
3. Complete subscription group sandbox tests (`store/SUBSCRIPTION_TESTS.md`)
4. Submit for review
