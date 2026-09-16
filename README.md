# CareCircle Backend MVP — KV Dev Environment

A Cloudflare Worker with KV storage, Web Push notifications, Twilio SMS, scheduled reminders, case management, and task tracking.

**Live URL:** https://care-backend-mvp.forwardjump-com198.workers.dev/

---

## What's New (Item 5 — Reminders)

### Push Notifications (Web Push)
- VAPID key pair generation via `npx web-push generate-vapid-keys`
- Subscriptions stored per-task in KV
- Browser Service Worker (`/sw.js`) shows rich native notifications
- Notifications include actions: **Confirm** / **Snooze**

### SMS (Twilio)
- Twilio Messages API via native `fetch()` — no Node SDK needed
- Handles: phone number on task → SMS on reminder triggers

### Scheduled Reminders
| Trigger | When | Channels |
|---------|------|----------|
| 24h reminder | Task due within 24h, not sent yet | Push + SMS |
| Overdue reminder | Task is overdue (0-24h past due) | Push + SMS |
| Escalation | Task auto-escalated after overdue | Push + SMS |

- Runs automatically every 15 minutes via CRON trigger
- Manual trigger via `POST /api/run-reminders`

---

## API Endpoints

### Cases
- `POST /api/cases` — Create case (body: `{caree, coordinator, consent?}`)
- `GET /api/cases` — List all cases
- `GET /api/cases/:id` — Get case
- `PATCH /api/cases/:id` — Update case

### Tasks
- `POST /api/tasks` — Create task with due date & assignee
- `GET /api/tasks?caseId=...` — List tasks by case
- `GET /api/tasks` — List all pending tasks
- `GET /api/tasks/:id` — Get task
- `PATCH /api/tasks/:id` — Update task
- `POST /api/tasks/:id/confirm` — Mark task done (stops all reminders)
- `POST /api/tasks/:id/remind` — Send manual reminder

### Reminders & Monitoring
- `POST /api/run-reminders` — Execute reminder check manually
- `GET /api/overdue` — List overdue tasks
- `POST /api/push-subscribe` — Register browser push for a task
- `GET /api/vapid-public-key` — Get VAPID public key for frontend

### Legacy KV
- `GET /api/keys`, `POST /api/keys`, `GET /api/keys/:key`, `DELETE /api/keys/:key`

### Utility
- `GET /api/health` — Health check
- `/` — Web admin dashboard
- `/sw.js` — Service Worker for push notifications
- `POST /api/email` — Send email via Resend

---

## Configuration

### Secrets (set via Wrangler CLI)

```bash
# Twilio
npx wrangler secret put TWILIO_ACCOUNT_SID
npx wrangler secret put TWILIO_AUTH_TOKEN
npx wrangler secret put TWILIO_FROM_NUMBER

# Web Push (generate with: npx web-push generate-vapid-keys)
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_JWK   # Store the JSON privateKey object
npx wrangler secret put VAPID_SUBJECT       # e.g., mailto:admin@carecircle.com

# Email
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
```

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
# Store `publicKey` in VAPID_PUBLIC_KEY secret
# Store `privateKey` JSON as VAPID_PRIVATE_JWK secret
```

---

## Deploy

```bash
npx wrangler deploy
```

The CRON trigger (`*/15 * * * *`) is deployed automatically and will execute `checkAndSendReminders()` every 15 minutes.

---

## Local Dev

```bash
# Authenticate
npx wrangler login

# Set dev secrets (same as above with --local)
npx wrangler secret put TWILIO_ACCOUNT_SID --local

# Dev server
npx wrangler dev
```

---

## Modules & File Structure

```
src/
  utils.js          — shared helpers (ids, dates, filters, CORS)
  cases.js          — Case CRUD + GDPR consent field
  tasks.js          — Task CRUD + due-date indexes + escalation
  push.js           — Web Push via Web Crypto API (VAPID JWT signing)
  twilio-sms.js     — Twilio Messages API via fetch()
  reminders.js      — Scheduled reminder orchestrator (24h/overdue/escalation)
  email.js          — Resend email integration
worker.js           — Main fetch() router + scheduled() CRON handler
wrangler.toml       — KV binding + CRON trigger config
```

---

## Reference & Inspiration

| Module | Inspired By |
|--------|------------|
| Web Push (Web Crypto) | Mozilla's [web-push-libs/web-push](https://github.com/web-push-libs/web-push) — VAPID JWT / ECDSA signing patterns |
| Twilio SMS | Twilio [Node SDK source](https://github.com/twilio/twilio-node) — their REST form-encode pattern |
| Cloudflare KV patterns | Cloudflare [Workers docs](https://developers.cloudflare.com/workers/examples/) — prefix listing + index keys |
| Service Worker push | Google [Web Fundamentals: Push](https://developers.google.com/web/fundamentals/push-notifications) — notification actions + data pattern |
