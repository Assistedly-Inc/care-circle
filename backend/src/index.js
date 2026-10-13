// Assistedly Cares — Cloudflare Worker (D1-backed)
// Consolidates the KV "CareProfile" blob into D1. A "case" row holds the full
// CareProfile document in `data` (JSON), preserving the exact shape the frontend
// expects. users/case_members/case_invitations/audit_log are relational.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Defense-in-depth headers on every API response (HSTS, nosniff, framing,
// referrer, no caching of API payloads).
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...securityHeaders, ...corsHeaders } });
}
const notFound = (m = 'Not found') => json({ error: m }, 404);
const badRequest = (m) => json({ error: m }, 400);
const unauthorized = (m = 'Unauthorized') => json({ error: m }, 401);
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
function reqIp(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}

// ── in-memory rate limiting (per key) ───────────────────────────────────────
const rateBuckets = new Map();
function rateLimit(key, { limit, windowMs }) {
  const nowMs = Date.now();
  const rec = rateBuckets.get(key);
  if (!rec || nowMs > rec.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  rec.count += 1;
  return { allowed: rec.count <= limit, remaining: Math.max(0, limit - rec.count) };
}
const loginFailures = new Map();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
function loginLocked(key) {
  const nowMs = Date.now();
  const rec = loginFailures.get(key);
  if (!rec || nowMs > rec.resetAt) {
    loginFailures.set(key, { count: 0, resetAt: nowMs + LOGIN_WINDOW_MS });
    return false;
  }
  return rec.count >= MAX_LOGIN_ATTEMPTS;
}
function recordLoginFailure(key) { const rec = loginFailures.get(key); if (rec) rec.count += 1; }
function clearLoginFailures(key) { loginFailures.delete(key); }

// ── tiny JWT (HS256) ────────────────────────────────────────────────────────
function b64url(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlJson(o) { return b64url(new TextEncoder().encode(JSON.stringify(o))); }
function b64urlDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return atob(s); }

async function signJwt(payload, secret, expiresInSec = 60 * 60 * 24 * 7) {
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const body = b64urlJson({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSec });
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}
function b64urlToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return new Uint8Array([...atob(s)].map(c => c.charCodeAt(0))); }

