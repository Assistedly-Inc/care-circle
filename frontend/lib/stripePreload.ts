/**
 * Warm Stripe's assets AND pre-create the Checkout Session as early as
 * possible so the embedded checkout mounts instantly:
 *   1. preconnect to Stripe hosts (DNS/TLS warm-up)
 *   2. preload Stripe.js (script cached by the time /checkout mounts)
 *   3. pre-create the Checkout Session on CTA click and stash the
 *      client_secret in sessionStorage — the page then renders the form as
 *      soon as Stripe.js is ready, no extra round trip (~0.5s saved).
 * Idempotent and guarded — never throws, never blocks rendering.
 */
import { checkoutApi } from './api';

const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
const STRIPE_HOSTS = ['https://js.stripe.com', 'https://api.stripe.com', 'https://m.stripe.network'];
const CS_KEY = 'assistedly_checkout_cs';

let preloaded = false;

export function preloadStripeJs(): void {
  if (preloaded || typeof document === 'undefined') return;
  preloaded = true;
  try {
    for (const href of STRIPE_HOSTS) {
      if (!document.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        document.head.appendChild(link);
      }
    }
    if (!document.querySelector(`script[src="${STRIPE_JS_URL}"]`)) {
      const script = document.createElement('script');
      script.src = STRIPE_JS_URL;
      script.async = true;
      // Low priority on marketing pages (warm-up only); the checkout page
      // itself re-loads at high priority.
      (script as HTMLScriptElement & { fetchPriority?: string }).fetchPriority = 'low';
      document.head.appendChild(script);
    }
  } catch {
    // Preloading must never break the page.
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