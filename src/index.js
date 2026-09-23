const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
}
function notFound(message = 'Not found') { return json({ error: message }, 404); }
function badRequest(message) { return json({ error: message }, 400); }
function now() { return new Date().toISOString(); }



const TASK_STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];
const TASK_TEMPLATES = [
  { id: 'follow-up', title: 'Schedule follow-up appointment', defaultOwner: 'Care coordinator', defaultDueDays: 7 },
  { id: 'med-rec', title: 'Complete medication reconciliation', defaultOwner: 'Nurse', defaultDueDays: 2 },
  { id: 'transport', title: 'Confirm transportation', defaultOwner: 'Family', defaultDueDays: 3 },
  { id: 'home-safety', title: 'Home safety check', defaultOwner: 'Care coordinator', defaultDueDays: 5 }
];
function normalizeTask(input = {}, existing = {}) {
  const t = now();
  const status = input.status ?? existing.status ?? 'todo';
  return {
    id: existing.id || input.id || crypto.randomUUID(),
    templateId: input.templateId ?? existing.templateId ?? '',
    title: input.title ?? existing.title ?? '',
    description: input.description ?? existing.description ?? '',
    owner: input.owner ?? existing.owner ?? '',
    dueDate: input.dueDate ?? existing.dueDate ?? '',
    status: TASK_STATUSES.includes(status) ? status : 'todo',
    escalation: Boolean(input.escalation ?? existing.escalation ?? false),
    escalatedAt: input.escalatedAt ?? existing.escalatedAt ?? null,
    comments: Array.isArray(input.comments) ? input.comments : (existing.comments || []),
    createdAt: existing.createdAt || input.createdAt || t,
    updatedAt: t
  };
}
function normalizeTasks(tasks = []) { return Array.isArray(tasks) ? tasks.map(t => normalizeTask(t)) : []; }

