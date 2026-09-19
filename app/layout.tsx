import type { Metadata } from 'next';
import './globals.css';
import SiteNav from './SiteNav';
import Footer from './Footer';

export const metadata: Metadata = {
  title: {
    default: 'Care Circle | Coordinated Care Platform',
    template: '%s | Care Circle',
  },
  description: 'Care Circle helps families, caregivers, and healthcare professionals coordinate around shared care transitions. Private, secure, and beautifully simple.',
  keywords: [
    'care coordination',
    'care transition',
    'post discharge',
    'family caregiving',
    'healthcare management',
    'care circle',
    'caregiver tools',
  ],
  openGraph: {
    title: 'Care Circle | Coordinated Care Platform',
    description: 'Care Circle helps families and facilities coordinate care transitions after discharge.',
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
        <Footer />
      </body>
    </html>
  );
}
