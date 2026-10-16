/**
 * chat-worker — Assistedly Cares concierge backend.
 *
 * Sits between the assistedly.ai chat page and the Inkbox identity layer:
 *
 *  POST /api/chat            web chat → A2A task on the Inkbox ledger
 *                            ("Inkbot Messages") + knowledge answer
 *  POST /api/sms/start       start a private HIPAA-compliant SMS chat
 *                            (Inkbox opt-in gate + welcome text)
 *  POST /api/webhooks/inkbox inbound SMS → knowledge answer → reply
 *  GET  /health
 *
 * Keys (Worker secrets, never committed):
 *   INKBOX_REQUESTER_KEY  agent-scoped key for `assistedly-web` (sends A2A tasks)
 *   INKBOX_WORKER_KEY     agent-scoped key for `josh-assistedly` (sends texts, replies to tasks)
 *   INKBOX_WEBHOOK_SECRET signing key secret for `josh-assistedly` (verifies webhooks)
 *   INKBOX_PHONE_ID       phone number id owned by `josh-assistedly`
 *   INKBOX_WORKER_HANDLE  agent handle that owns the phone + ledger (`josh-assistedly`)
 */
import { demoAnswer, fallbackReply } from './chatClient';
import { SMS_DISPLAY, SMS_NUMBER, SITE_NAME } from './chatKnowledge';

const API_ROOT = 'https://inkbox.ai/api/v1';
const A2A_ROOT = 'https://inkbox.ai/a2a';

interface Env {
  INKBOX_REQUESTER_KEY: string;
  INKBOX_WORKER_KEY: string;
  INKBOX_WEBHOOK_SECRET: string;
  INKBOX_PHONE_ID: string;
  INKBOX_WORKER_HANDLE: string;
  CHAT_KV: KVNamespace;
}

const WELCOME_SMS =
  `Hi! This is the ${SITE_NAME} concierge. Your SMS chat is active — ask about care plans, medications, ` +
  `tasks, follow-ups, or how we keep things private and HIPAA compliant. Reply anytime. ` +
  `(Text STOP to opt out.)`;

/* ─── Helpers ────────────────────────────────────────────────────────── */

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function inkbox(path: string, apiKey: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data: data as any };
}

function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits.startsWith('1') && digits.length === 11 ? `+${digits}` : `+${digits}`;
}

function errMessage(d: any): string {
  return d?.error?.message ?? d?.message ?? JSON.stringify(d ?? {}).slice(0, 200);
}

/* ─── A2A ledger ("Inkbot Messages") ─────────────────────────────────── */

