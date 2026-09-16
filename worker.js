import { jsonResponse, errorResponse, corsHeadersBase, generateId } from './src/utils.js';
import { createCase, getCase, listCases, updateCase } from './src/cases.js';
import { createTask, getTask, listTasksByCase, listPendingTasks, updateTask } from './src/tasks.js';
import { checkAndSendReminders, runManualReminder } from './src/reminders.js';
import { sendEmailNotification } from './src/email.js';

// ---------------------------------------------------------------------------
// Global CORS helper
// ---------------------------------------------------------------------------
function cors(r) {
  const h = new Headers(r.headers);
  for (const [k, v] of Object.entries(corsHeadersBase)) h.set(k, v);
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
}

// ---------------------------------------------------------------------------
// Service Worker Push Event Listener (for receiving push in browser)
// NOTE: This lives at /sw.js served as text/javascript for browsers that
// need a traditional ServiceWorker.  The Worker itself does not act as a
// ServiceWorker — it sends pushes via Web Push API.
// ---------------------------------------------------------------------------
const serviceWorkerCode = `
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'CareCircle', body: 'You have a reminder' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'CareCircle', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: data.taskId || 'carecircle',
      requireInteraction: true,
      actions: data.type === 'escalation'
        ? [{ action: 'open', title: 'Open Case' }]
        : [{ action: 'confirm', title: 'Confirm' }, { action: 'snooze', title: 'Snooze 1h' }],
      data,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data;
  if (event.action === 'confirm') {
    event.waitUntil(fetch('/api/tasks/' + data.taskId + '/confirm', { method: 'POST' }));
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});
`;

