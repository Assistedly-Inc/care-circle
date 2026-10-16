// checkout-test-worker — TEST-MODE Stripe Checkout Session creator.
// Used ONLY by preview builds (care-circle-cta-preview) via
// NEXT_PUBLIC_CHECKOUT_API_URL so reviewers can complete checkout with
// Stripe TEST cards (4242 4242 4242 4242). Production checkout is untouched.
// Secrets come from Bitwarden-managed worker secrets (never env files):
//   STRIPE_SECRET_KEY  (sk_test_...) and STRIPE_PRICE_ID (test-mode price).
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'Content-Type, Authorization',
  'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'cache-control': 'no-store',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname !== '/api/create-checkout-session' || request.method !== 'POST') {
      return json({ error: 'Not found' }, 404);
    }
    const sk = env.STRIPE_SECRET_KEY || '';
    const priceId = env.STRIPE_PRICE_ID || '';
    if (!sk || !priceId) {
      return json({ error: 'STRIPE_SECRET_KEY or STRIPE_PRICE_ID not configured' }, 500);
    }

    const origin =
      request.headers.get('origin') ||
      (request.headers.get('referer') || '').replace(/\/$/, '') ||
      'https://assistedly.ai';

    try {
      const body = await request.json().catch(() => ({}));
      const form = new URLSearchParams();
      // Mirrors production (backend/src/index.js) session params — test mode only.
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
      if (body.ga4_client_id) form.set('metadata[ga4_client_id]', String(body.ga4_client_id));
      if (body.gclid) form.set('metadata[gclid]', String(body.gclid));

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${sk}:`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const data = await res.json();
      if (!res.ok) {
        return json({ error: 'Stripe session creation failed', detail: data.error?.message }, 502);
      }
      return json({ client_secret: data.client_secret });
    } catch (err) {
      return json({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }, 500);
    }
  },
};