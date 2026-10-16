/**
 * Inkbot knowledge base — every fact currently published on assistedly.ai.
 *
 * This file is the single source of truth the Inkbot chat page uses to answer
 * questions. It is also the content that gets loaded into the Inkbox A2A
 * worker ("Inkbot") so the same answers are available over the Inkbot Messages
 * ledger once the chat worker is connected.
 *
 * Sources: frontend/app/page.tsx, (persona) pages, features/* pages,
 * terms/page.tsx, privacy/page.tsx. Gathered 2026-10-13.
 */

export interface KnowledgeLink {
  href: string;
  label: string;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  /** Phrases / tokens that should trigger this entry. Match on lowercase. */
  keywords: string[];
  answer: string;
  links?: KnowledgeLink[];
}

export const SITE_NAME = 'Assistedly Cares';
export const SITE_URL = 'https://assistedly.ai';
export const SUPPORT_EMAIL = 'support@assistedly.ai';
export const AGENT_NAME = 'Assistedly Cares concierge';
export const CHAT_TITLE = 'Ask Assistedly Cares';
/** Inkbox SMS line for the Assistedly concierge (identity josh-assistedly). */
export const SMS_NUMBER = '+14133509016';
export const SMS_DISPLAY = '+1 (413) 350-9016';

export const knowledge: KnowledgeEntry[] = [
  {
    id: 'overview',
    topic: 'What is Assistedly Cares',
    keywords: [
      'what is assistedly', 'what does assistedly do', 'about assistedly',
      'assistedly cares', 'what is this', 'company', 'platform', 'product',
      'what do you do', 'what is care coordination', 'what is assistedly ai',
    ],
    answer:
      'Assistedly Cares is a care-coordination platform that helps families, caregivers, and healthcare facilities work from a shared care plan during the first 30 days after a hospital or skilled-nursing discharge. It turns the discharge folder into a living plan — shared medications, follow-ups, daily tasks, health observations, and reminders — so everyone in the care circle stays on the same page. It is free for families, built for facilities, and HIPAA-aware in its design.',
    links: [
      { href: '/', label: 'Assistedly Cares home' },
      { href: '/features/cases/', label: 'Care plans overview' },
    ],
  },
  {
    id: 'why-30-days',
    topic: 'Why the first 30 days matter',
    keywords: [
      '30 days', 'first 30', 'readmission', 'readmitted', 'statistics', 'stats',
      'why important', '1 in 5', '80%', '40%', '75%', 'risk',
    ],
    answer:
      'The first 30 days home are the most important: about 1 in 5 older adults are readmitted to the hospital within 30 days of discharge, and most of those readmissions are preventable — missed medications, confusion about follow-up appointments, or lack of daily observation. Roughly 80% of post-discharge complications are preventable with coordinated follow-up care, around 40% of patients experience medication errors shortly after leaving the hospital, and about 75% of families say they lack clear guidance on what to do after discharge. Assistedly Cares exists to close that gap.',
  },
  {
    id: 'for-families',
    topic: 'For families',
    keywords: [
      'family', 'families', 'daughter', 'son', 'children', 'relative',
      'caregiver for parent', 'help my mom', 'help my dad', 'loved one at home',
    ],
    answer:
      'Families use Assistedly Cares to quarterback the first 30 days after discharge. You get a shared transition plan, medication schedule, daily tasks, reminders, health observations, and an exportable record for the first primary-care follow-up. The family page includes a before-discharge checklist (review medications, confirm follow-ups, add emergency contacts, invite caregivers) plus a week-by-week timeline for week 1 and weeks 2–4. Everything lives in one place so siblings and caregivers stay aligned. It is free for families — no credit card required.',
    links: [
      { href: '/family/', label: 'For families' },
      { href: '/features/cases/', label: 'Start a care plan' },
    ],
  },
  {
    id: 'for-facilities',
    topic: 'For facilities and discharge planners',
    keywords: [
      'facility', 'facilities', 'snf', 'nursing home', 'discharge planner',
      'hospital', 'skilled nursing', 'professional', 'staff', 'cms', 'star rating',
      'readmissions reduction', 'compliance', 'post-acute', 'ltc',
      'home health care agency', 'home health agencies', 'home care agency',
      'home health', 'agencies', 'agency',
    ],
    answer:
      'Facilities use Assistedly Cares to discharge with a living care plan instead of a folder of papers. You get pre-populated care transition plans, medication reconciliation families can actually follow, follow-up scheduling and reminders, health handoffs to the next provider, structured data export for reporting and CMS compliance, a full audit trail, role-based access, and real-time family communication. Facilities typically see fewer readmissions, higher family satisfaction (including CMS Star Ratings and post-discharge surveys), and a ~40% reduction in phone callbacks when families get real-time updates in the app. Home health care agencies use the same platform to keep clinicians, aides, and families aligned — tracking patients\' health, medications, and daily tasks on the go while staying compliant.',
    links: [
      { href: '/professional/', label: 'For facilities' },
      { href: '/features/audit/', label: 'Audit & compliance' },
    ],
  },
  {
    id: 'for-caregivers',
    topic: 'For caregivers',
    keywords: [
      'caregiver', 'caregivers', 'home care aide', 'aide', 'cna', 'nurse aide',
      'care worker', 'shift', 'home health',
    ],
    answer:
      'Caregivers get a simple toolkit: daily care tasks assigned by the family (wound care, meals, mobility, exercises) with notes, a medication schedule that shows exactly when each dose is due and who verified it, daily health observations (vitals, meals, mood, mobility), reminders via push or SMS, and one-tap shift reports that summarize what was completed and observed. The family sees your notes in real time, so everyone stays in sync.',
    links: [
      { href: '/caregiver/', label: 'For caregivers' },
      { href: '/features/tasks/', label: 'Daily tasks' },
    ],
  },
  {
    id: 'for-patients',
    topic: 'For patients and loved ones',
    keywords: [
      'patient', 'loved one', 'senior', 'my care plan', 'my medications',
      'recovery', 'for the patient', 'elderly',
    ],
    answer:
      'The person receiving care is at the center of the plan. Patients can see their transition plan, diagnosis, goals, and recovery timeline in one private place; follow their medication schedule (when to take, how much, who made sure); see their day laid out with appointments, exercises, and care moments; and export their full record anytime — it belongs to them. The promise: after the hospital or rehab, coming home should feel like a relief, not a puzzle.',
    links: [
      { href: '/patient/', label: 'For your loved one' },
      { href: '/features/health/', label: 'Care profile' },
      { href: '/features/export/', label: 'Download my record' },
    ],
  },
  {
    id: 'care-plans',
    topic: 'Care plans / care transitions',
    keywords: [
      'care plan', 'transition plan', 'care transition', 'discharge plan',
      'create a plan', 'start a care plan', 'start a transition', 'plans',
      'care circle', 'shared plan', 'how to start', 'get started', 'sign up',
    ],
    answer:
      'A care plan (also called a care transition plan) is the shared, living version of the discharge instructions. You start by entering the patient\'s details and an emergency contact, then build out medications, follow-ups, daily tasks, and reminders. The plan stays active through the first 30 days — pre-discharge, days 1–7, and days 8–30 — and can be exported for the primary-care visit. To create one, open the Care Plans page and choose "Start a Care Plan." Families can start free, no credit card required.',
    links: [
      { href: '/features/cases/', label: 'Care plans page' },
    ],
  },
  {
    id: 'medications',
    topic: 'Medication tracking & reconciliation',
    keywords: [
      'medication', 'medications', 'medicine', 'meds', 'dose', 'dosage',
      'schedule', 'reconciliation', 'pill', 'adherence', 'verify', 'verified',
    ],
    answer:
      'The medication feature keeps a reconciled list in a format families can follow — not just a printout. Each medication shows the name, dose, schedule, and source, plus who verified it and when. You can log missed or delayed doses, add notes, and everyone in the care circle sees updates in real time. For facilities, medication reconciliation is shared before discharge so families leave with the same list the facility used.',
    links: [
      { href: '/features/medications/', label: 'Medication schedule' },
    ],
  },
  {
    id: 'tasks',
    topic: 'Daily tasks & coordination',
    keywords: [
      'task', 'tasks', 'to do', 'todo', 'assign', 'assignee', 'owner',
      'wound care', 'exercise', 'pt', 'physical therapy', 'meals', 'mobility',
      'escalate', 'comment',
    ],
    answer:
      'The Tasks feature assigns and tracks care tasks across family members, caregivers, and providers: wound care, PT exercises, meals, mobility, appointments, and more. Each task has an owner, due date, description, status (to do, in progress, blocked, done, cancelled), comments, and optional escalation. Families set the plan; caregivers mark things complete with notes; everyone sees the same board through the first 30 days.',
    links: [
      { href: '/features/tasks/', label: 'Daily tasks' },
    ],
  },
  {
    id: 'health',
    topic: 'Care profile & health observations',
    keywords: [
      'health', 'care profile', 'profile', 'observation', 'observations',
      'vitals', 'blood pressure', 'weight', 'allergy', 'allergies', 'diagnosis',
      'discharge instructions', 'red flag', 'red flags', 'diet', 'activity',
    ],
    answer:
      'The care profile keeps diagnosis history, allergies, discharge instructions (summary, discharge date, follow-up plan, red flags to watch, activity and diet guidance), emergency contacts, and consent in one place everyone authorized can access. Caregivers can log daily observations — vitals, meals, mood, mobility — so the family and facility stay informed between visits.',
    links: [
      { href: '/features/health/', label: 'Care profile' },
    ],
  },
  {
    id: 'notifications',
    topic: 'Reminders & notifications',
    keywords: [
      'reminder', 'reminders', 'notification', 'notifications', 'alert',
      'push', 'sms', 'text', 'appointment reminder', 'check-in', 'check in',
      'overdue',
    ],
    answer:
      'Reminders keep the plan moving: alerts for medication times, follow-up appointments, overdue tasks, and daily check-ins. Families and caregivers get them via push or SMS, so nothing gets forgotten — and facilities see fewer phone callbacks because families are updated in real time.',
    links: [
      { href: '/features/notifications/', label: 'Reminders' },
    ],
  },
  {
    id: 'follow-ups',
    topic: 'Post-discharge follow-ups',
    keywords: [
      'follow up', 'follow-up', 'followup', 'follow ups', 'follow-ups',
      'check-ins', 'day 3', 'day 7', 'day 14', 'day 30', 'complication',
      'readmission prevention',
    ],
    answer:
      'Assistedly Cares runs automated post-discharge check-ins at days 3, 7, 14, and 30 — catching complications before they become readmissions. Each follow-up is tracked as scheduled, completed, missed, escalated, or cancelled, with metrics like completion rate and escalation rate for facility quality review.',
    links: [
      { href: '/features/follow-ups/', label: 'Follow-ups' },
    ],
  },
  {
    id: 'barriers',
    topic: 'Discharge barrier ledger',
    keywords: [
      'barrier', 'barriers', 'discharge barrier', 'transport', 'placement',
      'insurance', 'pending test', 'readiness', 'sla', 'pilot metrics',
      'same-day discharge',
    ],
    answer:
      'The Discharge Barrier Ledger is a first-class workflow for the things that stall discharges: transport, medications, post-acute placement, insurance, family availability, and pending tests. Each barrier has a priority (high/medium/low) and moves from identified → assigned → in progress → resolved (or escalated), with notes and an overall case readiness of green/amber/red. Pilot metrics include same-day discharge rate, SLA breach rate, and median time-to-resolution by barrier type. This workflow is human-in-the-loop only — no autonomous resolution or clinical decisions.',
    links: [
      { href: '/features/barriers/', label: 'Barrier ledger' },
    ],
  },
  {
    id: 'export',
    topic: 'Exporting records',
    keywords: [
      'export', 'download', 'pdf', 'record', 'records', 'summary',
      'portability', 'data portability', 'print', 'primary care visit',
    ],
    answer:
      'You can export a patient\'s complete care plan — medications, tasks, discharge instructions — as a portable record, usually a PDF, to bring to the first primary-care follow-up or to keep for the family. Data portability is a first-class feature, including structured export for facility reporting, CMS compliance, and readmission analytics. Your data is yours: you may export it at any time.',
    links: [
      { href: '/features/export/', label: 'Export' },
    ],
  },
  {
    id: 'audit',
    topic: 'Audit trail & compliance',
    keywords: [
      'audit', 'audit trail', 'audit log', 'compliance', 'hipaa', 'logging',
      'traceable', 'accounted for', 'who accessed', 'who changed',
    ],
    answer:
      'Every access is logged and every change is traceable. Assistedly Cares maintains full audit trails that record who accessed a care plan, when, and what actions were taken — available to authorized members and facility administrators for QA and regulatory review. The platform is built with HIPAA-aware principles: role-based access, encryption in transit and at rest, secure authentication, and consent controls. It is a care-coordination tool, not a medical device — it does not provide diagnosis, treatment, or clinical decision support.',
    links: [
      { href: '/features/audit/', label: 'Audit trail' },
      { href: '/features/auth/', label: 'Access & security' },
    ],
  },
  {
    id: 'roles',
    topic: 'Role-based access & security',
    keywords: [
      'role', 'roles', 'role-based', 'permission', 'permissions', 'access',
      'security', 'secure', 'who can see', 'invite', 'invitation', 'revoke',
      'mfa', 'two factor', 'password', 'sign in', 'login', 'log in', 'auth',
    ],
    answer:
      'Access is controlled through role-based permissions: families (read-only views of their care plan), caregivers (can update tasks, medications, and health observations), and coordinators or facility staff (full access to their cases). Invitations are role-based and can be revoked instantly. The platform supports secure authentication (including MFA), audit logging, encryption in transit and at rest, and consent controls. Every care-circle member sees only what their role authorizes.',
    links: [
      { href: '/features/auth/', label: 'Access & security' },
    ],
  },
  {
    id: 'privacy',
    topic: 'Privacy policy',
    keywords: [
      'privacy', 'private', 'data', 'personal information', 'sell', 'sharing',
      'retention', 'deletion', 'delete my data', 'gdpr', 'ccpa', 'phi',
    ],
    answer:
      'Assistedly Cares collects only what the care circle needs: account information, care profiles, care plans and tasks, medication information, communications, and basic usage data. Information is shared only within your care circle — Assistedly Cares does not sell personal information or share it for advertising. Data is encrypted in transit and at rest, access is role-based, every access is audit-logged, and you can request deletion of your account and associated data at any time. See the Privacy Policy for the full details.',
    links: [
      { href: '/privacy/', label: 'Privacy policy' },
    ],
  },
  {
    id: 'terms',
    topic: 'Terms of service',
    keywords: [
      'terms', 'terms of service', 'medical advice', 'legal', 'liability',
      'acceptable use', 'not medical advice',
    ],
    answer:
      'The short version: Assistedly Cares supports coordination and does not replace professional medical judgment — nothing in the platform constitutes medical advice, diagnosis, or treatment. You retain ownership of the information you enter, use the service only for legitimate care-coordination purposes, and stay within the scope of your authorized role. In an emergency, contact emergency services immediately. Full details are in the Terms of Service.',
    links: [
      { href: '/terms/', label: 'Terms of service' },
    ],
  },
  {
    id: 'pricing',
    topic: 'Pricing',
    keywords: [
      'price', 'pricing', 'cost', 'how much', 'free', 'pay', 'payment',
      'credit card', 'plan', 'subscription',
    ],
    answer:
      'Assistedly Cares is free for families — no credit card required to start a care plan. It is built for facilities, with plans designed around improving outcomes, reducing readmissions, and raising family satisfaction. For facility pricing and onboarding, contact support@assistedly.ai.',
  },
  {
    id: 'getting-started',
    topic: 'Getting started',
    keywords: [
      'how do i start', 'how to use', 'get started', 'first step', 'where do i begin',
      'tutorial', 'onboarding', 'walk me through', 'demo', 'try it',
    ],
    answer:
      'Getting started takes about two minutes: open the Care Plans page, choose "Start a Care Plan," and enter the patient\'s name and an emergency contact. From there you can add medications, tasks, follow-ups, and reminders, then invite family and caregivers by role. Visitors can preview the platform immediately in demo mode — signed-in users see their real care plans. Start at the Care Plans page.',
    links: [
      { href: '/features/cases/', label: 'Start a care plan' },
    ],
  },
  {
    id: 'contact',
    topic: 'Contact & support',
    keywords: [
      'contact', 'support', 'email', 'help desk', 'reach', 'talk to a person',
      'human', 'sales', 'phone number', 'who do i contact',
    ],
    answer:
      'You can reach the Assistedly Cares team at support@assistedly.ai. For facility partnerships and onboarding, that is also the right address — mention your facility in the message.',
    links: [
      { href: '/', label: 'Assistedly Cares home' },
    ],
  },
];

