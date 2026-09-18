'use client';

export default function NotificationsFeaturePage() {
  return (
    <div>
      <h1>Push Notifications &amp; SMS</h1>
      <p>Real-time alerts for medication reminders, task due dates, care plan updates, and escalations.</p>

      <section>
        <h2>Supported Channels</h2>
        <ul>
          <li>Push — Web Push via service worker (VAPID-based)</li>
          <li>SMS — Twilio integration for critical alerts</li>
          <li>In-App — Toast notifications within the UI</li>
        </ul>
      </section>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>UserDevice — endpoint, p256dh, auth keys</li>
          <li>Notification — type, title, body, sentAt, read</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>POST /api/auth/devices — Register device for push</li>
          <li>POST /api/tasks/:caseId/:taskId/escalate — Trigger escalation alert</li>
        </ul>
      </section>

      <section>
        <h2>Reminder Service</h2>
        <p>Scheduled background jobs check upcoming tasks and medication schedules, sending push or SMS alerts at the appropriate times.</p>
      </section>
    </div>
  );
}
