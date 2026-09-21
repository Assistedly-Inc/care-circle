'use client';

import Link from 'next/link';

const personaLinks = [
  { href: '/family/', label: 'Family' },
  { href: '/professional/', label: 'Facility' },
  { href: '/caregiver/', label: 'Caregiver' },
  { href: '/patient/', label: 'Loved One' },
];

const featureLinks = [
  { href: '/features/cases/', label: 'Care Plans' },
  { href: '/features/medications/', label: 'Medications' },
  { href: '/features/tasks/', label: 'Tasks' },
  { href: '/features/health/', label: 'Health' },
  { href: '/features/notifications/', label: 'Reminders' },
  { href: '/features/export/', label: 'Export' },
];

const legalLinks = [
  { href: '/features/audit/', label: 'Compliance' },
  { href: '/features/auth/', label: 'Access & Security' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[#faf8f5]">
      <div className="container py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white border-2 border-[var(--color-accent)] text-[var(--color-accent)]">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
              </span>
              <span className="font-extrabold text-sm text-[var(--color-secondary)] tracking-tight">Care Circle</span>
            </Link>
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed max-w-xs">
              Care coordination for the first 30 days after discharge. Built for families and facilities.
            </p>
          </div>

          {/* Persona */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-4">For</h3>
            <ul className="space-y-2.5">
              {personaLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-4">Features</h3>
            <ul className="space-y-2.5">
              {featureLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance + CTA */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)] mb-4">Compliance</h3>
            <ul className="space-y-2.5 mb-6">
              {legalLinks.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/features/cases/" className="btn btn-primary text-sm !py-2 !px-4 inline-flex">
              Start a Transition
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-muted)]">&copy; {new Date().getFullYear()} Care Circle. All rights reserved.</p>
          <p className="text-xs text-[var(--color-muted)]">HIPAA-aware. Built for care transitions.</p>
        </div>
      </div>
    </footer>
  );
}