// ---------------------------------------------------------------------------
// MAIN EXPORTED HANDLERS
// ---------------------------------------------------------------------------
export default {
  // --- HTTP handler ---
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeadersBase });
    }

    try {
      // -------------------------------------------------- Legacy KV Routes ---
      if (url.pathname === '/api/keys' && request.method === 'GET') {
        const allKeys = await env.KV.list();
        return cors(jsonResponse(allKeys));
      }
      if (url.pathname === '/api/keys' && request.method === 'POST') {
        const { key, value } = await request.json();
        await env.KV.put(key, value);
        return cors(jsonResponse({ success: true, key }));
      }
      if (url.pathname.startsWith('/api/keys/') && request.method === 'GET') {
        const key = decodeURIComponent(url.pathname.replace('/api/keys/', ''));
        const value = await env.KV.get(key);
        return cors(jsonResponse({ key, value }));
      }
      if (url.pathname.startsWith('/api/keys/') && request.method === 'DELETE') {
        const key = decodeURIComponent(url.pathname.replace('/api/keys/', ''));
        await env.KV.delete(key);
        return cors(jsonResponse({ success: true, key }));
      }

      // -------------------------------------------------- Service Worker ---
      if (url.pathname === '/sw.js' && request.method === 'GET') {
        return new Response(serviceWorkerCode, {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }

      // -------------------------------------------------- Health ---
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return cors(jsonResponse({ ok: true, env: 'care-backend-mvp', version: '1.0.0' }));
      }

      // -------------------------------------------------- VAPID Public Key ---
      if (url.pathname === '/api/vapid-public-key' && request.method === 'GET') {
        return cors(jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY || null }));
      }

      // -------------------------------------------------- Cases ---
      if (url.pathname === '/api/cases' && request.method === 'POST') {
        const { caree, coordinator, consent } = await request.json();
        const c = await createCase(env.KV, caree, coordinator, consent);
        return cors(jsonResponse({ success: true, case: c }, 201));
      }
      if (url.pathname === '/api/cases' && request.method === 'GET') {
        const cases = await listCases(env.KV);
        return cors(jsonResponse({ success: true, cases }));
      }
      if (url.pathname.startsWith('/api/cases/') && request.method === 'GET') {
        const caseId = url.pathname.replace('/api/cases/', '');
        const c = await getCase(env.KV, caseId);
        if (!c) return cors(errorResponse('Not found', 404));
        return cors(jsonResponse({ success: true, case: c }));
      }
      if (url.pathname.startsWith('/api/cases/') && request.method === 'PATCH') {
        const caseId = url.pathname.replace('/api/cases/', '');
        const patch = await request.json();
        const c = await updateCase(env.KV, caseId, patch);
        return cors(jsonResponse({ success: true, case: c }));
      }

      // -------------------------------------------------- Tasks ---
      if (url.pathname === '/api/tasks' && request.method === 'POST') {
        const body = await request.json();
        const t = await createTask(env.KV, body);
        return cors(jsonResponse({ success: true, task: t }, 201));
      }
      if (url.pathname === '/api/tasks' && request.method === 'GET') {
        const caseId = url.searchParams.get('caseId');
        const tasks = caseId
          ? await listTasksByCase(env.KV, caseId)
          : await listPendingTasks(env.KV);
        return cors(jsonResponse({ success: true, tasks }));
      }
      if (url.pathname.startsWith('/api/tasks/') && request.method === 'GET') {
        const taskId = url.pathname.replace('/api/tasks/', '');
        const t = await getTask(env.KV, taskId);
        if (!t) return cors(errorResponse('Not found', 404));
        return cors(jsonResponse({ success: true, task: t }));
      }
      if (url.pathname.startsWith('/api/tasks/') && request.method === 'PATCH') {
        const taskId = url.pathname.replace('/api/tasks/', '');
        const patch = await request.json();
        const t = await updateTask(env.KV, taskId, patch);
        return cors(jsonResponse({ success: true, task: t }));
      }

      // -------------------------------------------------- Confirm Task ---
      if (url.pathname.match(/^\/api\/tasks\/[^/]+\/confirm$/) && request.method === 'POST') {
        const taskId = url.pathname.split('/')[3];
        const t = await updateTask(env.KV, taskId, {
          status: 'done',
          reminderSent24h: true,
          reminderSentOverdue: true,
          reminderSentEscalation: true,
        });
        return cors(jsonResponse({ success: true, task: t }));
      }

      // -------------------------------------------------- Push Subscription ---
      if (url.pathname === '/api/push-subscribe' && request.method === 'POST') {
        const { taskId, subscription } = await request.json();
        const t = await getTask(env.KV, taskId);
        if (!t) return cors(errorResponse('Task not found', 404));
        const notifications = { ...t.assigneeNotifications, pushSubscription: subscription };
        await updateTask(env.KV, taskId, { assigneeNotifications: notifications });
        return cors(jsonResponse({ success: true, message: 'Subscribed to push' }));
      }

      // -------------------------------------------------- Manual Reminder ---
      if (url.pathname.match(/^\/api\/tasks\/[^/]+\/remind$/) && request.method === 'POST') {
        const taskId = url.pathname.split('/')[3];
        const body = await request.json().catch(() => ({}));
        const type = body.type || 'manual';
        const result = await runManualReminder(env.KV, env, taskId, type);
        return cors(jsonResponse({ success: true, result }));
      }

      // -------------------------------------------------- Email ---
      if (url.pathname === '/api/email' && request.method === 'POST') {
        const { to, subject, text, html } = await request.json();
        const r = await sendEmailNotification(env, to, subject, text, html);
        return cors(jsonResponse({ success: r.success, ...r }));
      }

      // -------------------------------------------------- Overdue & Escalation Report ---
      if (url.pathname === '/api/overdue' && request.method === 'GET') {
        const all = await listPendingTasks(env.KV);
        const overdue = all.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'done');
        return cors(jsonResponse({ success: true, count: overdue.length, overdue }));
      }

      // -------------------------------------------------- Scheduled / Cron Trigger (also HTTP for testing) ---
      if (url.pathname === '/api/run-reminders' && request.method === 'POST') {
        const results = await checkAndSendReminders(env.KV, env);
        return cors(jsonResponse({ success: true, processed: results.length, results }));
      }

      // -------------------------------------------------- Admin Dashboard HTML ---
      return new Response(dashboardHTML(), {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch (err) {
      console.error('Request error:', err);
      return cors(errorResponse(err.message, 500));
    }
  },

  // --- Scheduled / Cron trigger ---
  async scheduled(event, env, ctx) {
    console.log(`Cron triggered: ${event.cron || 'unscheduled'}`);
    await checkAndSendReminders(env.KV, env);
  },
};

