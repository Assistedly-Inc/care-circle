'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DemoProfile, generateId, getDemoProfiles } from '@/lib/demoData';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function TasksDemoPage() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [commentingTask, setCommentingTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const [newTask, setNewTask] = useState<{
    title: string;
    owner: string;
    dueDate: string;
    status: DemoProfile['tasks'][number]['status'];
    description: string;
  }>({
    title: '', owner: '', dueDate: '', status: 'todo', description: '',
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setProfiles(getDemoProfiles());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const profile = useMemo(() => profiles.find(p => p.id === selectedProfile), [profiles, selectedProfile]);

  const counts = useMemo(() => {
    return profiles.reduce((acc, p) => {
      acc.total += p.tasks.length;
      acc.done += p.tasks.filter(t => t.status === 'done').length;
      acc.open += p.tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
      acc.escalated += p.tasks.filter(t => t.escalated).length;
      return acc;
    }, { total: 0, done: 0, open: 0, escalated: 0 });
  }, [profiles]);

  function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newTask.title.trim()) return;
    const task = {
      id: generateId(),
      title: newTask.title,
      owner: newTask.owner,
      dueDate: newTask.dueDate || undefined,
      status: newTask.status as DemoProfile['tasks'][number]['status'],
      description: newTask.description,
      escalated: false,
      comments: [],
    };
    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return { ...p, tasks: [...p.tasks, task], updatedAt: new Date().toISOString() };
    }));
    setNewTask({ title: '', owner: '', dueDate: '', status: 'todo', description: '' });
  }

  function updateStatus(taskId: string, status: string) {
    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: status as DemoProfile['tasks'][number]['status'] } : t),
      };
    }));
  }

  function escalate(taskId: string) {
    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, escalated: !t.escalated } : t),
      };
    }));
  }

  function addComment(taskId: string) {
    if (!commentText.trim()) return;
    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, { user: 'You', text: commentText, time: new Date().toISOString() }] } : t),
      };
    }));
    setCommentText('');
    setCommentingTask(null);
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Tasks</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Everyone knows what needs to be done — and who owns it
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Assign tasks with clear owners, deadlines, and descriptions. Family members, caregivers, and professionals stay in sync without endless phone calls.
          </p>
        </div>
      </div>

      <div className="container mt-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Open', value: counts.open, color: 'text-[var(--color-accent)]' },
            { label: 'Done', value: counts.done, color: 'text-[#065f46]' },
            { label: 'Total', value: counts.total, color: 'text-[var(--color-primary)]' },
            { label: 'Escalated', value: counts.escalated, color: 'text-[var(--color-danger)]' },
          ].map(s => (
            <div key={s.label} className="card text-center !p-5">
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="field max-w-sm">
              <option value="">— Choose a patient —</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.patient.displayName}</option>)}
            </select>
          )}
        </div>

        {selectedProfile && profile && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2">
              <div className="card !p-5 bg-[#faf8f5]">
                <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2">{profile.patient.displayName}</h3>
                <p className="text-sm text-[var(--color-text-light)] mb-3">{profile.patient.primaryDiagnosis}</p>
                <div className="space-y-1.5 text-xs text-[var(--color-muted)]">
                  <p>Contacts: {profile.emergencyContacts.length}</p>
                  <p>Medications: {profile.medications.length}</p>
                  <p>Reminders: {profile.notifications.length}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                  <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    ← Back to Care Plans
                  </Link>
                </div>
              </div>
            </div>

            {/* Tasks */}
            <div className="lg:col-span-3 space-y-5">
              {/* Create */}
              <form onSubmit={createTask} className="card !p-5">
                <h4 className="text-sm font-extrabold text-[var(--color-text)] mb-3">Add Task</h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input required type="text" placeholder="Task title" value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} className="field" />
                  <input type="text" placeholder="Owner (e.g. Daughter)" value={newTask.owner} onChange={e => setNewTask(t => ({ ...t, owner: e.target.value }))} className="field" />
                  <input type="date" value={newTask.dueDate} onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))} className="field" />
                  <select value={newTask.status} onChange={e => setNewTask(t => ({ ...t, status: e.target.value as DemoProfile['tasks'][number]['status'] }))} className="field">
                    {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="text" placeholder="Description" value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} className="field sm:col-span-2" />
                </div>
                <button type="submit" className="btn btn-primary text-sm mt-3">Add Task</button>
              </form>

              {/* List */}
              {profile.tasks.length === 0 ? (
                <div className="card !p-8 text-center text-[var(--color-text-light)]">
                  <p className="font-semibold mb-1">No tasks yet</p>
                  <p className="text-sm">Add the first task for this care plan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.tasks.slice().sort((a,b) => +new Date(b.dueDate||0) - +new Date(a.dueDate||0)).map(task => (
                    <article key={task.id} className="card !p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <h4 className="text-sm font-extrabold text-[var(--color-text)]">{task.title}</h4>
                            {task.escalated && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase bg-[#fef2f2] text-[#991b1b] px-1.5 py-0.5 rounded-full">
                                ⚠ Escalated
                              </span>
                            )}
                          </div>
                          {task.description && <p className="text-xs text-[var(--color-text-light)] leading-relaxed">{task.description}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {task.owner && <span className="text-xs text-[var(--color-muted)]">👤 {task.owner}</span>}
                            {task.dueDate && <span className="text-xs text-[var(--color-muted)]">📅 {task.dueDate}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <select value={task.status} onChange={e => updateStatus(task.id, e.target.value)} className="field text-xs py-1.5 h-auto w-auto min-w-[100px]">
                            {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <button onClick={() => escalate(task.id)} className={`text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] transition-colors ${task.escalated ? 'text-[var(--color-muted)] hover:text-[var(--color-danger)]' : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'}`}>
                            {task.escalated ? 'De-escalate' : 'Escalate'}
                          </button>
                          <button onClick={() => setCommentingTask(commentingTask === task.id ? null : task.id)} className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] px-2 py-1.5">
                            💬 {task.comments.length}
                          </button>
                        </div>
                      </div>

                      {/* Comments */}
                      {commentingTask === task.id && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                          {task.comments.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {task.comments.map((c, i) => (
                                <div key={i} className="text-xs">
                                  <span className="font-semibold">{c.user}</span>
                                  <span className="text-[var(--color-muted)]"> — {new Date(c.time).toLocaleDateString()}</span>
                                  <p className="text-[var(--color-text-light)]">{c.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add a comment..."
                              value={commentText}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addComment(task.id); }}
                              className="field flex-1 text-xs"
                            />
                            <button onClick={() => addComment(task.id)} className="btn btn-primary text-xs !py-1.5 !px-3">Add</button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
