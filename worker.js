export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // List all keys
    if (url.pathname === '/api/keys' && request.method === 'GET') {
      const allKeys = await env.KV.list();
      return new Response(JSON.stringify(allKeys), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Create or update a key
    if (url.pathname === '/api/keys' && request.method === 'POST') {
      const { key, value } = await request.json();
      await env.KV.put(key, value);
      return new Response(JSON.stringify({ success: true, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get a single key's value
    if (url.pathname.startsWith('/api/keys/') && request.method === 'GET') {
      const key = decodeURIComponent(url.pathname.replace('/api/keys/', ''));
      const value = await env.KV.get(key);
      return new Response(JSON.stringify({ key, value }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Delete a key
    if (url.pathname.startsWith('/api/keys/') && request.method === 'DELETE') {
      const key = decodeURIComponent(url.pathname.replace('/api/keys/', ''));
      await env.KV.delete(key);
      return new Response(JSON.stringify({ success: true, key }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Serve the frontend UI
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Care Backend MVP — KV Dev Environment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: 0.9rem; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    .card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #f1f5f9; }
    .row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
    input, button { padding: 0.6rem 0.9rem; border-radius: 8px; border: 1px solid #475569; font-size: 0.9rem; }
    input { background: #0f172a; color: #e2e8f0; flex: 1; }
    input::placeholder { color: #64748b; }
    button { background: #0ea5e9; color: white; border: none; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    button:hover { background: #0284c7; }
    button.danger { background: #ef4444; }
    button.danger:hover { background: #dc2626; }
    button.secondary { background: #334155; }
    button.secondary:hover { background: #475569; }
    .key-list { list-style: none; }
    .key-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.9rem; background: #0f172a; border-radius: 8px; margin-bottom: 0.4rem; }
    .key-item .key { font-weight: 600; color: #38bdf8; }
    .key-item .value { color: #94a3b8; font-size: 0.85rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions { display: flex; gap: 0.3rem; }
    .actions button { padding: 0.4rem 0.7rem; font-size: 0.8rem; }
    .empty { color: #64748b; text-align: center; padding: 1rem; }
    .status { padding: 0.5rem 0.9rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; display: none; }
    .status.success { background: #064e3b; color: #34d399; display: block; }
    .status.error { background: #450a0a; color: #fca5a5; display: block; }
    .badge { display: inline-block; background: #1e3a5f; color: #38bdf8; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; margin-left: 0.5rem; }
  </style>
</head>
<body>
  <h1>Care Backend MVP <span class="badge">KV Dev Environment</span></h1>
  <p class="subtitle">Connected to Workers KV namespace: cloud-native development environment</p>

  <div id="status" class="status"></div>

  <div class="card">
    <h2>Add / Update Key</h2>
    <div class="row">
      <input id="keyInput" placeholder="Key" />
      <input id="valueInput" placeholder="Value" />
      <button onclick="saveKey()">Save</button>
    </div>
  </div>

  <div class="card">
    <h2>Stored Keys <button class="secondary" style="float:right;" onclick="loadKeys()">Refresh</button></h2>
    <ul id="keyList" class="key-list">
      <li class="empty">Loading...</li>
    </ul>
  </div>

  <script>
    async function loadKeys() {
      try {
        const res = await fetch('/api/keys');
        const data = await res.json();
        const list = document.getElementById('keyList');
        if (!data.keys || data.keys.length === 0) {
          list.innerHTML = '<li class="empty">No keys yet. Add one above!</li>';
          return;
        }
        const items = await Promise.all(data.keys.map(async (k) => {
          const valRes = await fetch('/api/keys/' + encodeURIComponent(k.name));
          const valData = await valRes.json();
          return '<li class="key-item"><span class="key">' + k.name + '</span><span class="value">' + (valData.value || '(empty)') + '</span><div class="actions"><button class="danger" onclick="deleteKey(\\'' + k.name + '\\')">Delete</button></div></li>';
        }));
        list.innerHTML = items.join('');
      } catch (e) {
        showStatus('Failed to load keys: ' + e.message, 'error');
      }
    }

    async function saveKey() {
      const key = document.getElementById('keyInput').value.trim();
      const value = document.getElementById('valueInput').value.trim();
      if (!key) { showStatus('Please enter a key', 'error'); return; }
      try {
        await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        });
        document.getElementById('keyInput').value = '';
        document.getElementById('valueInput').value = '';
        showStatus('Saved key: ' + key, 'success');
        loadKeys();
      } catch (e) {
        showStatus('Failed to save: ' + e.message, 'error');
      }
    }

    async function deleteKey(key) {
      try {
        await fetch('/api/keys/' + encodeURIComponent(key), { method: 'DELETE' });
        showStatus('Deleted key: ' + key, 'success');
        loadKeys();
      } catch (e) {
        showStatus('Failed to delete: ' + e.message, 'error');
      }
    }

    function showStatus(msg, type) {
      const s = document.getElementById('status');
      s.textContent = msg;
      s.className = 'status ' + type;
      setTimeout(() => { s.className = 'status'; }, 3000);
    }

    loadKeys();
  </script>
</body>
</html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
};
