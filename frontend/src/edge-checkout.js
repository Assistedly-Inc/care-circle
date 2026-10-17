/**
 * care-circle-cta-preview edge handler (preview only — production untouched).
 *
 * Static assets + one interception: for GET /checkout, STREAM the HTML.
 *   1. The <head> + a Stripe.js preload link are sent IMMEDIATELY, so the
 *      browser starts the 1.1 MB Stripe.js download while the Worker awaits
 *      the Stripe API.
 *   2. The Checkout Session is created at the edge in parallel and its
 *      client_secret is injected before </head>.
 *   3. The body streams next — the form mounts with zero client-side session
 *      round trip and the script already in flight ("Loading checkout…" gone,
 *      TTFB ≈ static-asset latency instead of session latency).
 *
 * Secrets come from worker secrets/vars (never env files):
 *   STRIPE_SECRET_KEY  — test secret key (preview)
 *   STRIPE_PRICE_ID    — test-mode price
 */
const STRIPE_JS = 'https://js.stripe.com/dahlia/stripe.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isCheckout = url.pathname === '/checkout' || url.pathname === '/checkout/';

    if (request.method === 'GET' && isCheckout) {
      const assetResp = await env.ASSETS.fetch(request);
      if (!assetResp.ok) return assetResp;
      const html = await assetResp.text();
      const headEnd = html.indexOf('</head>');
      const preloadTag = `<link rel="preload" as="script" href="${STRIPE_JS}" fetchpriority="high">`;

      const body = new ReadableStream({
        async start(controller) {
          // 1) Stream the <head> + preload immediately (browser starts the
          //    Stripe.js download NOW, in parallel with the Stripe API call).
          controller.enqueue(html.slice(0, headEnd) + preloadTag);
          // 2) Create the session at the edge, then inject its secret.
          try {
            const clientSecret = await createCheckoutSession(env, url.origin);
            controller.enqueue(`<script>window.__CHECKOUT_CS=${JSON.stringify(clientSecret)};</script>`);
          } catch {
            // Edge session failed — the page's parse-time script falls back to
            // creating the session client-side.
          }
          // 3) Stream the rest of the document.
          controller.enqueue(html.slice(headEnd));
          controller.close();
        },
      });

      return new Response(body, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store', // per-visit session — never cache
        },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

async function createCheckoutSession(env, origin) {
  const sk = env.STRIPE_SECRET_KEY || '';
  const priceId = env.STRIPE_PRICE_ID || '';
  if (!sk || !priceId) throw new Error('STRIPE_SECRET_KEY or STRIPE_PRICE_ID not configured');

  const form = new URLSearchParams();
  // Mirrors the production/test-worker session params — embedded form mode.
  form.set('mode', 'subscription');
  form.set('ui_mode', 'form');
  form.set('billing_address_collection', 'auto');
  form.set('phone_number_collection[enabled]', 'false');
  form.set('automatic_tax[enabled]', 'false');
  form.set('submit_type', 'auto');
  form.set('integration_identifier', 'custom_embedded_web_0001');
  form.set('payment_method_collection', 'always');
  form.set('subscription_data[trial_period_days]', '30'); // 30-day free trial
  form.set('line_items[0][price]', priceId);
  form.set('line_items[0][quantity]', '1');
  form.set('return_url', `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${sk}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Stripe session creation failed');
  return data.client_secret;
}