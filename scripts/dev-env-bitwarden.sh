#!/usr/bin/env bash
#
# dev-env-bitwarden.sh — load secrets from Bitwarden as env vars, then exec "$@".
# GUARDRAIL: secrets are NEVER stored in .env files — Bitwarden is the only source.
#
# Usage (backend):  scripts/dev-env-bitwarden.sh -- npm run dev
# Usage (frontend): scripts/dev-env-bitwarden.sh -- npm run dev
# Values are exported into the child process only; nothing is written to disk.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export BWS_ACCESS_TOKEN="${BWS_ACCESS_TOKEN:-$(cat "$HOME/.secrets/bws_token" 2>/dev/null || true)}"
if [[ -z "${BWS_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: BWS_ACCESS_TOKEN not set and ~/.secrets/bws_token missing." >&2
  exit 1
fi

lookup() {
  bws secret list --output json 2>/dev/null \
    | jq -r --arg k "$1" 'first(.[] | select((.key|ascii_downcase)==($k|ascii_downcase)) | .value)' || true
}

export STRIPE_SECRET_KEY="$(lookup 'Stripe Live Key')"
export STRIPE_WEBHOOK_SECRET="$(lookup 'Stripe Signing Secret')"
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(lookup 'Stripe Publishable Key')"
export GA4_API_SECRET="$(lookup 'Google Analytics Measurement Protocol API secrets')"
export GA4_MEASUREMENT_ID="$(lookup 'GA4 Measurement ID')"

[[ -n "$STRIPE_SECRET_KEY" ]] || { echo "WARN: Stripe Live Key not found in Bitwarden" >&2; }
[[ -n "$GA4_MEASUREMENT_ID" ]] || { echo "WARN: GA4 Measurement ID not found in Bitwarden (add it to enable server-side purchase events)" >&2; }

exec "$@"