/**
 * Warm the Stripe.js cache as early as possible so the embedded checkout
 * mounts instantly instead of waterfalling: CTA click → page nav → download.
 * Idempotent and guarded — never throws, never blocks rendering.
 */
const STRIPE_JS_URL = 'https://js.stripe.com/dahlia/stripe.js';
const STRIPE_HOSTS = ['https://js.stripe.com', 'https://api.stripe.com', 'https://m.stripe.network'];

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
      // Low priority: page-critical assets win; this is a warm-up only.
      (script as HTMLScriptElement & { fetchPriority?: string }).fetchPriority = 'low';
      document.head.appendChild(script);
    }
  } catch {
    // Preloading must never break the page.
  }
}