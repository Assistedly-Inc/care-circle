import { generateId, nowISO } from './utils.js';

export async function createCase(kv, caree, coordinator, consent = false) {
  const c = {
    id: generateId('case'),
    caree,
    coordinator,
    consent, // GDPR-style consent
    status: 'active',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await kv.put(`case:${c.id}`, JSON.stringify(c));
  await kv.put(`case_index:${caree.id}`, c.id);
  return c;
}

export async function getCase(kv, caseId) {
  const raw = await kv.get(`case:${caseId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function listCases(kv) {
  const keys = await kv.list({ prefix: 'case:' });
  const cases = [];
  for (const k of keys.keys) {
    const raw = await kv.get(k.name);
    if (raw) cases.push(JSON.parse(raw));
  }
  return cases;
}

export async function updateCase(kv, caseId, patch) {
  const c = await getCase(kv, caseId);
  if (!c) throw new Error('Case not found');
  Object.assign(c, patch, { updatedAt: nowISO() });
  await kv.put(`case:${c.id}`, JSON.stringify(c));
  return c;
}
