import Link from 'next/link';

const features = [
  { href: '/features/tasks', title: 'Daily Tasks', desc: 'See your assigned care tasks, mark them done, add comments, and escalate when blocked.' },
  { href: '/features/medications', title: 'Medication Schedule', desc: 'View administered and upcoming medications, verify doses, and log notes.' },
  { href: '/features/health', title: 'Health Observations', desc: 'Log vital signs, symptoms, and daily care notes for the care profile.' },
  { href: '/features/notifications', title: 'Reminders', desc: 'Receive push and SMS reminders for upcoming tasks, medication times, and care plan changes.' },
  { href: '/features/export', title: 'Shift Reports', desc: 'Generate and export a summary of tasks completed and health observations during your shift.' },
];

export default function CaregiverPage() {
  return (
    <div>
      <h1>For Caregivers</h1>
      <p>Your daily workflow — tasks, medications, and care logs in one place.</p>
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
