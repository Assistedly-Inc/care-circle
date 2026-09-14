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
  <title>Care Circle MVP Tester</title>
  <style>
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#0f172a;color:#e2e8f0} header{padding:18px 24px;background:#111827;border-bottom:1px solid #334155;display:flex;justify-content:space-between;gap:16px;align-items:center;position:sticky;top:0;z-index:2} h1{font-size:20px;margin:0;color:#38bdf8} .pill{font-size:12px;color:#34d399;border:1px solid #166534;border-radius:999px;padding:4px 9px;background:#052e1a}.wrap{display:grid;grid-template-columns:330px 1fr;gap:18px;padding:18px;max-width:1400px;margin:0 auto}.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:16px;margin-bottom:16px;box-shadow:0 10px 30px #02061733}.card h2{font-size:16px;margin:0 0 12px;color:#f8fafc}.card h3{font-size:13px;color:#7dd3fc;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}label{display:block;font-size:12px;color:#94a3b8;margin:0 0 4px}input,textarea,select{width:100%;border:1px solid #475569;border-radius:10px;background:#0f172a;color:#e2e8f0;padding:9px 10px;font:inherit;font-size:14px}textarea{min-height:82px;resize:vertical}.btn{border:0;border-radius:10px;background:#0ea5e9;color:white;font-weight:700;padding:9px 12px;cursor:pointer}.btn:hover{background:#0284c7}.btn.secondary{background:#334155}.btn.danger{background:#dc2626}.btn.small{font-size:12px;padding:6px 9px}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.list{display:flex;flex-direction:column;gap:8px}.item{padding:10px;border-radius:10px;background:#0f172a;border:1px solid #334155;cursor:pointer}.item:hover,.item.active{border-color:#38bdf8}.muted{color:#94a3b8;font-size:13px}.tiny{font-size:12px;color:#64748b}.split{display:flex;justify-content:space-between;gap:10px}.table{width:100%;border-collapse:collapse}.table th,.table td{border-bottom:1px solid #334155;padding:8px;text-align:left;font-size:13px}.output{white-space:pre-wrap;background:#020617;border:1px solid #334155;border-radius:12px;padding:12px;max-height:320px;overflow:auto;font-size:12px}.toast{position:fixed;right:18px;bottom:18px;padding:12px 14px;border-radius:10px;background:#064e3b;color:#bbf7d0;display:none;z-index:5}.toast.err{background:#7f1d1d;color:#fecaca}@media(max-width:900px){.wrap{grid-template-columns:1fr}.grid,.grid3{grid-template-columns:1fr}}
  </style>
