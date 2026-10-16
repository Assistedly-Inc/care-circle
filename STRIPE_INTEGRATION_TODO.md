# STRIPE_INTEGRATION_TODO.md

Stripe Checkout integration — embedded form (`ui_mode: "form"`, Dahlia API `2026-03-25.dahlia`).
**Single source of truth for remaining setup steps.** Server + client changes are complete and typecheck; the items below are the remaining configuration before a real purchase can complete end-to-end.

## Values to Replace

The following values are placeholders and must be updated before going live.

**Files containing placeholders:**
- [backend/src/api/checkout.ts](backend/src/api/checkout.ts)

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `subscription` | ✅ Resolved — subscription with 30-day trial (`subscription_data.trial_period_days = 30`). One-time `payment` mode no longer used. |
| line_items[].price | `price_1URC9xApH5e5iOZ4vtS464J6` | ✅ Resolved — "30-Day Free Trial" price (live). ⚠️ **Amount is $0/month** — set the real post-trial amount in the Stripe Dashboard (Products → 30-Day Free Trial → Price) before charging customers. |

**Files containing missing env values:**
- [backend/.env.example](backend/.env.example) / [frontend/.env.local.example](frontend/.env.local.example)

| Env var | Status | What to Set |
|---------|--------|-------------|
| `STRIPE_SECRET_KEY` | ✅ set locally (Bitwarden `Stripe Live Key` a3e3a09a) | Add to production runtime env injection (Cloudflare Worker secret / deploy pipeline) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ set locally (Bitwarden `Stripe Publishable Key` 963cf7fc) | Set at frontend **build time** in production |
| `STRIPE_WEBHOOK_SECRET` | ✅ set locally (Bitwarden `Stripe Signing Secret` 9d94effb, whsec_) + webhook endpoint verified (signed event → 200) | Add to production runtime env injection (Cloudflare Worker secret / deploy pipeline) |
| `DOMAIN` | ⚠ local default | Set to your production domain |

## Configured Parameters

These parameters were configured in Checkout Studio and are already set correctly (do not change without updating Checkout Studio).

**Files containing these parameters:**
- [backend/src/api/checkout.ts](backend/src/api/checkout.ts) (Checkout Session creation)
- [frontend/app/checkout/page.tsx](frontend/app/checkout/page.tsx) (appearance + SDK init)

| Parameter | Value |
|-----------|-------|
| ui_mode | `form` |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| submit_type | `auto` |
| integration_identifier | `custom_embedded_web_0001` |
| payment_method_collection | `always` (active — mode is now `subscription`) |
| subscription_data.trial_period_days | `30` (30-day free trial) |
| line_items[].price | `price_1URC9xApH5e5iOZ4vtS464J6` ($0/mo — set real amount before charging) |

## Setup and Next Steps

### Environment variables (local dev — done, gitignored)
- `backend/.env`: `STRIPE_SECRET_KEY`, `DOMAIN`, `PORT` (from Bitwarden, mode 600)
- `frontend/.env.local`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`
- ⚠️ **Live keys are currently in use** (`pk_live_`/`sk_live_`) — real charges will be made. For dev/testing, consider test keys (`pk_test_`/`sk_test_`) until the flow is verified.

### Dependencies
- `stripe@^23.0.0` added to [backend/package.json](backend/package.json) (supports Dahlia API + `ui_mode: "form"`)

### Project structure (new files)
```
backend/src/api/checkout.ts          # POST /api/create-checkout-session + webhook handler
backend/.env.example                 # env reference
frontend/app/checkout/page.tsx       # /checkout — embedded form UI
frontend/.env.local.example          # env reference
STRIPE_INTEGRATION_TODO.md           # this file
```
Modified: `backend/src/routes.ts` (mount `/create-checkout-session`), `backend/src/server.ts` (raw-body `/api/webhook` before `express.json()`), `backend/src/config/env.ts` (stripe config keys), `frontend/lib/api.ts` (`checkoutApi.create`).

### Flow overview
1. User visits `/checkout` → page loads Stripe.js from `https://js.stripe.com/dahlia/stripe.js`
2. `POST /api/create-checkout-session` → server creates Checkout Session (`ui_mode: form`) → returns `{ client_secret }`
3. `stripe.initCheckoutFormSdk({ clientSecret, appearance })` → embedded form mounts in `#checkout-form`
4. User confirms → `checkout.loadActions()` + `actions.confirm()` processes payment
5. Stripe sends `checkout.session.completed` to `POST /api/webhook` (signature-verified, raw body) → fulfill purchase

### Remaining setup steps (in order)
1. ~~Create a Stripe Product + Price~~ ✅ done — "30-Day Free Trial", **$29/mo, 30-day trial** (price_1URC9xApH5e5iOZ4vtS464J6), wired into the checkout endpoint
2. ~~Create the webhook endpoint~~ ✅ done — endpoint registered, `whsec_...` in Bitwarden + backend/.env, signed-event test passed (HTTP 200)
3. **Production env injection** → run `scripts/deploy-stripe.sh` (reads `Stripe Live Key`, `Stripe Signing Secret`, `Stripe Publishable Key` from Bitwarden → `wrangler secret put` for the worker + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` at frontend build → deploys both workers). Requires `wrangler login` once.
4. **Fulfillment** → in the webhook handler, mark the order paid / grant access (currently logs + consent checks only). Worker: `backend/src/index.js` (`stripeHandleCompleted`); Express dev: `backend/src/api/checkout.ts`.
5. **Analytics → Google Ads handoff** → ✅ `trial_started` dataLayer event fires on checkout success (GTM tag spec: `docs/gtm-trial-started-setup.md`). ✅ Server-side GA4 `purchase` via Measurement Protocol coded in the worker (`invoice.paid` → `ga4SendPurchase`, with client_id/gclid attribution captured at checkout). Remaining:
   - Add `GA4 Measurement ID` + `GA4 API Secret` to Bitwarden (create the API secret in GA4 → Admin → Data Streams → Measurement Protocol API secrets), then re-run `scripts/deploy-stripe.sh` to push the worker secrets
   - Confirm the Stripe destination listens to `invoice.paid` (currently 27 events — add if missing)
   - Then promote Google Ads purchase action 7700177516 to primary
6. ~~Decide mode~~ ✅ `subscription` with `trial_period_days: 30`

### Testing credit card numbers (test mode)
- Use test keys (`pk_test_…`/`sk_test_…`) first: card `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (declined), `4000 0000 0000 9995` (insufficient funds). See https://docs.stripe.com/testing

### Resources
- https://support.stripe.com · https://docs.stripe.com/mcp · https://docs.stripe.com/payments/embedded/form