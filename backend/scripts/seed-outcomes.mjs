// Seed script for Outcome-Linked Analytics (pseudonymous multi-site demo data).
// Drives the production CareCircle API as the agent service account.
// Env: CC_AGENT_EMAIL, CC_AGENT_PASSWORD (and optional CC_API_URL).
// Re-running creates NEW cases (no dedupe) - demo/dev only.
const API = process.env.CC_API_URL || 'https://care-backend-mvp.forwardjump-com198.workers.dev';
const EMAIL = process.env.CC_AGENT_EMAIL;
const PASSWORD = process.env.CC_AGENT_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Usage: CC_AGENT_EMAIL=<email> CC_AGENT_PASSWORD=<password> node scripts/seed-outcomes.mjs');
  process.exit(1);
}

let token = null;
async function login() {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${(await res.text()).slice(0, 150)}`);
  token = (await res.json()).token;
}
async function cc(method, path, body) {
  const call = async () => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch {}
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
    return data;
  };
  try { return await call(); } catch (err) {
    if (String(err.message).includes('401')) { await login(); return call(); }
    throw err;
  }
}

const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const iso = (offset, hour = 12) => { const d = new Date(Date.now() + offset * 86400000); d.setUTCHours(hour, 0, 0, 0); return d.toISOString(); };

const SITES = [
  'Northgate Transitional Care', 'Cedar Falls Post-Acute', 'Willow Point Rehab',
  'Harborview Bridge Unit', 'Oakridge Continuum', 'Silverline Transition',
  'Maple Crest Post-Acute', 'Lakeside Recovery Center', 'Granite View Transitional',
  'Summit Homeward Unit',
];

const CASES = [
  { site: 0, first: 'Rosa', last: 'Delgado', admit: -6, out: { at: -1, readmission: false }, barriers: [
    { t: 'transport', p: 'HIGH', d: 'Ride not booked for discharge day', o: 'Daughter', due: -2, st: 'RESOLVED', n: 'Daughter confirmed pickup' },
    { t: 'medications', p: 'MEDIUM', d: 'Anticoagulant not reconciled with pharmacy', o: 'Nurse', due: -1, st: 'IN_PROGRESS' } ] },
  { site: 1, first: 'Arthur', last: 'Whitfield', admit: -9, out: { at: -2, readmission: false }, barriers: [
    { t: 'insurance', p: 'HIGH', d: 'Skilled nursing authorization unsigned', o: 'Case manager', due: -3, st: 'RESOLVED', n: 'Authorization faxed and confirmed' },
    { t: 'placement', p: 'MEDIUM', d: 'SNF bed not confirmed', o: 'Discharge planner', due: -1, st: 'ESCALATED' } ] },
  { site: 2, first: 'Evelyn', last: 'Nash', admit: -3, out: null, barriers: [
    { t: 'medications', p: 'HIGH', d: 'Insulin supply not delivered', o: 'Pharmacist', due: -2, st: 'IN_PROGRESS' },
    { t: 'family', p: 'MEDIUM', d: 'Weekend coverage not arranged', o: 'Son', due: 1, st: 'ASSIGNED' } ] },
  { site: 3, first: 'Tom', last: 'Barrows', admit: -12, out: { at: -5, readmission: false }, barriers: [
    { t: 'pending_test', p: 'HIGH', d: 'Follow-up labs not resulted', o: 'Lab', due: -4, st: 'RESOLVED', n: 'Labs resulted normal' },
    { t: 'transport', p: 'LOW', d: 'Paratransit application pending', o: 'Social worker', due: -1, st: 'RESOLVED', n: 'Paratransit approved' } ] },
  { site: 4, first: 'Mae', last: 'Holloway', admit: -4, out: null, barriers: [
    { t: 'placement', p: 'HIGH', d: 'No rehab bed available until next week', o: 'Discharge planner', due: 2, st: 'IDENTIFIED' },
    { t: 'insurance', p: 'MEDIUM', d: 'Pre-cert not submitted', o: 'Case manager', due: 0, st: 'ASSIGNED' } ] },
  { site: 5, first: 'George', last: 'Porter', admit: -8, out: { at: -3, readmission: true }, barriers: [
    { t: 'medications', p: 'HIGH', d: 'Discharge meds not reconciled', o: 'Nurse', due: -4, st: 'RESOLVED', n: 'Reconciled with PCP office' },
    { t: 'family', p: 'MEDIUM', d: 'Caregiver schedule gap', o: 'Daughter', due: -2, st: 'IN_PROGRESS' } ] },
  { site: 6, first: 'Helen', last: 'Okafor', admit: -2, out: null, barriers: [
    { t: 'transport', p: 'MEDIUM', d: 'Medical van unavailable Friday', o: 'Family', due: 3, st: 'IDENTIFIED' } ] },
  { site: 7, first: 'Frank', last: 'Bianchi', admit: -10, out: { at: -7, readmission: false }, barriers: [
    { t: 'insurance', p: 'HIGH', d: 'DME coverage disputed', o: 'Billing', due: -5, st: 'RESOLVED', n: 'Coverage approved after appeal' },
    { t: 'placement', p: 'HIGH', d: 'Home setup delayed - ramp install', o: 'Contractor', due: -3, st: 'RESOLVED', n: 'Ramp installed' },
    { t: 'pending_test', p: 'LOW', d: 'Echo scheduled', o: 'Cardiology', due: 1, st: 'ASSIGNED' } ] },
  { site: 8, first: 'Ida', last: 'Simmons', admit: -5, out: { at: -4, readmission: false }, barriers: [
    { t: 'family', p: 'HIGH', d: 'No one available for evening shifts', o: 'Granddaughter', due: -1, st: 'RESOLVED', n: 'Neighbor covers evenings' } ] },
  { site: 9, first: 'Walter', last: 'Crane', admit: -1, out: null, barriers: [
    { t: 'medications', p: 'HIGH', d: 'Prior auth pending for new inhaler', o: 'Pharmacy', due: 1, st: 'ASSIGNED' },
    { t: 'pending_test', p: 'MEDIUM', d: 'Chest x-ray follow-up', o: 'Radiology', due: 2, st: 'IDENTIFIED' },
    { t: 'transport', p: 'MEDIUM', d: 'First follow-up visit transport', o: 'Daughter', due: 3, st: 'IDENTIFIED' } ] },
  { site: 1, first: 'Nora', last: 'Klein', admit: -7, out: { at: -2, readmission: false }, barriers: [
    { t: 'transport', p: 'MEDIUM', d: 'Family car in shop', o: 'Son', due: -2, st: 'RESOLVED', n: 'Rental arranged' },
    { t: 'family', p: 'LOW', d: 'Meal prep coverage', o: 'Sister', due: -1, st: 'RESOLVED', n: 'Meals organized' } ] },
  { site: 4, first: 'Leon', last: 'Vasquez', admit: -3, out: null, barriers: [
    { t: 'placement', p: 'HIGH', d: 'Waiting on SNF eval', o: 'Case manager', due: 1, st: 'IN_PROGRESS' },
    { t: 'insurance', p: 'HIGH', d: 'Coverage verification incomplete', o: 'Billing', due: 0, st: 'IN_PROGRESS' } ] },
];

async function main() {
  await login();
  let created = 0, resolvedBarriers = 0, outcomeCount = 0;
  for (const c of CASES) {
    const prof = await cc('POST', '/api/care-profiles', {
      firstName: c.first, lastName: c.last,
      siteId: SITES[c.site], admissionDate: day(c.admit),
    });
    const caseId = prof.profile?.id ?? prof.profile?.id ?? null;
    if (!caseId) throw new Error('no case id in create response');
    for (const b of c.barriers) {
      const br = await cc('POST', `/api/barriers/${caseId}`, { description: b.d, type: b.t, priority: b.p, owner: b.o, dueDate: day(b.due) });
      const barrierId = br.barrier?.id;
      if (!barrierId) throw new Error('no barrier id');
      if (b.st === 'RESOLVED') {
        await cc('PATCH', `/api/barriers/${caseId}/${barrierId}`, { status: 'RESOLVED', resolutionNote: b.n });
        resolvedBarriers++;
      } else if (b.st === 'ESCALATED') {
        await cc('PATCH', `/api/barriers/${caseId}/${barrierId}`, { status: 'ESCALATED' });
      } else if (b.st !== 'IDENTIFIED' && b.st !== 'ASSIGNED' && b.st !== 'IN_PROGRESS') {
        throw new Error(`unexpected status ${b.st}`);
      }
    }
    if (c.out) {
      await cc('POST', `/api/cases/${caseId}/outcomes`, { dischargedAt: iso(c.out.at), readmission30d: c.out.readmission });
      outcomeCount++;
    }
    created++;
    console.log(`created case ${caseId} (${c.first} ${c.last}, ${SITES[c.site]})`);
  }
  console.log(`DONE: ${created} cases, ${resolvedBarriers} resolved barriers, ${outcomeCount} outcomes recorded`);
}
main().catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
