'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DemoProfile, generateId, getDemoProfiles } from '@/lib/demoData';

const NOTIFICATION_TYPES = ['Medication', 'Appointment', 'Task', 'Check-in'] as const;

export default function NotificationsDemoPage() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const profile = useMemo(() => profiles.find(p => p.id === selectedProfile), [profiles, selectedProfile]);

  const [form, setForm] = useState({ title: '', type: 'Medication' as typeof NOTIFICATION_TYPES[number], time: '09:00' });

  useEffect(() => {
    const t = setTimeout(() => {
      setProfiles(getDemoProfiles());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const summary = useMemo(() => {
    return profiles.reduce((acc, p) => {
      acc.total += p.notifications.length;
      p.notifications.forEach(n => acc.byType[n.type] = (acc.byType[n.type] || 0) + 1);
      return acc;
    }, { total: 0, byType: {} as Record<string, number> });
  }, [profiles]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !form.title.trim()) return;

    const now = new Date();
    const [h, m] = form.time.split(':').map(Number);
    now.setHours(h, m, 0, 0);

    const newN = {
      id: generateId(),
      title: form.title,
      type: form.type,
      time: now.toISOString(),
      status: 'pending' as const,
    };

    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return { ...p, notifications: [...p.notifications, newN] };
    }));
    setForm({ title: '', type: 'Medication', time: '09:00' });
  }

  function markDone(id: string) {
    setProfiles(prev => prev.map(p => {
      if (p.id !== selectedProfile) return p;
      return {
        ...p,
        notifications: p.notifications.map(n =>
          n.id === id ? { ...n, status: n.status === 'read' ? 'pending' as const : 'read' as const } : n
        ),
      };
    }));
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

      <div className="container mt-8">
        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="card text-center !p-5 min-w-[120px]">
            <div className="text-3xl font-extrabold text-[var(--color-primary)]">{summary.total}</div>
            <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Total Reminders</div>
          </div>
          {Object.entries(summary.byType).map(([type, count]) => (
            <div key={type} className="card text-center !p-5 min-w-[120px]">
              <div className="text-3xl font-extrabold text-[var(--color-secondary)]">{count}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{type}</div>
            </div>
          ))}
        </div>

        {/* Profile selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select
              value={selectedProfile}
              onChange={e => setSelectedProfile(e.target.value)}
              className="field max-w-sm"
            >
              <option value="">— Choose a patient —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.patient.displayName}</option>
              ))}
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
                  <p>DOB: {profile.patient.dateOfBirth}</p>
                  <p>Medications: {profile.medications.length}</p>
                  <p>Tasks: {profile.tasks.length}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                  <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                    ← Back to Care Plans
                  </Link>
                </div>
              </div>
            </div>

            {/* Notifications + create */}
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
              {profile.notifications.length === 0 ? (
                <div className="card !p-8 text-center text-[var(--color-text-light)]">
                  <p className="font-semibold mb-1">No reminders yet</p>
                  <p className="text-sm">Create your first reminder above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.notifications.slice().sort((a, b) => +new Date(b.time) - +new Date(a.time)).map(n => (
                    <div key={n.id} className={`card !p-4 flex items-center justify-between gap-4 ${n.status === 'read' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          n.type === 'Medication' ? 'bg-[#e8f4ef] text-[#4a7c7e]' :
                          n.type === 'Appointment' ? 'bg-[#ede8f2] text-[#6d1247]' :
                          n.type === 'Task' ? 'bg-[#e8eef4] text-[#4a6b8a]' : 'bg-[#f5ede5] text-[#a07c4a]'
                        }`}>
                          {n.type === 'Medication' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                          ) : n.type === 'Appointment' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                          ) : n.type === 'Task' ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${n.status === 'read' ? 'text-[var(--color-muted)] line-through' : 'text-[var(--color-text)]'}`}>{n.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-[var(--color-muted)]">{n.type}</span>
                            <span className="text-xs text-[var(--color-muted)]">{formatTime(n.time)}</span>
                            <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${n.status === 'read' ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                              {n.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => markDone(n.id)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] transition-colors shrink-0 ${n.status === 'read' ? 'text-[var(--color-muted)] hover:text-[var(--color-text)]' : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'}`}
                      >
                        {n.status === 'read' ? 'Reopen' : 'Done ✓'}
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
