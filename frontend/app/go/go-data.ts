export interface GoTheme {
  slug: string;
  eyebrow: string;
  h1: string;
  subhead: string;
  bullets: string[];
  stats: { value: string; label: string }[];
  metaTitle: string;
  metaDescription: string;
  adHeadlines: string[];
  adDescriptions: string[];
}

export const goThemes: GoTheme[] = [
  {
    slug: 'compliance',
    eyebrow: 'For Home Health Agencies',
    h1: 'Home Health Compliance Without the Paper Chase',
    subhead:
      'Full audit trail, role-based access, and HIPAA-aware logging — Assistedly Cares keeps your post-discharge care plans compliant and your team on track. No new software for nurses to learn.',
    bullets: [
      'Full audit trail with before/after history for every change',
      'Role-based access — coordinators, caregivers, and family see only what they should',
      'Consent tracked before any information is shared',
      'Encrypted connections and signed sessions with automatic expiry',
      'Export structured records for CMS reporting, QA, and readmission analytics',
    ],
    stats: [],
    metaTitle: 'Compliance & Audit Trail for Home Health Agencies',
    metaDescription:
      'HIPAA-aware audit trails, role-based access, and consent tracking for post-discharge care plans. Built for Massachusetts home health agencies.',
    adHeadlines: [
      'Compliance Without the Paper Chase',
      'HIPAA-Aware Audit Trails',
      'For MA Home Health Agencies',
    ],
    adDescriptions: [
      'Full audit trail, role-based access, consent tracking. See how Assistedly Cares keeps post-discharge plans compliant.',
    ],
  },
  {
    slug: 'medication-tracking',
    eyebrow: 'For Home Health Agencies',
    h1: 'Medication Tracking Families Actually Follow',
    subhead:
      'See every medication, when it is due, and who verified it — in real time. Families stop relying on sticky notes, and your team stops fielding missed-dose calls after discharge.',
    bullets: [
      'Real-time medication schedule with doses and due times',
      'Verification trail — who confirmed each medication and when',
      'Concern logging for side effects, refusals, or questions',
      'Push + SMS reminders for meds, appointments, and tasks',
      'Export the reconciled list for the primary care visit',
    ],
    stats: [],
    metaTitle: 'Medication Tracking for Home Health Agencies',
    metaDescription:
      'Medication schedules, verification trails, and SMS reminders families actually follow. Reduce post-discharge medication errors with Assistedly Cares.',
    adHeadlines: [
      'Medication Tracking Families Follow',
      'Who Verified Every Dose?',
      'Reduce Post-Discharge Med Errors',
    ],
    adDescriptions: [
      'Real-time med schedules, verification trails, SMS reminders. Free pilot for MA home health agencies.',
    ],
  },
  {
    slug: 'readmissions',
    eyebrow: 'For Home Health Agencies',
    h1: 'Cut Avoidable Readmissions — Before HHVBP Does It for You',
    subhead:
      'Automated check-ins at days 3, 7, 14, and 30. Discharge barriers tracked with SLA clocks and escalation. Assistedly Cares gives families a living care plan — and protects your payments.',
    bullets: [
      'Automated follow-up cadence catches complications early',
      'Discharge barrier tracking — transport, meds, placement, insurance — with escalation',
      'Medication reconciliation families can follow at home',
      'Coordinator dashboard for overdue tasks and unresolved questions',
      'Reduces post-discharge phone callbacks by up to 40%',
    ],
    stats: [],
    metaTitle: 'Reduce Readmissions & HHVBP Risk for Home Health',
    metaDescription:
      'Automated 3-7-14-30 day follow-ups, barrier tracking, and escalation. Protect your HHVBP adjustment with Assistedly Cares for MA home health agencies.',
    adHeadlines: [
      'Cut Avoidable Readmissions',
      'HHVBP Risk? Fix It Now',
      'Automated 3-7-14-30 Day Follow-Ups',
    ],
    adDescriptions: [
      'Automated follow-ups, barrier tracking, escalation. Free pilot for MA home health agencies — no EHR required.',
    ],
  },
  {
    slug: 'family-engagement',
    eyebrow: 'For Home Health Agencies',
    h1: 'Families in the Loop. Callbacks Down.',
    subhead:
      'Push, SMS, and in-app updates keep families informed between visits — so your team answers fewer routine calls, satisfaction scores climb, and CMS Star Ratings follow.',
    bullets: [
      'Real-time family communication channel to your team',
      'Reminders for meds, appointments, and daily check-ins',
      'Families can log observations and questions in-app',
      'Coordinator sees overdue tasks and escalations at a glance',
      'Full audit trail for QA and regulatory review',
    ],
    stats: [],
    metaTitle: 'Family Engagement for Home Health Agencies',
    metaDescription:
      'Push, SMS, and in-app updates keep families informed — fewer callbacks, better satisfaction, higher star ratings. Free pilot for MA agencies.',
    adHeadlines: [
      'Families in the Loop',
      'Fewer Callbacks for Your Team',
      'Better Family Satisfaction Scores',
    ],
    adDescriptions: [
      'Push, SMS, in-app updates keep families informed. Cut callbacks and lift satisfaction with Assistedly Cares.',
    ],
  },
  {
    slug: 'pilot',
    eyebrow: 'Massachusetts Home Health Agencies',
    h1: 'Free 30-Day Pilot for Massachusetts Home Health Agencies',
    subhead:
      'No EHR required. No IT setup. Give 10 patients a living post-discharge care plan — meds, tasks, reminders — and see the difference before you pay anything.',
    bullets: [
      'Free 30-day pilot — 10 patients, no credit card',
      'Live in under two minutes — passwordless sign-in',
      'Zero extra documentation for your nurses',
      'HIPAA-aware, with full audit trail',
      'Success metric: fewer callbacks and missed meds in 30 days',
    ],
    stats: [],
    metaTitle: 'Free 30-Day Pilot for MA Home Health Agencies',
    metaDescription:
      'Free 30-day pilot for Massachusetts home health agencies. Living care plans, meds, tasks, reminders — no EHR required, zero nurse documentation.',
    adHeadlines: [
      'Free 30-Day Pilot for HHAs',
      'No EHR Required — Try It Free',
      '10 Patients. 30 Days. Free.',
    ],
    adDescriptions: [
      'Free pilot for MA home health agencies: living post-discharge care plans, meds, tasks, reminders. No EHR required. Sign up today.',
    ],
  },
];

export const goThemeBySlug: Record<string, GoTheme> = Object.fromEntries(
  goThemes.map((t) => [t.slug, t])
);
