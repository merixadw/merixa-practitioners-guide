# Store readiness — Cap → ASC → TestFlight → App Store

Master checklist for Merixa Practitioner's Guide. Ties Windows-done assets to
Mac / App Store Connect leftovers.

**Bundle ID / Cap appId:** `uk.co.merixa.practitionersguide`  
**webDir:** `out/` (`npm run build:web` → `npm run cap:prep`)  
**Commercial offer (P0):** Guide unlock once + AI Premium monthly (Lite = legacy restore only)

---

## Status summary

| Area | State | Where |
|------|--------|--------|
| Product IDs in code | **Done** | `src/lib/entitlements/products.ts` |
| StoreKit Configuration | **Done** | `storekit/Products.storekit` (IDs match code) |
| Listing copy / prices | **Done in-repo** | `store/APP_STORE_CONNECT.md` |
| ASC setup steps | **Done in-repo** | `store/ASC_SETUP.md` |
| Privacy nutrition answers | **Done in-repo** | `store/PRIVACY_NUTRITION.md` |
| Legal routes in app | **Done** | `/privacy/`, `/terms/`, `/support/` |
| Public HTTPS legal URLs | **Blocked (ops)** | Host `merixa.co.uk/apps/practitioners-guide/…` |
| IAP verify worker docs | **Done in-repo** | `store/WORKERS_AND_ENV.md` + `wrangler.iap.toml` |
| Ask worker docs | **Done in-repo** | same |
| Cap web export | **Done** | `CAPACITOR_SHIP.md`, `npm run cap:prep` |
| Real `ios/` Xcode project | **Blocked (Mac)** | `npx cap add ios` |
| Screenshots PNGs | **Blocked (Mac)** | folders ready under `store/screenshots/` |
| ASC products / app record | **Blocked (ASC account)** | browser on any OS |
| TestFlight / submit | **Blocked (Mac + ASC)** | Archive + upload |

Verify product IDs anytime:

```bash
npm run store:verify
```

---

## Ordered path

### A. Windows (in-repo) — do before Mac/ASC

- [x] Cap `webDir=out` + `npm run build:web` / `cap:prep` (`CAPACITOR_SHIP.md`)
- [x] Unlock + Premium (+ legacy Lite) IDs aligned across code, StoreKit, ASC docs
- [x] Listing pack, privacy answers, subscription QA script updated for P0 offer
- [x] Worker deploy + production env documented (`store/WORKERS_AND_ENV.md`)
- [x] Screenshot folder structure + Mac capture instructions
- [ ] Deploy IAP verify + Ask workers to Cloudflare (ops; needs secrets/API keys)
- [ ] Publish legal pages to the HTTPS URLs in `APP_STORE_CONNECT.md`

### B. App Store Connect (browser — any OS with Apple login)

Follow `store/ASC_SETUP.md`:

1. Register Bundle ID + In-App Purchase capability  
2. Create app record  
3. Create IAPs: Unlock + Premium; stop selling Lite (`AI_LITE_SUNSET.md`)  
4. Paste listing from `APP_STORE_CONNECT.md`  
5. Complete App Privacy from `PRIVACY_NUTRITION.md`  
6. Set Privacy / Terms / Support URLs (must be live HTTPS)

### C. Mac — binary + screenshots

Follow `CAPACITOR_SHIP.md` then `store/SCREENSHOTS.md`:

1. `npm ci` → `npm run build:web` → `npx cap add ios` (once) → `npm run ios:sync`  
2. Xcode: Team, StoreKit config = `storekit/Products.storekit`  
3. Capture PNGs into `store/screenshots/6.7/` and `6.1/`  
4. Sandbox / StoreKit QA: `store/SUBSCRIPTION_TESTS.md`  
5. Archive → Upload → TestFlight (internal)  
6. Attach build to 1.0 → Submit for review  

---

## Production build env (never ship unverified IAP)

| Variable | Required for | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL` | Unlock / restore | Deployed `iap-verify` worker |
| `NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL` | Live Premium coach | Deployed `ask` worker |
| `NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL` | Optional OTA corpus | Else uses bundled `/corpus/` |
| `NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED` | **Forbidden in prod** | StoreKit-local QA only |
| Worker `ALLOW_JWS_CLAIMS_ONLY` | **Forbidden in prod** | StoreKit Configuration QA only |

Details: `store/WORKERS_AND_ENV.md`.

---

## Mac / ASC leftovers (explicit)

1. Apple Developer Program + ASC app / IAP records created  
2. Live HTTPS privacy / terms / support at merixa.co.uk (or update URLs)  
3. `npx cap add ios` + signing + StoreKit scheme  
4. Screenshot PNGs (6.7" + 6.1")  
5. Sandbox subscription matrix signed off  
6. TestFlight → App Review submit  
7. Production worker secrets (`APPLE_*`, `OPENAI_API_KEY`) on Cloudflare  

Nothing above can be completed from Windows alone without Apple credentials and a Mac for the binary.
