'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cases as casesApi, tasksApi } from '@/lib/api';
import { getDemoProfiles } from '@/lib/demoData';
import type { CareCase, Task } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
  PENDING: 'Pending',
};

interface TaskView {
  id: string;
  title: string;
  owner: string;
  dueDate?: string;
  status: string;
  description: string;
  escalated: boolean;
  comments: { user: string; text: string; time: string }[];
}

interface CaseView {
  id: string;
  patient: { displayName: string; primaryDiagnosis: string };
  emergencyContacts: { name: string }[];
  medications: unknown[];
  notifications: unknown[];
  tasks: TaskView[];
  updatedAt: string;
}

function toTaskView(t: Task): TaskView {
  return {
    id: t.id,
    title: t.title,
    owner: t.owner?.name || '',
    dueDate: t.dueDate || undefined,
    status: t.status,
    description: t.description || '',
    escalated: t.escalationLevel > 0,
    comments: (t.comments || []).map(c => ({ user: c.authorId, text: c.content, time: c.createdAt })),
  };
}

function toCaseView(c: CareCase): CaseView {
  return {
    id: c.id,
    patient: { displayName: c.patientName, primaryDiagnosis: c.dischargeNotes || '—' },
    emergencyContacts: c.emergencyContact ? [{ name: c.emergencyContact }] : [],
    medications: c.medications || [],
    notifications: [],
    tasks: (c.tasks || []).map(toTaskView),
    updatedAt: c.updatedAt,
  };
}

/** Sample care plan shown to visitors so task management is interactive immediately. */
function demoCaseView(): CaseView {
  const d = getDemoProfiles()[0];
  return {
    id: d.id,
    patient: { displayName: d.patient.displayName, primaryDiagnosis: d.patient.primaryDiagnosis },
    emergencyContacts: d.emergencyContacts.map((c) => ({ name: c.name })),
    medications: [],
    notifications: [],
    tasks: d.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      dueDate: t.dueDate,
      status: t.status,
      description: t.description,
      escalated: t.escalated,
      comments: t.comments.map((c) => ({ user: c.user, text: c.text, time: c.time })),
    })),
    updatedAt: d.updatedAt,
  };
}

const isDemoId = (id: string) => id.startsWith('demo-') || id.startsWith('local-');

