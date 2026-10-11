You are building the FHIR/export interoperability pack for CareCircle — the
must-have foundation that lets hospitals bring data in from any EHR and get
barrier/outcome data out. Work in /Users/dev/care-circle. This is Phase 1 of
the moat strategy: structured import now, so outcome-linked analytics later.

## Phase 1 — Collect data from local research files (read before designing)
1. Inventory Firecrawl research at /Users/dev/care-circle/.firecrawl/ — key
   files include discharge-planning-research.json, elion-market-map.md,
   search-care-transitions.json, search-competitors*.json, mkt-careport.json.
   Also check "/Users/dev/non-senior care idea/", /Users/dev/care-mvp-frontend/,
   and search the drive for DataForSEO exports:
   find /Users/dev -maxdepth 4 \( -iname "*dataforseo*" -o -iname "*dfs*" -o -iname "*keyword*" \) -not -path "*/node_modules/*" 2>/dev/null
2. Extract and cite (with file names) only facts relevant to scoping:
   - Which EHRs dominate the target market (Epic, Oracle/Cerner, Meditech) and
     what export mechanisms they support (Bulk FHIR $export, HL7v2 ADT, CSV)
   - Integration pain points hospitals report
   - Search demand terms related to FHIR/discharge/interop (DataForSEO data)
   - Competitor integration features (CarePort, PointClickCare)
   Do NOT invent market facts. If a file doesn't exist, say so and move on.

## Phase 2 — Scope document (write docs/interop.md before coding)
Define: FHIR R4 NDJSON ingestion spec (Patient, Encounter, Observation),
field-by-field mapping to the CareProfile document (name, birthDate, gender,
identifier -> external id; Encounter.period.start -> admissionDate,
period.end -> dischargeDate; Observation -> optional barrier metadata),
upsert/idempotency rules keyed by FHIR identifier, size limits (Workers CPU:
cap ~5MB / 1000 patients per request), auth model (coordinator-only ingest,
audit entries with counts — no PHI in audit), and export paths (per-case JSON,
barriers CSV). Include a "how Epic/Cerner/Oracle attach" section: Bulk FHIR
$export -> file drop -> this importer; HL7v2 ADT as future phase; SMART on
FHIR later. Cite the research where it informed choices.

## Phase 3 — Build (match existing patterns exactly)
1. New module backend/src/interop.js (ESM, imported by src/index.js). Follow
   the Worker's existing conventions: json/notFound/badRequest helpers,
   getAuthedUser -> 401, canAccessCase -> 404, audit() on mutations, putCaseDoc
   for writes, D1 JSON-doc storage. Mirror the barrier routes' structure.
2. Endpoints:
   - POST /api/interop/fhir-ndjson — body is NDJSON text; parse line-by-line;
     upsert cases by identifier; create/update CareProfile docs; map
     Encounter dates; ignore unknown resource types gracefully; return
     { imported, updated, skipped, errors[] } (counts only, no PHI echoed)
   - GET /api/interop/export/:caseId — case as simplified FHIR-style JSON
   - GET /api/interop/export/barriers.csv — CSV of barriers across accessible
     cases (pseudonymous IDs, no patient names — for analytics)
3. Generate synthetic test data: docs/samples/fhir-sample.ndjson with 3 fake
   patients (obviously synthetic names like "Test Patient One"), encounters,
   one Observation. No real PHI anywhere.
4. Add a smoke script docs/smoke-interop.sh mirroring the barrier smoke test
   pattern (login -> import NDJSON -> list cases -> export CSV), runnable
   against `npx wrangler dev`.

## Phase 4 — Verify and commit
- node --check on modified JS
- Run the smoke script against local wrangler dev if feasible; otherwise
  document expected output
- Commit to a NEW branch: git checkout -b feature/fhir-interop (from main)
- Commit messages: "docs: interop scope from local research" then
  "feat: FHIR NDJSON import + export endpoints"
- Do NOT deploy. Deploys require review.
- Do NOT touch mcp-server/, frontend/, or unrelated backend code beyond
  wiring the import of interop.js into src/index.js.

## Deliverables
docs/interop.md (scope, mappings, research citations, integration roadmap),
backend/src/interop.js, updated backend/src/index.js (routes wired),
docs/samples/fhir-sample.ndjson, docs/smoke-interop.sh, updated README section.
Finish with a summary: what was built, which research files informed which
decisions, and open questions for review.
