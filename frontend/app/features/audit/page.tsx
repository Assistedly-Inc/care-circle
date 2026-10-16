'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { profilesApi } from '@/lib/api';
import { getDemoProfiles } from '@/lib/demoData';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

const isDemoId = (id: string) => id.startsWith('demo-') || id.startsWith('local-');

/** Sample patient shown to visitors so the audit trail is interactive immediately. */
function demoPatient() {
  const d = getDemoProfiles()[0];
  return { id: d.id, patient: { displayName: d.patient.displayName } };
}

/** Sample audit log covering the platform's compliance trail (times within the demo's updatedAt window). */
function demoAuditLog(): AuditEntry[] {
  const d = getDemoProfiles()[0];
  return [
    {
      id: 'audit-001',
      timestamp: '2026-09-18T09:05:00Z',
      user: 'David Chen',
      action: 'Care plan created',
      entity: 'CarePlan',
      entityId: d.id,
      details: 'Care plan created for Margaret Chen following total knee replacement discharge.',
    },
    {
      id: 'audit-002',
      timestamp: '2026-09-18T10:20:00Z',
      user: 'Home health nurse',
      action: 'Medication verified',
      entity: 'Medication',
      entityId: 'm1',
      details: 'Medication verified — Oxycodone 5mg (every 4-6 hours as needed).',
    },
    {
      id: 'audit-003',
      timestamp: '2026-09-18T14:45:00Z',
      user: 'David Chen',
      action: 'Medication added',
      entity: 'Medication',
      entityId: 'm2',
      details: 'Medication added — Acetaminophen 500mg (every 6 hours).',
    },
    {
      id: 'audit-004',
      timestamp: '2026-09-18T18:30:00Z',
      user: 'Margaret Chen',
      action: 'Task completed',
      entity: 'Task',
      entityId: 't2',
      details: 'Task completed — Ice and elevate leg (20 minutes on, 20 minutes off).',
    },
    {
      id: 'audit-005',
      timestamp: '2026-09-18T19:10:00Z',
      user: 'Dr. Lisa Park',
      action: 'Follow-up scheduled',
      entity: 'Appointment',
      entityId: 'apt-2026-09-24',
      details: 'Follow-up scheduled — Orthopedic surgeon (Dr. Lisa Park) on Sep 24, 2026.',
    },
    {
      id: 'audit-006',
      timestamp: '2026-09-19T08:15:00Z',
      user: 'Dr. Lisa Park',
      action: 'Discharge instructions updated',
      entity: 'CarePlan',
      entityId: d.id,
      details: 'Discharge instructions updated — post-op precautions and dressing change guidance.',
    },
    {
      id: 'audit-007',
      timestamp: '2026-09-19T09:30:00Z',
      user: 'Margaret Chen',
      action: 'Consent granted',
      entity: 'Consent',
      entityId: 'consent-family-ro',
      details: 'Consent granted — Family (read-only) access for David Chen.',
    },
    {
      id: 'audit-008',
      timestamp: '2026-09-19T10:15:00Z',
      user: 'David Chen',
      action: 'Audit export performed',
      entity: 'AuditLog',
      entityId: 'export-2026-09-19',
      details: 'Audit export performed — full audit trail exported to PDF.',
    },
  ];
}

export default function AuditPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await profilesApi.list();
        if (cancelled) return;
        const list = res.patients ?? [];
        if (list.length > 0) {
          setPatients(list);
          setDemoMode(false);
          setError(null);
        } else {
          // No patients yet → sample data so visitors can try the audit trail now.
          const demo = demoPatient();
          setPatients([demo]);
          setSelected(demo.id);
          setDemoMode(true);
          setError(null);
        }
      } catch (e) {
        // Visitors without a session hit the auth-required backend → sample data.
        if (cancelled) return;
        const demo = demoPatient();
        setPatients([demo]);
        setSelected(demo.id);
        setDemoMode(true);
        setError(null);
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (isDemoId(selected)) {
      // Demo: serve the sample audit log from local state.
      setEntries(demoAuditLog());
      setError(null);
      setLoadingLog(false);
      return;
    }
    setLoadingLog(true);
    profilesApi
      .audit(selected)
      .then((res) => {
        const log = (res.auditLog ?? []) as any[];
        setEntries(
          log.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            user: e.user?.name ?? e.userId ?? 'System',
            action: e.action,
            entity: e.entity,
            entityId: e.entityId ?? '',
            details: e.details ?? `${e.action} on ${e.entity}`,
          }))
        );
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingLog(false));
  }, [selected]);

  const patient = useMemo(() => patients.find((p) => p.id === selected), [patients, selected]);

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Audit Trail</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Every change, accounted for
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Full audit trail of profile, medication, and task changes — designed with HIPAA-aware safeguards for every action.
          </p>
        </div>
      </div>

      {/* Demo-mode notice (sample data for visitors) */}
      {demoMode && (
        <div className="container mt-6">
          <div className="card !p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-accent)]/30 bg-[#fdf9f3]">
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
              <span className="font-bold text-[var(--color-accent)]">Demo mode — </span>
              you&apos;re exploring the sample compliance &amp; audit trail.{' '}
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

        {/* Patient selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          {loadingPatients ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="field max-w-sm"
            >
              <option value="">— Choose a patient —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.patient?.displayName ?? p.name ?? p.id}</option>
              ))}
            </select>
          )}
        </div>

        {selected && (
          <div className="card !p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[var(--color-text)]">
                Audit Log — {patient?.patient?.displayName ?? patient?.name ?? 'Patient'}
              </h3>
              <span className="text-xs font-semibold text-[var(--color-muted)]">{entries.length} events</span>
            </div>

            {loadingLog ? (
              <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
            ) : entries.length === 0 ? (
              <p className="text-sm text-[var(--color-text-light)] text-center py-6">No audit events found.</p>
            ) : (
              <div className="space-y-3">
                {entries.map((e) => (
                  <div key={e.id} className="border border-[var(--color-border)] rounded-lg p-4 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] mt-2 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text)]">{e.user}</span>
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                          {e.action}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">{e.entity} · {e.entityId}</span>
                        <span className="text-xs text-[var(--color-muted)] ml-auto">{formatDate(e.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[var(--color-text-light)] mt-1.5 break-words">{e.details}</p>
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
