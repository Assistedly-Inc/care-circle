# Care Circle — Cloudflare Deployment Guide

## Quick Start

```bash
# Install Wrangler (if needed)
npm install -g wrangler

# Login
npx wrangler login

# Build the static export
npm run build          # produces out/

# Deploy (Workers static assets + custom domain assistedly.ai)
wrangler deploy        # uploads out/ and provisions the assistedly.ai custom domain
```

## What's deployed where

- **assistedly.ai** → `care-circle` Worker serving `out/` as static assets
  (Workers custom domain, auto-provisioned by `wrangler deploy` from `routes`
  in `wrangler.toml`). Replaces the old "CareCircle MVP Dashboard" worker.
- **care-circle-ctl.pages.dev** → `care-circle` Cloudflare Pages project
  (kept for previews/rollback; deploy with `wrangler pages deploy out --project-name care-circle`).

## Notes

- Pages projects do **not** support `routes` in `wrangler.toml` — for Pages,
  attach custom domains via the dashboard or API instead.
- `workers_dev` is disabled; the site is only served on the custom domain.

## Development

```bash
npm run dev
```

## Features
- Workers static assets hosting
- Next.js (App Router) static export
- Tailwind CSS