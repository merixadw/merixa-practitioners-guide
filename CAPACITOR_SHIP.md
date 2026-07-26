# Capacitor ship — Windows prep + Mac iOS checklist

Native shell: Capacitor 8 · app id `uk.co.merixa.practitionersguide` · **webDir = `out/`**.

`npm run build:web` produces the static export Capacitor copies into the native project. Do **not** point `webDir` at `.next` or `public`.

---

## Honest platform status

| Path | Status |
|------|--------|
| `out/` | Built on Windows via `npm run build:web` (corpus + stamped `/guide/*` shells) |
| `ios/` | **Stub only** (`.gitkeep`) until a Mac runs `npx cap add ios` |
| `android/` | **Not present** (optional; ignored by git if added) |
| Device Lab | Windows **UI preview** only — not Xcode Simulator / StoreKit |

---

## Windows prep checklist (do this first)

1. Ensure corpus exists: `public/corpus/catalog.json` (or let `build:web` run `library:seamless`).
2. Export + stamp + smoke:
   ```bash
   npm run build:web
   ```
3. Confirm Cap readiness (webDir + `out/` smoke):
   ```bash
   npm run cap:check
   ```
4. Sync whatever native projects exist (none yet on a fresh clone):
   ```bash
   npm run cap:sync
   ```
   Expected on Windows today: `synced: []` with a note that `ios/` is stub-only.
5. Optional layout check without Xcode:
   ```bash
   npm run device-lab
   ```
   (requires `npm run dev` for live preview; or point the lab at a static server of `out/`).

IAP / Ask workers (env for the web build you sync):

```bash
NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL=https://your-iap-verify.workers.dev
NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL=https://your-ask.workers.dev
```

Never ship `NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true` or worker `ALLOW_JWS_CLAIMS_ONLY=true` in production.

---

## npm scripts

| Script | Role |
|--------|------|
| `npm run build:web` | seamless (if needed) → `next build` → stamp guides → smoke `out/` |
| `npm run cap:check` | Assert `webDir=out` + `smoke-out-web` |
| `npm run cap:sync` | Sync **existing** platforms only (honest no-op if stub) |
| `npm run cap:prep` | `build:web` + `cap:check` (full Windows prep) |
| `npm run ios:sync` | `build:web` + `cap sync ios` — **requires real ios/ (Mac)** |
| `npm run android:sync` | `build:web` + `cap sync android` — requires `android/` |
| `npm run cap:open` | `npx cap open ios` — Mac / Xcode only |

---

## Mac-only: add iOS + TestFlight (ordered)

Prereqs: macOS, Xcode (current stable), CocoaPods, Apple Developer account, Node matching the repo.

1. Clone / pull the branch that already passes `npm run build:web` on Windows (or rebuild on the Mac).
2. Install deps:
   ```bash
   npm ci
   ```
3. Build web assets into `out/`:
   ```bash
   npm run build:web
   ```
4. **Once** — create the native project (replaces the stub):
   ```bash
   # Remove the placeholder if cap add complains about a non-empty ios/:
   #   mv ios ios-stub-backup   # or delete ios/.gitkeep only if add requires empty dir
   npx cap add ios
   ```
5. Sync webDir into the iOS app:
   ```bash
   npm run ios:sync
   # equivalent: npm run build:web && npx cap sync ios
   ```
6. Open Xcode:
   ```bash
   npx cap open ios
   ```
7. In Xcode:
   - Set **Team** / signing for `uk.co.merixa.practitionersguide`
   - Attach **StoreKit Configuration**: `storekit/Products.storekit`  
     (Edit Scheme → Run → Options → StoreKit Configuration)
   - Confirm deployment target matches Capacitor iOS requirements
8. Run on a simulator or device; smoke Tutor / Library / Paths / one stamped `/guide/{id}/` deep link.
9. Archive → upload → **TestFlight** (internal).
10. App Store Connect listing leftovers: `store/ASC_SETUP.md`, `store/SCREENSHOTS.md`, `store/SUBSCRIPTION_TESTS.md`, `store/PRIVACY_NUTRITION.md`.

### After the first `cap add ios`

- Re-run `npm run ios:sync` whenever web content changes.
- Do not commit `ios/App/Pods/` or `ios/App/public/` (gitignored).
- Prefer committing the Xcode project once the team agrees on a baseline; until then keep `ios/` local.

---

## Optional Android

```bash
npm install @capacitor/android --save-dev   # if not already present
npx cap add android
npm run android:sync
npx cap open android
```

`android/` is gitignored in this repo — treat it as a local/CI artifact unless you change that policy.

---

## Mac leftover list (cannot do on Windows)

- [ ] `npx cap add ios` (real Xcode project)
- [ ] `npm run ios:sync` / `npx cap open ios`
- [ ] Signing, StoreKit scheme, Archive, TestFlight
- [ ] App Store Connect screenshots / review notes (`store/*`)
- [ ] Physical-device IAP against production verify worker