function normalizeMedication(input = {}, existing = {}) {
  const t = now();
  return {
    id: existing.id || input.id || crypto.randomUUID(),
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

function normalizeMedications(meds = []) { return Array.isArray(meds) ? meds.map(m => normalizeMedication(m)) : []; }

function normalizeCareProfile(input = {}, existing = {}) {
  const id = existing.id || crypto.randomUUID();
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
    medications: Array.isArray(input.medications) ? normalizeMedications(input.medications) : normalizeMedications(existing.medications || []),
    dischargeInstructions: {
      summary: input.dischargeInstructions?.summary ?? input.dischargeInstructions ?? existing.dischargeInstructions?.summary ?? '',
      dischargeDate: input.dischargeInstructions?.dischargeDate ?? input.dischargeDate ?? existing.dischargeInstructions?.dischargeDate ?? '',
      followUp: input.dischargeInstructions?.followUp ?? existing.dischargeInstructions?.followUp ?? '',
      redFlags: Array.isArray(input.dischargeInstructions?.redFlags) ? input.dischargeInstructions.redFlags : (existing.dischargeInstructions?.redFlags || []),
      activity: input.dischargeInstructions?.activity ?? existing.dischargeInstructions?.activity ?? '',
      diet: input.dischargeInstructions?.diet ?? existing.dischargeInstructions?.diet ?? ''
    },
    consent: input.consent ?? existing.consent ?? { given: false, scope: '', givenBy: '', givenAt: null },
    tasks: Array.isArray(input.tasks) ? normalizeTasks(input.tasks) : normalizeTasks(existing.tasks || []),
    status: input.status ?? existing.status ?? 'active',
    createdAt: existing.createdAt || now(),
    updatedAt: now()
  };
}

async function audit(env, profileId, action, details = {}) {
  const entry = { id: crypto.randomUUID(), profileId, action, details, ts: now() };
  await env.CARE_KV.put(`audit:${profileId}:${entry.ts}:${entry.id}`, JSON.stringify(entry));
  return entry;
}

async function listProfiles(env) {
  const listed = await env.CARE_KV.list({ prefix: 'profile:' });
  const profiles = [];
  for (const key of listed.keys) {
    const p = await env.CARE_KV.get(key.name, 'json');
    if (p?.id) profiles.push(p);
  }
  return profiles.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === '/api/task-templates' && method === 'GET') return json({ templates: TASK_TEMPLATES, statuses: TASK_STATUSES });

  if (path === '/api/health' && method === 'GET') {
    await env.CARE_KV.put('health:last', now());
    return json({ status: 'ok', kv: true, service: 'care-backend-mvp', feature: 'shared-care-profile' });
  }

  if ((path === '/api/care-profiles' || path === '/api/patients') && method === 'GET') {
    const profiles = await listProfiles(env);
    return json({ profiles, patients: profiles });
  }

  if ((path === '/api/care-profiles' || path === '/api/patients') && method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const profile = normalizeCareProfile(body);
    if (!profile.patient.displayName && !profile.patient.firstName && !profile.patient.lastName) return badRequest('Patient name is required');
    await env.CARE_KV.put(`profile:${profile.id}`, JSON.stringify(profile));
    await audit(env, profile.id, 'careProfile.create', { fields: Object.keys(body) });
    return json({ success: true, profile, patient: profile }, 201);
  }

  const taskMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)\/tasks(?:\/([^/]+))?(?:\/(comments|escalate))?$/);
  if (taskMatch) {
    const [, id, taskId, action] = taskMatch;
    const key = `profile:${id}`;
    const existing = await env.CARE_KV.get(key, 'json');
    if (!existing) return notFound('Care profile not found');
    existing.tasks = normalizeTasks(existing.tasks || []);
    if (!taskId && method === 'GET') return json({ tasks: existing.tasks, templates: TASK_TEMPLATES, statuses: TASK_STATUSES });
    if (!taskId && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      let seed = body;
      if (body.templateId && !body.title) {
        const tpl = TASK_TEMPLATES.find(t => t.id === body.templateId);
        if (tpl) seed = { ...body, title: tpl.title, owner: body.owner || tpl.defaultOwner, dueDate: body.dueDate || new Date(Date.now()+tpl.defaultDueDays*86400000).toISOString().slice(0,10) };
      }
      const task = normalizeTask(seed);
      if (!task.title) return badRequest('Task title is required');
      existing.tasks.push(task); existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'task.create', { taskId: task.id, title: task.title });
      return json({ success: true, task, tasks: existing.tasks }, 201);
    }
    const idx = existing.tasks.findIndex(t => t.id === taskId);
    if (idx < 0) return notFound('Task not found');
    if (!action && method === 'GET') return json({ task: existing.tasks[idx] });
    if (!action && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json().catch(() => ({}));
      existing.tasks[idx] = normalizeTask(body, existing.tasks[idx]); existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'task.update', { taskId, fields: Object.keys(body) });
      return json({ success: true, task: existing.tasks[idx], tasks: existing.tasks });
    }
    if (!action && method === 'DELETE') {
      const [removed] = existing.tasks.splice(idx, 1); existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'task.delete', { taskId, title: removed.title });
      return json({ success: true, task: removed, tasks: existing.tasks });
    }
    if (action === 'comments' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const comment = { id: crypto.randomUUID(), text: body.text || '', author: body.author || 'frontend-tester', createdAt: now() };
      if (!comment.text) return badRequest('Comment text is required');
      existing.tasks[idx].comments = existing.tasks[idx].comments || []; existing.tasks[idx].comments.push(comment); existing.tasks[idx].updatedAt = now(); existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'task.comment', { taskId, commentId: comment.id });
      return json({ success: true, comment, task: existing.tasks[idx], tasks: existing.tasks });
    }
    if (action === 'escalate' && (method === 'POST' || method === 'PATCH')) {
      existing.tasks[idx].escalation = true; existing.tasks[idx].escalatedAt = now(); existing.tasks[idx].updatedAt = now(); existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'task.escalate', { taskId });
      return json({ success: true, task: existing.tasks[idx], tasks: existing.tasks });
    }
  }

  const medMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)\/medications\/([^/]+)(?:\/(verify|notes))?$/);
  if (medMatch) {
    const [, id, medId, action] = medMatch;
    const key = `profile:${id}`;
    const existing = await env.CARE_KV.get(key, 'json');
    if (!existing) return notFound('Care profile not found');
    existing.medications = normalizeMedications(existing.medications || []);
    const idx = existing.medications.findIndex(m => m.id === medId || String(existing.medications.indexOf(m)) === medId);
    if (idx < 0) return notFound('Medication not found');
    if (method === 'GET' && !action) return json({ medication: existing.medications[idx] });
    if ((method === 'PUT' || method === 'PATCH') && !action) {
      const body = await request.json().catch(() => ({}));
      existing.medications[idx] = normalizeMedication(body, existing.medications[idx]);
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medication.update', { medicationId: existing.medications[idx].id, fields: Object.keys(body) });
      return json({ success: true, medication: existing.medications[idx], medications: existing.medications });
    }
    if (method === 'DELETE' && !action) {
      const [removed] = existing.medications.splice(idx, 1);
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medication.delete', { medicationId: removed.id, name: removed.name });
      return json({ success: true, medication: removed, medications: existing.medications });
    }
    if ((method === 'POST' || method === 'PATCH') && action === 'verify') {
      const body = await request.json().catch(() => ({}));
      existing.medications[idx] = normalizeMedication({ ...existing.medications[idx], verified: true, lastVerified: now(), lastVerifiedBy: body.verifiedBy || body.actor || 'mvp-user' }, existing.medications[idx]);
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medication.verify', { medicationId: existing.medications[idx].id });
      return json({ success: true, medication: existing.medications[idx], medications: existing.medications });
    }
    if ((method === 'PATCH' || method === 'PUT') && action === 'notes') {
      const body = await request.json().catch(() => ({}));
      existing.medications[idx] = normalizeMedication({ ...existing.medications[idx], notes: body.notes ?? '' }, existing.medications[idx]);
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medication.notes.update', { medicationId: existing.medications[idx].id });
      return json({ success: true, medication: existing.medications[idx], medications: existing.medications });
    }
  }

  const profileMatch = path.match(/^\/api\/(?:care-profiles|patients)\/([^/]+)(?:\/(emergency-contacts|medications|discharge-instructions|audit))?$/);
  if (profileMatch) {
    const [, id, sub] = profileMatch;
    const key = `profile:${id}`;
    const existing = await env.CARE_KV.get(key, 'json');
    if (!existing) return notFound('Care profile not found');

    if (!sub && method === 'GET') return json({ profile: existing, patient: existing });
    if (!sub && (method === 'PUT' || method === 'PATCH')) {
      const body = await request.json().catch(() => ({}));
      const profile = normalizeCareProfile(body, existing);
      await env.CARE_KV.put(key, JSON.stringify(profile));
      await audit(env, id, 'careProfile.update', { fields: Object.keys(body) });
      return json({ success: true, profile, patient: profile });
    }
    if (sub === 'emergency-contacts' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      existing.emergencyContacts = Array.isArray(body.emergencyContacts) ? body.emergencyContacts : [];
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'emergencyContacts.update', { count: existing.emergencyContacts.length });
      return json({ success: true, emergencyContacts: existing.emergencyContacts });
    }
    if (sub === 'medications' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      existing.medications = Array.isArray(body.medications) ? body.medications : [];
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medications.update', { count: existing.medications.length });
      return json({ success: true, medications: existing.medications });
    }
    if (sub === 'medications' && method === 'GET') {
      return json({ medications: normalizeMedications(existing.medications || []) });
    }
    if (sub === 'medications' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const med = normalizeMedication(body);
      if (!med.name) return badRequest('Medication name is required');
      existing.medications = normalizeMedications(existing.medications || []);
      existing.medications.push(med);
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'medication.create', { medicationId: med.id, name: med.name });
      return json({ success: true, medication: med, medications: existing.medications }, 201);
    }
    if (sub === 'discharge-instructions' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      existing.dischargeInstructions = normalizeCareProfile({ dischargeInstructions: body }, existing).dischargeInstructions;
      existing.updatedAt = now();
      await env.CARE_KV.put(key, JSON.stringify(existing));
      await audit(env, id, 'dischargeInstructions.update');
      return json({ success: true, dischargeInstructions: existing.dischargeInstructions });
    }
    if (sub === 'audit' && method === 'GET') {
      const entries = await env.CARE_KV.list({ prefix: `audit:${id}:` });
      const auditLog = [];
      for (const k of entries.keys) auditLog.push(await env.CARE_KV.get(k.name, 'json'));
      return json({ auditLog: auditLog.filter(Boolean) });
    }
  }

  return notFound();
}

