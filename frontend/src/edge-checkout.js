/**
 * care-circle-cta-preview edge handler (preview only — production untouched).
 *
 * Two responsibilities:
 *
 * A) /checkout/ → STREAM the checkout HTML (fast path):
 *    1. <head> + Stripe.js preload link sent IMMEDIATELY — the browser starts
 *       the 1.1 MB Stripe.js download while the Worker awaits the Stripe API.
 *    2. Checkout Session created at the edge in parallel; client_secret
 *       injected before </head>.
 *    3. Body streams next — form mounts with zero client-side session round
 *       trip and the script already in flight. Response is always no-store
 *       (unique per-visit session).
 *
 * B) Every other route → serve static assets with edge-cache headers
 *    (s-maxage lets Cloudflare's edge cache serve repeat hits WITHOUT running
 *    the Worker — TTFB ~0.01s, zero CPU on cache hits):
 *      /sw.js                 → 24h edge cache
 *      /checkout/success*     → 60s browser / 5min edge
 *      fingerprinted assets   → 1 year, immutable
 *      HTML routes (/, /pricing/, …) → 5min browser / 10min edge
 *
 * Secrets come from worker secrets/vars (never env files):
 *   STRIPE_SECRET_KEY  — test secret key (preview)
 *   STRIPE_PRICE_ID    — test-mode price
 */
const STRIPE_JS = 'https://js.stripe.com/dahlia/stripe.js';

/** Classify a non-checkout path into a cache profile. */
function classifyPath(pathname) {
  if (pathname === '/sw.js') {
    return { type: 'sw', value: 'public, max-age=0, s-maxage=86400, must-revalidate' };
  }
  if (pathname.startsWith('/checkout/success')) {
    return { type: 'success', value: 'public, max-age=60, s-maxage=300' };
  }
  if (/\.(js|css|woff2?|png|jpe?g|gif|webp|svg|ico|txt|json|xml|map)(\?|$)/i.test(pathname)) {
    return { type: 'asset', value: 'public, max-age=31536000, immutable' };
  }
  return { type: 'html', value: 'public, max-age=300, s-maxage=600' };
}

/** Wrap a response with the right Cache-Control (preserves streamed bodies). */
function withCache(response, cacheControl) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isCheckout = url.pathname === '/checkout' || url.pathname === '/checkout/';

    // HEAD mirrors GET headers (no body) — tools like curl -sI hit this.
    if (request.method === 'HEAD' && isCheckout) {
      return new Response(null, {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    if (request.method === 'GET' && isCheckout) {
      return streamCheckout(request, env, url);
    }

    const assetResp = await env.ASSETS.fetch(request);
    const profile = classifyPath(url.pathname);
    return withCache(assetResp, profile.value);
  },
};

async function streamCheckout(request, env, url) {
  const assetResp = await env.ASSETS.fetch(request);
  if (!assetResp.ok) return assetResp;
  const html = await assetResp.text();
  const headEnd = html.indexOf('</head>');

  // Defensive: if the built HTML has no </head>, fall back to plain no-store.
  if (headEnd === -1) {
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const preloadTag = `<link rel="preload" as="script" href="${STRIPE_JS}" fetchpriority="high">`;

  const body = new ReadableStream({
    async start(controller) {
      // 1) Stream <head> + preload immediately (Stripe.js starts NOW, in
      //    parallel with the Stripe API call).
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