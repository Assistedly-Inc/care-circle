import { generateId, nowISO } from './utils.js';

/**
 * Append an immutable audit log entry to a case or global log.
 */
export async function auditLog(kv, {
  caseId = null,
  userId,
  action,          // 'CREATE_CASE' | 'UPDATE_TASK' | 'SEND_REMINDER' | 'CONSENT_CHANGE' | etc
  entityType,      // 'case' | 'task' | 'message' | 'user' | 'system'
  entityId,
  oldValue = null,
  newValue = null,
  metadata = {},
}) {
  const entry = {
    id: `audit:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    caseId,
    userId,
    action,
    entityType,
    entityId,
    oldValue,
    newValue,
    metadata,
    timestamp: nowISO(),
    immutable: true,
  };

  await kv.put(entry.id, JSON.stringify(entry));

  if (caseId) {
    await kv.put(`audit_case:${caseId}:${entry.id}`, entry.id);
  }
  await kv.put(`audit_user:${userId}:${entry.id}`, entry.id);

  return entry;
}

/**
 * Get audit trail for a specific case, newest first.
 */
export async function getCaseAudit(kv, caseId, { limit = 100 } = {}) {
  const prefix = `audit_case:${caseId}:`;
  const keys = await kv.list({ prefix });

  const entries = [];
  for (const k of keys.keys) {
    const raw = await kv.get(k.name.replace('audit_case:', 'audit:'));
    if (raw) entries.push(JSON.parse(raw));
  }

  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return entries.slice(0, limit);
}

/**
 * Get audit trail for a user, newest first.
 */
export async function getUserAudit(kv, userId, { limit = 100 } = {}) {
  const prefix = `audit_user:${userId}:`;
  const keys = await kv.list({ prefix });

  const entries = [];
  for (const k of keys.keys) {
    const raw = await kv.get(k.name.replace('audit_user:', 'audit:'));
    if (raw) entries.push(JSON.parse(raw));
  }

  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return entries.slice(0, limit);
}

/**
 * Get all recent audit entries (admin/coordinator view).
 */
export async function getAllAudit(kv, { limit = 200, since = null } = {}) {
  const keys = await kv.list({ prefix: 'audit:' });

  const entries = [];
  for (const k of keys.keys) {
    const raw = await kv.get(k.name);
    if (!raw) continue;
    const entry = JSON.parse(raw);
    if (since && new Date(entry.timestamp) < new Date(since)) continue;
    entries.push(entry);
  }

  entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return entries.slice(0, limit);
}
