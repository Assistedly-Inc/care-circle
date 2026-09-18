import Link from 'next/link';

export default function PersonaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <aside role="navigation" aria-label="Persona">
        <ul>
          <li><Link href="/family">Family</Link></li>
          <li><Link href="/caregiver">Caregiver</Link></li>
          <li><Link href="/professional">Professional</Link></li>
          <li><Link href="/patient">Patient</Link></li>
        </ul>
      </aside>
      {children}
    </div>
  );
}
