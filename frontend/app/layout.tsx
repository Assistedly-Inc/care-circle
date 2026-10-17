import type { Metadata } from 'next';
import './globals.css';
import SiteNav from './SiteNav';
import Footer from './Footer';
import ConsentBanner from './ConsentBanner';
import CtaTracker from './CtaTracker';
import StickyTrialBar from './components/StickyTrialBar';

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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

/**
 * Google Consent Mode v2 defaults. Must run BEFORE the GTM container
 * (edge-injected via Cloudflare's googletaggateway) so GA4/Ads tags
 * start in a denied state and only un-gate after explicit user choice.
 */
const consentDefaultsScript = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:2000});try{var c=JSON.parse(localStorage.getItem('cc-consent'));if(c&&c.v===1&&c.s)gtag('consent','update',c.s);}catch(e){}`;

/**
 * Standard Google Tag Manager loader. Client-side container only.
 * The server-side container (GTM-P7V2DSFQ) is NOT loaded in the browser —
 * it receives events from the client container via the `server_container_url`
 * configured in GTM (https://server-side-tagging-piipsyjx3a-uc.a.run.app).
 */
function gtmLoaderScript(containerId: string) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${containerId}');`;
}

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
        {/* Google Consent Mode v2 defaults — MUST execute before the GTM loader */}
        <script dangerouslySetInnerHTML={{ __html: consentDefaultsScript }} />
        {/* Warm Stripe hosts (DNS/TLS) early — checkout mounts faster */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=document;['https://js.stripe.com','https://api.stripe.com','https://m.stripe.network'].forEach(function(u){var l=d.createElement('link');l.rel='preconnect';l.href=u;d.head.appendChild(l);});}catch(e){}})();` }} />
        {/* If this IS the checkout page: start Stripe.js at HTML parse time (before
            React hydrates) at high priority, AND pre-create the Checkout Session
            at parse time so the form has its client_secret with zero wait. If the
            edge already injected window.__CHECKOUT_CS, skip the client POST. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{if(location.pathname.indexOf('/checkout')!==0)return;var d=document,u='https://js.stripe.com/dahlia/stripe.js';var l=d.createElement('link');l.rel='preload';l.as='script';l.href=u;l.fetchPriority='high';d.head.appendChild(l);if(!d.querySelector('script[src="'+u+'"]')){var s=d.createElement('script');s.src=u;s.async=true;s.fetchPriority='high';d.head.appendChild(s);}window.__stripePreloaded=true;try{if(!window.__EDGE_CHECKOUT && !window.__CHECKOUT_CS){var cs=sessionStorage.getItem('assistedly_checkout_cs');if(!cs){sessionStorage.setItem('assistedly_checkout_cs','pending');fetch('${process.env.NEXT_PUBLIC_CHECKOUT_API_URL || 'https://care-backend-mvp.forwardjump-com198.workers.dev'}'+'/api/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(function(r){return r.json()}).then(function(j){if(j.client_secret)sessionStorage.setItem('assistedly_checkout_cs',j.client_secret)}).catch(function(){sessionStorage.removeItem('assistedly_checkout_cs')})}}catch(e2){}}catch(e){}})();` }} />
        {/* Service Worker — caches Stripe.js (stale-while-revalidate) so the
            embedded checkout is instant on repeat visits. */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}` }} />
        {/* Google Tag Manager — client container GTM-5MZDBQ5P */}
        <script dangerouslySetInnerHTML={{ __html: gtmLoaderScript('GTM-5MZDBQ5P') }} />
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5MZDBQ5P"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
        <ConsentBanner />
        <CtaTracker />
        <StickyTrialBar />
      </body>
    </html>
  );
}