// ---------------------------------------------------------------------------
// Dashboard HTML (embedded admin UI)
// ---------------------------------------------------------------------------
function dashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CareCircle MVP — Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
  .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: 0.9rem; }
  .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
  .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #f1f5f9; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
  .row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
  input, button, textarea, select { padding: 0.6rem 0.9rem; border-radius: 8px; border: 1px solid #475569; font-size: 0.9rem; }
  input, textarea, select { background: #0f172a; color: #e2e8f0; flex: 1; }
  textarea { min-height: 60px; }
  input::placeholder, textarea::placeholder { color: #64748b; }
  button { background: #0ea5e9; color: white; border: none; cursor: pointer; font-weight: 600; transition: background 0.2s; }
  button:hover { background: #0284c7; }
  button.danger { background: #ef4444; }
  button.danger:hover { background: #dc2626; }
  button.secondary { background: #334155; }
  button.secondary:hover { background: #475569; }
  .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 20px; font-size: 0.75rem; margin-left: 0.3rem; }
  .badge.active { background: #065f46; color: #34d399; }
  .badge.pending { background: #78350f; color: #fbbf24; }
  .badge.overdue { background: #7f1d1d; color: #fca5a5; }
  .badge.escalated { background: #4c1d95; color: #c4b5fd; }
  .key-list { list-style: none; }
  .key-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.9rem; background: #0f172a; border-radius: 8px; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.5rem; }
  .key-item .info { flex: 1; min-width: 0; }
  .key-item .key { font-weight: 600; color: #38bdf8; }
  .key-item .meta { color: #94a3b8; font-size: 0.8rem; margin-top: 0.2rem; }
  .actions { display: flex; gap: 0.3rem; }
  .actions button { padding: 0.4rem 0.7rem; font-size: 0.8rem; }
  .empty { color: #64748b; text-align: center; padding: 1rem; }
  .status { padding: 0.5rem 0.9rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; display: none; }
  .status.success { background: #064e3b; color: #34d399; display: block; }
  .status.error { background: #450a0a; color: #fca5a5; display: block; }
  .section-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; }
</style>
</head>
<body>
  <h1>CareCircle MVP <span class="badge active">Dashboard</span></h1>
  <p class="subtitle">Push + SMS Reminders  •  Escalation  •  Admin Panel</p>

  <div id="status" class="status"></div>

  <div class="card">
    <h2>Quick Actions</h2>
    <div class="row">
      <button onclick="runReminders()">Run Reminders Now</button>
      <button class="secondary" onclick="loadTasks()">Reload Tasks</button>
      <button class="secondary" onclick="loadCases()">Reload Cases</button>
    </div>
    <div class="row">
      <button class="danger" onclick="loadOverdue()">Show Overdue</button>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Create Case</h2>
      <input id="careeName" placeholder="Caree Name" />
      <input id="coordinatorName" placeholder="Coordinator Name" />
      <div class="row"><label style="font-size:0.85rem;color:#94a3b8;"><input type="checkbox" id="consentCheck" /> GDPR Consent given</label></div>
      <button onclick="createCase()">Create Case</button>
    </div>

    <div class="card">
      <h2>Create Task</h2>
      <select id="taskCaseId"><option value="">Select case...</option></select>
      <input id="taskTitle" placeholder="Task title" />
      <textarea id="taskDesc" placeholder="Description (optional)"></textarea>
      <input id="taskDue" type="datetime-local" />
      <input id="taskPhone" type="tel" placeholder="Assignee phone (for SMS)" />
      <button onclick="createTask()">Create Task</button>
    </div>

    <div class="card">
      <h2>Push Subscribe</h2>
      <select id="subTaskId"><option value="">Select task...</option></select>
      <button onclick="subscribePush()" id="subBtn">Enable Push</button>
      <p class="empty" id="subStatus" style="display:none;margin-top:0.5rem;">Subscribed!</p>
    </div>
  </div>

  <div class="card">
    <h2>Active Cases <span class="badge active">live</span></h2>
    <ul id="caseList" class="key-list"><li class="empty">No cases</li></ul>
  </div>

  <div class="card">
    <h2>Pending & Upcoming Tasks</h2>
    <ul id="taskList" class="key-list"><li class="empty">No tasks</li></ul>
  </div>

  <div class="card" id="overdueCard" style="display:none;">
    <h2>Overdue Tasks <span class="badge overdue">urgent</span></h2>
    <ul id="overdueList" class="key-list"><li class="empty">None overdue</li></ul>
  </div>

  <div class="card">
    <h2>VAPID Public Key</h2>
    <code id="vapidKey" style="color:#34d399;font-size:0.8rem;word-break:break-all;">Loading...</code>
  </div>

  <script>
    const API = '/api';

    function showStatus(msg, type) {
      const s = document.getElementById('status');
      s.textContent = msg;
      s.className = 'status ' + type;
      setTimeout(() => s.className = 'status', 4000);
    }

    async function api(method, path, body) {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(API + path, opts);
      if (!r.ok) throw new Error((await r.json()).error || r.statusText);
      return r.json();
    }

    async function createCase() {
      const caree = { name: document.getElementById('careeName').value.trim() };
      const coordinator = { name: document.getElementById('coordinatorName').value.trim() };
      const consent = document.getElementById('consentCheck').checked;
      if (!caree.name) return showStatus('Caree name required', 'error');
      await api('POST', '/cases', { caree, coordinator, consent });
      showStatus('Case created', 'success');
      loadCases(); resetCaseFields();
    }

    function resetCaseFields() {
      document.getElementById('careeName').value = '';
      document.getElementById('coordinatorName').value = '';
      document.getElementById('consentCheck').checked = false;
    }

    async function loadCases() {
      const data = await api('GET', '/cases');
      const list = document.getElementById('caseList');
      const sel = document.getElementById('taskCaseId');
      if (!data.cases?.length) { list.innerHTML = '<li class="empty">No cases</li>'; sel.innerHTML = '<option value="">Select case...</option>'; return; }
      list.innerHTML = data.cases.map(c => '<li class="key-item"><div class="info"><span class="key">' + c.id.slice(0,12) + '…</span><div class="meta">Caree: ' + (c.caree?.name || '—') + ' | Coordinator: ' + (c.coordinator?.name || '—') + ' | Consent: ' + (c.consent ? '✅' : '❌') + '</div></div><span class="badge ' + c.status + '">' + c.status + '</span></li>').join('');
      sel.innerHTML = '<option value="">Select case...</option>' + data.cases.map(c => '<option value="' + c.id + '">' + (c.caree?.name || c.id) + '</option>').join('');
    }

    async function createTask() {
      const caseId = document.getElementById('taskCaseId').value;
      const title = document.getElementById('taskTitle').value.trim();
      const description = document.getElementById('taskDesc').value.trim();
      const dueDate = document.getElementById('taskDue').value;
      const assigneePhone = document.getElementById('taskPhone').value.trim();
      if (!caseId) return showStatus('Select a case', 'error');
      if (!title) return showStatus('Title required', 'error');
      if (!dueDate) return showStatus('Due date required', 'error');
      await api('POST', '/tasks', { caseId, title, description, dueDate: new Date(dueDate).toISOString(), assigneePhone, priority: 'normal' });
      showStatus('Task created', 'success');
      loadTasks();
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDesc').value = '';
      document.getElementById('taskDue').value = '';
      document.getElementById('taskPhone').value = '';
    }

    async function loadTasks() {
      const data = await api('GET', '/tasks');
      const list = document.getElementById('taskList');
      const sel = document.getElementById('subTaskId');
      if (!data.tasks?.length) { list.innerHTML = '<li class="empty">No tasks</li>'; sel.innerHTML = '<option value="">Select task...</option>'; return; }
      list.innerHTML = data.tasks.map(t => {
        const due = new Date(t.dueDate).toLocaleString();
        const statusBadge = t.status === 'done' ? 'active' : (t.escalated ? 'escalated' : (new Date(t.dueDate) < new Date() ? 'overdue' : 'pending'));
        const actions = '<button class="secondary" onclick="remindTask(\'' + t.id + '\')">Remind</button> <button onclick="confirmTask(\'' + t.id + '\')">Done</button>';
        return '<li class="key-item"><div class="info"><span class="key">' + t.title + '</span><div class="meta">Due: ' + due + ' | Priority: ' + t.priority + '</div></div><div class="actions">' + actions + '</div><span class="badge ' + statusBadge + '">' + t.status + (t.escalated ? '·esc' : '') + '</span></li>';
      }).join('');
      sel.innerHTML = '<option value="">Select task...</option>' + data.tasks.map(t => '<option value="' + t.id + '">' + t.title + '</option>').join('');
    }

    async function confirmTask(id) {
      await api('POST', '/tasks/' + id + '/confirm');
      showStatus('Task confirmed done', 'success');
      loadTasks();
    }

    async function remindTask(id) {
      await api('POST', '/tasks/' + id + '/remind', { type: 'manual' });
      showStatus('Reminder sent', 'success');
    }

    async function loadOverdue() {
      const data = await api('GET', '/overdue');
      document.getElementById('overdueCard').style.display = data.count > 0 ? 'block' : 'none';
      const list = document.getElementById('overdueList');
      if (!data.count) { list.innerHTML = '<li class="empty">None overdue</li>'; return; }
      list.innerHTML = data.overdue.map(t => '<li class="key-item"><div class="info"><span class="key">' + t.title + '</span><div class="meta">Due: ' + new Date(t.dueDate).toLocaleString() + '</div></div><div class="actions"><button class="danger" onclick="remindTask(\'' + t.id + '\')">Re-Remind</button></div></li>').join('');
    }

    async function runReminders() {
      const data = await api('POST', '/run-reminders');
      showStatus('Processed ' + data.processed + ' reminders', 'success');
      loadTasks();
    }

    // Push subscription integration
    async function subscribePush() {
      const taskId = document.getElementById('subTaskId').value;
      if (!taskId) return showStatus('Select a task first', 'error');
      if (!('serviceWorker' in navigator)) return showStatus('Push not supported', 'error');

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyData = await api('GET', '/vapid-public-key');
      if (!keyData.publicKey) return showStatus('Push not configured on backend', 'error');

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(keyData.publicKey)
      });

      await api('POST', '/push-subscribe', { taskId, subscription: JSON.parse(JSON.stringify(subscription)) });
      document.getElementById('subStatus').style.display = 'block';
      document.getElementById('subBtn').textContent = 'Push Enabled';
      showStatus('Push subscription saved', 'success');
    }

    function urlB64ToUint8Array(base64String) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      return Uint8Array.from(rawData.split('').map(c => c.charCodeAt(0)));
    }

    // Load VAPID key on startup
    api('GET', '/vapid-public-key').then(d => { document.getElementById('vapidKey').textContent = d.publicKey || 'Not configured'; });

    loadCases();
    loadTasks();
  </script>
</body>
</html>`;
}
