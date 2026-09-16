// Inkbox — In-app Notification Inbox
// Replaces Twilio SMS with an in-app message center stored in KV.
// Messages are indexed by userId and can be fetched, marked read, deleted.

import { generateId, nowISO } from './utils.js';

/**
 * Deliver a message to a user's inbox.
 */
export async function inboxDeliver(kv, {
  userId,
  type,           // '24h' | 'overdue' | 'escalation' | 'manual' | 'system'
  taskId,
  caseId,
  title,
  body,
  actionUrl = null,
  priority = 'normal',  // 'low' | 'normal' | 'high' | 'urgent'
}) {
  if (!userId) throw new Error('userId required for inbox delivery');

  const msg = {
    id: generateId('msg'),
    userId,
    type,
    taskId,
    caseId,
    title,
    body,
    actionUrl,
    priority,
    read: false,
    dismissed: false,
    createdAt: nowISO(),
  };

  // Primary key
  await kv.put(`inbox:${msg.id}`, JSON.stringify(msg));
  // User index
  await kv.put(`inbox_user:${userId}:${msg.id}`, msg.id);
  // Unread counter index (used for dashboard badges)
  if (!msg.read) {
    await kv.put(`inbox_unread:${userId}:${msg.id}`, msg.id);
  }

  return msg;
}

/**
 * Get messages for a user, newest first. Supports filtering by read status.
 */
export async function inboxGet(kv, userId, { onlyUnread = false, limit = 50, since = null } = {}) {
  const prefix = `inbox_user:${userId}:`;
  const keys = await kv.list({ prefix });

  const messages = [];
  for (const k of keys.keys) {
    const msgId = k.name.split(':').pop();
    const raw = await kv.get(`inbox:${msgId}`);
    if (!raw) continue;
    const msg = JSON.parse(raw);
    if (onlyUnread && msg.read) continue;
    if (since && new Date(msg.createdAt) < new Date(since)) continue;
    messages.push(msg);
  }

  // Sort newest first
  messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return messages.slice(0, limit);
}

/**
 * Count unread messages for a user.
 */
export async function inboxUnreadCount(kv, userId) {
  const prefix = `inbox_unread:${userId}:`;
  const keys = await kv.list({ prefix });
  return keys.keys.length;
}

/**
 * Mark a message as read.
 */
export async function inboxMarkRead(kv, messageId, userId) {
  const raw = await kv.get(`inbox:${messageId}`);
  if (!raw) throw new Error('Message not found');
  const msg = JSON.parse(raw);
  if (msg.userId !== userId) throw new Error('Not authorized');

  msg.read = true;
  msg.readAt = nowISO();
  await kv.put(`inbox:${msg.id}`, JSON.stringify(msg));
  await kv.delete(`inbox_unread:${userId}:${msg.id}`);
  return msg;
}

/**
 * Mark all messages for a user as read.
 */
export async function inboxMarkAllRead(kv, userId) {
  const messages = await inboxGet(kv, userId, { onlyUnread: true });
  for (const msg of messages) {
    msg.read = true;
    msg.readAt = nowISO();
    await kv.put(`inbox:${msg.id}`, JSON.stringify(msg));
    await kv.delete(`inbox_unread:${userId}:${msg.id}`);
  }
  return { count: messages.length };
}

/**
 * Dismiss (soft-delete) a message.
 */
export async function inboxDismiss(kv, messageId, userId) {
  const raw = await kv.get(`inbox:${messageId}`);
  if (!raw) throw new Error('Message not found');
  const msg = JSON.parse(raw);
  if (msg.userId !== userId) throw new Error('Not authorized');

  msg.dismissed = true;
  msg.dismissedAt = nowISO();
  await kv.put(`inbox:${msg.id}`, JSON.stringify(msg));
  await kv.delete(`inbox_unread:${userId}:${msg.id}`);
  // Keep in user index for history, but can be excluded by `dismissed` check
  return msg;
}

/**
 * Hard delete a message (admin/coordinator only).
 */
export async function inboxDelete(kv, messageId) {
  const raw = await kv.get(`inbox:${messageId}`);
  if (!raw) throw new Error('Message not found');
  const msg = JSON.parse(raw);

  await kv.delete(`inbox:${messageId}`);
  await kv.delete(`inbox_user:${msg.userId}:${messageId}`);
  await kv.delete(`inbox_unread:${msg.userId}:${messageId}`);
  return { deleted: true };
}

/**
 * Build inbox message from a task reminder context.
 */
export function buildInboxMessage(task, type) {
  const due = new Date(task.dueDate).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  switch (type) {
    case '24h':
      return {
        title: `⏰ Reminder: "${task.title}"`,
        body: `Due at ${due}. Please confirm when completed.`,
        priority: 'normal',
        actionUrl: `/tasks/${task.id}`,
      };
    case 'overdue':
      return {
        title: `🚨 OVERDUE: "${task.title}"`,
        body: `Was due at ${due}. This task is now overdue — please act immediately.`,
        priority: 'urgent',
        actionUrl: `/tasks/${task.id}`,
      };
    case 'escalation':
      return {
        title: `⚠️ ESCALATED: "${task.title}"`,
        body: `Task escalated. A coordinator has been notified. Due was ${due}.`,
        priority: 'high',
        actionUrl: `/tasks/${task.id}`,
      };
    default:
      return {
        title: `CareCircle Reminder`,
        body: `"${task.title}" — due at ${due}.`,
        priority: 'normal',
        actionUrl: `/tasks/${task.id}`,
      };
  }
}
