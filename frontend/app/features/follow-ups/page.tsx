'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cases, followUpsApi, type FollowUp } from '@/lib/api';
import { getDemoProfiles } from '@/lib/demoData';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-[#fef3c7] text-[#92400e]',
  COMPLETED: 'bg-[#d1fae5] text-[#065f46]',
  MISSED: 'bg-[#fee2e2] text-[#991b1b]',
  ESCALATED: 'bg-[#fce7f3] text-[#9d174d]',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const isDemoId = (id: string) => id.startsWith('demo-');

/** Sample case shown to visitors when the backend is auth-gated or has no plans yet. */
function demoCaseView() {
  const d = getDemoProfiles()[0];
  return {
    id: d.id,
    patientName: d.patient.displayName,
    dischargeAt: d.updatedAt,
  };
}

/** Sample follow-ups mapped from the demo profile's tasks (dueDates) and 'Check-in' notifications. */
function buildDemoFollowUps(): FollowUp[] {
  const d = getDemoProfiles()[0];
  const now = new Date().toISOString();
  const items: FollowUp[] = [];
  (d.tasks || []).forEach((t) => {
    if (!t.dueDate) return;
    const status = t.status === 'done' ? 'COMPLETED' : t.status === 'blocked' ? 'ESCALATED' : 'SCHEDULED';
    items.push({
      id: `demo-fu-${t.id}`,
      caseId: d.id,
      scheduledFor: `${t.dueDate}T12:00:00Z`,
      completedAt: status === 'COMPLETED' ? `${t.dueDate}T12:00:00Z` : null,
      status,
      contactType: 'phone',
      notes: t.description || t.title,
      outcome: status === 'COMPLETED' ? 'OK' : null,
      escalatedAt: null,
      escalationLevel: status === 'ESCALATED' ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    });
  });
  (d.notifications || []).forEach((n) => {
    if (n.type !== 'Check-in') return;
    items.push({
      id: `demo-fu-${n.id}`,
      caseId: d.id,
      scheduledFor: n.time,
      completedAt: null,
      status: 'SCHEDULED',
      contactType: 'sms',
      notes: n.title,
      outcome: null,
      escalatedAt: null,
      escalationLevel: 0,
      createdAt: now,
      updatedAt: now,
    });
  });
  return items.sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor));
}

function computeMetrics(fus: FollowUp[]) {
  const total = fus.length;
  const completed = fus.filter((f) => f.status === 'COMPLETED').length;
  const escalated = fus.filter((f) => f.status === 'ESCALATED').length;
  const missed = fus.filter((f) => f.status === 'MISSED').length;
  return {
    total,
    completed,
    escalated,
    missed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    escalationRate: total ? Math.round((escalated / total) * 100) : 0,
  };
}

