import Link from 'next/link';

const features = [
  { href: '/features/health', title: 'My Care Profile', desc: 'View your personal information, diagnosis, and care plan.' },
  { href: '/features/medications', title: 'My Medications', desc: 'See all your prescribed medications, doses, schedules, and last verified dates.' },
  { href: '/features/tasks', title: 'My Tasks', desc: 'Your upcoming appointments, exercises, and care instructions.' },
  { href: '/features/export', title: 'Download My Data', desc: 'Export your own care record in a portable format.' },
];

export default function PatientPage() {
  return (
    <div>
      <h1>For Patients</h1>
      <p>Your care information, in your hands. View your profile, medications, and care schedule any time.</p>
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
