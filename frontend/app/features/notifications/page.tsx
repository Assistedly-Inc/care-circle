'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cases, tasksApi, remindersApi } from '@/lib/api';
import { getDemoProfiles } from '@/lib/demoData';

const NOTIFICATION_TYPES = ['Medication', 'Appointment', 'Task', 'Check-in'] as const;

interface Reminder {
  id: string;
  title: string;
  type: string;
  time: string;
  status: string;
  caseId: string;
  patientName: string;
  ownerName: string | null;
  escalationLevel: number;
}

const isDemoId = (id: string) => id.startsWith('demo-') || id.startsWith('local-');

/** Sample case shown to visitors so reminders are interactive immediately. */
function demoCase() {
  const d = getDemoProfiles()[0];
  return {
    id: d.id,
    patientName: d.patient.displayName,
    patientDob: d.patient.dateOfBirth,
    emergencyContact: d.emergencyContacts[0]?.name || '',
  };
}

/** Sample reminders mapped from the demo profile + a few realistic extras. */
function demoReminders(): Reminder[] {
  const d = getDemoProfiles()[0];
  const base: Reminder[] = d.notifications.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    time: n.time,
    status: n.status,
    caseId: d.id,
    patientName: d.patient.displayName,
    ownerName: 'Home health nurse',
    escalationLevel: 0,
  }));
  return [
    ...base,
    { id: 'demo-n4', title: 'Enoxaparin injection due', type: 'Medication', time: '2026-09-19T17:00:00Z', status: 'pending', caseId: d.id, patientName: d.patient.displayName, ownerName: 'Home health nurse', escalationLevel: 0 },
    { id: 'demo-n5', title: 'Change surgical dressing', type: 'Task', time: '2026-09-19T15:00:00Z', status: 'pending', caseId: d.id, patientName: d.patient.displayName, ownerName: 'Home health nurse', escalationLevel: 0 },
    { id: 'demo-n6', title: 'Evening check-in call', type: 'Check-in', time: '2026-09-19T19:00:00Z', status: 'sent', caseId: d.id, patientName: d.patient.displayName, ownerName: 'Home health nurse', escalationLevel: 1 },
  ];
}

