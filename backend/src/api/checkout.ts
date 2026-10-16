import { Router } from 'express';
import Stripe from 'stripe';

/**
 * Stripe Checkout — embedded form integration (ui_mode: "form", Dahlia API).
 *
 * Scenario B: no Checkout Session call existed in the codebase; this is the
 * minimal new endpoint per the Stripe integration task.
 *
 * fixed_by_ui parameters (Checkout Studio):
 *   ui_mode: "form", billing_address_collection: "auto",
 *   phone_number_collection: { enabled: false }, automatic_tax: { enabled: false },
 *   payment_method_collection: "always" (only when mode === "subscription"),
 *   submit_type: "auto", integration_identifier: "custom_embedded_web_0001"
 * sample_only parameters (placeholders — see STRIPE_INTEGRATION_TODO.md):
 *   mode: "payment", line_items: [{ price: "price_..." }]
 */

const router = Router();
const webhookRouter = Router();

// API version 2026-03-25.dahlia or later is required for ui_mode "form"
// (embedded form). Cast keeps TS happy while the SDK passes the version
// header through at runtime (verified: getApiField('version') === value).
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia' as Stripe.LatestApiVersion,
});

/**
 * POST /api/create-checkout-session
 * Creates an embedded-form Checkout Session and returns the client secret.
 * The frontend uses the client secret with stripe.initCheckoutFormSdk(...).
 */
router.post('/', async (req, res, next) => {
  try {
    // Mode: subscription with a 30-day free trial (trial_period_days below).
    // The price is $0/month for now — set the real amount before charging
    // (see STRIPE_INTEGRATION_TODO.md).
    let mode = 'subscription' as 'payment' | 'subscription';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      // fixed_by_ui — do not change without Checkout Studio
      ui_mode: 'form',
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      automatic_tax: { enabled: false },
      submit_type: 'auto',
      integration_identifier: 'custom_embedded_web_0001',
      // sample_only — replace with real Stripe Price IDs (see TODO doc)
      mode,
      line_items: [{ price: 'price_1URC9xApH5e5iOZ4vtS464J6', quantity: 1 }],
      // 30-day free trial — customer pays $0 for the first 30 days
      subscription_data: { trial_period_days: 30 },
    };
    // Rule: only include payment_method_collection when mode is "subscription".
    if (mode === 'subscription') {
      sessionParams.payment_method_collection = 'always';
    }
    // Redirect the customer back to a thank-you page after checkout.
    // Origin is derived from the request so the preview workers.dev URL and
    // production both redirect to the right place.
    const requestOrigin =
      (req.headers.origin as string) ||
      (typeof req.headers.referer === 'string' ? req.headers.referer.replace(/\/$/, '') : '') ||
      'https://assistedly.ai';
    sessionParams.return_url = `${requestOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ client_secret: session.client_secret });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhook (mounted with express.raw in server.ts BEFORE express.json())
 * Verifies the Stripe signature and handles checkout.session.completed.
 */
webhookRouter.post('/', (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const signature = (req.headers['stripe-signature'] ?? '') as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', (err as Error).message);
    return res.sendStatus(400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout completed:', session.id);
      // Fulfill the purchase, grant access, etc. (see STRIPE_INTEGRATION_TODO.md)

      if (session.consent?.terms_of_service === 'accepted') {
        console.log('Customer accepted terms of service');
      }
      if (session.consent?.promotions === 'opt_in') {
        const email = session.customer_details?.email;
        console.log('Customer opted in for promotional emails:', email);
        // Add email to your marketing list
      }
      break;
    }
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.sendStatus(200);
});

export default router;
export { webhookRouter };