/** Send a chat message as `assistedly-web` → task on `josh-assistedly`'s ledger. */
async function a2aSendTask(env: Env, text: string, contextId?: string) {
  const res = await fetch(`${A2A_ROOT}/${env.INKBOX_WORKER_HANDLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.INKBOX_REQUESTER_KEY,
      'A2A-Version': '1.0',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'SendMessage',
      params: {
        message: {
          messageId: crypto.randomUUID(),
          role: 'ROLE_USER',
          parts: [{ text }],
          ...(contextId ? { contextId } : {}),
        },
        configuration: { returnImmediately: true },
      },
    }),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data: data as any };
}

/** Reply to a received A2A task as the worker identity (completes the task). */
async function a2aReplyTask(env: Env, taskId: string, text: string) {
  return inkbox(
    `/identities/${env.INKBOX_WORKER_HANDLE}/a2a/tasks/${taskId}/reply`,
    env.INKBOX_WORKER_KEY,
    { method: 'POST', body: { intent: 'complete', parts: [{ text }] } },
  );
}

/* ─── SMS via Inkbox ─────────────────────────────────────────────────── */

async function sendText(env: Env, body: { to?: string; conversation_id?: string; text: string }) {
  return inkbox(`/phone/numbers/${env.INKBOX_PHONE_ID}/texts`, env.INKBOX_WORKER_KEY, {
    method: 'POST',
    body,
  });
}

/* ─── Webhook signature verification ─────────────────────────────────── */

/**
 * Inkbox signs webhooks as HMAC-SHA256 over `<requestId>.<timestamp>.<body>`
 * with the identity's signing key; header `X-Inkbox-Signature: sha256=<hex>`.
 */
async function verifyWebhookSignature(rawBody: ArrayBuffer, headers: Headers, secret: string): Promise<boolean> {
  const sig = headers.get('x-inkbox-signature') ?? '';
  const requestId = headers.get('x-inkbox-request-id') ?? '';
  const timestamp = headers.get('x-inkbox-timestamp') ?? '';
  if (!sig.startsWith('sha256=')) return false;
  const key = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;

  const prefix = new TextEncoder().encode(`${requestId}.${timestamp}.`);
  const body = new Uint8Array(rawBody);
  const message = new Uint8Array(prefix.byteLength + body.byteLength);
  message.set(prefix, 0);
  message.set(body, prefix.byteLength);

  const keyBuf = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', keyBuf, message);
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return expected === sig.slice('sha256='.length).toLowerCase();
}

/* ─── Answer generation (knowledge base) ─────────────────────────────── */

function answerFor(message: string) {
  const reply = demoAnswer(message) ?? fallbackReply();
  return {
    reply: reply.reply,
    links: reply.links ?? [],
    sources: reply.sources ?? [],
  };
}

/* ─── Routes ─────────────────────────────────────────────────────────── */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (url.pathname === '/health') return json({ ok: true });

    // CORS preflight for browser calls from assistedly.ai
    if (method === 'OPTIONS') return corsPreflight();

    try {
      /* Web chat → Inkbot Messages ledger + answer */
      if (method === 'POST' && url.pathname === '/api/chat') {
        const { message, sessionId } = (await request.json()) as { message?: string; sessionId?: string };
        if (!message || !message.trim()) return json({ error: 'message is required' }, 400);

        const answer = answerFor(message);

        // Record the exchange on the A2A ledger (best effort — chat works even if it fails).
        // Each web session maps to ONE Inkbox context ("Inkbot Messages" thread):
        // the first message creates the context, KV remembers it for later messages.
        if (sessionId && typeof sessionId === 'string') {
          try {
            const sessionKey = `session:${sessionId}`;
            const existingContextId = await env.CHAT_KV.get(sessionKey);
            const sent = await a2aSendTask(env, message.trim(), existingContextId ?? undefined);
            const task = sent.data?.result?.task;
            const taskId = task?.id;
            const taskContextId = task?.contextId;

            if (taskContextId && !existingContextId) {
              // First message in this session — pin the created context to the session.
              await env.CHAT_KV.put(sessionKey, taskContextId);
            }
            if (taskId) {
              const replyRes = await a2aReplyTask(env, taskId, answer.reply);
              if (replyRes.status >= 400) {
                console.warn('a2a reply failed', replyRes.status, JSON.stringify(replyRes.data).slice(0, 300));
              }
            } else {
              console.warn('a2a send returned no task', sent.status, JSON.stringify(sent.data).slice(0, 200));
            }
          } catch (e) {
            console.warn('a2a ledger write failed', e instanceof Error ? e.message : String(e));
          }
        }

        return json(answer);
      }

      /* Start SMS chat (HIPAA-compliant, via Inkbox) */
      if (method === 'POST' && url.pathname === '/api/sms/start') {
        const { phone } = (await request.json()) as { phone?: string };
        const to = phone ? normalizePhone(phone) : null;
        if (!to) return json({ error: 'A valid US phone number is required (E.164).' }, 400);

        const sent = await sendText(env, { to, text: WELCOME_SMS });

        // Inkbox gates outbound SMS on the recipient's opt-in registry:
        // unknown → 403 recipient_not_opted_in → tell the visitor to text START first.
        if (sent.status === 403 && /recipient_not_opted_in/.test(errMessage(sent.data))) {
          return json({
            status: 'needs_opt_in',
            number: SMS_DISPLAY,
            deepLink: `sms:${SMS_NUMBER}?&body=START`,
            message:
              `To keep SMS chats private and HIPAA compliant, Inkbox requires you to opt in first. ` +
              `Text START to ${SMS_DISPLAY} from your phone, then come back and try again.`,
          });
        }
        if (sent.status >= 400) {
          return json({ status: 'error', detail: errMessage(sent.data) }, sent.status);
        }
        return json({ status: 'sent', messageId: sent.data?.id ?? null, number: SMS_DISPLAY });
      }

      /* Inbound SMS from Inkbox webhook */
      if (method === 'POST' && url.pathname === '/api/webhooks/inkbox') {
        const rawBody = await request.arrayBuffer();
        const valid = await verifyWebhookSignature(rawBody, request.headers, env.INKBOX_WEBHOOK_SECRET);
        if (!valid) return new Response('invalid signature', { status: 403 });

        const payload = JSON.parse(new TextDecoder().decode(rawBody)) as {
          event_type?: string;
          data?: { text_message?: { conversation_id?: string; sender_phone_number?: string; text?: string } };
        };

        if (payload.event_type === 'text.received') {
          const tm = payload.data?.text_message;
          if (tm?.conversation_id) {
            const answer = answerFor(tm.text ?? '');
            await sendText(env, { conversation_id: tm.conversation_id, text: answer.reply });
          }
        }
        return new Response('ok', { status: 200 });
      }
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : 'internal error' }, 500);
    }

    return json({ error: 'not found' }, 404);
  },
};