# Branch-Specific Deployment Setup Guide

This guide explains how to set up Cloudflare Workers, KV, and Pages to deploy each git branch to its own URL.

## Architecture

```
canary.<branch>.care-circle-routing.pages.dev → Cloudflare Worker → Fetch from GitHub Pages preview
                                                    ↓
                                          KV stores deployment metadata
```

## Prerequisites

1. Cloudflare account with Workers and KV access
2. wrangler CLI installed (`npm install -g wrangler`)
3. GitHub repository with Pages deployment

## Step 1: Set up KV Namespace

```bash
# Login to Cloudflare
wrangler login

# Create a KV namespace
wrangler kv:namespace create "BRANCH_MANIFEST"

# The response will look like:
# ✨ Successfully created a new namespace!
# id = "xxxxxxxxxxxx"
# var_name = "BRANCH_MANIFEST"

# Update wrangler.toml with the actual ID
```

## Step 2: Deploy the Routing Worker

```bash
# Deploy the worker
wrangler deploy
```

## Step 3: Configure Pages Custom Domains

1. Go to Cloudflare Dashboard → Pages
2. Add a custom domain: `care-circle-routing.pages.dev`
3. Update the DNS records to point to your new routing worker

## Step 4: Use the Deployment Script

Create `scripts/deploy-preview.sh`:

```bash
#!/bin/bash

# Configuration
BRANCH=${1:-"main"}
REPO="JoshFialkoff/care-circle"
PR_NUMBER=$(gh pr list --branch $BRANCH --json number --jq '.[0].number')

# Generate a unique preview URL
PREVIEW_URL="https://${BRANCH}.canary.care-circle-routing.pages.dev"

# Deploy Pages preview
gh workflow run deploy-preview.yml --ref $BRANCH

# Wait for deployment
echo "Waiting for Pages deployment..."
sleep 60

# Set KV manifest
PREVIEW_GITHUB_URL="https://${BRANCH}.pages.dev"

cat > manifest.json <<EOF
{
  "url": "${PREVIEW_GITHUB_URL}",
  "branch": "${BRANCH}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "prNumber": ${PR_NUMBER}
}
EOF

# Store manifest in KV
wrangler kv:key put "manifest:${BRANCH}" --path manifest.json

echo "Preview deployment: ${PREVIEW_URL}"
```

## Step 5: Branch-Specific URLs

### For Main Branch
```
https://main.canary.care-circle-routing.pages.dev
```

### For Your Feature Branch
```
https://remove-see-how-families-button.canary.care-circle-routing.pages.dev
```

### For Pull Requests
```
https/<pr-number>.canary.care-circle-routing.pages.dev
```

## Manual KV Entry Setup (for your current branches)

Set the KV entries directly:

```bash
# For your main branch
cat > manifest-main.json <<EOF
{
  "url": "https://e995ba88.care-circle-ctl-2.pages.dev",
  "branch": "main",
  "deployedAt": "2024-01-01T00:00:00Z"
}
EOF

wrangler kv:key put "manifest:main" --path manifest-main.json

# For your remove-see-how-families-button branch
cat > manifest-remove-see-how-families-button.json <<EOF
{
  "url": "https://remove-see-how-families-button.care-circle-routing.pages.dev",
  "branch": "remove-see-how-families-button",
  "deployedAt": "2024-01-01T00:00:00Z"
}
EOF

wrangler kv:key put "manifest:remove-see-how-families-button" --path manifest-remove-see-how-families-button.json
```

## Access Your Branch Previews

1. Visit: `canary.<branch>.care-circle-routing.pages.dev`
2. Example: `https://canary.remove-see-how-families-button.care-circle-routing.pages.dev`

This will route through your Cloudflare Worker, which looks up the branch deployment in KV and proxies requests to the appropriate GitHub Pages preview.

## Managing KV Entries

```bash
# List all KV keys
wrangler kv:key list

# Get a specific value
wrangler kv:key get "manifest:remove-see-how-families-button" --namespace-id=<your-ids>

# Delete a KV key
wrangler kv:key delete "manifest:<branch>"
```

## Troubleshooting

### 404 Error on Preview URLs
- Make sure the KV entry exists for the branch
- Check the worker logs: `wrangler tail --format pretty`

### Images Not Loading
- The worker should proxy images correctly
- Check if `/images/` paths are being handled correctly

### Deployment Not Updating
- Invalidate worker cache
- Check KV entry timestamp matches your deployment

## Cost Estimate

- **Workers**: Free tier includes 100,000 requests/day
- **KV**: Free tier includes 100,000 reads/day, 1,000 writes/day
- **Pages**: Free tier includes unlimited bandwidth

This setup should work within Cloudflare's free tier for most development use cases.