'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/features/auth', label: 'Auth' },
  { href: '/features/cases', label: 'Cases' },
  { href: '/features/health', label: 'Health' },
  { href: '/features/medications', label: 'Meds' },
  { href: '/features/tasks', label: 'Tasks' },
  { href: '/features/export', label: 'Export' },
  { href: '/features/audit', label: 'Compliance' },
  { href: '/features/notifications', label: 'Alerts' },
];

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <header className="border-b border-[var(--color-border)] bg-white/70 backdrop-blur">
        <nav aria-label="Feature navigation">
          <div className="container">
            <ul className="flex items-center gap-0 overflow-x-auto no-scrollbar py-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`inline-block px-3.5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                          : 'text-[var(--color-text-light)] hover:text-[var(--color-text)] hover:bg-gray-100'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>
      <div className="page-content">{children}</div>
    </div>
  );
}
