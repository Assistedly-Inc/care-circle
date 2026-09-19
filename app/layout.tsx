import type { Metadata } from 'next';
import './globals.css';
import SiteNav from './SiteNav';

export const metadata: Metadata = {
  title: {
    default: 'Care Circle | Coordinated Care Platform',
    template: '%s | Care Circle',
  },
  description: 'Care Circle helps families, caregivers, and healthcare professionals coordinate around shared care profiles. Private, secure, and beautifully simple.',
  keywords: [
    'care coordination',
    'family caregiving',
    'healthcare management',
    'care circle',
    'patient care',
    'caregiver tools',
  ],
  openGraph: {
    title: 'Care Circle | Coordinated Care Platform',
    description: 'Care Circle helps families, caregivers, and healthcare professionals coordinate around shared care profiles.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <SiteNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
