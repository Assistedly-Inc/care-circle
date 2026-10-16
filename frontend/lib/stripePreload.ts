/**
 * Stripe warm-up pipeline — one shared loader, no duplicate downloads.
 *   1. Parse-time inline script in the layout starts the Stripe.js download
 *      the instant /checkout HTML arrives (before React hydrates).
 *   2. preloadStripeJs() (CTA click or page effect) preconnects + ensures the
 *      script exists at low priority on marketing pages.
 *   3. loadStripeJs('high') on the checkout page bumps priority and resolves
 *      once Stripe is ready — reusing the script already in flight.
 *   4. precreateCheckoutSession() stashes the client_secret in sessionStorage
 *      so /checkout renders the form with zero session round trip.
 * Idempotent and guarded — never throws, never blocks rendering.
 */
import { checkoutApi } from './api';

export const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
const STRIPE_HOSTS = ['https://js.stripe.com', 'https://api.stripe.com', 'https://m.stripe.network'];
const CS_KEY = 'assistedly_checkout_cs';

let stripePromise: Promise<unknown> | null = null;

function ensureStripeScript(priority: 'low' | 'high'): Promise<unknown> {
  if (stripePromise) return stripePromise;
  stripePromise = new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        reject(new Error('Stripe.js can only be loaded in the browser.'));
        return;
      }
      const existing = document.querySelector(`script[src="${STRIPE_JS_URL}"]`);
      if (existing && (window as { Stripe?: unknown }).Stripe) {
        resolve((window as { Stripe?: unknown }).Stripe);
        return;
      }
      const script = (existing as HTMLScriptElement) || document.createElement('script');
      if (!existing) {
        script.src = STRIPE_JS_URL;
        script.async = true;
        document.head.appendChild(script);
      }
      (script as HTMLScriptElement & { fetchPriority?: string }).fetchPriority = priority;
      script.onload = () => resolve((window as { Stripe?: unknown }).Stripe);
      script.onerror = () => {
        stripePromise = null;
        reject(new Error('Failed to load Stripe.js.'));
      };
    } catch (err) {
      stripePromise = null;
      reject(err);
    }
  });
  return stripePromise;
}

/** Marketing-page warm-up: preconnect + ensure the script (low priority). */
export function preloadStripeJs(): void {
  try {
    if (typeof document === 'undefined') return;
    for (const href of STRIPE_HOSTS) {
      if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        document.head.appendChild(link);
      }
    }
    void ensureStripeScript('low');
  } catch {
    // Preloading must never break the page.
  }
}

/** Checkout page loader: ensure script at high priority, resolve when ready. */
export function loadStripeJs(): Promise<unknown> {
  try {
    return ensureStripeScript('high');
  } catch {
    return Promise.reject(new Error('Failed to load Stripe.js.'));
  }
}

/** Fire-and-forget session creation; stash the client_secret for checkout. */
export function precreateCheckoutSession(): void {
  try {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    if (sessionStorage.getItem(CS_KEY)) return; // already created or in flight
    sessionStorage.setItem(CS_KEY, 'pending');
    checkoutApi
      .create({})
      .then(res => sessionStorage.setItem(CS_KEY, res.client_secret))
      .catch(() => sessionStorage.removeItem(CS_KEY));
  } catch {
    // Pre-creation must never break the page.
  }
}

/** Read (and consume) a pre-created client_secret, if one exists. */
export function readPrecreatedSession(): string | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const v = sessionStorage.getItem(CS_KEY);
    if (!v || v === 'pending') return null;
    sessionStorage.removeItem(CS_KEY);
    return v;
  } catch {
    return null;
  }
}

/** Full warm-up used by every trial CTA: preload Stripe.js + pre-create session. */
export function preloadCheckout(): void {
  preloadStripeJs();
  precreateCheckoutSession();
}