/** Quick-reply chips shown in the composer area. */
export const suggestedPrompts: string[] = [
  'Start SMS Chat',
  'Begin New Care Plan',
  'Track Medications',
  'How Much Does It Cost?',
  'Is My Data Private?',
];

/** The greeting Inkbot sends when a conversation starts. */
export const welcomeMessage =
  `Hi! I'm ${AGENT_NAME}. I help home health care agencies with: care plans, medications, tasks, follow-ups, and more. ` +
  `Plus chats are private and HIPAA compliant, and more. Start a care plan or get answers now! 👋`;

export const fallbackMessage =
  `I don't have a specific answer for that one yet — I'm built from everything currently on assistedly.ai. ` +
  `Here's what I can tell you about:`;

export const fallbackTopics: { label: string; entryId: string }[] = [
  { label: 'What is Assistedly Cares?', entryId: 'overview' },
  { label: 'Care plans', entryId: 'care-plans' },
  { label: 'Medications', entryId: 'medications' },
  { label: 'For facilities', entryId: 'for-facilities' },
  { label: 'Privacy', entryId: 'privacy' },
  { label: 'Pricing', entryId: 'pricing' },
  { label: 'Contact support', entryId: 'contact' },
];

export const disclaimer =
  `Chats are private and HIPAA compliant. ${AGENT_NAME} is an AI assistant and does not provide medical advice. ` +
  `For medical decisions, always consult a qualified healthcare professional; in an emergency, call emergency services. ` +
  `Information about a specific patient is only shared with authorized members of that care circle.`;

export function getEntryById(id: string): KnowledgeEntry | undefined {
  return knowledge.find((e) => e.id === id);
}