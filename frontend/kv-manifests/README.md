# KV Manifests for Branch Routing

This directory contains pre-generated manifest files that define how each branch should be routed.

## Format

Each branch has a corresponding JSON file that the Branch Router Worker uses to find the correct deployment.

## Branch: main
- **artifact**: https://e995ba88.care-circle-ctl-2.pages.dev
- **gitRef**: 22f4b10
- **branch**: main

## Branch: remove-see-how-families-button
- **artifact**: https://e995ba88.care-circle-ctl-2.pages.dev
- **gitRef**: 22f4b10
- **branch**: remove-see-how-families-button

---

## Deployment Commands

For each branch, write to KV:

```bash
# Set main manifest
wrangler kv:key put "manifest:main" --namespace-id=<YOUR_KV_ID> --path kv-manifests/main.json

# Set remove-see-how-families-button manifest
wrangler kv:key put "manifest:remove-see-how-families-button" --namespace-id=<YOUR_KV_ID> --path kv-manifests/remove-see-how-families-button.json

# Deploy the routing worker
wrangler deploy branch-router-worker.js

# Add branch subdomains (one per branch)
wrangler kv:namespace create "BRANCH_CONFIG"
# Then for each branch:
wrangler routes:apply <BRANCH>.care-circle-preview.pages.dev --pattern="<BRANCH>.care-circle-preview.pages.dev" --zone-id=<YOUR_ZONE_ID>
```

---

## Troubleshooting

If branch preview URLs aren't working:

1. Check KV entry exists: `wrangler kv:key get "manifest:<branch>"`
2. Check worker logs: `wrangler tail --format json`
3. Verify subdomains are configured in Cloudflare DNS

---

## Worker URLs

Once deployed, each branch will be accessible at:

- `https://main.care-circle-preview.pages.dev`
- `https://remove-see-how-families-button.care-circle-preview.pages.dev`