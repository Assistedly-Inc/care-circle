#!/bin/bash
# Branch-specific Cloudflare Tunnel Setup Script

set -e

usage() {
  echo "Usage: $0 <branch-name> [deployment-url]"
  echo ""
  echo "Example:"
  echo "  $0 main"
  echo "  $0 remove-see-how-families-button https://e995ba88.care-circle-ctl-2.pages.dev"
  exit 1
}

BRANCH=${1:-$BRANCH}
DEPLOYMENT_URL=${2:-""}

if [ -z "$BRANCH" ]; then
  echo "Error: Branch name is required"
  usage
fi

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Error: wrangler CLI is not installed"
  echo "Run: npm install -g wrangler"
  exit 1
fi

# Login if not authenticated
wrangler whoami || wrangler login

# Generate a unique tunnel name for this branch
TUNNEL_NAME="care-circle-${BRANCH}"

# Generate a unique tunnel ID
TUNNEL_ID=$(uuidgen)
echo "Generated Tunnel ID: $TUNNEL_ID"

# Create the tunnel config
mkdir -p "tunnel-configs/${BRANCH}"
cat > "tunnel-configs/${BRANCH}/config.json" <<EOF
{
  "tunnel_name": "$TUNNEL_NAME",
  "tunnel_id": "$TUNNEL_ID",
  "ingress": {
    "rules": [
      {
        "hostname": "${BRANCH}.care-circle-preview.pages.dev",
        "service": "${DEPLOYMENT_URL:-http://localhost:3000}"
      },
      {
        "service": "http_status:404"
      }
    ]
  },
  "account_id": "$CLOUDFLARE_ACCOUNT_ID"
}
EOF

echo "✓ Created tunnel configuration for branch: $BRANCH"
echo ""
echo "Tunnel Name: $TUNNEL_NAME"
echo "Hostname: ${BRANCH}.care-circle-preview.pages.dev"
echo ""
echo "Next steps:"
echo "1. Run: wrangler tunnels create $TUNNEL_NAME"
echo "2. Run: wrangler tunnels run $TUNNEL_NAME --config tunnel-configs/${BRANCH}/config.json"
echo "3. Assign hostname: ${BRANCH}.care-circle-preview.pages.dev to this tunnel"
echo ""

# Optional: Deploy immediately
if [[ "$2" != *http://* && "$2" != *https://* ]]; then
  echo "To deploy and run the tunnel immediately:"
  echo "cd tunnel-configs/${BRANCH}"
  echo "wrangler tunnels create $TUNNEL_NAME"
  echo "wrangler tunnel run --config config.json"
fi