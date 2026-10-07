# Care Circle — Post-Discharge Care Workspace

## Backend (/care-circle/backend/)
- API: Cases, Tasks, Medications, Auth, Invitations (Phase 1)
- HIPAA compliance
- SQLite

## Frontend (/care-circle/frontend/)
- Next.js family app
- Tasks, medications, care plans

## Phase 1 Status
✅ Care Team Invite Flow (Resend.com)
✅ Role-Based Visibility
✅ Seller-Led B2B GTM

## Discharge Barrier Ledger (feature/barrier-ledger)

A first-class workflow for the barriers that stall discharges: transport, medications, post-acute placement, insurance, family availability, pending tests.

### What it is
- **Backend** (Express + Prisma/SQLite): `barriers` and `barrier_notes` tables. API: `GET/POST /api/barriers/:caseId` (list/create), `PATCH /api/barriers/:caseId/:id` (assign, status transitions, escalate, resolve-with-note), `POST /api/barriers/:caseId/:id/notes`, `GET /api/barriers/:caseId/readiness` (GREEN/AMBER/RED from open barrier priorities), `GET /api/barriers/metrics` (same-day discharge rate, SLA breach rate, median time-to-resolution by type). All routes behind `requireAuth` + case-access checks, mirroring the tasks API.
- **Frontend** (Next.js): `/features/barriers` — barrier board with type/status/owner filters, SLA-breach highlighting, assign/start/escalate/resolve-with-note/reopen actions, per-patient readiness chip, and a pilot-metrics section. Currently demo-driven (`lib/demoBarriers.ts`) to match the rest of the UI; API wiring is the next step.
- `Case` now carries `admissionAt` and `dischargeAt` — the fields that unlock outcome-linked metrics.

### Compliance posture
- Human-in-the-loop only: no autonomous resolution, no clinical decisions, no prediction models.
- Pseudonymous demo data; no PHI in seed.
- Audit logging via existing middleware; role-based access inherited from the case model.
- Minimal data: only what the workflow needs.

### Pilot metrics to measure
Same-day discharge rate, SLA breach rate, median time-to-resolution by barrier type, open barriers per case.

## Discharge Barrier Ledger (feature/barrier-ledger)

A first-class workflow for the barriers that stall discharges: transport, medications, post-acute placement, insurance, family availability, pending tests.

### What it is
- **Backend** (Express + Prisma/SQLite): `barriers` and `barrier_notes` tables. API: `GET/POST /api/barriers/:caseId` (list/create), `PATCH /api/barriers/:caseId/:id` (assign, status transitions, escalate, resolve-with-note), `POST /api/barriers/:caseId/:id/notes`, `GET /api/barriers/:caseId/readiness` (GREEN/AMBER/RED from open barrier priorities), `GET /api/barriers/metrics` (same-day discharge rate, SLA breach rate, median time-to-resolution by type). All routes behind `requireAuth` + case-access checks, mirroring the tasks API.
- **Frontend** (Next.js): `/features/barriers` — barrier board with type/status/owner filters, SLA-breach highlighting, assign/start/escalate/resolve-with-note/reopen actions, per-patient readiness chip, and a pilot-metrics section. Currently demo-driven (`lib/demoBarriers.ts`) to match the rest of the UI; API wiring is the next step.
- `Case` now carries `admissionAt` and `dischargeAt` — the fields that unlock outcome-linked metrics.

### Compliance posture
- Human-in-the-loop only: no autonomous resolution, no clinical decisions, no prediction models.
- Pseudonymous demo data; no PHI in seed.
- Audit logging via existing middleware; role-based access inherited from the case model.
- Minimal data: only what the workflow needs.

### Pilot metrics to measure
Same-day discharge rate, SLA breach rate, median time-to-resolution by barrier type, open barriers per case.
