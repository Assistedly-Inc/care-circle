import Link from 'next/link';

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <header>
        <nav aria-label="Feature navigation">
          <ul>
            <li><Link href="/features/auth">Auth</Link></li>
            <li><Link href="/features/cases">Cases</Link></li>
            <li><Link href="/features/health">Health</Link></li>
            <li><Link href="/features/medications">Meds</Link></li>
            <li><Link href="/features/tasks">Tasks</Link></li>
            <li><Link href="/features/export">Export</Link></li>
            <li><Link href="/features/audit">Audit</Link></li>
            <li><Link href="/features/notifications">Alerts</Link></li>
          </ul>
        </nav>
      </header>
      {children}
    </div>
  );
}
