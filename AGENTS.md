# Agent Rules — Assistedly Cares

## Infrastructure Policy (binding)

- **No local tunnels.** Never install, configure, or run `cloudflared` or any
  other local tunnel on developer machines. No local processes, LaunchAgents,
  LaunchDaemons, brew services, or login/startup items for tunnels.
- **Edge-only sandbox routing.** The sandbox-router Worker executes code in
  Cloudflare Containers, entirely on Cloudflare's edge. If a Worker needs
  sandboxed execution, use Cloudflare Containers directly from the Worker.
- **No traffic through local machines.** Never route traffic to or from a local
  machine unless the user explicitly asks for it.
- **Do not re-create removed artifacts.** Tunnel scripts, LaunchAgent plists,
  and `~/.cloudflared` configs were removed/quarantined (see commit
  `b84761b`). Do not reintroduce them.

## Next.js

- `frontend/` is a static-export Next.js app deployed as Workers static assets
  on the `care-circle` Worker (`assistedly.ai` custom domain). Build with
  `npm run build` (use the NVM node if Homebrew node's simdjson linkage breaks),
  deploy with `wrangler deploy` from `frontend/`.
## Secrets Policy (binding — ALL BOTS)

- **NEVER use env files.** Do not create, read, source, or commit `.env`, `.env.local`, `.env.production`, or any `.env*` file that contains secrets. Env files are FORBIDDEN as a secrets mechanism.
- **ALWAYS use Bitwarden Secrets Manager (`bws`) for ALL secrets** (API keys, tokens, Stripe keys, Cloudflare tokens, DB/SMTP credentials, etc.):
  - Run commands with secrets injected: `bws run -- <command>`
  - Builds/deploys: `bws run -- npm run build` / `bws run -- npx wrangler deploy`
  - Read a secret into a shell variable: `VAR=$(bws secret get <SECRET_ID>)` — never echo the value.
- If `bws` is unavailable or a secret is missing, **STOP and ask the user**. Never fall back to env files, hardcoded literals, or pasting values into chat.
- This policy supersedes any Infisical, Keychain, or `.env`-based instructions in any project AGENTS.md, guardrail, or recipe file.
