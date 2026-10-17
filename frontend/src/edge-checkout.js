/**
 * care-circle-cta-preview edge handler (preview only — production untouched).
 *
 * Static assets + one interception: for GET /checkout, create the Stripe
 * Checkout Session AT THE EDGE (before HTML is returned) and inject the
 * client_secret into the page, so the form renders with zero client-side
 * session round trip ("Loading checkout…" disappears).
 *
 * Secrets come from worker secrets/vars (never env files):
 *   STRIPE_SECRET_KEY  — test secret key (preview)
 *   STRIPE_PRICE_ID    — test-mode price
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isCheckout = url.pathname === '/checkout' || url.pathname === '/checkout/';

    if (request.method === 'GET' && isCheckout) {
      const assetResp = await env.ASSETS.fetch(request);
      if (!assetResp.ok) return assetResp;
      let html = await assetResp.text();
      try {
        const clientSecret = await createCheckoutSession(env, url.origin);
        html = html.replace(
          '</head>',
          `<script>window.__CHECKOUT_CS=${JSON.stringify(clientSecret)};</script></head>`
        );
      } catch {
        // Edge session failed — the page falls back to client-side creation.
      }
      return new Response(html, {
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