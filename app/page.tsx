import Link from 'next/link';

const personas = [
  {
    slug: 'family',
    title: 'Family Members',
    description: 'Coordinate care for your loved one. Manage emergency contacts, review medications, track discharge instructions, and oversee care tasks.',
    features: ['Cases', 'Emergency Contacts', 'Medications', 'Discharge Instructions', 'Export'],
  },
  {
    slug: 'caregiver',
    title: 'Caregivers',
    description: 'Your daily companion for care delivery. Track medication schedules, manage tasks, log health observations, and receive push reminders.',
    features: ['Tasks', 'Medications', 'Health Tracking', 'Push Notifications', 'Reminders'],
  },
  {
    slug: 'professional',
    title: 'Healthcare Professionals',
    description: 'Coordinate care across providers. Manage care plans, review audit trails, verify medications, and export structured data.',
    features: ['Cases', 'Audit Logs', 'Medication Verification', 'Export / Portability', 'Role-Based Access'],
  },
  {
    slug: 'patient',
    title: 'Patients',
    description: 'View your own care profile, medications, upcoming tasks, and health records. Your data, your control.',
    features: ['Own Care Profile', 'Medication List', 'Task Schedule', 'Health Records'],
  },
];

export default function HomePage() {
  return (
    <div>
      <section>
        <h1>Care Circle</h1>
        <p>Coordinated care for families, caregivers, and healthcare professionals.</p>
        <p>Each persona sees the tools most relevant to their role.</p>
      </section>
      <section>
        <h2>Choose your path</h2>
        <div>
          {personas.map((p) => (
            <article key={p.slug}>
              <Link href={`/${p.slug}`}>
                <h3>{p.title}</h3>
              </Link>
              <p>{p.description}</p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href={`/${p.slug}`}>Go to {p.title}</Link>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>Feature Showcase</h2>
        <p>Browse every capability on its own page:</p>
        <ul>
          <li><Link href="/features/auth">Authentication &amp; Role-Based Access</Link></li>
          <li><Link href="/features/cases">Cases &amp; Care Coordination</Link></li>
          <li><Link href="/features/health">Health Tracking &amp; Care Profiles</Link></li>
          <li><Link href="/features/medications">Medications Management</Link></li>
          <li><Link href="/features/tasks">Tasks &amp; Reminders</Link></li>
          <li><Link href="/features/export">Export &amp; Data Portability</Link></li>
          <li><Link href="/features/audit">Audit &amp; Compliance</Link></li>
          <li><Link href="/features/notifications">Push Notifications &amp; SMS</Link></li>
        </ul>
      </section>
    </div>
  );
}
