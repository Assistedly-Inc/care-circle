import type { Metadata } from 'next';
import './globals.css';
import SiteNav from './SiteNav';
import Footer from './Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://assistedly.ai'),
  alternates: {
    canonical: '/',
  },
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
    siteName: 'Assistedly Cares',
    images: [
      {
        url: '/images/og-hero.jpg',
        width: 1200,
        height: 630,
        alt: 'Adult son in a supportive conversation with his elderly father at home',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Assistedly Cares | Coordinated Care Platform',
    description: 'Assistedly Cares helps families and facilities coordinate care transitions after discharge.',
    images: ['/images/og-hero.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'Assistedly Cares',
      url: 'https://assistedly.ai/',
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      name: 'Assistedly Cares',
      url: 'https://assistedly.ai/',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased flex flex-col min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