export default function TasksDemoPage() {
  const [profiles, setProfiles] = useState<CaseView[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentingTask, setCommentingTask] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const [newTask, setNewTask] = useState<{
    title: string;
    owner: string;
    dueDate: string;
    status: TaskView['status'];
    description: string;
  }>({
    title: '', owner: '', dueDate: '', status: 'todo', description: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await casesApi.list();
        if (cancelled) return;
        if (list && list.length > 0) {
          const views = list.map(toCaseView);
          setProfiles(views);
          setDemoMode(false);
          setError(null);
          if (views.length > 0) {
            const latest = views.slice().sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0];
            setSelectedProfile(latest.id);
            refreshTasks(latest.id).catch(e => setError(e instanceof Error ? e.message : 'Failed to load tasks'));
          }
        } else {
          // No care plans yet → sample data so visitors can try task management now.
          const demo = demoCaseView();
          setProfiles([demo]);
          setSelectedProfile(demo.id);
          setDemoMode(true);
          setError(null);
        }
      } catch (e) {
        // Visitors without a session hit the auth-required backend → sample data.
        if (cancelled) return;
        const demo = demoCaseView();
        setProfiles([demo]);
        setSelectedProfile(demo.id);
        setDemoMode(true);
        setError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refreshTasks(caseId: string) {
    if (isDemoId(caseId)) return; // demo tasks live in the local CaseView
    const tasks = await tasksApi.list(caseId);
    setProfiles(prev => prev.map(p => p.id === caseId ? { ...p, tasks: tasks.map(toTaskView) } : p));
  }

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

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newTask.title.trim()) return;
    setSaving(true);
    if (isDemoId(selectedProfile)) {
      // Demo: add the task locally so visitors can try the flow.
      setProfiles(prev => prev.map(p => p.id === selectedProfile ? { ...p, tasks: [...p.tasks, {
        id: `local-${Date.now()}`,
        title: newTask.title,
        owner: newTask.owner || 'You',
        dueDate: newTask.dueDate || undefined,
        status: newTask.status,
        description: newTask.description,
        escalated: false,
        comments: [],
      }] } : p));
      setNewTask({ title: '', owner: '', dueDate: '', status: 'todo', description: '' });
      setSaving(false);
      return;
    }
    try {
      await tasksApi.create(selectedProfile, {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate || new Date().toISOString().slice(0, 10),
      });
      await refreshTasks(selectedProfile);
      setNewTask({ title: '', owner: '', dueDate: '', status: 'todo', description: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(taskId: string, status: string) {
    if (!selectedProfile) return;
    if (isDemoId(selectedProfile)) {
      // Demo: update the status locally so visitors can try the flow.
      setProfiles(prev => prev.map(p => p.id === selectedProfile ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, status } : t) } : p));
      return;
    }
    try {
      await tasksApi.update(selectedProfile, taskId, { status });
      await refreshTasks(selectedProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  async function escalate(taskId: string) {
    if (!selectedProfile || !profile) return;
    const task = profile.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (isDemoId(selectedProfile)) {
      // Demo: toggle escalation locally so visitors can try the flow.
      setProfiles(prev => prev.map(p => p.id === selectedProfile ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, escalated: !t.escalated } : t) } : p));
      return;
    }
    try {
      await tasksApi.update(selectedProfile, taskId, { escalationLevel: task.escalated ? 0 : 1 });
      await refreshTasks(selectedProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }

  async function addComment(taskId: string) {
    if (!commentText.trim() || !selectedProfile) return;
    if (isDemoId(selectedProfile)) {
      // Demo: add the comment locally so visitors can try the flow.
      setProfiles(prev => prev.map(p => p.id === selectedProfile ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, { user: 'You', text: commentText, time: new Date().toISOString() }] } : t) } : p));
      setCommentText('');
      setCommentingTask(null);
      return;
    }
    try {
      await tasksApi.addComment(selectedProfile, taskId, commentText);
      await refreshTasks(selectedProfile);
      setCommentText('');
      setCommentingTask(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    }
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

      {/* Demo-mode notice (sample data for visitors) */}
      {demoMode && (
        <div className="container mt-6">
          <div className="card !p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-accent)]/30 bg-[#fdf9f3]">
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
              <span className="font-bold text-[var(--color-accent)]">Demo mode — </span>
              you&apos;re exploring sample task management.{' '}
              <Link href="/features/auth" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>{' '}
              to manage real care plans.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <div className="container mt-8">
          <div className="card !p-6 border border-[var(--color-danger)]/30">
            <p className="text-sm font-semibold text-[var(--color-danger)] mb-1">Couldn&apos;t load tasks</p>
            <p className="text-xs text-[var(--color-text-light)] mb-4">{error}</p>
            <div className="flex gap-2">
              <button onClick={() => window.location.reload()} className="btn btn-outline text-xs">Retry</button>
              <Link href="/features/auth" className="btn btn-primary text-xs">Go to sign-in</Link>
            </div>
          </div>
        </div>
      ) : (
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
              <select value={selectedProfile} onChange={e => {
                const id = e.target.value;
                setSelectedProfile(id);
                if (id) refreshTasks(id).catch(err => setError(err instanceof Error ? err.message : 'Failed to load tasks'));
              }} className="field max-w-sm">
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
                    <select value={newTask.status} onChange={e => setNewTask(t => ({ ...t, status: e.target.value as TaskView['status'] }))} className="field">
                      {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <input type="text" placeholder="Description" value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} className="field sm:col-span-2" />
                  </div>
                  <button type="submit" disabled={saving} className="btn btn-primary text-sm mt-3">{saving ? 'Saving…' : 'Add Task'}</button>
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
      )}
    </div>
  );
}