import { getTask, listPendingTasks, updateTask, escalateTask } from './tasks.js';
import { sendWebPush } from './push.js';
import { sendTwilioSms, buildReminderSms } from './twilio-sms.js';
import { nowISO, hoursUntilDue } from './utils.js';

export async function checkAndSendReminders(kv, env) {
  const tasks = await listPendingTasks(kv);
  const results = [];

  for (const task of tasks) {
    const hours = hoursUntilDue(task.dueDate);

    // 24h reminder
    if (hours <= 24 && hours > 0 && !task.reminderSent24h) {
      const r = await sendReminder(kv, env, task, '24h');
      task.reminderSent24h = true;
      task.updatedAt = nowISO();
      await updateTask(kv, task.id, { reminderSent24h: true });
      results.push(r);
      continue;
    }

    // Overdue reminder (0-24h past due)
    if (hours < 0 && hours >= -24 && !task.reminderSentOverdue) {
      const r = await sendReminder(kv, env, task, 'overdue');
      await updateTask(kv, task.id, { reminderSentOverdue: true });
      results.push(r);

      // If still not done after overdue notice, escalate
      if (task.assigneeNotifications?.coordinatorId) {
        await escalateTask(kv, task.id, 'Task overdue — auto-escalated');
      }
      continue;
    }

    // Escalation reminder (after escalation flag set)
    if (task.escalated && !task.reminderSentEscalation) {
      const r = await sendReminder(kv, env, task, 'escalation');
      await updateTask(kv, task.id, { reminderSentEscalation: true });
      results.push(r);
    }
  }

  return results;
}

async function sendReminder(kv, env, task, type) {
  const result = { taskId: task.id, type, push: null, sms: null };

  try {
    // Push notification
    if (task.assigneeNotifications?.pushSubscription && env.VAPID_PUBLIC_KEY) {
      const payload = {
        title: `CareCircle Reminder: ${type}`,
        body: buildReminderSms(task, type),
        taskId: task.id,
        caseId: task.caseId,
        type,
      };
      result.push = await sendWebPush(kv, env, task.assigneeNotifications.pushSubscription, payload);
    }
  } catch (err) {
    result.push = { error: err.message };
  }

  try {
    // SMS
    if (task.assigneePhone && env.TWILIO_ACCOUNT_SID) {
      const msg = buildReminderSms(task, type);
      result.sms = await sendTwilioSms(env, task.assigneePhone, msg);
    }
  } catch (err) {
    result.sms = { error: err.message };
  }

  // Audit log entry
  await logReminder(kv, task.caseId, task.id, type, result);
  return result;
}

async function logReminder(kv, caseId, taskId, type, result) {
  const entry = {
    id: `log:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    caseId,
    taskId,
    event: `reminder_${type}`,
    payload: result,
    timestamp: nowISO(),
    immutable: true,
  };
  await kv.put(entry.id, JSON.stringify(entry));
}

export async function runManualReminder(kv, env, taskId, type) {
  const task = await getTask(kv, taskId);
  if (!task) throw new Error('Task not found');
  return sendReminder(kv, env, task, type);
}