export default function NotificationsPage() {
  const [casesList, setCasesList] = useState<any[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ title: '', type: 'Task' as typeof NOTIFICATION_TYPES[number], time: '09:00' });
  const [demoMode, setDemoMode] = useState(false);

  const applyDemo = () => {
    const demo = demoCase();
    setCasesList([demo]);
    setReminders(demoReminders());
    setSelectedCaseId(demo.id);
    setDemoMode(true);
    setError(null);
  };

  const load = async () => {
    try {
      const [c, r] = await Promise.all([cases.list(), remindersApi.list()]);
      if (c && c.length > 0 && r && r.length > 0) {
        setCasesList(c);
        setReminders(r);
        setDemoMode(false);
        setError(null);
      } else {
        // Empty lists → sample data so visitors can try reminders now.
        applyDemo();
      }
    } catch (e: any) {
      // Visitors without a session hit the auth-required backend → sample data.
      applyDemo();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selectedCase = useMemo(
    () => casesList.find((c) => c.id === selectedCaseId),
    [casesList, selectedCaseId]
  );

  const summary = useMemo(() => {
    return reminders.reduce((acc, r) => {
      acc.total += 1;
      acc.byType[r.type] = (acc.byType[r.type] || 0) + 1;
      return acc;
    }, { total: 0, byType: {} as Record<string, number> });
  }, [reminders]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase || !form.title.trim()) return;

    const now = new Date();
    const [h, m] = form.time.split(':').map(Number);
    now.setHours(h, m, 0, 0);

    if (isDemoId(selectedCase.id)) {
      // Demo: add the reminder locally so visitors can try the flow.
      setReminders(prev => [...prev, {
        id: `local-${Date.now()}`,
        title: form.title,
        type: form.type,
        time: now.toISOString(),
        status: 'pending',
        caseId: selectedCase.id,
        patientName: selectedCase.patientName,
        ownerName: 'You (family member)',
        escalationLevel: 0,
      }]);
      setForm({ title: '', type: 'Task', time: '09:00' });
      return;
    }

    await tasksApi.create(selectedCase.id, { title: form.title, dueDate: now.toISOString() });
    setForm({ title: '', type: 'Task', time: '09:00' });
    load();
  }

  async function markDone(id: string) {
    const r = reminders.find((x) => x.id === id);
    if (!r) return;
    if (isDemoId(r.caseId)) {
      // Demo: mark read locally so visitors can try the flow.
      setReminders(prev => prev.map((x) => x.id === id ? { ...x, status: 'read' } : x));
      return;
    }
    await tasksApi.update(r.caseId, r.id, { status: 'COMPLETED' });
    load();
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Reminders &amp; Alerts</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            The right reminder at the right time
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Push, SMS, and in-app reminders for medications, appointments, tasks, and daily check-ins. Families and caregivers never miss a beat.
          </p>
        </div>
      </div>

      {/* Demo-mode notice (sample data for visitors) */}
      {demoMode && (
        <div className="container mt-6">
          <div className="card !p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-accent)]/30 bg-[#fdf9f3]">
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
              <span className="font-bold text-[var(--color-accent)]">Demo mode — </span>
              you&apos;re exploring sample reminders &amp; alerts.{' '}
              <Link href="/features/auth" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>{' '}
              to manage real notifications.
            </p>
          </div>
        </div>
      )}

      <div className="container mt-8">
        {error && (
          <div className="card !p-4 mb-6 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="card text-center !p-5 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[var(--color-primary)]">{summary.total}</div>
            <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Upcoming Reminders</div>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div key={type} className="card text-center !p-5 min-w-[120px]">
              <div className="text-3xl font-extrabold text-[var(--color-secondary)]">{count}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{type}</div>
            </div>
          ))}
        </div>

        {/* Case selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select
              value={selectedCaseId}
              onChange={e => setSelectedCaseId(e.target.value)}
              className="field max-w-sm"
            >
              <option value="">— Choose a patient —</option>
              {casesList.map((c) => (
                <option key={c.id} value={c.id}>{c.patientName}</option>
              ))}
            </select>
          )}
        </div>

        {selectedCase && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-2">
              <div className="card !p-5 bg-[#faf8f5]">
                <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2">{selectedCase.patientName}</h3>
                <div className="space-y-1.5 text-xs text-[var(--color-muted)]">
                  <p>DOB: {selectedCase.patientDob ? new Date(selectedCase.patientDob).toLocaleDateString() : '—'}</p>
                  <p>Emergency: {selectedCase.emergencyContact || '—'}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                  <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    ← Back to Care Plans
                  </Link>
                </div>
              </div>
            </div>

            {/* Reminders + create */}
            <div className="lg:col-span-3 space-y-5">
              {/* Create form */}
              <form onSubmit={handleCreate} className="card !p-5">
                <h4 className="text-sm font-extrabold text-[var(--color-text)] mb-3">Add Reminder</h4>
                <div className="flex flex-wrap gap-3">
                  <input
                    required
                    type="text"
                    placeholder="Reminder title (e.g. Aspirin at bedtime)"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="field flex-1 min-w-[200px]"
                  />
                  <select
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as typeof NOTIFICATION_TYPES[number] }))}
                    className="field w-[140px]"
                  >
                    {NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="field w-[120px]"
                  />
                  <button type="submit" className="btn btn-primary text-sm">Add</button>
                </div>
              </form>

              {/* List */}
              {reminders.length === 0 ? (
                <div className="card !p-8 text-center text-[var(--color-text-light)]">
                  <p className="font-semibold mb-1">No reminders yet</p>
                  <p className="text-sm">Create your first reminder above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.slice().sort((a, b) => +new Date(b.time) - +new Date(a.time)).map((n) => (
                    <div key={n.id} className="card !p-4 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          n.type === 'Medication' ? 'bg-[#e8f4ef] text-[#4a7c7e]' :
                          n.type === 'Appointment' ? 'bg-[#ede8f2] text-[#6d1247]' :
                          n.type === 'Task' ? 'bg-[#e8eef4] text-[#4a6b8a]' : 'bg-[#f5ede5] text-[#a07c4a]'
                        }`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[var(--color-text)]">{n.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-[var(--color-muted)]">{n.type}</span>
                            <span className="text-xs text-[var(--color-muted)]">{formatTime(n.time)}</span>
                            {n.escalationLevel > 0 && (
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                Escalated
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => markDone(n.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] transition-colors shrink-0 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
                      >
                        Done ✓
                      </button>
                    </div>
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
