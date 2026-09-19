'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

interface Task {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  dueDate?: string;
  status: string;
  escalation?: boolean;
  escalatedAt?: string | null;
  comments: { id: string; text: string; author: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  patient: { displayName?: string };
}

const STATUSES = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'];

export default function TasksFeaturePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({ title: '', owner: '', dueDate: '', status: 'todo', description: '' });
  const [commentText, setCommentText] = useState('');
  const [commentingTask, setCommentingTask] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/care-profiles`).then(r => r.json()).then(d => setProfiles(d.patients || []));
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;
    loadTasks();
  }, [selectedProfile]);

  async function loadTasks() {
    if (!selectedProfile) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/tasks`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile || !newTask.title) return;
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTasks();
      setNewTask({ title: '', owner: '', dueDate: '', status: 'todo', description: '' });
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function updateStatus(taskId: string, status: string) {
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTasks();
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function escalateTask(taskId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/tasks/${taskId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTasks();
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function addComment(taskId: string) {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentText, author: 'frontend-user' }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCommentText('');
      setCommentingTask(null);
      await loadTasks();
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div className="container">
          <h1>Tasks &amp; Reminders</h1>
          <p>Structured task management with templates, owners, due dates, escalation rules, and comments.</p>
        </div>
      </div>
      <div className="container space-y-4">
        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Create Task</h2>
          <label>Profile</label>
          <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}>
            <option value="">— Choose —</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.patient?.displayName || p.id}</option>
            ))}
          </select>
          {selectedProfile && (
            <form onSubmit={createTask} className="mt-3 space-y-3">
              <div className="grid-2">
                <div><label>Title</label><input value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required /></div>
                <div><label>Owner</label><input value={newTask.owner} onChange={e => setNewTask({...newTask, owner: e.target.value})} /></div>
              </div>
              <div className="grid-2">
                <div><label>Due Date</label><input type="date" value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} /></div>
                <div>
                  <label>Status</label>
                  <select value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label>Description</label><textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} rows={3} /></div>
              <button type="submit" className="btn btn-primary">Add Task</button>
            </form>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="siteSurfaceSectionTitle m-0">Task List</h2>
            <button className="btn btn-sm btn-secondary" onClick={loadTasks} disabled={!selectedProfile}>Refresh</button>
          </div>
          {loading && <p>Loading...</p>}
          {error && <p className="text-[var(--color-danger)]">Error: {error}</p>}
          {!loading && tasks.length === 0 && <p>{selectedProfile ? 'No tasks for this profile.' : 'Select a profile to view tasks.'}</p>}
          {tasks.map(task => (
            <article key={task.id} className="border-b border-[var(--color-border)] py-4 last:border-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold">{task.title}</h3>
                  {task.description && <p className="text-sm text-[var(--color-text-light)]">{task.description}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--color-text-light)]">Owner: {task.owner || '—'}</span>
                    <span className="text-xs text-[var(--color-text-light)]">Due: {task.dueDate || '—'}</span>
                    {task.escalation && <span className="badge badge-danger">⚠️ Escalated</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select className="w-auto text-sm" value={task.status} onChange={e => updateStatus(task.id, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-sm btn-accent" onClick={() => escalateTask(task.id)}>Escalate</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setCommentingTask(commentingTask === task.id ? null : task.id)}>
                    Comment ({task.comments?.length || 0})
                  </button>
                </div>
              </div>

              {commentingTask === task.id && (
                <div className="mt-3 pl-4 border-l-2 border-[var(--color-border)]">
                  <div><label>New Comment</label>
                    <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={2} />
                  </div>
                  <button className="btn btn-sm btn-primary mt-2" onClick={() => addComment(task.id)}>Submit Comment</button>
                  {task.comments?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {task.comments.map(c => (
                        <div key={c.id} className="text-sm">
                          <span className="font-semibold">{c.author}</span>
                          <span className="text-[var(--color-text-light)]"> @ {new Date(c.createdAt).toLocaleString()}</span>
                          <p className="text-[var(--color-text-light)]">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
