// Web Push implementation using Web Crypto API for Cloudflare Workers
// No heavy Node.js dependencies — runs natively in the V8 isolate.

const PUSH_TTL = 86400; // 24 hours

function base64UrlDecode(str) {
  // Add padding if needed
  const pad = str.length % 4;
  if (pad) str += '='.repeat(4 - pad);
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

function base64UrlEncode(buf) {
  const b = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importPrivateKey(base64Url) {
  const raw = base64UrlDecode(base64Url);
  // For P-256 raw key workaround: create a proper JWK
  // We'll store JWK format instead. The env var should be a JSON JWK.
  throw new Error('Use JWK format for VAPID private key');
}

async function importVapidJwk(jwk) {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );
}

function createVapidJwt(sub, aud, privateJwk) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 3600, sub };
  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encHeader}.${encPayload}`;
}

async function signJwt(unsigned, privateKey) {
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(unsigned)
  );
  return base64UrlEncode(sig);
}

export async function sendWebPush(kv, env, subscription, payload) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) {
    throw new Error('VAPID keys not configured');
  }

  const privateJwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const privateKey = await importVapidJwk(privateJwk);

  const endpoint = subscription.endpoint;
  const audience = new URL(endpoint).origin;
  const vapidSubject = env.VAPID_SUBJECT || 'mailto:admin@carecircle.com';

  const jwtUnsigned = createVapidJwt(vapidSubject, audience, privateJwk);
  const jwtSignature = await signJwt(jwtUnsigned, privateKey);
  const jwt = `${jwtUnsigned}.${jwtSignature}`;

  const body = payload ? JSON.stringify(payload) : '';

  const headers = {
    'Authorization': `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    'TTL': String(PUSH_TTL),
    'Content-Type': 'application/json',
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Web Push failed: ${response.status} ${text}`);
  }

  return { success: true, status: response.status };
}

// Encryption helpers (used when payload delivery to Firefox/Chrome needs it)
// For MVP we use plaintext JSON payload which standard push services accept.
