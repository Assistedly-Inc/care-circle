# Care Circle — Task List

## Subtask: Replace "Start a Transition" CTAs with "Start a Care Plan"

Replace the "Start a Transition" / "Start a Care Transition" / "Start a Transition Plan" / "Create a Care Plan" calls-to-action with "Start a Care Plan" (button label and link text).

**Files with current CTA strings (verified 2026-10-11):**

- `frontend/app/(persona)/family/page.tsx:63` — "Start a Transition Plan"
- `frontend/app/features/cases/page.tsx:104` — "Create a Care Plan" (hero button)
- `frontend/app/features/cases/page.tsx:121` — "Start a Care Transition" (form heading)
- `frontend/app/page.tsx:49` — "Start a Care Transition"
- `frontend/app/page.tsx:226` — "Start a Transition"
- `frontend/app/SiteNav.tsx:100` — "Start a Transition"
- `frontend/app/SiteNav.tsx:168` — "Start a Transition"
- `frontend/app/Footer.tsx:85` — "Start a Transition"

**Scope:** copy/label changes only — keep existing links, layout, and styling. Do not change backend.
**Acceptance:** no "Start a Transition"/"Create a Care Plan"/"Transition Plan" strings remain in the UI; "Start a Care Plan" appears consistently across nav, footer, homepage, family persona, and cases page.