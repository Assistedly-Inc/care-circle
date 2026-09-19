'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

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
  { href: '/features/audit/', label: 'Compliance' },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '/index.html';
  return pathname === href || pathname.startsWith(href);
}

export default function SiteNav() {
  const pathname = usePathname() || '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)] shadow-[var(--shadow-sm)]">
      <div className="container flex items-center gap-3 py-2">
        {/* Home icon */}
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white border-2 border-[var(--color-accent)] text-[var(--color-accent)] transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>
          </span>
        </Link>

        {/* Desktop persona links */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Persona navigation">
          {personaLinks.map(item => {
            const active = isActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#fbeedf] text-[var(--color-accent)]'
                    : 'text-[var(--color-primary)] hover:bg-[#faf7f3] hover:text-[var(--color-secondary)]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Desktop features dropdown */}
        <div className="hidden md:block relative group" aria-label="Features">
          <button className="px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--color-primary)] hover:bg-[#fdf5ef] hover:text-[var(--color-secondary)] transition-colors">
            Features
            <svg className="inline-block w-4 h-4 ml-0.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className="absolute top-full right-0 mt-1.5 w-48 bg-white rounded-[var(--radius-md)] shadow-[var(--shadow-md)] border border-[var(--color-border)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right p-2 grid grid-cols-2 gap-1">
            {featureLinks.map(f => {
              const active = isActive(f.href, pathname);
              return (
                <Link key={f.href} href={f.href}
                  className={`px-3 py-2 text-sm font-semibold rounded-[var(--radius-md)] transition-colors text-center ${
                    active
                      ? 'bg-[#fbeedf] text-[var(--color-accent)]'
                      : 'text-[var(--color-primary)] hover:bg-[#faf7f3]'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <Link href="/features/cases/" className="hidden md:inline-flex btn btn-primary !py-2 !px-4 text-sm whitespace-nowrap">
          Start a Transition
        </Link>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white text-[var(--color-primary)]"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(p => !p)}
        >
          {mobileOpen ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white shadow-[var(--shadow-md)]">
          <div className="container py-3 space-y-4">
            {/* Persona section */}
            <div>
              <p className="px-4 text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">For</p>
              <div className="space-y-1">
                {personaLinks.map(item => {
                  const active = isActive(item.href, pathname);
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-3 rounded-[var(--radius-md)] text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[#fbeedf] text-[var(--color-accent)]'
                          : 'text-[var(--color-primary)] hover:bg-[#faf7f3]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            {/* Features section */}
            <div>
              <p className="px-4 text-xs font-bold uppercase tracking-widest text-[var(--color-muted)] mb-1">Features</p>
              <div className="space-y-1">
                {featureLinks.map(item => {
                  const active = isActive(item.href, pathname);
                  return (
                    <Link key={item.href} href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block px-4 py-3 rounded-[var(--radius-md)] text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-[#fbeedf] text-[var(--color-accent)]'
                          : 'text-[var(--color-primary)] hover:bg-[#faf7f3]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="pt-1">
              <Link href="/features/cases/" onClick={() => setMobileOpen(false)} className="btn btn-primary w-full justify-center !py-3">
                Start a Transition
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
