import Link from 'next/link';

const features = [
  { href: '/features/cases', title: 'Cases', desc: 'Create and manage care cases for your loved one. Set up emergency contacts, discharge notes, and care team access.' },
  { href: '/features/health', title: 'Care Profiles', desc: 'View patient information, demographics, and health history in one place.' },
  { href: '/features/medications', title: 'Medications', desc: 'Review all prescribed medications, dosages, schedules, and verification history.' },
  { href: '/features/tasks', title: 'Tasks', desc: 'Assign and track care tasks for the care team. Set due dates and monitor completion.' },
  { href: '/features/export', title: 'Export Data', desc: 'Download care records, medication lists, and contact information for portability.' },
];

export default function FamilyPage() {
  return (
    <div>
      <h1>For Family Members</h1>
      <p>Coordinate care for your loved one. Share access with caregivers and healthcare providers while maintaining visibility and control.</p>
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
