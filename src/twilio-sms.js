// Twilio SMS via REST API using native fetch() — no Node SDK required.
// Perfect for Cloudflare Workers.

export async function sendTwilioSms(env, toPhone, message) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    throw new Error('Twilio credentials not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const formData = new URLSearchParams();
  formData.append('To', toPhone);
  formData.append('From', env.TWILIO_FROM_NUMBER);
  formData.append('Body', message);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { success: true, sid: data.sid, status: data.status };
}

export function buildReminderSms(task, type) {
  const due = new Date(task.dueDate).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  switch (type) {
    case '24h':
      return `[CareCircle] Reminder: "${task.title}" is due ${due}. Open the app to confirm.`;
    case 'overdue':
      return `[CareCircle] URGENT: "${task.title}" is now OVERDUE (was due ${due}). Please act now.`;
    case 'escalation':
      return `[CareCircle] ESCALATED: "${task.title}" has been escalated (due ${due}). Coordinator notified.`;
    default:
      return `[CareCircle] Reminder: "${task.title}" due ${due}.`;
  }
}
