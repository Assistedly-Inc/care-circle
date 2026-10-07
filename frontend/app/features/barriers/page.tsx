'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoBarrier, DemoBarrierCase, getDemoBarrierCases } from '@/lib/demoBarriers';

const TYPE_LABELS: Record<string, string> = {
  transport: 'Transport',
  medications: 'Medications',
  placement: 'Placement',
  insurance: 'Insurance',
  family: 'Family / Caregiver',
  pending_test: 'Pending Test',
  social: 'Social',
  other: 'Other',
};

const PRIORITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const STATUS_STYLES: Record<string, string> = {
  IDENTIFIED: 'bg-slate-100 text-slate-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  ESCALATED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
};

const READINESS_STYLES: Record<string, string> = {
  GREEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  AMBER: 'bg-amber-100 text-amber-800 border-amber-200',
  RED: 'bg-red-100 text-red-700 border-red-200',
};

function isBreached(b: DemoBarrier): boolean {
  if (!b.dueDate) return false;
  const end = b.resolvedAt ? new Date(b.resolvedAt) : new Date();
  return end.getTime() > new Date(b.dueDate).getTime();
}

function ttrHours(b: DemoBarrier): number | null {
  if (!b.resolvedAt) return null;
  return Math.round(((new Date(b.resolvedAt).getTime() - new Date(b.createdAt).getTime()) / 3600000) * 10) / 10;
}

function readinessOf(c: DemoBarrierCase): 'GREEN' | 'AMBER' | 'RED' {
  const open = c.barriers.filter(b => b.status !== 'RESOLVED');
  if (open.some(b => b.priority === 'HIGH')) return 'RED';
  if (open.some(b => b.priority === 'MEDIUM')) return 'AMBER';
  return 'GREEN';
}

