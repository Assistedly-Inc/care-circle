'use client';

import Link from 'next/link';

const personas = [
  { slug: 'family', label: 'Family', desc: 'Manage care for your loved one' },
  { slug: 'caregiver', label: 'Caregiver', desc: 'Track tasks, medications and schedules' },
  { slug: 'professional', label: 'Professional', desc: 'Coordinate care plans across providers' },
  { slug: 'patient', label: 'Patient', desc: 'Access your own care information' },
];

const featureLinks = [
  { href: '/features/auth', label: 'Authentication' },
  { href: '/features/cases', label: 'Cases' },
  { href: '/features/health', label: 'Health' },
  { href: '/features/medications', label: 'Medications' },
  { href: '/features/tasks', label: 'Tasks' },
  { href: '/features/export', label: 'Export' },
  { href: '/features/audit', label: 'Audit' },
  { href: '/features/notifications', label: 'Notifications' },
];

export default function SiteNav() {
  return (
    <nav role="navigation" aria-label="Primary">
      <div>
        <Link href="/">Care Circle</Link>
      </div>
      <div>
        <details>
          <summary>For</summary>
          <div>
            {personas.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`}>
                {p.label} — {p.desc}
              </Link>
            ))}
          </div>
        </details>
        <details>
          <summary>Features</summary>
          <div>
            {featureLinks.map((f) => (
              <Link key={f.href} href={f.href}>
                {f.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
