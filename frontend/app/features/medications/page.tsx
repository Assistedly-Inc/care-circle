'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cases as casesApi, medicationsApi } from '@/lib/api';
import type { CareCase, Medication } from '@/types';

interface MedView {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  source: string;
  verified: boolean;
  notes: string;
}

interface CaseView {
  id: string;
  patient: { displayName: string; primaryDiagnosis: string; dateOfBirth: string };
  emergencyContacts: { name: string }[];
  tasks: unknown[];
  medications: MedView[];
  updatedAt: string;
}

function toMedView(m: Medication): MedView {
  return {
    id: m.id,
    name: m.name,
    dose: m.dosage || m.dose || '',
    schedule: m.schedule || '',
    source: m.source || '',
    verified: !!m.verifiedAt,
    notes: m.notes || '',
  };
}

function toCaseView(c: CareCase): CaseView {
  return {
    id: c.id,
    patient: {
      displayName: c.patientName,
      primaryDiagnosis: c.dischargeNotes || '—',
      dateOfBirth: c.patientDob || '—',
    },
    emergencyContacts: c.emergencyContact ? [{ name: c.emergencyContact }] : [],
    tasks: c.tasks || [],
    medications: (c.medications || []).map(toMedView),
    updatedAt: c.updatedAt,
  };
}

export default function MedicationsDemoPage() {
  const [profiles, setProfiles] = useState<CaseView[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const profile = useMemo(() => profiles.find(p => p.id === selectedProfile), [profiles, selectedProfile]);

  const [form, setForm] = useState({
    name: '', dose: '', schedule: '', source: '', notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await casesApi.list();
        if (cancelled) return;
        setProfiles(list.map(toCaseView));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load cases');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refreshMeds(caseId: string) {
    const meds = await medicationsApi.list(caseId);
    setProfiles(prev => prev.map(p => p.id === caseId ? { ...p, medications: meds.map(toMedView) } : p));
  }

  const medicationCounts = useMemo(() => {
    return profiles.reduce((acc, p) => {
      acc.total += p.medications.length;
      acc.verified += p.medications.filter(m => m.verified).length;
      acc.pending += p.medications.filter(m => !m.verified).length;
      return acc;
    }, { total: 0, verified: 0, pending: 0 });
  }, [profiles]);

  async function handleVerify(medId: string) {
    if (!selectedProfile || !profile) return;
    const med = profile.medications.find(m => m.id === medId);
    if (!med) return;
    setSaving(true);
    try {
      await medicationsApi.update(selectedProfile, medId, {
        verifiedAt: med.verified ? null : new Date().toISOString(),
      });
      await refreshMeds(selectedProfile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update medication');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !form.name.trim()) return;
    setSaving(true);
    try {
      await medicationsApi.create(selectedProfile, {
        name: form.name,
        dosage: form.dose,
        schedule: form.schedule,
        source: form.source || 'Family added',
        notes: form.notes,
      });
      await refreshMeds(selectedProfile);
      setForm({ name: '', dose: '', schedule: '', source: '', notes: '' });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Medications</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Medication tracking families actually follow
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            See every medication, when to take it, and who verified it. No more guessing between discharge papers, pharmacy bags, and sticky notes.
          </p>
        </div>
      </div>

      {error ? (
        <div className="container mt-8">
          <div className="card !p-6 border border-[var(--color-danger)]/30">
            <p className="text-sm font-semibold text-[var(--color-danger)] mb-1">Couldn&apos;t load medications</p>
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
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total', value: medicationCounts.total, color: 'text-[var(--color-primary)]' },
              { label: 'Verified', value: medicationCounts.verified, color: 'text-[#065f46]' },
              { label: 'Needs Verification', value: medicationCounts.pending, color: 'text-[var(--color-accent)]' },
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
              <select
                value={selectedProfile}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedProfile(id);
                  if (id) refreshMeds(id).catch(err => setError(err instanceof Error ? err.message : 'Failed to load medications'));
                }}
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
              {/* Patient sidebar */}
              <div className="lg:col-span-2 space-y-5">
                <div className="card !p-5 bg-[#faf8f5]">
                  <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2">{profile.patient.displayName}</h3>
                  <p className="text-sm text-[var(--color-text-light)] mb-3">{profile.patient.primaryDiagnosis}</p>
                  <div className="space-y-1.5">
                    <p className="text-xs text-[var(--color-muted)]">DOB: {profile.patient.dateOfBirth}</p>
                    <p className="text-xs text-[var(--color-muted)]">Contacts: {profile.emergencyContacts.length}</p>
                    <p className="text-xs text-[var(--color-muted)]">Tasks: {profile.tasks.length}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                    <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                      ← Back to Care Plans
                    </Link>
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div className="lg:col-span-3 space-y-5">
                {/* Add Form */}
                <div className="card !p-5">
                  <h4 className="text-sm font-extrabold text-[var(--color-text)] mb-3">Add Medication</h4>
                  <form onSubmit={handleSubmit}>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input required type="text" placeholder="Medication Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="field" />
                      <input type="text" placeholder="Dose (e.g. 5mg)" value={form.dose} onChange={e => setForm(f => ({ ...f, dose: e.target.value }))} className="field" />
                      <input type="text" placeholder="Schedule" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} className="field" />
                      <input type="text" placeholder="Source (e.g. Discharge orders)" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="field" />
                      <input type="text" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="field sm:col-span-2" />
                    </div>
                    <button type="submit" disabled={saving} className="btn btn-primary text-sm mt-3">{saving ? 'Saving…' : 'Add Medication'}</button>
                  </form>
                </div>

                {/* Table */}
                {profile.medications.length === 0 ? (
                  <div className="card !p-8 text-center text-[var(--color-text-light)]">
                    <p className="font-semibold mb-1">No medications yet</p>
                    <p className="text-sm">Add the first medication above or import from a discharge summary.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead className="bg-[#faf8f5]">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] px-4 py-3">Name</th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] px-4 py-3">Dose</th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] px-4 py-3">Schedule</th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] px-4 py-3">Status</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {profile.medications.map(m => (
                          <tr key={m.id} className="group hover:bg-[#faf8f5]/50">
                            <td className="px-4 py-3 font-semibold text-[var(--color-text)]">{m.name}</td>
                            <td className="px-4 py-3 text-[var(--color-text-light)]">{m.dose || '—'}</td>
                            <td className="px-4 py-3 text-[var(--color-text-light)] max-w-[200px] truncate" title={m.schedule}>{m.schedule || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${m.verified ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                                {m.verified ? (
                                  <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> Verified</>
                                ) : 'Needs Check'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleVerify(m.id)}
                                disabled={saving}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-md)] transition-colors ${m.verified ? 'text-[var(--color-muted)] hover:text-[var(--color-text)]' : 'text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10'}`}
                              >
                                {m.verified ? 'Unverify' : 'Verify ✓'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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