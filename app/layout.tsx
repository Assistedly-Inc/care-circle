import type { Metadata } from 'next';
import SiteNav from './SiteNav';

export const metadata: Metadata = {
  title: {
    default: 'Care Circle | Coordinated Care Platform',
    template: '%s | Care Circle',
  },
  description: 'Care Circle helps families, caregivers, and healthcare professionals coordinate around shared care profiles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteNav />
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
