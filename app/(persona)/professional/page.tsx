import Link from 'next/link';

const features = [
  { href: '/features/cases', title: 'Care Case Management', desc: 'Create and manage shared care profiles, assign coordinators, and control team access.' },
  { href: '/features/audit', title: 'Audit & Compliance', desc: 'Full audit trail of who changed what, when. HIPAA-adjacent logging with before/after snapshots.' },
  { href: '/features/medications', title: 'Medication Verification', desc: 'Verify medication sources, reconcile discharge orders, and flag drug interactions.' },
  { href: '/features/tasks', title: 'Care Plans & Tasks', desc: 'Build structured task lists with due dates, owners, and escalation rules.' },
  { href: '/features/export', title: 'Data Portability', desc: 'Export structured care data in portable format for continuity and compliance.' },
  { href: '/features/auth', title: 'Role-Based Access', desc: 'Configure roles — Coordinator, Caregiver, Family — with role-based permissions.' },
];

export default function ProfessionalPage() {
  return (
    <div>
      <h1>For Healthcare Professionals</h1>
      <p>Coordinate care across providers, maintain compliance, and ensure continuity for every patient.</p>
      <section>
        <h2>Your tools</h2>
        {features.map((f) => (
          <article key={f.href}>
            <Link href={f.href}><h3>{f.title}</h3></Link>
            <p>{f.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
