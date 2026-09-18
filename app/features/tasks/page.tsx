'use client';

import { useEffect, useState } from 'react';
import type { Task } from '@/types';

export default function TasksFeaturePage() {
  const [profiles, setProfiles] = useState<{ id: string; patient: { displayName?: string } }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch('/api/care-profiles')
      .then((r) => r.json())
      .then((data) => setProfiles(data.patients || []));
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;
    setLoading(true);
    fetch(`/api/care-profiles/${selectedProfile}/tasks`)
      .then((r) => r.json())
      .then((data) => { setTasks(data.tasks || []); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [selectedProfile]);

  useEffect(() => {
    fetch('/api/task-templates')
      .then((r) => r.json())
      .then((data) => setTemplates(data.templates || []));
  }, []);

  return (
    <div>
      <h1>Tasks &amp; Reminders</h1>
      <p>Structured task management with templates, owners, due dates, escalation rules, and comments.</p>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>title / description — task body</li>
          <li>owner — assigned user</li>
          <li>dueDate — scheduled date</li>
          <li>status — todo, in_progress, blocked, done, cancelled</li>
          <li>escalationLevel — escalation counter</li>
          <li>comments — threaded discussion</li>
        </ul>
      </section>

      <section>
        <h2>Task Templates</h2>
        <ul>
          {templates.map((t) => (
            <li key={t.id}>{t.title} <span>({t.id})</span></li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Live Tasks</h2>
        <label>
          Select Profile:
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">— Choose —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.patient?.displayName || p.id}</option>
            ))}
          </select>
        </label>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && tasks.length === 0 && selectedProfile && <p>No tasks for this profile.</p>}
        {tasks.map((t) => (
          <article key={t.id}>
            <h3>{t.title}</h3>
            <span>{t.status}</span>
            <span>{t.escalationLevel ? `⚠️ Escalated (${t.escalationLevel})` : ''}</span>
            <p>Due: {t.dueDate}</p>
            <p>Owner: {t.owner?.name || t.ownerId || 'Unassigned'}</p>
            <p>Comments: {t.comments?.length ?? 0}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