export default function FollowUpsPage() {
  const [casesList, setCasesList] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [metrics, setMetrics] = useState<{ total: number; completed: number; escalated: number; missed: number; completionRate: number; escalationRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const loadCases = async () => {
    try {
      const list = await cases.list();
      if (list && list.length > 0) {
        setCasesList(list);
        setError(null);
      } else {
        // No plans yet → sample data so visitors can try follow-up tracking now.
        const demo = demoCaseView();
        const demoFus = buildDemoFollowUps();
        setCasesList([demo]);
        setSelectedCaseId(demo.id);
        setFollowUps(demoFus);
        setMetrics(computeMetrics(demoFus));
        setDemoMode(true);
        setError(null);
      }
    } catch (e: any) {
      // Visitors without a session hit the auth-required backend → sample data.
      const demo = demoCaseView();
      const demoFus = buildDemoFollowUps();
      setCasesList([demo]);
      setSelectedCaseId(demo.id);
      setFollowUps(demoFus);
      setMetrics(computeMetrics(demoFus));
      setDemoMode(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    if (demoMode) return; // demo metrics computed from local sample follow-ups
    try { setMetrics(await followUpsApi.metrics()); } catch { /* ignore */ }
  };

  const loadFollowUps = async (caseId: string) => {
    if (isDemoId(caseId)) {
      // Demo follow-ups live in local state — no backend call.
      const demoFus = buildDemoFollowUps();
      setFollowUps(demoFus);
      setMetrics(computeMetrics(demoFus));
      setError(null);
      return;
    }
    try {
      setFollowUps(await followUpsApi.list(caseId));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => { loadCases(); loadMetrics(); }, []);

  const selectedCase = useMemo(
    () => casesList.find((c) => c.id === selectedCaseId),
    [casesList, selectedCaseId]
  );

  async function schedule() {
    if (!selectedCaseId) return;
    if (isDemoId(selectedCaseId)) {
      // Local demo cadence: day-3/7/14/30 check-ins anchored to today.
      const now = new Date();
      const base = now.toISOString();
      const newFus: FollowUp[] = [3, 7, 14, 30].map((day) => ({
        id: `demo-fu-cadence-${day}-${Date.now()}`,
        caseId: selectedCaseId,
        scheduledFor: new Date(now.getTime() + day * 86400000).toISOString(),
        completedAt: null,
        status: 'SCHEDULED',
        contactType: 'phone',
        notes: `Automated ${day}-day post-discharge check-in`,
        outcome: null,
        escalatedAt: null,
        escalationLevel: 0,
        createdAt: base,
        updatedAt: base,
      }));
      setFollowUps((prev) => {
        const next = [...prev, ...newFus];
        setMetrics(computeMetrics(next));
        return next;
      });
      return;
    }
    await followUpsApi.schedule(selectedCaseId);
    loadFollowUps(selectedCaseId);
    loadMetrics();
  }

  async function updateFollowUp(fu: FollowUp, patch: Partial<FollowUp>) {
    if (isDemoId(fu.caseId)) {
      // Demo updates are local React state only.
      setFollowUps((prev) => {
        const next = prev.map((f) => (f.id === fu.id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f));
        setMetrics(computeMetrics(next));
        return next;
      });
      return;
    }
    await followUpsApi.update(fu.caseId, fu.id, patch);
    loadFollowUps(fu.caseId);
    loadMetrics();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Post-Discharge Follow-Up</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            The loop that closes the gap beyond the door
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Automated check-ins at days 3, 7, 14, and 30 after discharge — catching complications before they become readmissions.
          </p>
        </div>
      </div>

      {/* Demo-mode notice (sample data for visitors) */}
      {demoMode && (
        <div className="container mt-6">
          <div className="card !p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-accent)]/30 bg-[#fdf9f3]">
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
              <span className="font-bold text-[var(--color-accent)]">Demo mode — </span>
              you&apos;re exploring sample follow-up tracking.{' '}
              <Link href="/features/auth" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>{' '}
              to manage real care plans.
            </p>
          </div>
        </div>
      )}

      <div className="container mt-8">
        {error && (
          <div className="card !p-4 mb-6 border-l-4 border-red-500 text-red-700 text-sm">{error}</div>
        )}

        {/* Metrics */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card text-center !p-5">
              <div className="text-3xl font-extrabold text-[var(--color-primary)]">{metrics.total}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Total</div>
            </div>
            <div className="card text-center !p-5">
              <div className="text-3xl font-extrabold text-green-600">{metrics.completionRate}%</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Completion Rate</div>
            </div>
            <div className="card text-center !p-5">
              <div className="text-3xl font-extrabold text-pink-600">{metrics.escalationRate}%</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Escalation Rate</div>
            </div>
            <div className="card text-center !p-5">
              <div className="text-3xl font-extrabold text-red-600">{metrics.missed}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">Missed</div>
            </div>
          </div>
        )}

        {/* Case selector + schedule */}
        <div className="flex flex-wrap items-end gap-4 mb-8">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
            {loading ? (
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <select
                value={selectedCaseId}
                onChange={e => { setSelectedCaseId(e.target.value); if (e.target.value) loadFollowUps(e.target.value); }}
                className="field w-full"
              >
                <option value="">— Choose a patient —</option>
                {casesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.patientName} {c.dischargeAt ? `(discharged ${new Date(c.dischargeAt).toLocaleDateString()})` : ''}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={schedule} disabled={!selectedCaseId} className="btn btn-primary text-sm">
            Schedule Follow-Up Cadence
          </button>
        </div>

        {selectedCase && (
          <div className="space-y-4">
            <div className="card !p-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[var(--color-text)]">{selectedCase.patientName}</h3>
                <p className="text-sm text-[var(--color-text-light)]">
                  {selectedCase.dischargeAt
                    ? `Discharged ${new Date(selectedCase.dischargeAt).toLocaleDateString()}`
                    : 'Not yet discharged — cadence will anchor to today'}
                </p>
              </div>
              <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)]">
                ← Back to Care Plans
              </Link>
            </div>

            {followUps.length === 0 ? (
              <div className="card !p-8 text-center text-[var(--color-text-light)]">
                <p className="font-semibold mb-1">No follow-ups scheduled</p>
                <p className="text-sm">Click "Schedule Follow-Up Cadence" to create the day-3/7/14/30 check-in loop.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((fu) => (
                  <div key={fu.id} className="card !p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${fu.status === 'COMPLETED' ? 'bg-green-500' : fu.status === 'ESCALATED' ? 'bg-pink-500' : fu.status === 'MISSED' ? 'bg-red-500' : 'bg-amber-400'}`} />
                      <div>
                        <p className="text-sm font-bold text-[var(--color-text)]">
                          Day {Math.max(1, Math.round((+new Date(fu.scheduledFor) - +(selectedCase.dischargeAt ? new Date(selectedCase.dischargeAt) : new Date())) / 86400000))} check-in
                        </p>
                        <p className="text-xs text-[var(--color-muted)]">{formatDate(fu.scheduledFor)} · {fu.contactType}</p>
                        {fu.notes && <p className="text-xs text-[var(--color-text-light)] mt-1">{fu.notes}</p>}
                        {fu.outcome && <p className="text-xs font-semibold text-[var(--color-text)] mt-0.5">Outcome: {fu.outcome}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full ${STATUS_STYLES[fu.status] || 'bg-gray-100'}`}>{fu.status}</span>
                      {fu.status === 'SCHEDULED' && (
                        <>
                          <button onClick={() => updateFollowUp(fu, { status: 'COMPLETED', outcome: 'OK' })} className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-green-600 hover:bg-green-700">Complete ✓</button>
                          <button onClick={() => updateFollowUp(fu, { status: 'ESCALATED', escalationLevel: 1 })} className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-pink-600 hover:bg-pink-700">Escalate</button>
                        </>
                      )}
                      {fu.status === 'COMPLETED' && (
                        <button onClick={() => updateFollowUp(fu, { status: 'ESCALATED', escalationLevel: 2 })} className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-pink-600 hover:bg-pink-700">Escalate ↑</button>
                      )}
                      {fu.status === 'ESCALATED' && (
                        <button onClick={() => updateFollowUp(fu, { status: 'COMPLETED', outcome: 'RESOLVED' })} className="text-xs font-semibold px-3 py-1.5 rounded-md text-white bg-green-600 hover:bg-green-700">Resolve ✓</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