export default function BarriersDemoPage() {
  const [cases, setCases] = useState<DemoBarrierCase[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [assignText, setAssignText] = useState<Record<string, string>>({});
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterOwner, setFilterOwner] = useState('');
  const [breachedOnly, setBreachedOnly] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setCases(getDemoBarrierCases());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const current = useMemo(() => cases.find(c => c.id === selected), [cases, selected]);

  const stats = useMemo(() => {
    const all = cases.flatMap(c => c.barriers);
    const discharged = cases.filter(c => c.admissionAt && c.dischargeAt);
    const sameDay = discharged.filter(
      c => new Date(c.dischargeAt!).toDateString() === new Date(c.admissionAt).toDateString()
    ).length;
    return {
      open: all.filter(b => b.status !== 'RESOLVED').length,
      breached: all.filter(isBreached).length,
      resolved: all.filter(b => b.status === 'RESOLVED').length,
      total: all.length,
      sameDayRate: discharged.length ? Math.round((sameDay / discharged.length) * 100) : null,
    };
  }, [cases]);

  const metrics = useMemo(() => {
    const all = cases.flatMap(c => c.barriers);
    const withDue = all.filter(b => b.dueDate);
    const breachRate = withDue.length ? Math.round((withDue.filter(isBreached).length / withDue.length) * 100) : null;
    const ttr: Record<string, number> = {};
    for (const key of Object.keys(TYPE_LABELS)) {
      const hours = all
        .filter(b => b.type === key && b.resolvedAt)
        .map(ttrHours)
        .filter((h): h is number => h !== null);
      if (hours.length) {
        const sorted = [...hours].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        ttr[key] = sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
      }
    }
    return { breachRate, ttr };
  }, [cases]);

  const visible = useMemo(() => {
    if (!current) return [];
    let list = current.barriers.slice();
    if (filterType !== 'ALL') list = list.filter(b => b.type === filterType);
    if (filterStatus !== 'ALL') list = list.filter(b => b.status === filterStatus);
    if (filterOwner.trim()) list = list.filter(b => b.owner.toLowerCase().includes(filterOwner.trim().toLowerCase()));
    if (breachedOnly) list = list.filter(isBreached);
    return list.sort((a, b) => {
      const ba = isBreached(a) ? 1 : 0;
      const bb = isBreached(b) ? 1 : 0;
      if (ba !== bb) return bb - ba;
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [current, filterType, filterStatus, filterOwner, breachedOnly]);

  function patchBarrier(id: string, patch: Partial<DemoBarrier>) {
    setCases(prev => prev.map(c => c.id !== selected ? c : {
      ...c,
      barriers: c.barriers.map(b => b.id === id ? { ...b, ...patch } : b),
    }));
  }

  function assign(e: React.FormEvent, barrier: DemoBarrier) {
    e.preventDefault();
    const owner = (assignText[barrier.id] || '').trim();
    if (!owner) return;
    patchBarrier(barrier.id, { owner, status: barrier.status === 'IDENTIFIED' ? 'ASSIGNED' : barrier.status });
    setAssignText(prev => ({ ...prev, [barrier.id]: '' }));
  }

  function confirmResolve() {
    if (!resolvingId || !resolveNote.trim()) return;
    patchBarrier(resolvingId, { status: 'RESOLVED', resolvedAt: new Date().toISOString(), resolutionNote: resolveNote.trim() });
    setResolvingId(null);
    setResolveNote('');
  }

  function reopen(barrier: DemoBarrier) {
    patchBarrier(barrier.id, { status: 'IN_PROGRESS', resolvedAt: undefined, resolutionNote: undefined });
  }

  return (
    <div className="pb-16">
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Discharge Barriers</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Every barrier has an owner and a deadline
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Transport, medications, placement, insurance, family availability — tracked from identification to resolution with SLA clocks and escalation. Human-in-the-loop only: nothing is resolved automatically.
          </p>
        </div>
      </div>

      <div className="container mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Open', value: stats.open, color: 'text-[var(--color-accent)]' },
            { label: 'SLA Breached', value: stats.breached, color: 'text-[var(--color-danger)]' },
            { label: 'Resolved', value: stats.resolved, color: 'text-[#065f46]' },
            { label: 'Same-Day Discharge', value: stats.sameDayRate === null ? '—' : stats.sameDayRate + '%', color: 'text-[var(--color-primary)]' },
          ].map(s => (
            <div key={s.label} className="card text-center !p-5">
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          <div className="flex flex-wrap items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <select value={selected} onChange={e => setSelected(e.target.value)} className="field max-w-sm">
                <option value="">— Choose a patient —</option>
                {cases.map(c => <option key={c.id} value={c.id}>{c.patient.displayName}</option>)}
              </select>
            )}
            {current && (() => {
              const r = readinessOf(current);
              return (
                <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-bold ${READINESS_STYLES[r]}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${r === 'RED' ? 'bg-red-500' : r === 'AMBER' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  Discharge readiness: {r}
                </span>
              );
            })()}
          </div>
          {current && (
            <p className="text-xs text-[var(--color-muted)] mt-2">
              Admitted {new Date(current.admissionAt).toLocaleDateString()}
              {current.dischargeAt ? ` — discharged ${new Date(current.dischargeAt).toLocaleDateString()}` : ' — still in house'}
            </p>
          )}
        </div>

        {selected && current && (
          <>
            <div className="card !p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="field !py-1.5 !text-sm">
                  <option value="ALL">All types</option>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Status</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="field !py-1.5 !text-sm">
                  <option value="ALL">All statuses</option>
                  {['IDENTIFIED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Owner</label>
                <input value={filterOwner} onChange={e => setFilterOwner(e.target.value)} placeholder="e.g. Dana" className="field !py-1.5 !text-sm" />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <input id="breachedOnly" type="checkbox" checked={breachedOnly} onChange={e => setBreachedOnly(e.target.checked)} />
                <label htmlFor="breachedOnly" className="text-xs font-semibold text-[var(--color-muted)]">SLA breached only</label>
              </div>
              <div className="text-xs text-[var(--color-muted)]">{visible.length} of {current.barriers.length} barriers</div>
            </div>

            <div className="grid gap-4">
              {visible.map(b => (
                <div key={b.id} className={`card !p-5 ${isBreached(b) && b.status !== 'RESOLVED' ? 'border-2 border-[var(--color-danger)]' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">{TYPE_LABELS[b.type]}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${b.priority === 'HIGH' ? 'bg-red-100 text-red-700' : b.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{b.priority}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${STATUS_STYLES[b.status]}`}>{b.status.replace('_', ' ')}</span>
                    {isBreached(b) && <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">SLA BREACHED</span>}
                  </div>
                  <p className="text-sm text-[var(--color-text)] mb-2">{b.description}</p>
                  <div className="text-xs text-[var(--color-muted)] space-y-0.5 mb-2">
                    <div>Owner: <strong>{b.owner || 'Unassigned'}</strong></div>
                    <div>Opened: {new Date(b.createdAt).toLocaleString()}</div>
                    {b.dueDate && <div>Due (SLA): {new Date(b.dueDate).toLocaleString()}</div>}
                    {ttrHours(b) !== null && <div>Resolved in {ttrHours(b)}h — {b.resolutionNote}</div>}
                    {b.escalatedAt && <div>Escalated: {new Date(b.escalatedAt).toLocaleString()}</div>}
                  </div>
                  {b.notes.length > 0 && (
                    <ul className="text-xs text-[var(--color-text-light)] mb-2 space-y-1">
                      {b.notes.map((n, i) => <li key={i}>• {n.user}: {n.text}</li>)}
                    </ul>
                  )}
                  {b.status !== 'RESOLVED' ? (
                    <div className="flex flex-wrap gap-2 items-center">
                      <form onSubmit={e => assign(e, b)} className="flex gap-2">
                        <input
                          value={assignText[b.id] || ''}
                          onChange={e => setAssignText(prev => ({ ...prev, [b.id]: e.target.value }))}
                          placeholder="Assign owner"
                          className="field !py-1.5 !text-sm !w-44"
                        />
                        <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20">Assign</button>
                      </form>
                      {b.status === 'ASSIGNED' && (
                        <button onClick={() => patchBarrier(b.id, { status: 'IN_PROGRESS' })} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20">Start</button>
                      )}
                      {b.status !== 'ESCALATED' && (
                        <button onClick={() => patchBarrier(b.id, { status: 'ESCALATED', escalatedAt: new Date().toISOString() })} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20">Escalate</button>
                      )}
                      {resolvingId === b.id ? (
                        <div className="w-full">
                          <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} placeholder="How was it resolved?" className="field !text-sm" rows={2} />
                          <div className="flex gap-2 mt-2">
                            <button onClick={confirmResolve} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90">Confirm resolution</button>
                            <button onClick={() => { setResolvingId(null); setResolveNote(''); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setResolvingId(b.id); setResolveNote(''); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-accent)] text-white hover:opacity-90">Resolve</button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => reopen(b)} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200">Reopen</button>
                  )}
                </div>
              ))}
              {visible.length === 0 && (
                <div className="card !p-8 text-center text-sm text-[var(--color-muted)]">No barriers match these filters.</div>
              )}
            </div>

            <div className="card !p-6 mt-8">
              <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">Pilot metrics — all demo patients</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Same-Day Discharge', value: stats.sameDayRate === null ? '—' : stats.sameDayRate + '%' },
                  { label: 'SLA Breach Rate', value: metrics.breachRate === null ? '—' : metrics.breachRate + '%' },
                  { label: 'Open Barriers', value: stats.open },
                  { label: 'Total Barriers', value: stats.total },
                ].map(m => (
                  <div key={m.label} className="border border-[var(--color-border)] rounded-lg p-4 text-center">
                    <div className="text-2xl font-extrabold text-[var(--color-text)]">{m.value}</div>
                    <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{m.label}</div>
                  </div>
                ))}
              </div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Median time-to-resolution (hours)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(metrics.ttr).map(([k, v]) => (
                  <div key={k} className="border border-[var(--color-border)] rounded-lg p-3">
                    <div className="text-sm font-bold text-[var(--color-text)]">{v}</div>
                    <div className="text-xs text-[var(--color-muted)]">{TYPE_LABELS[k]}</div>
                  </div>
                ))}
                {Object.keys(metrics.ttr).length === 0 && <div className="text-xs text-[var(--color-muted)]">No resolved barriers yet.</div>}
              </div>
            </div>

            <p className="text-xs text-[var(--color-muted)] mt-6 text-center">Demo data. Human-in-the-loop workflow — no automated clinical decisions.</p>
          </>
        )}
      </div>
    </div>
  );
}
