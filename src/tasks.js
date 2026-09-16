import { generateId, nowISO, hoursUntilDue } from './utils.js';

export async function createTask(kv, { caseId, title, description, dueDate, assigneeId, assigneePhone, assigneeNotifications = {}, priority = 'normal' }) {
  const t = {
    id: generateId('task'),
    caseId,
    title,
    description,
    dueDate,
    assigneeId,
    assigneePhone,
    assigneeNotifications,
    priority,
    status: 'pending', // pending -> in-progress -> done -> confirmed
    escalated: false,
    reminderSent24h: false,
    reminderSentOverdue: false,
    reminderSentEscalation: false,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await kv.put(`task:${t.id}`, JSON.stringify(t));
  // Index by case
  await kv.put(`task_case:${caseId}:${t.id}`, t.id);
  // Index for scheduling
  await kv.put(`task_due:${dueDate}:${t.id}`, t.id);
  return t;
}

export async function getTask(kv, taskId) {
  const raw = await kv.get(`task:${taskId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function listTasksByCase(kv, caseId) {
  const keys = await kv.list({ prefix: `task_case:${caseId}:` });
  const tasks = [];
  for (const k of keys.keys) {
    const raw = await kv.get(`task:${k.name.split(':').pop()}`);
    if (raw) tasks.push(JSON.parse(raw));
  }
  return tasks;
}

export async function listPendingTasks(kv) {
  const keys = await kv.list({ prefix: 'task_due:' });
  const tasks = [];
  for (const k of keys.keys) {
    const taskId = k.name.split(':').pop();
    const t = await getTask(kv, taskId);
    if (t && t.status !== 'done') tasks.push(t);
  }
  return tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export async function updateTask(kv, taskId, patch) {
  const t = await getTask(kv, taskId);
  if (!t) throw new Error('Task not found');
  Object.assign(t, patch, { updatedAt: nowISO() });
  await kv.put(`task:${t.id}`, JSON.stringify(t));
  return t;
}

export async function escalateTask(kv, taskId, reason) {
  const t = await getTask(kv, taskId);
  if (!t) throw new Error('Task not found');
  t.escalated = true;
  t.escalationReason = reason;
  t.escalatedAt = nowISO();
  t.status = 'escalated';
  t.updatedAt = nowISO();
  await kv.put(`task:${t.id}`, JSON.stringify(t));
  return t;
}