</head>
<body>
<header><div><h1>Care Circle MVP Frontend Tester</h1><div class="tiny">Tests Feature #2 shared care profile on Cloudflare KV Worker</div></div><div class="row"><span id="health" class="pill">checking...</span><button class="btn secondary small" onclick="loadProfiles()">Refresh</button></div></header>
<div class="wrap">
  <aside>
    <div class="card"><h2>Create Care Profile</h2>
      <label>Display name</label><input id="newName" placeholder="Jane Doe">
      <div class="grid" style="margin-top:8px"><div><label>DOB</label><input id="newDob" type="date"></div><div><label>Diagnosis</label><input id="newDx" placeholder="CHF follow-up"></div></div>
      <label style="margin-top:8px">Initial discharge summary</label><textarea id="newDischarge" placeholder="Monitor vitals daily..."></textarea>
      <button class="btn" style="margin-top:10px;width:100%" onclick="createProfile()">Create Profile</button>
    </div>
    <div class="card"><h2>Profiles</h2><div id="profiles" class="list"><div class="muted">Loading...</div></div></div>
  </aside>

  <main>
    <div id="empty" class="card"><h2>Select or create a profile</h2><p class="muted">Use the left panel to create a patient profile, then test contacts, meds, discharge instructions, audit log, and raw API output here.</p></div>
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

      <div class="card"><h2>Medication List</h2><table class="table"><thead><tr><th>Name</th><th>Dose</th><th>Schedule</th><th>Source</th><th>Notes</th><th></th></tr></thead><tbody id="medsBody"></tbody></table>
        <h3>Add medication</h3><div class="grid3"><input id="mName" placeholder="Medication"><input id="mDose" placeholder="10mg"><input id="mSchedule" placeholder="Daily 8 AM"></div><div class="grid" style="margin-top:8px"><input id="mSource" placeholder="Hospital discharge"><input id="mNotes" placeholder="Notes"></div><button class="btn" style="margin-top:8px" onclick="addMed()">Add Medication</button>
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
function render(){if(!selected)return; $('empty').style.display='none'; $('editor').style.display='block'; $('title').textContent='Care Profile — '+nameOf(selected); const p=selected.patient; set('pFirst',p.firstName);set('pLast',p.lastName);set('pDisplay',p.displayName);set('pDob',p.dateOfBirth);set('pAge',p.age);set('pGender',p.gender);set('pPhone',p.phone);set('pStatus',selected.status);set('pDx',p.primaryDiagnosis);set('pAddress',p.address);set('pNotes',p.notes); renderContacts(); renderMeds(); const d=selected.dischargeInstructions||{}; set('dDate',d.dischargeDate);set('dFollow',d.followUp);set('dSummary',d.summary);set('dActivity',d.activity);set('dDiet',d.diet);set('dRed',(d.redFlags||[]).join(', ')); $('raw').textContent=JSON.stringify(selected,null,2)}
function set(id,v){$(id).value=v||''} function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function savePatient(){const patient={firstName:val('pFirst'),lastName:val('pLast'),displayName:val('pDisplay'),dateOfBirth:val('pDob'),age:val('pAge'),gender:val('pGender'),phone:val('pPhone'),address:val('pAddress'),primaryDiagnosis:val('pDx'),notes:val('pNotes')}; const d=await req('/api/care-profiles/'+selected.id,{method:'PUT',body:JSON.stringify({patient,status:val('pStatus')})}); selected=d.profile; toast('Basic data saved'); render(); await loadProfiles()}
function renderContacts(){const a=selected.emergencyContacts||[]; $('contactsBody').innerHTML=a.length?a.map((c,i)=>'<tr><td>'+esc(c.name)+'</td><td>'+esc(c.relationship)+'</td><td>'+esc(c.phone)+'</td><td>'+esc(c.email)+'</td><td><button class="btn danger small" onclick="removeContact('+i+')">Remove</button></td></tr>').join(''):'<tr><td colspan="5" class="muted">No contacts</td></tr>'}
async function addContact(){selected.emergencyContacts=selected.emergencyContacts||[]; selected.emergencyContacts.push({name:val('cName'),relationship:val('cRel'),phone:val('cPhone'),email:val('cEmail')}); await saveContacts()}
async function removeContact(i){selected.emergencyContacts.splice(i,1); await saveContacts()} async function saveContacts(){const d=await req('/api/care-profiles/'+selected.id+'/emergency-contacts',{method:'PUT',body:JSON.stringify({emergencyContacts:selected.emergencyContacts})}); selected.emergencyContacts=d.emergencyContacts; toast('Contacts saved'); renderContacts(); clear(['cName','cRel','cPhone','cEmail'])}
function renderMeds(){const a=selected.medications||[]; $('medsBody').innerHTML=a.length?a.map((m,i)=>'<tr><td>'+esc(m.name)+'</td><td>'+esc(m.dose||m.dosage)+'</td><td>'+esc(m.schedule)+'</td><td>'+esc(m.source)+'</td><td>'+esc(m.notes)+'</td><td><button class="btn danger small" onclick="removeMed('+i+')">Remove</button></td></tr>').join(''):'<tr><td colspan="6" class="muted">No medications</td></tr>'}
async function addMed(){selected.medications=selected.medications||[]; selected.medications.push({name:val('mName'),dose:val('mDose'),schedule:val('mSchedule'),source:val('mSource'),notes:val('mNotes')}); await saveMeds()} async function removeMed(i){selected.medications.splice(i,1); await saveMeds()} async function saveMeds(){const d=await req('/api/care-profiles/'+selected.id+'/medications',{method:'PUT',body:JSON.stringify({medications:selected.medications})}); selected.medications=d.medications; toast('Medications saved'); renderMeds(); clear(['mName','mDose','mSchedule','mSource','mNotes'])}
async function saveDischarge(){const body={summary:val('dSummary'),dischargeDate:val('dDate'),followUp:val('dFollow'),activity:val('dActivity'),diet:val('dDiet'),redFlags:val('dRed').split(',').map(s=>s.trim()).filter(Boolean)}; const d=await req('/api/care-profiles/'+selected.id+'/discharge-instructions',{method:'PUT',body:JSON.stringify(body)}); selected.dischargeInstructions=d.dischargeInstructions; toast('Discharge saved')}
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
