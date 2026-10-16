#!/usr/bin/env node
/**
 * Guard: production static export must NEVER bake local/dev API bases into the
 * browser bundle, and secret-bearing .env files are forbidden in this repo.
 *
 * Fails (exit 1) if:
 *   - any built chunk/html/json in out/ references http://localhost,
 *     http://127.0.0.1, or http://0.0.0.0 (e.g. a NEXT_PUBLIC_API_URL like
 *     http://localhost:3002 leaking into production — the "Failed to fetch"
 *     sign-in bug), OR
 *   - a non-empty .env / .env.local / .env.production / .env.development file
 *     exists (secrets must come from Bitwarden Secrets Manager via `bws run`).
 *
 * Usage: node scripts/guard-no-localhost-api.cjs
 * Wired into `npm run build` so it runs automatically after `next build`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "out");
const FORBIDDEN = [
  /http:\/\/localhost(?::\d+)?/i,
  /http:\/\/127\.0\.0\.1(?::\d+)?/,
  /http:\/\/0\.0\.0\.0(?::\d+)?/,
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else if (/\.(js|json|html|txt)$/.test(ent.name)) files.push(full);
  }
  return files;
}

let failed = false;

for (const file of walk(OUT)) {
  const content = fs.readFileSync(file, "utf8");
  for (const re of FORBIDDEN) {
    if (re.test(content)) {
      console.error(
        `❌ ${path.relative(ROOT, file)} contains ${re.toString()} — dev/local API base leaked into the production build. Set NEXT_PUBLIC_API_URL via Bitwarden (bws run -- npm run build).`
      );
      failed = true;
    }
  }
}

for (const envFile of [".env", ".env.local", ".env.production", ".env.development"]) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) {
    console.error(
      `❌ Forbidden env file present: ${envFile}. Secrets must come from Bitwarden Secrets Manager (bws run -- ...), never .env files.`
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.log("✅ Guard passed: no localhost API bases, no secret .env files.");