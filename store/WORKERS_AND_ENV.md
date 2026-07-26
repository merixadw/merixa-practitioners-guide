# Workers & production env (IAP + Ask)

Windows-doable deploy docs for the Cloudflare workers the iOS build calls.
No OpenAI calls are required to *document* or *verify product IDs*; live Ask
needs `OPENAI_API_KEY` on the worker when you deploy for Premium.

## Workers

| Worker | Config | Script | Purpose |
|--------|--------|--------|---------|
| IAP verify | `wrangler.iap.toml` → `workers/iap-verify.js` | `npm run iap:deploy` | StoreKit JWS / receipt verify before unlock |
| Ask (live Tutor) | `wrangler.ask.toml` → `workers/ask.js` | `npm run ask:deploy` | Premium live coach |
| Learn / corpus (optional) | `wrangler.toml` | `npm run learn:deploy` | OTA corpus / circle |

Bundle ID baked into IAP worker vars: `APPLE_BUNDLE_ID = uk.co.merixa.practitionersguide`
(must match Cap `appId` and ASC).

## Deploy IAP verify

```bash
npx wrangler secret put APPLE_ISSUER_ID --config wrangler.iap.toml
npx wrangler secret put APPLE_KEY_ID --config wrangler.iap.toml
npx wrangler secret put APPLE_PRIVATE_KEY --config wrangler.iap.toml
# optional legacy shared secret:
# npx wrangler secret put APPLE_IAP_SHARED_SECRET --config wrangler.iap.toml
npm run iap:deploy
```

**Production:** leave `ALLOW_JWS_CLAIMS_ONLY` unset/false in `[vars]`.  
**Local StoreKit Configuration QA only:** you may set `ALLOW_JWS_CLAIMS_ONLY=true`
temporarily — never on the production worker.

## Deploy Ask

```bash
npx wrangler secret put OPENAI_API_KEY --config wrangler.ask.toml
# Ensure R2 bucket merixa-guide-corpus exists and is bound (see wrangler.ask.toml)
npm run ask:deploy
```

Premium models are set in `wrangler.ask.toml` (`OPENAI_MODEL_PREMIUM` / `OPENAI_MODEL`).

## App build-time public env

Set these when running `npm run build:web` / `cap:prep` for a ship binary:

```bash
# Required for production unlock/restore
NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL=https://merixa-guide-iap-verify.<account>.workers.dev

# Required for live Premium coach (offline Tutor works without it)
NEXT_PUBLIC_MERIXA_GUIDE_ASK_URL=https://merixa-guide-ask.<account>.workers.dev

# Optional OTA retrieve index; otherwise Cap uses bundled out/corpus/
# NEXT_PUBLIC_MERIXA_GUIDE_CORPUS_URL=https://…

# FORBIDDEN in production / TestFlight external:
# NEXT_PUBLIC_IAP_ALLOW_UNVERIFIED=true
```

After changing env, rebuild web and sync:

```bash
npm run ios:sync    # Mac, real ios/
# or Windows prep only:
npm run cap:prep
```

## Smoke without Mac

- Product IDs: `npm run store:verify`  
- Cap webDir + `out/`: `npm run cap:check`  
- Legal routes locally: `npm run dev` → `/privacy/`, `/terms/`, `/support/`  

Worker HTTP smoke (optional, needs deployed URLs):

```bash
curl -sS "$NEXT_PUBLIC_MERIXA_IAP_VERIFY_URL"   # expect non-HTML health/405/JSON — not a naked 404 host
```
