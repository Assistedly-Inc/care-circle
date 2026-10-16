'use client';

import { useEffect, useRef, useState } from 'react';
import { checkoutApi } from '@/lib/api';
import { loadStripeJs, preloadStripeJs, readPrecreatedSession } from '@/lib/stripePreload';

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

        // Warm Stripe preconnect/preload even on direct landing (no CTA click).
        preloadStripeJs();

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

        // Use a session pre-created on the CTA click when available (no round
        // trip); otherwise create one now. Stripe.js and the session load in
        // parallel either way.
        const precreated = readPrecreatedSession();
        const sessionPromise = precreated
          ? Promise.resolve({ client_secret: precreated })
          : checkoutApi.create({ ga4_client_id: ga4ClientId, gclid });

        const [StripeCtor, session] = await Promise.all([
          loadStripeJs(),
          sessionPromise,
        ]);
        const stripe = (StripeCtor as (key: string) => {
          initCheckoutFormSdk: (args: {
            clientSecret: string;
            appearance: typeof appearance;
          }) => unknown;
        })(publishableKey);
        const { client_secret } = session;

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
            actions: { confirm: (args: { formConfirmEvent: unknown }) => Promise<void> };
          } | { type: 'error' }>;
        };

        const form = checkout.createForm({ layout: 'expanded' });
        form.mount('#checkout-form');

        const loadActionsResult = await checkout.loadActions();
        if (loadActionsResult.type === 'success') {
          form.on('confirm', async (event: unknown) => {
            try {
              // return_url is set on the Checkout Session server-side (both the
              // production backend and checkout-test-worker), so confirm() must
              // NOT also pass returnUrl — Stripe rejects providing both.
              await loadActionsResult.actions.confirm({ formConfirmEvent: event });
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