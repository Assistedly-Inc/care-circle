import type { Metadata } from 'next';
import './globals.css';
import SiteNav from './SiteNav';
import Footer from './Footer';

export const metadata: Metadata = {
  title: {
    default: 'Assistedly Cares | Coordinated Care Platform',
    template: '%s | Assistedly Cares',
  },
  description: 'Assistedly Cares helps families, caregivers, and healthcare professionals coordinate around shared care transitions. Private, secure, and beautifully simple.',
  keywords: [
    'care coordination',
    'care transition',
    'post discharge',
    'family caregiving',
    'healthcare management',
    'assistedly cares',
    'caregiver tools',
  ],
  openGraph: {
    title: 'Assistedly Cares | Coordinated Care Platform',
    description: 'Assistedly Cares helps families and facilities coordinate care transitions after discharge.',
    type: 'website',
    url: 'https://assistedly.ai/',
    images: [{ url: 'https://assistedly.ai/images/family-generations.jpg', width: 1600, height: 1067, alt: 'Multigenerational family caring for a loved one at home' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Assistedly Cares | Coordinated Care Platform',
    description: 'Assistedly Cares helps families and facilities coordinate care transitions after discharge.',
    images: ['https://assistedly.ai/images/family-generations.jpg'],
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