async function verifyJwt2(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sig), new TextEncoder().encode(`${header}.${body}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
const jwtVerify = verifyJwt2;

// ── token revocation (logout / account deletion) ───────────────────────────
async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function revokeToken(env, token) {
  try {
    const payload = await jwtVerify(token, env.SESSION_SECRET || 'dev-secret');
    if (!payload?.exp) return;
    const h = await sha256Hex(token);
    await exec(env, 'INSERT OR IGNORE INTO revoked_tokens (token_hash, expires_at) VALUES (?,?)', [h, new Date(payload.exp * 1000).toISOString()]);
    await exec(env, 'DELETE FROM revoked_tokens WHERE expires_at <= ?', [now()]);
  } catch { /* token already invalid */ }
}
async function isTokenRevoked(env, token) {
  try {
    const h = await sha256Hex(token);
    const row = await qFirst(env, 'SELECT 1 AS ok FROM revoked_tokens WHERE token_hash = ? AND expires_at > ?', [h, now()]);
    return !!row;
  } catch { return false; }
}

// ── SMS MFA (one-time passcodes via Inkbox) ─────────────────────────────────
// 10-minute window: friendlier for less tech-enabled users while still
// bounded; the 5-attempt cap and one-active-code rule keep it secure.
const MFA_CODE_TTL_MS = 10 * 60 * 1000;
const MFA_MAX_ATTEMPTS = 5;
const PRIVILEGED_ROLES = ['coordinator', 'caregiver'];
function isPrivilegedRole(role) { return PRIVILEGED_ROLES.includes(role); }
function randomDigits(n) {
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return [...arr].map((x) => String(x % 10)).join('');
}
function maskPhone(p) {
  if (!p) return '';
  return p.replace(/^(\+\d{1,3})(\d+)(\d{4})$/, '$1****$3');
}
// Accept friendly input for the low-tech audience: "6175003450" (US 10-digit),
// "16175003450" (US with leading 1), or full E.164 "+16175003450". Returns E.164.
function normalizePhone(raw) {
  const p = String(raw || '').replace(/[\s()-]/g, '');
  if (!p) return null;
  if (p.startsWith('+')) return /^\+[1-9]\d{1,14}$/.test(p) ? p : null;
  if (/^\d{10}$/.test(p)) return '+1' + p;
  if (/^1\d{10}$/.test(p)) return '+' + p;
  return null;
}
async function issueMfaCode(env, userId, phone, opts = {}) {
  // Replace any pending code for this user (one active code per user).
  await exec(env, 'DELETE FROM mfa_otps WHERE user_id = ?', [userId]);
  const code = randomDigits(6);
  const h = await sha256Hex(code);
  const smsText = `Your Assistedly Cares verification code is ${code}. It expires in 10 minutes. Don't share this code with anyone.`;
  // One-tap opt-in for text delivery: the sms: URI opens the recipient's
  // messaging app pre-filled with START to our number (US 10DLC opt-in).
  const optInNumber = env.SMS_OPT_IN_NUMBER || '+14133509016';
  const optInDigits = optInNumber.replace(/\D/g, '');
  const smsLink = `sms:${optInDigits}?body=START`;
  // "Text me the code instead" link -> frontend triggers mfa/resend via SMS.
  const resendUrl = opts.challengeToken && opts.appUrl
    ? `${opts.appUrl}/features/auth/?resend=${opts.challengeToken}`
    : null;
  const resendText = resendUrl
    ? `\n\nPrefer the code by text? Tap here and we'll text it to your phone: ${resendUrl}`
    : `\n\nPrefer codes by text? Open this link on your phone (or text START to ${optInNumber}): ${smsLink}`;
  const resendHtml = resendUrl
    ? `<p style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280"><a href="${resendUrl}" style="color:#4a7c7e;font-weight:600">Text me the code instead</a> — we'll send it to your phone by SMS.</p>`
    : `<p style="margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">Prefer codes by text? <a href="${smsLink}" style="color:#4a7c7e;font-weight:600">Tap here to text START to ${optInNumber}</a> from your phone — it opens your messaging app ready to send.</p><p style="font-size:13px;color:#6b7280">If the link doesn't open your messaging app, open it and <a href="${smsLink}" style="color:#4a7c7e;font-weight:600">send START to ${optInNumber}</a> manually.</p>`;
  const emailBody = {
    to: opts.fallbackEmail,
    subject: 'Your Assistedly Cares verification code',
    text: `Your Assistedly Cares verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.${resendText}`,
    html: `<p>Your <strong>Assistedly Cares</strong> verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p style="color:#6b7280;font-size:13px">It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>${resendHtml}`,
  };
  // Default: SMS-first with email fallback so users are never locked out.
  // When the user toggles to email (opts.channel === 'email'), email-first with
  // SMS fallback. When a text succeeds, the caller flips mfa_channel to sms.
  let channel = opts.channel === 'email' ? 'email' : 'sms';
  let sent;
  if (channel === 'email') {
    if (opts.fallbackEmail) sent = await resendSendEmail(env, emailBody);
    if (!sent?.ok) { sent = await inkboxSendSms(env, phone, smsText); if (sent.ok) channel = 'sms'; }
  } else {
    sent = await inkboxSendSms(env, phone, smsText);
    if (!sent.ok && opts.fallbackEmail) {
      const e = await resendSendEmail(env, emailBody);
      if (e.ok) { sent = e; channel = 'email'; }
    }
  }
  await exec(env, 'INSERT INTO mfa_otps (id, user_id, code_hash, expires_at, attempts, created_at, channel) VALUES (?,?,?,?,?,?,?)',
    [uid(), userId, h, new Date(Date.now() + MFA_CODE_TTL_MS).toISOString(), 0, now(), channel]);
  return { codeHash: h, sent, channel };
}
function maskEmail(e) {
  if (!e) return '';
  const [local, domain] = e.split('@');
  if (!domain) return e;
  return local.slice(0, 2) + '***@' + domain;
}
async function verifyMfaCode(env, userId, code) {
  const row = await qFirst(env, 'SELECT * FROM mfa_otps WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
  if (!row) return { ok: false, error: 'No verification code pending. Request a new one.' };
  if (row.expires_at <= now()) {
    await exec(env, 'DELETE FROM mfa_otps WHERE id = ?', [row.id]);
    return { ok: false, error: 'Code expired. Request a new one.' };
  }
  if (row.attempts >= MFA_MAX_ATTEMPTS) {
    await exec(env, 'DELETE FROM mfa_otps WHERE id = ?', [row.id]);
    return { ok: false, error: 'Too many attempts. Request a new code.' };
  }
  const h = await sha256Hex(String(code || '').trim());
  if (h !== row.code_hash) {
    await exec(env, 'UPDATE mfa_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
    return { ok: false, error: 'Incorrect code.' };
  }
  const channel = row.channel || 'sms';
  await exec(env, 'DELETE FROM mfa_otps WHERE id = ?', [row.id]);
  return { ok: true, channel };
}
async function mfaChallengeToken(env, user) {
  return signJwt({ sub: user.id, purpose: 'mfa', scope: 'session' }, env.SESSION_SECRET || 'dev-secret', 300);
}

// ── SMS via Inkbox (replaces Twilio) ────────────────────────────────────────
// POST https://inkbox.ai/api/v1/phone/numbers/{phoneId}/texts
//   Header: X-API-Key: {INKBOX_API_KEY}
//   Body:   { to, body }
async function inkboxSendSms(env, to, message) {
  const apiKey = env.INKBOX_API_KEY;
  const phoneId = env.INKBOX_PHONE_NUMBER_ID;
  if (!apiKey || !phoneId) return { ok: false, reason: 'Inkbox credentials not set (INKBOX_API_KEY / INKBOX_PHONE_NUMBER_ID)' };
  if (!to) return { ok: false, reason: 'No recipient phone number' };
  const headers = { 'X-API-Key': apiKey, 'Content-Type': 'application/json' };
  try {
    // US recipients must opt in before receiving texts (10DLC). Best-effort
    // opt-in first; ignore failures — the send itself reports the real error.
    let optInStatus = null;
    try {
      const optIn = await fetch(`https://inkbox.ai/api/v1/phone/sms-opt-ins/${encodeURIComponent(to)}/opt-in`, { method: 'POST', headers });
      optInStatus = optIn.status;
    } catch { /* non-fatal */ }
    const res = await fetch(`https://inkbox.ai/api/v1/phone/numbers/${phoneId}/texts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, text: message }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, optInStatus, detail: data, to };
  } catch (err) {
    return { ok: false, error: err.message, to };
  }
}
// Turn an Inkbox failure into a human-readable message for the user.
function smsErrorMessage(sent) {
  const code = sent?.detail?.code || sent?.detail?.error?.code || sent?.detail?.error?.error?.code || '';
  if (code === 'recipient_not_opted_in') return 'This phone must opt in before it can receive texts. From this phone, text START to 14133509016, then tap Send code again.';
  if (code === 'recipient_opted_out') return 'This number has opted out of text messages.';
  if (code === 'sender_sms_pending') return 'Our text number is still warming up — please try again in about 15 minutes.';
  if (code === 'sender_not_ready') return 'Our text number is not ready yet — please try again shortly.';
  return 'Could not send the verification code. Please try again later.';
}

// ── Email via Resend (reminders) ────────────────────────────────────────────
async function resendSendEmail(env, { to, subject, text, html }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || 'Assistedly Cares <hello@updates.assistedly.ai>';
  if (!apiKey) return { ok: false, reason: 'RESEND_API_KEY not set' };
  if (!to) return { ok: false, reason: 'No recipient email' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, text, html }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, id: data.id, detail: data, to };
  } catch (err) {
    return { ok: false, error: err.message, to };
  }
}

// ── password hashing (PBKDF2-SHA256, versioned) ──────────────────────────────
// Format: v2:<iterations>:<saltB64url>:<hashB64url>. Legacy (100k, no prefix)
// hashes still verify so existing accounts keep working.
// NOTE: Cloudflare Workers' WebCrypto caps PBKDF2 at 100,000 iterations — that
// limit is enforced here (still 10x the NIST SP 800-63B minimum of 10k).
const PBKDF2_ITERATIONS = 100000;
// Passwordless accounts can never log in with a password, so their placeholder
// "hash" is a cheap sentinel instead of a costly PBKDF2 computation.
const PLACEHOLDER_HASH = 'v2:0:disabled:disabled';
async function hashPassword(password, secret, iterations = PBKDF2_ITERATIONS) {
  const iters = Math.min(Math.max(iterations, 1), 100000);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: iters, hash: 'SHA-256' }, key, 256);
  return `v2:${iters}:${b64url(salt)}:${b64url(bits)}`;
}
async function verifyPassword(password, stored) {
  try {
    if (typeof stored !== 'string') return false;
    let saltB64, hashB64, iterations = PBKDF2_ITERATIONS;
    if (stored.startsWith('v2:')) {
      const parts = stored.split(':');
      if (parts.length !== 4) return false;
      iterations = Math.min(Math.max(parseInt(parts[1], 10) || PBKDF2_ITERATIONS, 1), 100000);
      saltB64 = parts[2]; hashB64 = parts[3];
    } else {
      const [s, h] = stored.split('.');
      saltB64 = s; hashB64 = h;
    }
    if (saltB64 === 'disabled' || hashB64 === 'disabled') return false; // placeholder
    const salt = b64urlToBytes(saltB64);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
    return b64url(bits) === hashB64;
  } catch { return false; }
}

// ── normalize a CareProfile document (frontend shape) ──────────────────────
function normalizeCareProfile(input = {}, existing = {}) {
  const id = existing.id || input.id || uid();
  return {
    id,
    patient: {
      firstName: input.patient?.firstName ?? input.firstName ?? existing.patient?.firstName ?? '',
      lastName: input.patient?.lastName ?? input.lastName ?? existing.patient?.lastName ?? '',
      displayName: input.patient?.displayName ?? input.name ?? existing.patient?.displayName ?? '',
      dateOfBirth: input.patient?.dateOfBirth ?? input.dateOfBirth ?? existing.patient?.dateOfBirth ?? '',
      age: input.patient?.age ?? input.age ?? existing.patient?.age ?? '',
      gender: input.patient?.gender ?? input.gender ?? existing.patient?.gender ?? '',
      phone: input.patient?.phone ?? input.phone ?? existing.patient?.phone ?? '',
      address: input.patient?.address ?? input.address ?? existing.patient?.address ?? '',
      primaryDiagnosis: input.patient?.primaryDiagnosis ?? input.condition ?? existing.patient?.primaryDiagnosis ?? '',
      notes: input.patient?.notes ?? input.notes ?? existing.patient?.notes ?? ''
    },
    emergencyContacts: Array.isArray(input.emergencyContacts) ? input.emergencyContacts : (existing.emergencyContacts || []),
    medications: Array.isArray(input.medications) ? input.medications : (existing.medications || []),
    dischargeInstructions: {
      summary: input.dischargeInstructions?.summary ?? input.dischargeInstructions ?? existing.dischargeInstructions?.summary ?? '',
      dischargeDate: input.dischargeInstructions?.dischargeDate ?? input.dischargeDate ?? existing.dischargeInstructions?.dischargeDate ?? '',
      followUp: input.dischargeInstructions?.followUp ?? existing.dischargeInstructions?.followUp ?? '',
      redFlags: Array.isArray(input.dischargeInstructions?.redFlags) ? input.dischargeInstructions.redFlags : (existing.dischargeInstructions?.redFlags || []),
      activity: input.dischargeInstructions?.activity ?? existing.dischargeInstructions?.activity ?? '',
      diet: input.dischargeInstructions?.diet ?? existing.dischargeInstructions?.diet ?? ''
    },
    consent: input.consent ?? existing.consent ?? { given: false, scope: '', givenBy: '', givenAt: null },
    tasks: Array.isArray(input.tasks) ? input.tasks : (existing.tasks || []),
    barriers: Array.isArray(input.barriers) ? input.barriers : (existing.barriers || []),
    followUps: Array.isArray(input.followUps) ? input.followUps : (existing.followUps || []),
    admissionDate: input.admissionDate ?? existing.admissionDate ?? null,
    dischargedAt: input.dischargedAt ?? existing.dischargedAt ?? null,
    readmission30d: input.readmission30d ?? existing.readmission30d ?? null,
    siteId: input.siteId ?? existing.siteId ?? 'demo',
    status: input.status ?? existing.status ?? 'active',
    createdAt: existing.createdAt || input.createdAt || now(),
    updatedAt: now()
  };
}

// ── DB helpers ──────────────────────────────────────────────────────────────
async function q(env, sql, params = []) {
  const stmt = env.CARE_DB.prepare(sql).bind(...params);
  const { results } = await stmt.all();
  return results;
}
async function qFirst(env, sql, params = []) {
  const rows = await q(env, sql, params);
  return rows[0] || null;
}
async function exec(env, sql, params = []) {
  await env.CARE_DB.prepare(sql).bind(...params).run();
}
async function getCaseRow(env, id) {
  return qFirst(env, 'SELECT * FROM cases WHERE id = ?', [id]);
}
async function getCaseDoc(env, id) {
  const row = await getCaseRow(env, id);
  if (!row) return null;
  try { return JSON.parse(row.data); } catch { return null; }
}
async function putCaseDoc(env, doc) {
  const row = await getCaseRow(env, doc.id);
  if (!row) return null;
  await exec(env, 'UPDATE cases SET data = ?, patient_name = ?, status = ?, consent_given = ?, site_id = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(doc), doc.patient.displayName || doc.patient.firstName || doc.patient.lastName || 'Unnamed', doc.status || 'active', doc.consent?.given ? 1 : 0, doc.siteId ?? 'demo', now(), doc.id]);
  return doc;
}
async function audit(env, caseId, action, details = {}, userId = null, before = null, after = null) {
  await exec(env,
    'INSERT INTO audit_log (id, ts, user_id, case_id, action, entity, entity_id, details, before_json, after_json) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [uid(), now(), userId, caseId, action, details.entity || null, details.entityId || null, details.details ? JSON.stringify(details.details) : null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]);
}

// ── auth helpers ────────────────────────────────────────────────────────────
function bearerToken(request) {
  const h = request.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
async function getAuthedUser(env, request) {
  const token = bearerToken(request);
  if (!token) return null;
  const payload = await jwtVerify(token, env.SESSION_SECRET || 'dev-secret');
  if (!payload?.sub) return null;
  if (await isTokenRevoked(env, token)) return null;
  return qFirst(env, 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
}
async function canAccessCase(env, user, caseId) {
  if (!user || !caseId) return false;
  const row = await qFirst(env,
    'SELECT 1 AS ok FROM cases WHERE id = ? AND coordinator_id = ? UNION ALL SELECT 1 AS ok FROM case_members WHERE case_id = ? AND user_id = ? LIMIT 1',
    [caseId, user.id, caseId, user.id]);
  return !!row;
}

const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];
const TASK_TEMPLATES = [
  { id: 'follow-up', title: 'Schedule follow-up appointment', defaultOwner: 'Care coordinator', defaultDueDays: 7 },
  { id: 'med-rec', title: 'Complete medication reconciliation', defaultOwner: 'Nurse', defaultDueDays: 2 },
  { id: 'transport', title: 'Confirm transportation', defaultOwner: 'Family', defaultDueDays: 3 },
  { id: 'home-safety', title: 'Home safety check', defaultOwner: 'Care coordinator', defaultDueDays: 5 }
];

function normalizeTask(input = {}, existing = {}) {
  const t = now();
  const status = TASK_STATUSES.includes(input.status ?? existing.status) ? (input.status ?? existing.status) : 'todo';
  return {
    id: existing.id || input.id || uid(),
    templateId: input.templateId ?? existing.templateId ?? '',
    title: input.title ?? existing.title ?? '',
    description: input.description ?? existing.description ?? '',
    owner: input.owner ?? existing.owner ?? '',
    dueDate: input.dueDate ?? existing.dueDate ?? '',
    status,
    escalation: Boolean(input.escalation ?? existing.escalation ?? false),
    escalatedAt: input.escalatedAt ?? existing.escalatedAt ?? null,
    comments: Array.isArray(input.comments) ? input.comments : (existing.comments || []),
    createdAt: existing.createdAt || input.createdAt || t,
    updatedAt: t
  };
}
function normalizeMedication(input = {}, existing = {}) {
  const t = now();
  return {
    id: existing.id || input.id || uid(),
    name: input.name ?? existing.name ?? '',
    source: input.source ?? existing.source ?? '',
    dose: input.dose ?? input.dosage ?? existing.dose ?? existing.dosage ?? '',
    schedule: input.schedule ?? existing.schedule ?? '',
    notes: input.notes ?? existing.notes ?? '',
    lastVerified: input.lastVerified ?? existing.lastVerified ?? null,
    lastVerifiedBy: input.lastVerifiedBy ?? existing.lastVerifiedBy ?? '',
    verified: Boolean(input.verified ?? existing.verified ?? existing.lastVerified ?? false),
    createdAt: existing.createdAt || input.createdAt || t,
    updatedAt: t
  };
}

// ── follow-ups (post-discharge scheduled check-ins) ────────────────────────
const FOLLOWUP_STATUSES = ['SCHEDULED', 'COMPLETED', 'MISSED', 'ESCALATED', 'CANCELLED'];
const FOLLOWUP_CONTACT_TYPES = ['PHONE', 'SMS', 'IN_APP'];
const FOLLOWUP_OUTCOMES = ['READMITTED', 'RECOVERING', 'NEEDS_HELP', 'OK'];
const FOLLOWUP_CADENCE_DAYS = [3, 7, 14, 30];

function normalizeFollowUp(input = {}, existing = {}) {
  const t = now();
  const status = FOLLOWUP_STATUSES.includes(input.status ?? existing.status) ? (input.status ?? existing.status) : 'SCHEDULED';
  const contactType = FOLLOWUP_CONTACT_TYPES.includes(input.contactType ?? existing.contactType) ? (input.contactType ?? existing.contactType) : 'PHONE';
  let outcome = input.outcome ?? existing.outcome ?? null;
  if (outcome !== null && !FOLLOWUP_OUTCOMES.includes(outcome)) outcome = null;
  return {
    id: existing.id || input.id || uid(),
    scheduledFor: input.scheduledFor ?? existing.scheduledFor ?? '',
    status,
    contactType,
    notes: input.notes ?? existing.notes ?? '',
    outcome,
    escalatedAt: input.escalatedAt ?? existing.escalatedAt ?? null,
    escalationLevel: Number(input.escalationLevel ?? existing.escalationLevel ?? 0) || 0,
    completedAt: status === 'COMPLETED' ? (input.completedAt ?? existing.completedAt ?? t) : null,
    createdAt: existing.createdAt || input.createdAt || t,
    updatedAt: t
  };
}

// ── barriers (discharge barrier ledger) ────────────────────────────────────
const BARRIER_TYPES = ['transport', 'medications', 'placement', 'insurance', 'family', 'pending_test', 'social', 'other'];
const BARRIER_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const BARRIER_STATUSES = ['IDENTIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'];

function normalizeBarrier(input = {}, existing = {}) {
  const t = now();
  const status = BARRIER_STATUSES.includes(input.status ?? existing.status) ? (input.status ?? existing.status) : 'IDENTIFIED';
  return {
    id: existing.id || input.id || uid(),
    type: BARRIER_TYPES.includes(input.type ?? existing.type) ? (input.type ?? existing.type) : 'other',
    priority: BARRIER_PRIORITIES.includes(input.priority ?? existing.priority) ? (input.priority ?? existing.priority) : 'MEDIUM',
    description: input.description ?? existing.description ?? '',
    owner: input.owner ?? existing.owner ?? '',
    status,
    dueDate: input.dueDate ?? existing.dueDate ?? null,
    escalatedAt: input.escalatedAt ?? existing.escalatedAt ?? null,
    resolvedAt: input.resolvedAt ?? existing.resolvedAt ?? null,
    resolutionNote: input.resolutionNote ?? existing.resolutionNote ?? null,
    comments: Array.isArray(input.comments) ? input.comments : (existing.comments || []),
    createdAt: existing.createdAt || input.createdAt || t,
    updatedAt: t
  };
}

function barrierBreached(b) {
  if (!b.dueDate) return false;
  const end = b.resolvedAt ? new Date(b.resolvedAt).getTime() : Date.now();
  return end > new Date(b.dueDate).getTime();
}

function medianOf(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function barrierReadiness(barriers) {
  const open = (barriers || []).filter(b => b.status !== 'RESOLVED');
  if (open.some(b => b.priority === 'HIGH')) return 'RED';
  if (open.some(b => b.priority === 'MEDIUM')) return 'AMBER';
  return 'GREEN';
}

// ── API router ──────────────────────────────────────────────────────────────
async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  // Health
  if (path === '/api/health' && method === 'GET') {
    let d1 = true;
    try { await q(env, 'SELECT 1'); } catch { d1 = false; }
    return json({ status: 'ok', kv: false, d1, service: 'care-backend-mvp', feature: 'shared-care-profile' });
  }

  if (path === '/api/task-templates' && method === 'GET') {
    return json({ templates: TASK_TEMPLATES, statuses: TASK_STATUSES });
  }

  // ── Auth ──
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    const name = body.name || email.split('@')[0] || '';
    // Roles are assigned server-side: self-registration can never claim
    // coordinator (full read/write). Elevated roles come from an invitation.
    const role = ['family', 'caregiver'].includes(body.role) ? body.role : 'caregiver';
    if (!email || !password) return badRequest('Email and password are required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest('Invalid email address');
    if (password.length < 8) return badRequest('Password must be at least 8 characters');
    if (password.length > 128) return badRequest('Password must be at most 128 characters');
    const limiter = rateLimit(`register:${reqIp(request)}`, { limit: 10, windowMs: 15 * 60 * 1000 });
    if (!limiter.allowed) return json({ error: 'Too many registration attempts. Try again later.' }, 429);
    const existing = await qFirst(env, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return json({ error: 'Email already registered' }, 409);
    const id = uid();
    const ph = await hashPassword(password, env.SESSION_SECRET || 'dev-secret');
    const t = now();
    await exec(env, 'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      [id, email, ph, name, role, t, t]);
    await audit(env, null, 'auth.signup', { details: { email, method: 'password' } }, id);
    const token = await signJwt({ sub: id, email, role }, env.SESSION_SECRET || 'dev-secret');
    return json({ token, expiresIn: 43200, user: { id, email, name, role }, mfaSetupRequired: isPrivilegedRole(role) }, 201);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    if (!email || !password) return badRequest('Email and password are required');
    const key = `${reqIp(request)}|${email}`;
    if (loginLocked(key)) return json({ error: 'Too many login attempts. Try again later.' }, 429);
    const user = await qFirst(env, 'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email]);
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      recordLoginFailure(key);
      await audit(env, null, 'auth.login.failed', { details: { email } }, null);
      return unauthorized('Invalid email or password');
    }
    clearLoginFailures(key);
    await audit(env, null, 'auth.login', { details: { email } }, user.id);
    if (Number(user.mfa_enabled)) {
      if (!user.phone) return json({ error: 'MFA is enabled but no phone number is on file. Contact support.' }, 400);
      const sendLimit = rateLimit(`mfa:send:${user.id}`, { limit: 3, windowMs: 15 * 60 * 1000 });
      if (!sendLimit.allowed) return json({ error: 'Too many verification codes. Try again later.' }, 429);
      const challengeToken = await mfaChallengeToken(env, user);
      const { sent, channel } = await issueMfaCode(env, user.id, user.phone, { fallbackEmail: user.email, challengeToken, appUrl: env.APP_URL || 'https://assistedly.ai' });
      if (channel !== (user.mfa_channel || 'sms')) {
        await exec(env, 'UPDATE users SET mfa_channel = ? WHERE id = ?', [channel, user.id]);
      }
      await audit(env, null, 'auth.mfa.send', { details: { channel, ok: sent.ok } }, user.id);
      return json({
        mfaRequired: true,
        challengeToken,
        expiresIn: 300,
        maskedPhone: maskPhone(user.phone),
        maskedEmail: channel === 'email' ? maskEmail(user.email) : undefined,
        deliveryChannel: channel,
        smsSent: channel === 'sms' && !!sent.ok,
      });
    }
    const token = await signJwt({ sub: user.id, email: user.email, role: user.role }, env.SESSION_SECRET || 'dev-secret');
    return json({
      token,
      expiresIn: 43200,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      mfaSetupRequired: isPrivilegedRole(user.role) && !Number(user.mfa_enabled),
    });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  // ── Passwordless magic-link sign-in ───────────────────────────────────────
  // Existing emails get a sign-in link. Unknown emails are treated as a NEW
  // user: we create the account and send a confirmation magic link.
  if (path === '/api/auth/passwordless/request' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    if (!email) return badRequest('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest('Invalid email address');
    const ipLimit = rateLimit(`pwreq:ip:${reqIp(request)}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!ipLimit.allowed) return json({ error: 'Too many sign-in requests. Try again later.' }, 429);
    const emailLimit = rateLimit(`pwreq:em:${email}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!emailLimit.allowed) return json({ error: 'Too many sign-in requests for this email. Try again later.' }, 429);
    const secret = env.SESSION_SECRET || 'dev-secret';
    let user = await qFirst(env, 'SELECT * FROM users WHERE email = ?', [email]);
    let created = false;
    if (!user) {
      const id = uid();
      const t = now();
      const name = email.split('@')[0].replace(/[._+]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'New member';
      // Placeholder hash — this account is passwordless; the sentinel can never
      // be used for a password login (and avoids a costly PBKDF2 on signup).
      const ph = PLACEHOLDER_HASH;
      try {
        await exec(env, 'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
          [id, email, ph, name, 'caregiver', t, t]);
        user = { id, email, password_hash: ph, name, role: 'caregiver' };
        created = true;
      } catch {
        // Race: another request created the same email between SELECT and INSERT.
        user = await qFirst(env, 'SELECT * FROM users WHERE email = ?', [email]);
        if (!user) throw new Error('Failed to create account');
      }
    }
    if (created) await audit(env, null, 'auth.signup', { details: { email, method: 'passwordless' } }, user.id);
    // One-time link token (10 min) — `created` is embedded so the verify step can
    // tell the client whether this was a new-account confirmation or a plain sign-in.
    const linkToken = await signJwt(
      { sub: user.id, email: user.email, role: user.role, purpose: 'passwordless', created },
      secret,
      600
    );
    // Best-effort confirmation/sign-in email. The token is also returned so the
    // client can complete sign-in immediately (dev mode / no mailer).
    const magicUrl = `${env.APP_URL || 'https://assistedly.ai'}/features/auth/?token=${linkToken}`;
    const emailResult = await resendSendEmail(env, {
      to: email,
      subject: created ? 'Confirm your Assistedly Cares account' : 'Your Assistedly Cares sign-in link',
      text: created
        ? `Hi ${user.name},\n\nWe created an Assistedly Cares account for ${email}. Confirm your account and sign in by opening this link:\n\n${magicUrl}\n\nThis link expires in 10 minutes. If you didn't request this, you can ignore this email.`
        : `Hi ${user.name},\n\nSign in to Assistedly Cares by opening this link:\n\n${magicUrl}\n\nThis link expires in 10 minutes. If you didn't request this, you can ignore this email.`,
      html: created
        ? `<p>Hi ${user.name},</p><p>We created an <strong>Assistedly Cares</strong> account for ${email}. Confirm your account and sign in with the button below.</p><p style="margin:24px 0"><a href="${magicUrl}" style="background:#4a7c7e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Confirm and sign in</a></p><p style="color:#6b7280;font-size:13px">This link expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`
        : `<p>Hi ${user.name},</p><p>Sign in to <strong>Assistedly Cares</strong> with the button below.</p><p style="margin:24px 0"><a href="${magicUrl}" style="background:#4a7c7e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign in to Assistedly Cares</a></p><p style="color:#6b7280;font-size:13px">This link expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
    });
    return json({
      ok: true,
      token: linkToken,
      expiresIn: 600,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      created,
      email: emailResult.ok ? 'sent' : emailResult.reason || 'not-sent',
    });
  }

  if (path === '/api/auth/passwordless/verify' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === 'string' ? body.token : '';
    if (!token) return badRequest('Token is required');
    const payload = await jwtVerify(token, env.SESSION_SECRET || 'dev-secret');
    if (!payload || payload.purpose !== 'passwordless' || !payload.sub) {
      return unauthorized('Invalid or expired sign-in token');
    }
    const user = await qFirst(env, 'SELECT * FROM users WHERE id = ?', [payload.sub]);
    if (!user) return unauthorized('User not found');
    if (Number(user.mfa_enabled)) {
      if (!user.phone) return json({ error: 'MFA is enabled but no phone number is on file. Contact support.' }, 400);
      const sendLimit = rateLimit(`mfa:send:${user.id}`, { limit: 3, windowMs: 15 * 60 * 1000 });
      if (!sendLimit.allowed) return json({ error: 'Too many verification codes. Try again later.' }, 429);
      const challengeToken = await mfaChallengeToken(env, user);
      const { sent, channel } = await issueMfaCode(env, user.id, user.phone, { fallbackEmail: user.email, challengeToken, appUrl: env.APP_URL || 'https://assistedly.ai' });
      if (channel !== (user.mfa_channel || 'sms')) {
        await exec(env, 'UPDATE users SET mfa_channel = ? WHERE id = ?', [channel, user.id]);
      }
      await audit(env, null, 'auth.mfa.send', { details: { channel, ok: sent.ok } }, user.id);
      return json({
        mfaRequired: true,
        challengeToken,
        expiresIn: 300,
        maskedPhone: maskPhone(user.phone),
        maskedEmail: channel === 'email' ? maskEmail(user.email) : undefined,
        deliveryChannel: channel,
        smsSent: channel === 'sms' && !!sent.ok,
        created: !!payload.created,
      });
    }
    // 12-hour session token
    const sessionToken = await signJwt({ sub: user.id, email: user.email, role: user.role }, env.SESSION_SECRET || 'dev-secret', 43200);
    return json({
      token: sessionToken,
      expiresIn: 43200,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      created: !!payload.created,
      mfaSetupRequired: isPrivilegedRole(user.role) && !Number(user.mfa_enabled),
    });
  }

  // ── SMS MFA ────────────────────────────────────────────────────────────────
  // POST /api/auth/mfa/setup - enroll: send a code to the supplied phone
  if (path === '/api/auth/mfa/setup' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (Number(user.mfa_enabled)) return json({ error: 'MFA is already enabled for this account.' }, 409);
    const body = await request.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    if (!phone) return badRequest('Enter a US phone number like 6175003450, or an international number like +442079460958');
    const setupLimit = rateLimit(`mfa:setup:${reqIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
    if (!setupLimit.allowed) return json({ error: 'Too many setup attempts. Try again later.' }, 429);
    // Enrollment verifies PHONE OWNERSHIP, so the code must arrive by SMS —
    // never by email (email fallback would let anyone verify a number they
    // don't own). Email fallback stays reserved for login-time step-up only.
    const { sent, channel } = await issueMfaCode(env, user.id, phone);
    await audit(env, null, 'auth.mfa.setup', { details: { phone: maskPhone(phone), channel, ok: sent.ok } }, user.id);
    if (!sent.ok) return json({ error: smsErrorMessage(sent) }, 502);
    return json({ success: true, maskedPhone: maskPhone(phone), deliveryChannel: channel, smsSent: true });
  }

  // POST /api/auth/mfa/verify-setup - confirm the code and enable MFA
  if (path === '/api/auth/mfa/verify-setup' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (Number(user.mfa_enabled)) return json({ error: 'MFA is already enabled for this account.' }, 409);
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return badRequest('Enter the 6-digit code from the text message');
    const res = await verifyMfaCode(env, user.id, code);
    if (!res.ok) return json({ error: res.error }, 400);
    const phone = normalizePhone(body.phone);
    if (!phone) return badRequest('Enter a US phone number like 6175003450, or an international number like +442079460958');
    await exec(env, 'UPDATE users SET phone = ?, mfa_enabled = 1, mfa_channel = ? WHERE id = ?', [phone, res.channel || 'sms', user.id]);
    await audit(env, null, 'auth.mfa.enabled', { details: { phone: maskPhone(phone) } }, user.id);
    return json({ success: true, mfaEnabled: true });
  }

  // POST /api/auth/mfa/verify - second factor at login (challenge token + SMS code)
  if (path === '/api/auth/mfa/verify' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : '';
    const code = String(body.code || '').trim();
    if (!challengeToken) return badRequest('Challenge token is required');
    if (!/^\d{6}$/.test(code)) return badRequest('Enter the 6-digit code from the text message');
    const payload = await jwtVerify(challengeToken, env.SESSION_SECRET || 'dev-secret');
    if (!payload || payload.purpose !== 'mfa' || !payload.sub) return unauthorized('Invalid or expired verification challenge');
    const user = await qFirst(env, 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
    if (!user || !Number(user.mfa_enabled)) return unauthorized('User not found');
    const res = await verifyMfaCode(env, user.id, code);
    if (!res.ok) {
      await audit(env, null, 'auth.mfa.failed', { details: { reason: res.error } }, user.id);
      return json({ error: res.error }, 400);
    }
    await audit(env, null, 'auth.mfa.verify', { details: { channel: 'sms' } }, user.id);
    const sessionToken = await signJwt({ sub: user.id, email: user.email, role: user.role }, env.SESSION_SECRET || 'dev-secret', 43200);
    return json({
      token: sessionToken,
      expiresIn: 43200,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      mfaSetupRequired: false,
    });
  }

  // POST /api/auth/mfa/resend - re-send the login code (for "didn't get the code?")
  if (path === '/api/auth/mfa/resend' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken : '';
    if (!challengeToken) return badRequest('Challenge token is required');
    const payload = await jwtVerify(challengeToken, env.SESSION_SECRET || 'dev-secret');
    if (!payload || payload.purpose !== 'mfa' || !payload.sub) return unauthorized('Invalid or expired verification challenge');
    const user = await qFirst(env, 'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [payload.sub]);
    if (!user || !Number(user.mfa_enabled) || !user.phone) return unauthorized('User not found');
    const sendLimit = rateLimit(`mfa:send:${user.id}`, { limit: 3, windowMs: 15 * 60 * 1000 });
    if (!sendLimit.allowed) return json({ error: 'Too many verification codes. Try again later.' }, 429);
    const chosen = body.channel === 'email' ? 'email' : 'sms';
    const { sent, channel } = await issueMfaCode(env, user.id, user.phone, { fallbackEmail: user.email, challengeToken, appUrl: env.APP_URL || 'https://assistedly.ai', channel: chosen });
    if (channel !== (user.mfa_channel || 'sms')) {
      await exec(env, 'UPDATE users SET mfa_channel = ? WHERE id = ?', [channel, user.id]);
    }
    await audit(env, null, 'auth.mfa.send', { details: { channel, ok: sent.ok, resend: true } }, user.id);
    if (!sent.ok) return json({ error: smsErrorMessage(sent) }, 502);
    return json({ success: true, maskedPhone: maskPhone(user.phone), maskedEmail: channel === 'email' ? maskEmail(user.email) : undefined, deliveryChannel: channel, smsSent: channel === 'sms' });
  }

  // POST /api/auth/mfa/disable - requires a fresh SMS code to the on-file phone
  if (path === '/api/auth/mfa/disable' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (!Number(user.mfa_enabled)) return json({ error: 'MFA is not enabled for this account.' }, 409);
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || '').trim();
    if (!code) {
      const sendLimit = rateLimit(`mfa:send:${user.id}`, { limit: 3, windowMs: 15 * 60 * 1000 });
      if (!sendLimit.allowed) return json({ error: 'Too many verification codes. Try again later.' }, 429);
      if (!user.phone) return badRequest('No phone number on file');
      const { sent, channel } = await issueMfaCode(env, user.id, user.phone, { fallbackEmail: user.email });
      await audit(env, null, 'auth.mfa.send', { details: { channel, ok: sent.ok } }, user.id);
      if (!sent.ok) return json({ error: smsErrorMessage(sent) }, 502);
      return json({ success: true, codeSent: true, maskedPhone: maskPhone(user.phone), maskedEmail: channel === 'email' ? maskEmail(user.email) : undefined, deliveryChannel: channel });
    }
    if (!/^\d{6}$/.test(code)) return badRequest('Enter the 6-digit code from the text message');
    const res = await verifyMfaCode(env, user.id, code);
    if (!res.ok) return json({ error: res.error }, 400);
    await exec(env, 'UPDATE users SET mfa_enabled = 0 WHERE id = ?', [user.id]);
    await audit(env, null, 'auth.mfa.disabled', { details: {} }, user.id);
    return json({ success: true, mfaEnabled: false });
  }

  // POST /api/auth/logout - revoke the presented session token server-side
  if (path === '/api/auth/logout' && method === 'POST') {
    const token = bearerToken(request);
    if (!token) return unauthorized();
    const payload = await jwtVerify(token, env.SESSION_SECRET || 'dev-secret');
    if (payload?.sub) {
      await revokeToken(env, token);
      await audit(env, null, 'auth.logout', { details: { method: 'jwt' } }, payload.sub);
    }
    return json({ success: true });
  }

  // POST /api/auth/delete-account - GDPR Art. 17 erasure for the signed-in user.
  // Soft-deletes (PII anonymized) so legal/audit retention keeps working; the
  // session is revoked and the email becomes reusable for a fresh account.
  if (path === '/api/auth/delete-account' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    const token = bearerToken(request);
    const owned = await qFirst(env, 'SELECT 1 AS ok FROM cases WHERE coordinator_id = ? LIMIT 1', [user.id]);
    if (owned) return json({ error: 'Transfer or close your care cases before deleting your account.' }, 409);
    await exec(env, 'DELETE FROM case_members WHERE user_id = ?', [user.id]);
    await exec(env,
      'UPDATE users SET email = ?, name = ?, password_hash = ?, role = ?, deleted_at = ? WHERE id = ?',
      [`deleted-${user.id}@invalid`, 'Deleted User', PLACEHOLDER_HASH, 'caregiver', now(), user.id]);
    if (token) await revokeToken(env, token);
    await audit(env, null, 'account.deleted', { details: { email: user.email } }, user.id);
    return json({ success: true });
  }

  // ── Care profiles (case documents) ──
  if ((path === '/api/care-profiles' || path === '/api/patients') && method === 'GET') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized('Login required to view profiles');
    const rows = await q(env, 'SELECT data FROM cases WHERE coordinator_id = ? OR id IN (SELECT case_id FROM case_members WHERE user_id = ?) ORDER BY updated_at DESC', [user.id, user.id]);
    const profiles = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    return json({ profiles, patients: profiles });
  }

  if ((path === '/api/care-profiles' || path === '/api/patients') && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized('Login required to create a profile');
    const body = await request.json().catch(() => ({}));
    const doc = normalizeCareProfile(body);
    if (!doc.patient.displayName && !doc.patient.firstName && !doc.patient.lastName) return badRequest('Patient name is required');
    const t = now();
    const coordinatorId = user.id;
    await exec(env, 'INSERT INTO cases (id, coordinator_id, patient_name, status, consent_given, data, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      [doc.id, coordinatorId, doc.patient.displayName || doc.patient.firstName || 'Unnamed', doc.status || 'active', doc.consent?.given ? 1 : 0, JSON.stringify(doc), t, t]);
    await audit(env, doc.id, 'careProfile.create', { fields: Object.keys(body) }, user.id);
    return json({ success: true, profile: doc, patient: doc }, 201);
  }

  // -- outcome-linked analytics (site-scoped, audited) --
  if (path === '/api/analytics/outcomes' && method === 'GET') {
    const aUser = await getAuthedUser(env, request);
    if (!aUser) return unauthorized('Login required');
    const site = url.searchParams.get('site');
    const aRows = await q(env, 'SELECT data FROM cases WHERE coordinator_id = ? OR id IN (SELECT case_id FROM case_members WHERE user_id = ?)', [aUser.id, aUser.id]);
    let docs = aRows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    if (site) docs = docs.filter(d => (d.siteId ?? 'demo') === site);
    const admitted = docs.filter(d => d.admissionDate);
    const dischargedDocs = docs.filter(d => d.dischargedAt);
    const sameDay = dischargedDocs.filter(d => d.admissionDate && d.admissionDate.slice(0, 10) === d.dischargedAt.slice(0, 10)).length;
    const losDays = dischargedDocs.map(d => {
      const start = new Date(d.admissionDate).getTime();
      const end = new Date(d.dischargedAt).getTime();
      return (isNaN(start) || isNaN(end)) ? null : (end - start) / 86400000;
    }).filter(v => v !== null);
    const delayByType = {};
    for (const t of BARRIER_TYPES) {
      const hrs = docs.flatMap(d => (d.barriers || []).filter(b => b.type === t && b.dueDate)).map(b => {
        const end = b.resolvedAt ? new Date(b.resolvedAt).getTime() : Date.now();
        const due = new Date(b.dueDate).getTime();
        return isNaN(due) ? null : (end - due) / 3600000;
      }).filter(v => v !== null && v > 0);
      if (hrs.length) {
        const sorted = [...hrs].sort((a, b) => a - b);
        delayByType[t] = { medianDelayHours: Math.round(medianOf(sorted)), p90DelayHours: Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]) };
      }
    }
    const resolvedWithDue = docs.flatMap(d => (d.barriers || []).filter(b => b.status === 'RESOLVED' && b.dueDate));
    const report = {
      generatedAt: new Date().toISOString(),
      site: site || 'all',
      sitesIncluded: [...new Set(docs.map(d => d.siteId ?? 'demo'))],
      admissions: admitted.length,
      discharges: dischargedDocs.length,
      sameDayDischargeRate: dischargedDocs.length ? sameDay / dischargedDocs.length : null,
      medianLosDays: losDays.length ? Math.round(medianOf(losDays) * 10) / 10 : null,
      slaComplianceRate: resolvedWithDue.length ? resolvedWithDue.filter(b => !barrierBreached(b)).length / resolvedWithDue.length : null,
      openBarrierCount: docs.flatMap(d => (d.barriers || []).filter(b => b.status !== 'RESOLVED')).length,
      topDelayCausingBarrierTypes: Object.entries(delayByType).sort((a, b) => (b[1].medianDelayHours ?? 0) - (a[1].medianDelayHours ?? 0)).slice(0, 3).map(([type, v]) => ({ type, medianDelayHours: v.medianDelayHours, p90DelayHours: v.p90DelayHours })),
    };
    await audit(env, null, 'analytics.outcomes', { site: site || 'all' }, aUser.id);
    return json(report);
  }

  // nested task routes
  const taskMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)\/tasks(?:\/([^/]+))?(?:\/(comments|escalate))?$/);
  if (taskMatch) {
    const [, id, taskId, action] = taskMatch;
    const taskUser = await getAuthedUser(env, request);
    if (!taskUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, taskUser, id))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, id);
    if (!doc) return notFound('Care profile not found');
    doc.tasks = Array.isArray(doc.tasks) ? doc.tasks.map(t => normalizeTask(t)) : [];
    if (!taskId && method === 'GET') return json({ tasks: doc.tasks, templates: TASK_TEMPLATES, statuses: TASK_STATUSES });
    if (!taskId && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      let seed = body;
      if (body.templateId && !body.title) {
        const tpl = TASK_TEMPLATES.find(t => t.id === body.templateId);
        if (tpl) seed = { ...body, title: tpl.title, owner: body.owner || tpl.defaultOwner, dueDate: body.dueDate || new Date(Date.now() + tpl.defaultDueDays * 86400000).toISOString().slice(0, 10) };
      }
      const task = normalizeTask(seed);
      if (!task.title) return badRequest('Task title is required');
      doc.tasks.push(task);
      await putCaseDoc(env, doc);
      await audit(env, id, 'task.create', { taskId: task.id, title: task.title });
      return json({ success: true, task, tasks: doc.tasks }, 201);
    }
    const idx = doc.tasks.findIndex(t => t.id === taskId);
    if (idx < 0) return notFound('Task not found');
    if (!action && method === 'GET') return json({ task: doc.tasks[idx] });
    if (!action && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json().catch(() => ({}));
      doc.tasks[idx] = normalizeTask(body, doc.tasks[idx]);
      await putCaseDoc(env, doc);
      await audit(env, id, 'task.update', { taskId, fields: Object.keys(body) });
      return json({ success: true, task: doc.tasks[idx], tasks: doc.tasks });
    }
    if (!action && method === 'DELETE') {
      const [removed] = doc.tasks.splice(idx, 1);
      await putCaseDoc(env, doc);
      await audit(env, id, 'task.delete', { taskId, title: removed.title });
      return json({ success: true, task: removed, tasks: doc.tasks });
    }
    if (action === 'comments' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const comment = { id: uid(), text: body.text || '', author: taskUser.name || taskUser.email || 'frontend-tester', createdAt: now() };
      if (!comment.text) return badRequest('Comment text is required');
      doc.tasks[idx].comments = doc.tasks[idx].comments || [];
      doc.tasks[idx].comments.push(comment);
      await putCaseDoc(env, doc);
      await audit(env, id, 'task.comment', { taskId, commentId: comment.id });
      return json({ success: true, comment, task: doc.tasks[idx], tasks: doc.tasks });
    }
    if (action === 'escalate' && (method === 'POST' || method === 'PATCH')) {
      doc.tasks[idx].escalation = true;
      doc.tasks[idx].escalatedAt = now();
      await putCaseDoc(env, doc);
      await audit(env, id, 'task.escalate', { taskId });
      return json({ success: true, task: doc.tasks[idx], tasks: doc.tasks });
    }
  }

  // ── barrier routes (discharge barrier ledger) ──
  if (path === '/api/barriers/metrics' && method === 'GET') {
    const mUser = await getAuthedUser(env, request);
    if (!mUser) return unauthorized('Login required');
    // scoped: only cases this user can access
    const mRows = await q(env, 'SELECT data FROM cases WHERE coordinator_id = ? OR id IN (SELECT case_id FROM case_members WHERE user_id = ?)', [mUser.id, mUser.id]);
    const mDocs = mRows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    const all = mDocs.flatMap(d => Array.isArray(d.barriers) ? d.barriers : []);
    const withDue = all.filter(b => b.dueDate);
    const ttrByType = {};
    for (const t of BARRIER_TYPES) {
      const hours = all.filter(b => b.type === t && b.resolvedAt).map(b => (new Date(b.resolvedAt).getTime() - new Date(b.createdAt).getTime()) / 3600000);
      if (hours.length) ttrByType[t] = Math.round(medianOf(hours) * 10) / 10;
    }
    const discharged = mDocs.filter(d => d.dischargeInstructions?.dischargeDate && d.admissionDate);
    const sameDay = discharged.filter(d => d.admissionDate.slice(0, 10) === d.dischargeInstructions.dischargeDate.slice(0, 10)).length;
    const site = url.searchParams.get('site');
    const scoped = site ? mDocs.filter(d => (d.siteId ?? 'demo') === site) : mDocs;
    const allScoped = scoped.flatMap(d => Array.isArray(d.barriers) ? d.barriers : []);
    const delayHrsByType = {};
    for (const t of BARRIER_TYPES) {
      const hrs = allScoped.filter(b => b.type === t && b.dueDate).map(b => {
        const end = b.resolvedAt ? new Date(b.resolvedAt).getTime() : Date.now();
        const due = new Date(b.dueDate).getTime();
        return isNaN(due) ? null : (end - due) / 3600000;
      }).filter(v => v !== null && v > 0);
      if (hrs.length) {
        const sorted = [...hrs].sort((a, b) => a - b);
        delayHrsByType[t] = {
          medianDelayHours: Math.round(medianOf(sorted)),
          p90DelayHours: Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]),
        };
      }
    }
    const groupRate = (pred) => {
      const cases = scoped.filter(pred);
      const dischargedCount = cases.filter(d => d.dischargedAt).length;
      return { cases: cases.length, discharged: dischargedCount, dischargeRate: cases.length ? dischargedCount / cases.length : null };
    };
    return json({
      site: site || 'all',
      siteIds: [...new Set(mDocs.map(d => d.siteId ?? 'demo'))],
      casesConsidered: discharged.length,
      sameDayDischargeRate: discharged.length ? sameDay / discharged.length : null,
      slaBreachRate: withDue.length ? withDue.filter(barrierBreached).length / withDue.length : null,
      openBarrierCount: allScoped.filter(b => b.status !== 'RESOLVED').length,
      medianTimeToResolutionHoursByType: ttrByType,
      medianDelayHoursByType: delayHrsByType,
      dischargeRateByBarrierResolution: {
        withResolvedBarrier: groupRate(d => (d.barriers || []).some(b => b.status === 'RESOLVED')),
        withoutResolvedBarrier: groupRate(d => !(d.barriers || []).some(b => b.status === 'RESOLVED')),
      },
    });
  }

  // -- outcome recording (human-recorded, never inferred) --
  if (path.startsWith('/api/cases/') && path.endsWith('/outcomes') && method === 'POST') {
    const caseId = path.split('/')[3];
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (!(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    const body = await request.json().catch(() => ({}));
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    const before = { dischargedAt: doc.dischargedAt ?? null, readmission30d: doc.readmission30d ?? null, siteId: doc.siteId ?? 'demo' };
    if (body.dischargedAt !== undefined) {
      const d = new Date(body.dischargedAt);
      if (isNaN(d.getTime())) return badRequest('dischargedAt must be a valid date');
      doc.dischargedAt = d.toISOString();
    }
    if (body.readmission30d !== undefined) doc.readmission30d = body.readmission30d === true;
    if (body.siteId !== undefined && typeof body.siteId === 'string' && body.siteId.trim()) doc.siteId = body.siteId.trim();
    await putCaseDoc(env, doc);
    await audit(env, caseId, 'outcome.record', { fields: Object.keys(body) }, user.id, before, { dischargedAt: doc.dischargedAt ?? null, readmission30d: doc.readmission30d ?? null, siteId: doc.siteId ?? 'demo' });
    return json({ success: true, outcomes: { dischargedAt: doc.dischargedAt ?? null, readmission30d: doc.readmission30d ?? null, siteId: doc.siteId ?? 'demo' } });
  }

  const readinessMatch = path.match(/^\/api\/barriers\/([^/]+)\/readiness$/);
  if (readinessMatch) {
    const [, rCaseId] = readinessMatch;
    const rUser = await getAuthedUser(env, request);
    if (!rUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, rUser, rCaseId))) return notFound('Care profile not found');
    const rDoc = await getCaseDoc(env, rCaseId);
    if (!rDoc) return notFound('Care profile not found');
    const rBarriers = Array.isArray(rDoc.barriers) ? rDoc.barriers : [];
    const rOpen = rBarriers.filter(b => b.status !== 'RESOLVED');
    return json({ status: barrierReadiness(rBarriers), openBarriers: rOpen.length, highPriority: rOpen.filter(b => b.priority === 'HIGH').length });
  }

  const barrierMatch = path.match(/^\/api\/barriers\/([^/]+)(?:\/([^/]+))?(?:\/(comments))?$/);
  if (barrierMatch) {
    const [, caseId, barrierId, action] = barrierMatch;
    const bUser = await getAuthedUser(env, request);
    if (!bUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, bUser, caseId))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    doc.barriers = Array.isArray(doc.barriers) ? doc.barriers.map(b => normalizeBarrier(b)) : [];

    if (!barrierId && method === 'GET') return json({ barriers: doc.barriers });
    if (!barrierId && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const barrier = normalizeBarrier(body);
      if (!barrier.description) return badRequest('Barrier description is required');
      if (body.owner && barrier.status === 'IDENTIFIED') barrier.status = 'ASSIGNED';
      doc.barriers.push(barrier);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'barrier.create', { barrierId: barrier.id, type: barrier.type }, bUser.id);
      return json({ success: true, barrier, barriers: doc.barriers }, 201);
    }
    const idx = doc.barriers.findIndex(b => b.id === barrierId);
    if (idx < 0) return notFound('Barrier not found');
    if (!action && method === 'GET') return json({ barrier: doc.barriers[idx] });
    if (!action && (method === 'PATCH' || method === 'PUT')) {
      const body = await request.json().catch(() => ({}));
      const before = { ...doc.barriers[idx] };
      const next = normalizeBarrier(body, doc.barriers[idx]);
      if (body.status === 'RESOLVED' && !next.resolutionNote) return badRequest('resolutionNote is required to resolve a barrier');
      if (body.status === 'RESOLVED') next.resolvedAt = now();
      if (body.status === 'ESCALATED') next.escalatedAt = next.escalatedAt || now();
      if (body.status && body.status !== 'RESOLVED' && before.resolvedAt) { next.resolvedAt = null; next.resolutionNote = null; }
      if (next.owner && before.status === 'IDENTIFIED' && next.status === 'IDENTIFIED') next.status = 'ASSIGNED';
      doc.barriers[idx] = next;
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'barrier.update', { barrierId: next.id, fields: Object.keys(body) }, bUser.id, before, next);
      return json({ success: true, barrier: next, barriers: doc.barriers });
    }
    if (!action && method === 'DELETE') {
      const [removed] = doc.barriers.splice(idx, 1);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'barrier.delete', { barrierId: removed.id }, bUser.id);
      return json({ success: true, barrier: removed, barriers: doc.barriers });
    }
    if (action === 'comments' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const comment = { id: uid(), text: body.text || '', author: bUser.name || bUser.email || 'mvp-user', createdAt: now() };
      if (!comment.text) return badRequest('Comment text is required');
      doc.barriers[idx].comments = doc.barriers[idx].comments || [];
      doc.barriers[idx].comments.push(comment);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'barrier.comment', { barrierId: doc.barriers[idx].id, commentId: comment.id }, bUser.id);
      return json({ success: true, comment, barrier: doc.barriers[idx], barriers: doc.barriers });
    }
  }

  // ── follow-up routes (post-discharge scheduled check-ins) ──
  // Upcoming follow-ups across cases the user can access
  if (path === '/api/follow-ups' && method === 'GET') {
    const fuUser = await getAuthedUser(env, request);
    if (!fuUser) return unauthorized('Login required');
    const nowIso = now();
    const owned = await q(env, 'SELECT id FROM cases WHERE coordinator_id = ?', [fuUser.id]);
    const memberRows = await q(env, 'SELECT case_id FROM case_members WHERE user_id = ?', [fuUser.id]);
    const ids = new Set([...owned.map(r => r.id), ...memberRows.map(r => r.case_id)]);
    const upcoming = [];
    for (const caseId of ids) {
      const doc = await getCaseDoc(env, caseId);
      if (!doc) continue;
      for (const f of (Array.isArray(doc.followUps) ? doc.followUps : [])) {
        if (f.status === 'SCHEDULED' && f.scheduledFor && f.scheduledFor >= nowIso) {
          upcoming.push({ ...f, caseId, patientName: doc.patient?.displayName || [doc.patient?.firstName, doc.patient?.lastName].filter(Boolean).join(' ') || 'Unnamed' });
        }
      }
    }
    upcoming.sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
    return json({ followUps: upcoming });
  }

  // Escalation / completion metrics across user's cases (registered before /:caseId)
  if (path === '/api/follow-ups/metrics' && method === 'GET') {
    const fuUser = await getAuthedUser(env, request);
    if (!fuUser) return unauthorized('Login required');
    const owned = await q(env, 'SELECT id FROM cases WHERE coordinator_id = ?', [fuUser.id]);
    const memberRows = await q(env, 'SELECT case_id FROM case_members WHERE user_id = ?', [fuUser.id]);
    const ids = new Set([...owned.map(r => r.id), ...memberRows.map(r => r.case_id)]);
    let total = 0, completed = 0, escalated = 0, missed = 0;
    for (const caseId of ids) {
      const doc = await getCaseDoc(env, caseId);
      if (!doc) continue;
      for (const f of (Array.isArray(doc.followUps) ? doc.followUps : [])) {
        total++;
        if (f.status === 'COMPLETED') completed++;
        if (f.status === 'ESCALATED') escalated++;
        if (f.status === 'MISSED' && f.scheduledFor && f.scheduledFor < now()) missed++;
      }
    }
    return json({
      total, completed, escalated, missed,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
      escalationRate: total ? Math.round((escalated / total) * 100) : 0
    });
  }

  const followUpMatch = path.match(/^\/api\/follow-ups\/([^/]+)(?:\/([^/]+))?(?:\/(escalate))?$/);
  if (followUpMatch) {
    const [, caseId, id, action] = followUpMatch;
    const fuUser = await getAuthedUser(env, request);
    if (!fuUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, fuUser, caseId))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    doc.followUps = Array.isArray(doc.followUps) ? doc.followUps.map(f => normalizeFollowUp(f)) : [];

    // List follow-ups for a case
    if (!id && method === 'GET') return json({ followUps: doc.followUps });
    // Create: single follow-up, or auto-cadence (+3/+7/+14/+30 days from discharge)
    if (!id && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (body.auto !== true && !body.scheduledFor) return badRequest('scheduledFor is required (or set auto=true for the discharge cadence)');
      const base = body.baseDate || doc.dischargeInstructions?.dischargeDate || doc.dischargedAt || now();
      const created = [];
      if (body.auto === true) {
        for (const days of FOLLOWUP_CADENCE_DAYS) {
          const scheduledFor = new Date(new Date(base).getTime() + days * 86400000).toISOString();
          const dup = doc.followUps.find(f => f.scheduledFor && f.scheduledFor.slice(0, 10) === scheduledFor.slice(0, 10));
          if (dup) continue;
          const f = normalizeFollowUp({ scheduledFor, contactType: body.contactType || 'PHONE' });
          doc.followUps.push(f); created.push(f);
        }
      } else {
        const f = normalizeFollowUp(body);
        doc.followUps.push(f); created.push(f);
      }
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'followUp.create', { count: created.length }, fuUser.id);
      return json({ success: true, followUps: created }, 201);
    }

    const idx = doc.followUps.findIndex(f => f.id === id);
    if (idx < 0) return notFound('Follow-up not found');
    if (!action && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json().catch(() => ({}));
      const next = normalizeFollowUp(body, doc.followUps[idx]);
      if (next.status === 'ESCALATED') { next.escalatedAt = next.escalatedAt || now(); next.escalationLevel = Math.max(next.escalationLevel, 1); }
      if (next.escalationLevel > 0) next.escalatedAt = next.escalatedAt || now();
      doc.followUps[idx] = next;
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'followUp.update', { followUpId: id, fields: Object.keys(body) }, fuUser.id);
      return json({ success: true, followUp: doc.followUps[idx], followUps: doc.followUps });
    }
    if (!action && method === 'DELETE') {
      const [removed] = doc.followUps.splice(idx, 1);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'followUp.delete', { followUpId: id }, fuUser.id);
      return json({ success: true, followUp: removed, followUps: doc.followUps });
    }
    if (action === 'escalate' && (method === 'POST' || method === 'PATCH')) {
      const current = doc.followUps[idx];
      doc.followUps[idx] = normalizeFollowUp({
        status: current.status === 'COMPLETED' ? 'COMPLETED' : 'ESCALATED',
        escalationLevel: (Number(current.escalationLevel) || 0) + 1,
        escalatedAt: now()
      }, current);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'followUp.escalate', { followUpId: id, level: doc.followUps[idx].escalationLevel }, fuUser.id);
      return json({ success: true, followUp: doc.followUps[idx], followUps: doc.followUps });
    }
  }

  // nested medication routes
  const medMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)\/medications\/([^/]+)(?:\/(verify|notes))?$/);
  if (medMatch) {
    const [, id, medId, action] = medMatch;
    const medUser = await getAuthedUser(env, request);
    if (!medUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, medUser, id))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, id);
    if (!doc) return notFound('Care profile not found');
    doc.medications = Array.isArray(doc.medications) ? doc.medications.map(m => normalizeMedication(m)) : [];
    const idx = doc.medications.findIndex(m => m.id === medId);
    if (idx < 0) return notFound('Medication not found');
    if (method === 'GET' && !action) return json({ medication: doc.medications[idx] });
    if ((method === 'PUT' || method === 'PATCH') && !action) {
      const body = await request.json().catch(() => ({}));
      doc.medications[idx] = normalizeMedication(body, doc.medications[idx]);
      await putCaseDoc(env, doc);
      await audit(env, id, 'medication.update', { medicationId: doc.medications[idx].id, fields: Object.keys(body) });
      return json({ success: true, medication: doc.medications[idx], medications: doc.medications });
    }
    if (method === 'DELETE' && !action) {
      const [removed] = doc.medications.splice(idx, 1);
      await putCaseDoc(env, doc);
      await audit(env, id, 'medication.delete', { medicationId: removed.id, name: removed.name });
      return json({ success: true, medication: removed, medications: doc.medications });
    }
    if ((method === 'POST' || method === 'PATCH') && action === 'verify') {
      const body = await request.json().catch(() => ({}));
      doc.medications[idx] = normalizeMedication({ ...doc.medications[idx], verified: true, lastVerified: now(), lastVerifiedBy: body.verifiedBy || body.actor || 'mvp-user' }, doc.medications[idx]);
      await putCaseDoc(env, doc);
      await audit(env, id, 'medication.verify', { medicationId: doc.medications[idx].id });
      return json({ success: true, medication: doc.medications[idx], medications: doc.medications });
    }
    if ((method === 'PATCH' || method === 'PUT') && action === 'notes') {
      const body = await request.json().catch(() => ({}));
      doc.medications[idx] = normalizeMedication({ ...doc.medications[idx], notes: body.notes ?? '' }, doc.medications[idx]);
      await putCaseDoc(env, doc);
      await audit(env, id, 'medication.notes.update', { medicationId: doc.medications[idx].id });
      return json({ success: true, medication: doc.medications[idx], medications: doc.medications });
    }
  }

  // ── FHIR export (R4) ──
  if (path.startsWith('/api/care-profiles/') && path.endsWith('/export/fhir') && method === 'GET') {
    const caseId = path.split('/')[3];
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (!(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    const base = 'https://care-circle.local/fhir';
    const entries = [];
    const add = (resource) => entries.push({ fullUrl: base + '/' + resource.resourceType + '/' + resource.id, resource });
    const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
    const displayName = doc.patient?.displayName || [doc.patient?.firstName, doc.patient?.lastName].filter(Boolean).join(' ').trim();
    const parts = displayName ? displayName.split(' ') : [];
    add({
      resourceType: 'Patient',
      id: caseId,
      name: parts.length ? [{ text: displayName, family: parts.length > 1 ? parts[parts.length - 1] : undefined, given: parts.length > 1 ? parts.slice(0, -1) : undefined }] : undefined,
      birthDate: isDate(doc.patient?.dateOfBirth) ? doc.patient.dateOfBirth : undefined,
      gender: ['male', 'female', 'other', 'unknown'].includes(String(doc.patient?.gender || '').toLowerCase()) ? String(doc.patient.gender).toLowerCase() : undefined,
      telecom: doc.patient?.phone ? [{ system: 'phone', value: doc.patient.phone }] : undefined,
      address: doc.patient?.address ? [{ text: doc.patient.address }] : undefined,
    });
    for (const med of (doc.medications || [])) {
      add({
        resourceType: 'MedicationStatement',
        id: 'med-' + med.id,
        status: med.verified ? 'active' : 'intended',
        medicationCodeableConcept: { text: med.name },
        subject: { reference: 'Patient/' + caseId },
        dateAsserted: med.updatedAt || med.createdAt,
        note: med.notes ? [{ text: med.notes }] : undefined,
        dosage: (med.dose || med.schedule) ? [{ text: [med.dose, med.schedule].filter(Boolean).join('; ') }] : undefined,
      });
    }
    const taskStatus = { todo: 'requested', in_progress: 'in-progress', blocked: 'on-hold', done: 'completed', cancelled: 'cancelled' };
    for (const t of (doc.tasks || [])) {
      add({
        resourceType: 'Task',
        id: 'task-' + t.id,
        status: taskStatus[t.status] || 'requested',
        intent: 'order',
        description: t.title,
        note: t.description ? [{ text: t.description }] : undefined,
        executionPeriod: t.dueDate ? { end: t.dueDate } : undefined,
        authoredOn: t.createdAt,
        owner: t.owner ? { display: t.owner } : undefined,
      });
    }
    if (doc.consent) {
      add({
        resourceType: 'Consent',
        id: 'consent-1',
        status: doc.consent.given ? 'active' : 'inactive',
        scope: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy', display: 'Privacy Consent' }] },
        patient: { reference: 'Patient/' + caseId },
        dateTime: doc.consent.givenAt || undefined,
        provision: { type: doc.consent.given ? 'permit' : 'deny' },
      });
    }
    const di = doc.dischargeInstructions || {};
    const diText = [
      di.summary ? 'Summary: ' + di.summary : null,
      di.dischargeDate ? 'Discharge date: ' + di.dischargeDate : null,
      di.followUp ? 'Follow-up: ' + di.followUp : null,
      di.activity ? 'Activity: ' + di.activity : null,
      di.diet ? 'Diet: ' + di.diet : null,
      Array.isArray(di.redFlags) && di.redFlags.length ? 'Red flags: ' + di.redFlags.join('; ') : null,
    ].filter(Boolean).join('\n');
    if (diText) {
      add({
        resourceType: 'DocumentReference',
        id: 'discharge-instructions',
        status: 'current',
        type: { text: 'Discharge instructions' },
        subject: { reference: 'Patient/' + caseId },
        date: doc.updatedAt,
        content: [{ attachment: { contentType: 'text/plain', data: btoa(diText), title: 'Discharge instructions' } }],
      });
    }
    const bundle = { resourceType: 'Bundle', id: 'care-profile-' + caseId, type: 'collection', timestamp: new Date().toISOString(), entry: entries };
    await audit(env, caseId, 'export.fhir', { resources: entries.length }, user.id);
    return new Response(JSON.stringify(bundle), { status: 200, headers: { 'Content-Type': 'application/fhir+json', ...corsHeaders } });
  }

  if (path.startsWith('/api/care-profiles/') && path.endsWith('/export/summary') && method === 'GET') {
    const caseId = path.split('/')[3];
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    if (!(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    await audit(env, caseId, 'export.summary', {}, user.id);
    return json({
      generatedAt: new Date().toISOString(),
      patient: doc.patient || {},
      medications: doc.medications || [],
      tasks: doc.tasks || [],
      dischargeInstructions: doc.dischargeInstructions || {},
      consent: doc.consent || {},
    });
  }

  // profile + sub-resources
  const profileMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)(?:\/(emergency-contacts|medications|discharge-instructions|audit))?$/);
  if (profileMatch) {
    const [, id, sub] = profileMatch;
    const profileUser = await getAuthedUser(env, request);
    if (!profileUser) return unauthorized('Login required');
    if (!(await canAccessCase(env, profileUser, id))) return notFound('Care profile not found');
    const doc = await getCaseDoc(env, id);
    if (!doc) return notFound('Care profile not found');

    if (!sub && method === 'GET') return json({ profile: doc, patient: doc });
    if (!sub && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json().catch(() => ({}));
      const profile = normalizeCareProfile(body, doc);
      await putCaseDoc(env, profile);
      await audit(env, id, 'careProfile.update', { fields: Object.keys(body) });
      return json({ success: true, profile, patient: profile });
    }
    if (sub === 'emergency-contacts' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      doc.emergencyContacts = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : [];
      await putCaseDoc(env, doc);
      await audit(env, id, 'emergencyContacts.update', { count: doc.emergencyContacts.length });
      return json({ success: true, emergencyContacts: doc.emergencyContacts });
    }
    if (sub === 'medications' && method === 'GET') return json({ medications: (doc.medications || []).map(m => normalizeMedication(m)) });
    if (sub === 'medications' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      doc.medications = Array.isArray(body.medications) ? body.medications.map(m => normalizeMedication(m)) : [];
      await putCaseDoc(env, doc);
      await audit(env, id, 'medications.update', { count: doc.medications.length });
      return json({ success: true, medications: doc.medications });
    }
    if (sub === 'medications' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const med = normalizeMedication(body);
      if (!med.name) return badRequest('Medication name is required');
      doc.medications = (doc.medications || []).map(m => normalizeMedication(m));
      doc.medications.push(med);
      await putCaseDoc(env, doc);
      await audit(env, id, 'medication.create', { medicationId: med.id, name: med.name });
      return json({ success: true, medication: med, medications: doc.medications }, 201);
    }
    if (sub === 'discharge-instructions' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      doc.dischargeInstructions = normalizeCareProfile({ dischargeInstructions: body }, doc).dischargeInstructions;
      await putCaseDoc(env, doc);
      await audit(env, id, 'dischargeInstructions.update');
      return json({ success: true, dischargeInstructions: doc.dischargeInstructions });
    }
    if (sub === 'audit' && method === 'GET') {
      const entries = await q(env, 'SELECT * FROM audit_log WHERE case_id = ? ORDER BY ts DESC', [id]);
      return json({ auditLog: entries.map(e => ({ id: e.id, timestamp: e.ts, userId: e.user_id, action: e.action, entity: e.entity, entityId: e.entity_id, details: e.details ? JSON.parse(e.details) : undefined })) });
    }
  }

  // ── Invitations ──
  if (path === '/api/invitations/send' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { caseId, email, role } = body;
    if (!caseId || !email) return badRequest('caseId and email are required');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    if (!(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    const token = uid();
    const t = now();
    const expires = new Date(Date.now() + 7 * 86400000).toISOString();
    await exec(env, 'INSERT INTO case_invitations (id, case_id, email, role, status, token, expires_at, created_at, invited_by) VALUES (?,?,?,?,?,?,?,?,?)',
      [uid(), caseId, email.toLowerCase().trim(), (role || 'family').toUpperCase(), 'pending', token, expires, t, user.id]);
    await audit(env, caseId, 'invitation.send', { email, role: (role || 'family').toUpperCase() }, user.id);
    // Email send is a no-op here (Resend key wired later); return the invite token for manual acceptance.
    return json({ success: true, message: 'Invitation created', inviteToken: token });
  }

  if (path === '/api/invitations/list' && method === 'GET') {
    const listUser = await getAuthedUser(env, request);
    if (!listUser) return unauthorized('Login required');
    const caseId = url.searchParams.get('caseId');
    let rows;
    if (caseId) {
      if (!(await canAccessCase(env, listUser, caseId))) return notFound('Care profile not found');
      rows = await q(env, 'SELECT * FROM case_invitations WHERE case_id = ? ORDER BY created_at DESC', [caseId]);
    } else {
      rows = await q(env, 'SELECT * FROM case_invitations WHERE invited_by = ? ORDER BY created_at DESC', [listUser.id]);
    }
    return json({ invitations: rows });
  }

  // ── Email notifications via Resend ──
  if (path === '/api/notify/email' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { caseId, subject, text, html } = body;
    if (!text && !html) return badRequest('text or html is required');
    if (caseId && !(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    const doc = caseId ? await getCaseDoc(env, caseId) : null;
    const to = [];
    if (doc) {
      for (const c of (doc.emergencyContacts || [])) if (c.email) to.push(c.email);
      if (doc.smsPreference?.email) to.push(doc.smsPreference.email);
    }
    if (body.to) { for (const e of (Array.isArray(body.to) ? body.to : [body.to])) if (e) to.push(e); }
    if (!to.length) return badRequest('No recipient email (case has no contact emails, and no "to" provided)');
    const result = await resendSendEmail(env, { to: [...new Set(to)], subject: subject || 'Assistedly Cares update', text: text || '', html: html || '' });
    await audit(env, caseId || null, 'notify.email', { to: [...new Set(to)], ok: result.ok }, user.id);
    return json(result.ok ? { success: true, ...result } : { success: false, ...result }, result.ok ? 200 : 502);
  }

  // ── SMS via Inkbox ──
  if (path === '/api/sms/send' && method === 'POST') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { caseId, phone, message } = body;
    if (!phone || !message) return badRequest('phone and message are required');
    const result = await inkboxSendSms(env, phone, message);
    await audit(env, caseId || null, 'sms.send', { phone, ok: result.ok }, user.id);
    return json(result.ok ? { success: true, ...result } : { success: false, ...result }, result.ok ? 200 : 502);
  }

  // ── SMS preference (store recipient phone on the case) ──
  if (path === '/api/sms/preference' && method === 'PUT') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    const body = await request.json().catch(() => ({}));
    const { caseId, phone } = body;
    if (!caseId) return badRequest('caseId is required');
    const doc = await getCaseDoc(env, caseId);
    if (!doc) return notFound('Care profile not found');
    if (!(await canAccessCase(env, user, caseId))) return notFound('Care profile not found');
    doc.smsPreference = { phone: phone || '', updatedAt: now() };
    await putCaseDoc(env, doc);
    await audit(env, caseId, 'sms.preference.update', { phone: phone || '' }, user.id);
    return json({ success: true, smsPreference: doc.smsPreference });
  }

  return notFound();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: { ...securityHeaders, ...corsHeaders } });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url); }
      catch (err) { return json({ error: 'Internal server error', detail: err.message }, 500); }
    }
    return json({ service: 'care-backend-mvp', docs: 'API only — see /api/health' });
  }
};