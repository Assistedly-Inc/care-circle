#!/usr/bin/env bash
#
# deploy-stripe.sh — deploy the Stripe integration to production using Bitwarden
# Secrets Manager (GUARDRAIL: credentials come from Bitwarden, never hardcoded,
# never echoed). Values are piped straight into wrangler — nothing is printed.
#
# Requires: bws CLI + token (~/.secrets/bws_token), wrangler (npx), jq.
# Bitwarden secrets expected:
#   Stripe Live Key          (sk_live_...)  -> STRIPE_SECRET_KEY (worker secret)
#   Stripe Signing Secret    (whsec_...)    -> STRIPE_WEBHOOK_SECRET (worker secret)
#   Stripe Publishable Key   (pk_live_...)  -> NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (frontend build)
#
# Usage:
#   scripts/deploy-stripe.sh            # uses ~/.secrets/bws_token
#   BWS_ACCESS_TOKEN=<token> scripts/deploy-stripe.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${BWS_ACCESS_TOKEN:-}" ]]; then
  if [[ -f "$HOME/.secrets/bws_token" ]]; then
    BWS_ACCESS_TOKEN="$(cat "$HOME/.secrets/bws_token")"
  else
    echo "ERROR: BWS_ACCESS_TOKEN not set and ~/.secrets/bws_token missing." >&2
    exit 1
  fi
fi
export BWS_ACCESS_TOKEN

command -v jq >/dev/null || { echo "ERROR: jq required" >&2; exit 1; }

lookup() {
  bws secret list --output json 2>/dev/null \
    | jq -r --arg k "$1" 'first(.[] | select((.key|ascii_downcase)==($k|ascii_downcase)) | .value)'
}

SK="$(lookup 'Stripe Live Key')"
WH="$(lookup 'Stripe Signing Secret')"
PK="$(lookup 'Stripe Publishable Key')"
GA4_MID="$(lookup 'GA4 Measurement ID')"
GA4_ASECRET="$(lookup 'GA4 API Secret' || lookup 'Google Analytics Measurement Protocol API secrets')"

for var in SK WH PK; do
  [[ -n "${!var}" ]] || { echo "ERROR: $var not found in Bitwarden" >&2; exit 1; }
done

echo "1/3 — backend worker secrets (values never printed)"
( cd "$ROOT/backend" \
  && printf '%s' "$SK" | npx wrangler secret put STRIPE_SECRET_KEY \
  && printf '%s' "$WH" | npx wrangler secret put STRIPE_WEBHOOK_SECRET )
if [[ -n "$GA4_MID" && -n "$GA4_ASECRET" ]]; then
  ( cd "$ROOT/backend" \
    && printf '%s' "$GA4_MID" | npx wrangler secret put GA4_MEASUREMENT_ID \
    && printf '%s' "$GA4_ASECRET" | npx wrangler secret put GA4_API_SECRET )
else
  echo "WARN: GA4 Measurement ID / API Secret not in Bitwarden — purchase events will log 'GA4 MP not configured'."
fi

echo "2/3 — frontend build with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
( cd "$ROOT/frontend" && NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$PK" npm run build )

echo "3/3 — deploy workers"
( cd "$ROOT/backend" && npx wrangler deploy )
( cd "$ROOT/frontend" && npx wrangler deploy )

echo "Done — Stripe integration deployed. Webhook endpoint: https://care-backend-mvp.forwardjump-com198.workers.dev/api/webhook"
echo "Reminder: update the webhook endpoint URL in the Stripe Dashboard if it differs."