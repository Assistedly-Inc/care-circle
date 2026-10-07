// Care Circle — Cloudflare Worker (D1-backed)
// Consolidates the KV "CareProfile" blob into D1. A "case" row holds the full
// CareProfile document in `data` (JSON), preserving the exact shape the frontend
// expects. users/case_members/case_invitations/audit_log are relational.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}
const notFound = (m = 'Not found') => json({ error: m }, 404);
const badRequest = (m) => json({ error: m }, 400);
const unauthorized = (m = 'Unauthorized') => json({ error: m }, 401);
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

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

// ── SMS via Inkbox (replaces Twilio) ────────────────────────────────────────
// POST https://inkbox.ai/api/v1/phone/numbers/{phoneId}/texts
//   Header: X-API-Key: {INKBOX_API_KEY}
//   Body:   { to, body }
async function inkboxSendSms(env, to, message) {
  const apiKey = env.INKBOX_API_KEY;
  const phoneId = env.INKBOX_PHONE_NUMBER_ID;
  if (!apiKey || !phoneId) return { ok: false, reason: 'Inkbox credentials not set (INKBOX_API_KEY / INKBOX_PHONE_NUMBER_ID)' };
  if (!to) return { ok: false, reason: 'No recipient phone number' };
  try {
    const res = await fetch(`https://inkbox.ai/api/v1/phone/numbers/${phoneId}/texts`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: message }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, detail: data, to };
  } catch (err) {
    return { ok: false, error: err.message, to };
  }
}

// ── Email via Resend (reminders) ────────────────────────────────────────────
async function resendSendEmail(env, { to, subject, text, html }) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM || 'Care Circle <onboarding@resend.dev>';
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

// ── password hashing (PBKDF2) ───────────────────────────────────────────────
async function hashPassword(password, secret) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${b64url(salt)}.${b64url(bits)}`;
}
async function verifyPassword(password, stored) {
  try {
    const [saltB64, hashB64] = stored.split('.');
    const salt = b64urlToBytes(saltB64);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
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
  await exec(env, 'UPDATE cases SET data = ?, patient_name = ?, status = ?, consent_given = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(doc), doc.patient.displayName || doc.patient.firstName || doc.patient.lastName || 'Unnamed', doc.status || 'active', doc.consent?.given ? 1 : 0, now(), doc.id]);
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
  return qFirst(env, 'SELECT * FROM users WHERE id = ?', [payload.sub]);
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
    const role = body.role || 'caregiver';
    if (!email || !password) return badRequest('Email and password are required');
    const existing = await qFirst(env, 'SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return json({ error: 'Email already registered' }, 409);
    const id = uid();
    const ph = await hashPassword(password, env.SESSION_SECRET || 'dev-secret');
    const t = now();
    await exec(env, 'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      [id, email, ph, name, role, t, t]);
    const token = await signJwt({ sub: id, email, role }, env.SESSION_SECRET || 'dev-secret');
    return json({ token, user: { id, email, name, role } }, 201);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const email = (body.email || '').toLowerCase().trim();
    const password = body.password || '';
    const user = await qFirst(env, 'SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return unauthorized('Invalid email or password');
    }
    const token = await signJwt({ sub: user.id, email: user.email, role: user.role }, env.SESSION_SECRET || 'dev-secret');
    return json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }

  if (path === '/api/auth/me' && method === 'GET') {
    const user = await getAuthedUser(env, request);
    if (!user) return unauthorized();
    return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
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
      const comment = { id: uid(), text: body.text || '', author: body.author || 'frontend-tester', createdAt: now() };
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
    return json({
      casesConsidered: discharged.length,
      sameDayDischargeRate: discharged.length ? sameDay / discharged.length : null,
      slaBreachRate: withDue.length ? withDue.filter(barrierBreached).length / withDue.length : null,
      openBarrierCount: all.filter(b => b.status !== 'RESOLVED').length,
      medianTimeToResolutionHoursByType: ttrByType
    });
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
      const comment = { id: uid(), text: body.text || '', author: body.author || 'mvp-user', createdAt: now() };
      if (!comment.text) return badRequest('Comment text is required');
      doc.barriers[idx].comments = doc.barriers[idx].comments || [];
      doc.barriers[idx].comments.push(comment);
      await putCaseDoc(env, doc);
      await audit(env, caseId, 'barrier.comment', { barrierId: doc.barriers[idx].id, commentId: comment.id }, bUser.id);
      return json({ success: true, comment, barrier: doc.barriers[idx], barriers: doc.barriers });
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
    const result = await resendSendEmail(env, { to: [...new Set(to)], subject: subject || 'Care Circle update', text: text || '', html: html || '' });
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
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url); }
      catch (err) { return json({ error: 'Internal server error', detail: err.message }, 500); }
    }
    return json({ service: 'care-backend-mvp', docs: 'API only — see /api/health' });
  }
};