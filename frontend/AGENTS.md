<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Secrets Policy (binding — ALL BOTS)

- **NEVER use env files.** Do not create, read, source, or commit `.env`, `.env.local`, `.env.production`, or any `.env*` file that contains secrets. Env files are FORBIDDEN as a secrets mechanism.
- **ALWAYS use Bitwarden Secrets Manager (`bws`) for ALL secrets** (API keys, tokens, Stripe keys, Cloudflare tokens, DB/SMTP credentials, etc.):
  - Run commands with secrets injected: `bws run -- <command>`
  - Builds/deploys: `bws run -- npm run build` / `bws run -- npx wrangler deploy`
  - Read a secret into a shell variable: `VAR=$(bws secret get <SECRET_ID>)` — never echo the value.
- If `bws` is unavailable or a secret is missing, **STOP and ask the user**. Never fall back to env files, hardcoded literals, or pasting values into chat.
- This policy supersedes any Infisical, Keychain, or `.env`-based instructions in any project AGENTS.md, guardrail, or recipe file.
