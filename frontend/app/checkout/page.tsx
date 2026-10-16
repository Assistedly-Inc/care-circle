'use client';

import { useEffect, useRef, useState } from 'react';
import { checkoutApi } from '@/lib/api';

/**
 * Stripe Checkout — embedded form (ui_mode: "form", Dahlia API).
 * Stripe.js is loaded directly from https://js.stripe.com/dahlia/stripe.js
 * (never bundled/self-hosted — PCI requirement).
 */

// Appearance configured in Checkout Studio — do not change without updating it there.
const appearance = {
  theme: 'stripe',
  labels: 'auto',
  inputs: 'spaced',
  variables: {
    borderRadius: '4px',
    colorBackground: '#ffffff',
    colorDanger: '#df1b41',
    colorPrimary: '#4a7c7e',
    colorSuccess: '#00c853',
    colorText: '#30313d',
    fontFamily: 'default',
    fontSizeBase: '16px',
    spacingUnit: '4px',
  },
};

let stripeJsPromise: Promise<unknown> | null = null;

function loadStripeJs(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Stripe.js can only be loaded in the browser.'));
  }
  if (stripeJsPromise) return stripeJsPromise;
  stripeJsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src="https://js.stripe.com/dahlia/stripe.js"]'
    ) as HTMLScriptElement | null;
    if (existing && (window as { Stripe?: unknown }).Stripe) {
      resolve((window as { Stripe?: unknown }).Stripe);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/dahlia/stripe.js';
    script.async = true;
    script.onload = () => resolve((window as { Stripe?: unknown }).Stripe);
    script.onerror = () => {
      stripeJsPromise = null;
      reject(new Error('Failed to load Stripe.js.'));
    };
    document.head.appendChild(script);
  });
  return stripeJsPromise;
}

export default function CheckoutPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) {
          throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set (see frontend/.env.local.example).');
        }

        const StripeCtor = (await loadStripeJs()) as (key: string) => {
          initCheckoutFormSdk: (args: {
            clientSecret: string;
            appearance: typeof appearance;
          }) => unknown;
        };
        const stripe = StripeCtor(publishableKey);

        // Best-effort attribution capture for the server-side GA4 purchase
        // event (Measurement Protocol): GA4 client id from the _ga cookie +
        // gclid from the landing URL (Google Ads click).
        let ga4ClientId = '';
        let gclid = '';
        try {
          const ga = document.cookie.match(/(?:^|;\s*)_ga=GA\d\.\d+\.\d+\.(\d+)/);
          if (ga) ga4ClientId = ga[1];
          gclid = new URLSearchParams(window.location.search).get('gclid') || '';
        } catch {
          // attribution capture must never break checkout
        }

        // Server endpoint returns JSON { client_secret } — no redirect.
        const { client_secret } = await checkoutApi.create({ ga4_client_id: ga4ClientId, gclid });

        const checkout = stripe.initCheckoutFormSdk({
          clientSecret: client_secret,
          appearance,
        }) as {
          createForm: (opts: { layout: 'expanded' }) => {
            mount: (selector: string) => void;
            on: (event: 'confirm', handler: (event: unknown) => void) => void;
          };
          loadActions: () => Promise<{
            type: 'success';
            actions: { confirm: (args: { formConfirmEvent: unknown; returnUrl?: string }) => Promise<void> };
          } | { type: 'error' }>;
        };

        const form = checkout.createForm({ layout: 'expanded' });
        form.mount('#checkout-form');

        const loadActionsResult = await checkout.loadActions();
        if (loadActionsResult.type === 'success') {
          form.on('confirm', async (event: unknown) => {
            try {
              // Embedded Checkout requires a return URL — send the customer to
              // /checkout/success after the trial is confirmed. The
              // {CHECKOUT_SESSION_ID} placeholder is replaced by Stripe.
              const returnUrl = `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
              await loadActionsResult.actions.confirm({ formConfirmEvent: event, returnUrl });
              // Trial signup succeeded — fire conversion event (GTM/GA4).
              // NOTE: first charge is $0 (30-day trial); real `purchase` events
              // fire post-trial via server-side GA4 (see STRIPE_INTEGRATION_TODO.md).
              try {
                const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
                if (Array.isArray(w.dataLayer)) {
                  w.dataLayer.push({
                    event: 'trial_started',
                    trial_session: client_secret.split('_secret_')[0],
                    value: 0,
                    currency: 'usd',
                  });
                }
              } catch {
                // Tracking must never break checkout.
              }
            } catch (err) {
              console.error('Payment confirmation error:', err);
              setError('Payment could not be confirmed. Please try again.');
            }
          });
        } else {
          throw new Error('Checkout actions failed to load.');
        }

        setStatus('ready');
      } catch (err) {
        console.error('Checkout initialization error:', err);
        setError(err instanceof Error ? err.message : 'Checkout could not be initialized.');
        setStatus('error');
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Checkout</h1>
      <div id="checkout-form" aria-label="Payment form" />
      {status === 'loading' && <p>Loading checkout…</p>}
      {status === 'error' && <p role="alert">{error}</p>}
    </main>
  );
}