function html() { return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Care Circle | Coordinated Hospital-to-Home Care Plans</title>
  <meta name="description" content="Care Circle helps families, caregivers, and discharge planners coordinate the first 30 days after a hospital stay with shared care plans, medication tracking, and clear next steps." />
  <style>
    :root{--bg:#0b1120;--panel:#111827;--card:#1e293b;--text:#f8fafc;--muted:#94a3b8;--accent:#38bdf8;--accent-2:#34d399;--accent-3:#0ea5e9;--danger:#dc2626;--border:#334155;--radius:14px}
    *{box-sizing:border-box} html{scroll-behavior:smooth}
    body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
    header{padding:20px 24px;background:var(--panel);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:16px;align-items:center;position:sticky;top:0;z-index:3}
    .brand{display:flex;align-items:center;gap:12px}
    .logo{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:grid;place-items:center;font-weight:800;color:#062c26}
    h1{font-size:20px;margin:0;color:var(--text)}
    .tagline{font-size:12px;color:var(--muted);margin-top:2px}
    .pill{font-size:12px;color:var(--accent-2);border:1px solid #166534;border-radius:999px;padding:4px 10px;background:#052e1a}
    .wrap{display:grid;grid-template-columns:330px 1fr;gap:20px;padding:20px;max-width:1440px;margin:0 auto}
    .card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:18px;box-shadow:0 12px 34px #02061755}
    .card h2{font-size:17px;margin:0 0 14px;color:var(--text)}
    .card h3{font-size:12px;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin:20px 0 10px}
    .hero{background:linear-gradient(135deg,#0f3d3e 0%,#111827 100%);border:1px solid #1f5f56}
    .hero p{color:var(--muted);margin:0}
    .hero .stat{display:flex;align-items:baseline;gap:8px;margin:10px 0}
    .hero .stat strong{font-size:28px;color:var(--accent-2)}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    label{display:block;font-size:12px;color:var(--muted);margin:0 0 5px}
    input,textarea,select{width:100%;border:1px solid #475569;border-radius:10px;background:#0f172a;color:var(--text);padding:10px 12px;font:inherit;font-size:14px;outline:none}
    input:focus,textarea:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(56,189,248,.15)}
    textarea{min-height:82px;resize:vertical}
    .btn{border:0;border-radius:10px;background:var(--accent-3);color:#fff;font-weight:700;padding:10px 14px;cursor:pointer;transition:transform .05s,background .15s}
    .btn:hover{background:#0284c7}.btn:active{transform:translateY(1px)}
    .btn.secondary{background:#334155}.btn.secondary:hover{background:#475569}
    .btn.danger{background:var(--danger)}.btn.danger:hover{background:#b91c1c}
    .btn.small{font-size:12px;padding:6px 10px}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .list{display:flex;flex-direction:column;gap:8px}
    .item{padding:12px;border-radius:10px;background:#0f172a;border:1px solid var(--border);cursor:pointer;transition:border-color .15s,background .15s}
    .item:hover,.item.active{border-color:var(--accent);background:#0b1a2e}
    .muted{color:var(--muted);font-size:13px}
    .tiny{font-size:12px;color:#64748b}
    .split{display:flex;justify-content:space-between;gap:10px;align-items:center}
    .table{width:100%;border-collapse:collapse}.table th,.table td{border-bottom:1px solid var(--border);padding:10px;text-align:left;font-size:13px}
    .table th{color:var(--accent);font-weight:600}
    .output{white-space:pre-wrap;background:#020617;border:1px solid var(--border);border-radius:12px;padding:12px;max-height:320px;overflow:auto;font-size:12px}
    .toast{position:fixed;right:18px;bottom:18px;padding:12px 16px;border-radius:10px;background:#064e3b;color:#bbf7d0;display:none;z-index:5;box-shadow:0 8px 24px rgba(0,0,0,.3)}
    .toast.err{background:#7f1d1d;color:#fecaca}
    .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:3px 8px;border-radius:999px;background:#1e293b;border:1px solid var(--border);color:var(--muted)}
    .badge.green{color:#34d399;background:#052e1a;border-color:#166534}
    .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
    .kpi{background:#0f172a;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
    .kpi strong{display:block;font-size:22px;color:var(--accent-2)}
    .kpi span{font-size:11px;color:var(--muted)}
    @media(max-width:900px){.wrap{grid-template-columns:1fr}.grid,.grid3,.kpi-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<header>
  <div class="brand">
    <div class="logo">CC</div>
    <div>
      <h1>Care Circle</h1>
      <div class="tagline">Coordinated hospital-to-home care plans for the first 30 days</div>
    </div>
  </div>
  <div class="row">
    <span class="badge green">HIPAA-aware</span>
    <span id="health" class="pill">checking...</span>
    <button class="btn secondary small" onclick="loadProfiles()">Refresh</button>
  </div>
</header>
<div class="wrap">
  <aside>
    <div class="card hero">
      <h2>Prevent readmissions together</h2>
      <p>1 in 5 older adults returns to the hospital within 30 days. Shared care plans, medication tracking, and clear daily tasks keep everyone aligned.</p>
      <div class="kpi-grid">
        <div class="kpi"><strong>80%</strong><span>of complications are preventable</span></div>
        <div class="kpi"><strong>40%</strong><span>have medication errors early on</span></div>
        <div class="kpi"><strong>75%</strong><span>families want clearer guidance</span></div>
      </div>
    </div>
    <div class="card"><h2>Create Care Profile</h2>
      <label>Display name</label><input id="newName" placeholder="Jane Doe">
      <div class="grid" style="margin-top:10px"><div><label>Date of birth</label><input id="newDob" type="date"></div><div><label>Primary diagnosis</label><input id="newDx" placeholder="CHF follow-up"></div></div>
      <label style="margin-top:10px">Initial discharge summary</label><textarea id="newDischarge" placeholder="Monitor vitals daily, watch for weight gain, follow-up in 7 days..."></textarea>
      <button class="btn" style="margin-top:12px;width:100%" onclick="createProfile()">Create Profile</button>
    </div>
    <div class="card"><h2>Care Profiles</h2><div id="profiles" class="list"><div class="muted">Loading...</div></div></div>
  </aside>

  <main>
    <div id="empty" class="card">
      <div class="split"><h2>Welcome to Care Circle</h2><span class="badge">MVP tester</span></div>
      <p class="muted">Care Circle is a shared care-transition platform built around the people recovering at home. Create a profile on the left to test contacts, medications, tasks, discharge instructions, audit log, and raw API responses.</p>
      <div class="kpi-grid" style="max-width:600px">
        <div class="kpi"><strong>1</strong><span>Create a patient profile</span></div>
        <div class="kpi"><strong>2</strong><span>Add contacts, meds & tasks</span></div>
        <div class="kpi"><strong>3</strong><span>Coordinate the 30-day window</span></div>
      </div>
    </div>
    <div id="editor" style="display:none">
      <div class="card"><div class="split"><h2 id="title">Care Profile</h2><button class="btn secondary small" onclick="loadSelected()">Reload selected</button></div>
        <h3>Patient basic data</h3>
        <div class="grid3">
          <div><label>First name</label><input id="pFirst"></div><div><label>Last name</label><input id="pLast"></div><div><label>Display name</label><input id="pDisplay"></div>
          <div><label>Date of birth</label><input id="pDob" type="date"></div><div><label>Age</label><input id="pAge"></div><div><label>Gender</label><input id="pGender"></div>
          <div><label>Phone</label><input id="pPhone"></div><div><label>Status</label><select id="pStatus"><option>active</option><option>pending</option><option>discharged</option></select></div><div><label>Primary diagnosis</label><input id="pDx"></div>
        </div>
        <label style="margin-top:10px">Address</label><input id="pAddress"><label style="margin-top:10px">Notes</label><textarea id="pNotes"></textarea>
        <button class="btn" style="margin-top:10px" onclick="savePatient()">Save Basic Data</button>
      </div>

      <div class="card"><h2>Emergency Contacts</h2><table class="table"><thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th></th></tr></thead><tbody id="contactsBody"></tbody></table>
        <h3>Add contact</h3><div class="grid3"><input id="cName" placeholder="Name"><input id="cRel" placeholder="Relationship"><input id="cPhone" placeholder="Phone"></div><div class="row" style="margin-top:8px"><input id="cEmail" placeholder="Email"><button class="btn" onclick="addContact()">Add Contact</button></div>
      </div>

      <div class="card"><h2>Medication List <span class="tiny">#3 source, dose, schedule, notes, last verified</span></h2><table class="table"><thead><tr><th>Name</th><th>Dose</th><th>Schedule</th><th>Source</th><th>Notes</th><th>Last verified</th><th></th></tr></thead><tbody id="medsBody"></tbody></table>
        <h3>Add medication</h3><div class="grid3"><input id="mName" placeholder="Medication"><input id="mDose" placeholder="10mg"><input id="mSchedule" placeholder="Daily 8 AM"></div><div class="grid" style="margin-top:8px"><input id="mSource" placeholder="Hospital discharge"><input id="mNotes" placeholder="Notes"></div><button class="btn" style="margin-top:8px" onclick="addMed()">Add Medication</button>
      </div>

      <div class="card"><h2>Task System <span class="tiny">#4 templates, owner, due-date, status, comments, escalation</span></h2>
        <div class="grid3"><select id="tTemplate"><option value="">Custom task</option></select><input id="tTitle" placeholder="Task title"><input id="tOwner" placeholder="Owner"></div>
        <div class="grid3" style="margin-top:8px"><input id="tDue" type="date"><select id="tStatus"><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="blocked">blocked</option><option value="done">done</option><option value="cancelled">cancelled</option></select><input id="tDesc" placeholder="Description"></div>
        <button class="btn" style="margin-top:8px" onclick="addTask()">Add Task</button>
        <table class="table" style="margin-top:12px"><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th><th>Esc</th><th>Comments</th><th></th></tr></thead><tbody id="tasksBody"></tbody></table>
      </div>

      <div class="card"><h2>Discharge Instructions</h2><div class="grid"><div><label>Discharge date</label><input id="dDate" type="date"></div><div><label>Follow-up</label><input id="dFollow"></div></div><label style="margin-top:8px">Summary</label><textarea id="dSummary"></textarea><div class="grid" style="margin-top:8px"><div><label>Activity</label><input id="dActivity"></div><div><label>Diet</label><input id="dDiet"></div></div><label style="margin-top:8px">Red flags, comma separated</label><input id="dRed"><button class="btn" style="margin-top:10px" onclick="saveDischarge()">Save Discharge Instructions</button></div>

      <div class="card"><h2>Audit Log</h2><button class="btn secondary small" onclick="loadAudit()">Load Audit</button><div id="audit" class="output" style="margin-top:10px"></div></div>
      <div class="card"><h2>Raw API Output</h2><div id="raw" class="output"></div></div>
    </div>
  </main>
</div><div id="toast" class="toast"></div>
<script>
const API=''; let profiles=[]; let selected=null;
const $=id=>document.getElementById(id); const val=id=>$(id).value.trim();
function toast(m,err=false){const t=$('toast');t.textContent=m;t.className='toast'+(err?' err':'');t.style.display='block';setTimeout(()=>t.style.display='none',2500)}
async function req(path,opt={}){opt.headers={...(opt.headers||{}),'Content-Type':'application/json'}; const r=await fetch(API+path,opt); const d=await r.json().catch(()=>({})); $('raw').textContent=JSON.stringify(d,null,2); if(!r.ok) throw new Error(d.error||r.status); return d}
async function checkHealth(){try{const d=await req('/api/health');$('health').textContent='KV connected';}catch(e){$('health').textContent='API error';$('health').style.color='#fecaca'}}
async function loadProfiles(){const d=await req('/api/care-profiles'); profiles=d.profiles||[]; $('profiles').innerHTML=profiles.length?profiles.map(p=>'<div class="item '+(selected&&selected.id===p.id?'active':'')+'" onclick="selectProfile(&quot;'+p.id+'&quot;)"><b>'+esc(nameOf(p))+'</b><div class="tiny">'+esc(p.patient.primaryDiagnosis||'No diagnosis')+'</div><div class="tiny">'+p.id+'</div></div>').join(''):'<div class="muted">No profiles yet</div>'}
function nameOf(p){return p.patient.displayName || (p.patient.firstName+' '+p.patient.lastName).trim() || 'Unnamed'}
async function createProfile(){if(!val('newName')) return toast('Name required',true); const d=await req('/api/care-profiles',{method:'POST',body:JSON.stringify({patient:{displayName:val('newName'),dateOfBirth:val('newDob'),primaryDiagnosis:val('newDx')},dischargeInstructions:{summary:val('newDischarge')}})}); selected=d.profile; toast('Profile created'); await loadProfiles(); render();}
async function selectProfile(id){selected=profiles.find(p=>p.id===id); await loadSelected();}
async function loadSelected(){if(!selected)return; const d=await req('/api/care-profiles/'+selected.id); selected=d.profile; await loadProfiles(); render();}
function render(){if(!selected)return; $('empty').style.display='none'; $('editor').style.display='block'; $('title').textContent='Care Profile — '+nameOf(selected); const p=selected.patient; set('pFirst',p.firstName);set('pLast',p.lastName);set('pDisplay',p.displayName);set('pDob',p.dateOfBirth);set('pAge',p.age);set('pGender',p.gender);set('pPhone',p.phone);set('pStatus',selected.status);set('pDx',p.primaryDiagnosis);set('pAddress',p.address);set('pNotes',p.notes); renderContacts(); renderMeds(); const d=selected.dischargeInstructions||{}; set('dDate',d.dischargeDate);set('dFollow',d.followUp);set('dSummary',d.summary);set('dActivity',d.activity);set('dDiet',d.diet);set('dRed',(d.redFlags||[]).join(', ')); renderTasks(); loadTaskTemplates(); $('raw').textContent=JSON.stringify(selected,null,2)}
function set(id,v){$(id).value=v||''} function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function savePatient(){const patient={firstName:val('pFirst'),lastName:val('pLast'),displayName:val('pDisplay'),dateOfBirth:val('pDob'),age:val('pAge'),gender:val('pGender'),phone:val('pPhone'),address:val('pAddress'),primaryDiagnosis:val('pDx'),notes:val('pNotes')}; const d=await req('/api/care-profiles/'+selected.id,{method:'PUT',body:JSON.stringify({patient,status:val('pStatus')})}); selected=d.profile; toast('Basic data saved'); render(); await loadProfiles()}
function renderContacts(){const a=selected.emergencyContacts||[]; $('contactsBody').innerHTML=a.length?a.map((c,i)=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.relationship)+'</td><td>'+esc(c.phone)+'</td><td>'+esc(c.email)+'</td><td><button class="btn danger small" onclick="removeContact('+i+')">Remove</button></td></tr>').join(''):'<tr><td colspan="5" class="muted">No contacts</td></tr>'}
async function addContact(){selected.emergencyContacts=selected.emergencyContacts||[]; selected.emergencyContacts.push({name:val('cName'),relationship:val('cRel'),phone:val('cPhone'),email:val('cEmail')}); await saveContacts()}
async function removeContact(i){selected.emergencyContacts.splice(i,1); await saveContacts()} async function saveContacts(){const d=await req('/api/care-profiles/'+selected.id+'/emergency-contacts',{method:'PUT',body:JSON.stringify({emergencyContacts:selected.emergencyContacts})}); selected.emergencyContacts=d.emergencyContacts; toast('Contacts saved'); renderContacts(); clear(['cName','cRel','cPhone','cEmail'])}
function renderMeds(){const a=selected.medications||[]; $('medsBody').innerHTML=a.length?a.map((m,i)=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.dose||m.dosage)+'</td><td>'+esc(m.schedule)+'</td><td>'+esc(m.source)+'</td><td>'+esc(m.notes)+'</td><td>'+(m.lastVerified?esc(new Date(m.lastVerified).toLocaleString())+'<div class="tiny">'+esc(m.lastVerifiedBy||'')+'</div>':'<span class="tiny">not verified</span>')+'</td><td><div class="row"><button class="btn secondary small" onclick="editMedNotes('+i+')">Notes</button><button class="btn secondary small" onclick="verifyMed('+i+')">Verify</button><button class="btn danger small" onclick="removeMed('+i+')">Remove</button></div></td></tr>').join(''):'<tr><td colspan="7" class="muted">No medications</td></tr>'}
async function addMed(){const d=await req('/api/care-profiles/'+selected.id+'/medications',{method:'POST',body:JSON.stringify({name:val('mName'),dose:val('mDose'),schedule:val('mSchedule'),source:val('mSource'),notes:val('mNotes')})}); selected.medications=d.medications; toast('Medication added'); renderMeds(); clear(['mName','mDose','mSchedule','mSource','mNotes'])}
async function removeMed(i){const m=selected.medications[i]; const d=await req('/api/care-profiles/'+selected.id+'/medications/'+m.id,{method:'DELETE'}); selected.medications=d.medications; toast('Medication removed'); renderMeds()}
async function verifyMed(i){const m=selected.medications[i]; const d=await req('/api/care-profiles/'+selected.id+'/medications/'+m.id+'/verify',{method:'POST',body:JSON.stringify({verifiedBy:'frontend-tester'})}); selected.medications=d.medications; toast('Medication verified'); renderMeds()}
async function editMedNotes(i){const m=selected.medications[i]; const notes=prompt('Medication notes',m.notes||''); if(notes===null)return; const d=await req('/api/care-profiles/'+selected.id+'/medications/'+m.id+'/notes',{method:'PATCH',body:JSON.stringify({notes})}); selected.medications=d.medications; toast('Medication notes updated'); renderMeds()}
async function saveMeds(){const d=await req('/api/care-profiles/'+selected.id+'/medications',{method:'PUT',body:JSON.stringify({medications:selected.medications})}); selected.medications=d.medications; toast('Medications saved'); renderMeds(); clear(['mName','mDose','mSchedule','mSource','mNotes'])}
async function saveDischarge(){const body={summary:val('dSummary'),dischargeDate:val('dDate'),followUp:val('dFollow'),activity:val('dActivity'),diet:val('dDiet'),redFlags:val('dRed').split(',').map(s=>s.trim()).filter(Boolean)}; const d=await req('/api/care-profiles/'+selected.id+'/discharge-instructions',{method:'PUT',body:JSON.stringify(body)}); selected.dischargeInstructions=d.dischargeInstructions; toast('Discharge saved')}

async function loadTaskTemplates(){try{const d=await req('/api/task-templates'); const sel=$('tTemplate'); if(!sel||sel.dataset.loaded)return; sel.innerHTML='<option value="">Custom task</option>'+(d.templates||[]).map(t=>'<option value="'+esc(t.id)+'">'+esc(t.title)+'</option>').join(''); sel.dataset.loaded='1'; sel.onchange=()=>{const tpl=(d.templates||[]).find(t=>t.id===sel.value); if(tpl){set('tTitle',tpl.title);set('tOwner',tpl.defaultOwner||''); const due=new Date(Date.now()+(tpl.defaultDueDays||1)*86400000).toISOString().slice(0,10); set('tDue',due)}}}catch(e){}}
function renderTasks(){const a=selected.tasks||[]; const el=$('tasksBody'); if(!el)return; el.innerHTML=a.length?a.map((t,i)=>'<tr><td>'+esc(t.title)+'<div class="tiny">'+esc(t.description||'')+'</div></td><td>'+esc(t.owner)+'</td><td>'+esc(t.dueDate)+'</td><td><select onchange="updateTaskStatus('+i+',this.value)">'+['todo','in_progress','blocked','done','cancelled'].map(s=>'<option value="'+s+'" '+(t.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td>'+(t.escalation?'⚠️':'')+'</td><td>'+((t.comments||[]).length)+'</td><td><div class="row"><button class="btn secondary small" onclick="commentTask('+i+')">Comment</button><button class="btn secondary small" onclick="escalateTask('+i+')">Escalate</button><button class="btn danger small" onclick="removeTask('+i+')">Remove</button></div></td></tr>').join(''):'<tr><td colspan="7" class="muted">No tasks</td></tr>'}
async function addTask(){const body={templateId:val('tTemplate'),title:val('tTitle'),owner:val('tOwner'),dueDate:val('tDue'),status:val('tStatus'),description:val('tDesc')}; const d=await req('/api/care-profiles/'+selected.id+'/tasks',{method:'POST',body:JSON.stringify(body)}); selected.tasks=d.tasks; toast('Task added'); renderTasks(); clear(['tTitle','tOwner','tDue','tDesc'])}
async function updateTaskStatus(i,status){const t=selected.tasks[i]; const d=await req('/api/care-profiles/'+selected.id+'/tasks/'+t.id,{method:'PATCH',body:JSON.stringify({status})}); selected.tasks=d.tasks; toast('Task status updated'); renderTasks()}
async function commentTask(i){const text=prompt('Comment text'); if(!text)return; const t=selected.tasks[i]; const d=await req('/api/care-profiles/'+selected.id+'/tasks/'+t.id+'/comments',{method:'POST',body:JSON.stringify({text,author:'frontend-tester'})}); selected.tasks=d.tasks; toast('Comment added'); renderTasks()}
async function escalateTask(i){const t=selected.tasks[i]; const d=await req('/api/care-profiles/'+selected.id+'/tasks/'+t.id+'/escalate',{method:'POST'}); selected.tasks=d.tasks; toast('Task escalated'); renderTasks()}
async function removeTask(i){const t=selected.tasks[i]; const d=await req('/api/care-profiles/'+selected.id+'/tasks/'+t.id,{method:'DELETE'}); selected.tasks=d.tasks; toast('Task removed'); renderTasks()}

async function loadAudit(){if(!selected)return; const d=await req('/api/care-profiles/'+selected.id+'/audit'); $('audit').textContent=JSON.stringify(d.auditLog,null,2)}
function clear(ids){ids.forEach(id=>set(id,''))}
checkHealth().then(loadProfiles);
</script></body></html>`; }

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await handleApi(request, env, url); }
      catch (err) { return json({ error: 'Internal server error', detail: err.message }, 500); }
    }
    return new Response(html(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
