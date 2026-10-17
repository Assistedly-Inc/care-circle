/**
 * Assistedly Service Worker — makes the embedded Stripe checkout instant.
 *
 * Strategy: stale-while-revalidate for Stripe.js (https://js.stripe.com/
 * dahlia/stripe.js, ~1.1 MB). First visit downloads + caches it; every
 * visit after that serves it from cache immediately while refreshing the
 * cache in the background — Stripe SDK updates stay fresh, the user never
 * waits on the 1 MB download again.
 *
 * Only Stripe.js is intercepted; everything else passes through untouched.
 */
const CACHE = 'assistedly-stripe-v1';
const STRIPE_JS = 'https://js.stripe.com/dahlia/stripe.js';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.href !== STRIPE_JS) return; // only cache Stripe.js; pass everything else through

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});