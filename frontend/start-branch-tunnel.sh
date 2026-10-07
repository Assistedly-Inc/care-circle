#!/bin/bash
# Quick start script for branch-specific Cloudflare tunnels

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <branch-name> [deployment-url]"
  echo ""
  echo "Examples:"
  echo "  $0 main"
  echo "  $0 remove-see-how-families-button https://e995ba88.care-circle-ctl-2.pages.dev"
  exit 1
fi

BRANCH=$1
DEPLOYMENT_URL=${2:-""}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "❌ wrangler CLI is not installed"
  echo "Run: npm install -g wrangler"
  exit 1
fi

# Check if authenticated
echo "🔍 Checking Cloudflare authentication..."
if ! wrangler whoami > /tmp/whoami-output.txt 2>&1; then
  echo "⚠️  Not logged into Cloudflare"
  echo "Run: wrangler login"
  exit 1
fi

# Get account ID from whoami output
echo "📋 Getting Cloudflare account ID..."
ACCOUNT_ID=$(grep "Account ID" /tmp/whoami-output.txt | tail -1 | sed 's/│/ /g' | awk '{print $4}')

if [ -z "$ACCOUNT_ID" ]; then
  echo "❌ Could not determine account ID"
  echo "Debug: Full output:"
  cat /tmp/whoami-output.txt
  exit 1
fi

echo "✅ Authenticated as: $ACCOUNT_ID"

# Create tunnel config
echo ""
echo "🔧 Creating tunnel configuration for branch: $BRANCH"
./scripts/deploy-branch-tunnel.sh "$BRANCH" "$DEPLOYMENT_URL"

# Go to tunnel config directory
TUNNEL_DIR="tunnel-configs/$BRANCH"

# Check if already created
if ! wrangler tunnel list | grep -q "care-circle-$BRANCH"; then
  echo ""
  echo "🚀 Creating tunnel in Cloudflare..."
  cd "$TUNNEL_DIR"
  WRANGLER_ACCOUNT_ID="$ACCOUNT_ID" wrangler tunnels create "care-circle-$BRANCH"

  # Generate dev credentials
  echo ""
  echo "📝 Generating tunnel credentials..."
  wrangler dev-secret generate dev

  # Add DNS hostname
  echo ""
  echo "🌐 Setting up custom hostname: ${BRANCH}.care-circle-preview.pages.dev"
  wrangler tunnel route dns "care-circle-$BRANCH" "${BRANCH}.care-circle-preview.pages.dev"
else
  echo ""
  echo "✅ Tunnel already exists for branch: $BRANCH"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1️⃣  Start the tunnel:"
echo "   cd $TUNNEL_DIR"
echo "   wrangler tunnel run care-circle-$BRANCH"
echo ""
echo "2️⃣  Access your branch:"
echo "   - Via auto-generated URL from Cloudflare"
echo "   - Or visit: https://${BRANCH}.care-circle-preview.pages.dev"
echo ""
echo "3️⃣  Stop the tunnel:"
echo "   Press Ctrl+C in the terminal where it's running"
echo ""