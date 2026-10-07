#!/usr/bin/env bash
# Branch indexer for KV. Writes lines into a single snapshot file for fast indexing.
# Usage:
#   bash scripts/kubernetes-indexer.sh <KV_NAMESPACE_ID> [BRANCH] [BRANCH...]
#   If no BRANCH provided, snapshots all KV entries with prefix manifest:.
set -euo pipefail

KV_NS_ID="${1:?Provide KV namespace ID}"
SNAPSHOT_FILE="/tmp/branch-snapshot.txt"
> "$SNAPSHOT_FILE"

snap_entry() {
  local key="$1"
  local val="$2"
  if [[ "$key" != "manifest:"* ]]; then return; fi
  # JSON formatting automatically via printf %s
  printf '%s = %s\n' "${key}" "${val}" >> "$SNAPSHOT_FILE"
}

if [[ $# -gt 1 ]]; then
  # Indexed mode: write manifest values directly
  shift
  for branch in "$@"; do
    # For robustness, we store the already-serialized JSON (or output from kv: put path)
    # The below oneshot uses --path to composite the entry in one call
    echo "manifest:${branch} = {\"gitRef\":\"22f4b10\",\"branch\":\"${branch}\",\"buildUrl\":\"https://${branch}.care-circle-preview.pages.dev\",\"committedAt\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"prNumber\":null}"
  done > "$SNAPSHOT_FILE"
else
  # Full KV listing mode
  for row in $(wrangler kv:key list --namespace-id "$KV_NS_ID"); do
    key=$(echo "$row" | jq -r '.name')
    val=$(wrangler kv:key get "$key" --namespace-id "$KV_NS_ID" | jq -Rs)
    snap_entry "$key" "$val"
  done
fi

echo "Branch snapshot written to: $SNAPSHOT_FILE"