'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DemoProfile, getDemoProfiles } from '@/lib/demoData';

export default function ExportDemoPage() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);

  const profile = useMemo(() => profiles.find(p => p.id === selected), [profiles, selected]);

  useEffect(() => {
    const t = setTimeout(() => {
      setProfiles(getDemoProfiles());
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  function handleDownload() {
    if (!profile) return;
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-plan-${profile.patient.displayName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Export</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Bring a complete record to every appointment
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Download a full care summary in seconds — medications, contacts, tasks, and notes. Perfect for primary care follow-ups, specialist visits, or keeping a personal backup.
          </p>
        </div>
      </div>

      <div className="container mt-8">
        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[
            { icon: '🏥', title: 'Primary Care Visit', desc: 'Arrive with every medication, observation, and follow-up task documented — so the doctor sees the full picture.' },
            { icon: '📋', title: 'Insurance / Compliance', desc: 'Generate structured records on demand. Every field traceable, every change logged.' },
            { icon: '💾', title: 'Family Backup', desc: 'Keep a personal copy of everything. Data portability is your right — we make it one click.' },
          ].map(b => (
            <div key={b.title} className="card !p-6">
              <div className="text-2xl mb-2">{b.icon}</div>
              <h3 className="text-sm font-extrabold text-[var(--color-text)] mb-1">{b.title}</h3>
              <p className="text-xs text-[var(--color-text-light)] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Selector + Export */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient to Export</label>
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select value={selected} onChange={e => setSelected(e.target.value)} className="field max-w-sm">
              <option value="">— Choose a patient —</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.patient.displayName}</option>)}
            </select>
          )}
        </div>

        {selected && profile && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card !p-6">
              <h3 className="text-base font-extrabold text-[var(--color-text)] mb-4">Export Preview</h3>
              <div className="space-y-2 text-xs text-[var(--color-text-light)] mb-4">
                <p><span className="font-semibold">Patient:</span> {profile.patient.displayName}</p>
                <p><span className="font-semibold">Diagnosis:</span> {profile.patient.primaryDiagnosis}</p>
                <p><span className="font-semibold">Contacts:</span> {profile.emergencyContacts.length}</p>
                <p><span className="font-semibold">Medications:</span> {profile.medications.length}</p>
                <p><span className="font-semibold">Tasks:</span> {profile.tasks.length}</p>
                <p><span className="font-semibold">Reminders:</span> {profile.notifications.length}</p>
              </div>
              <button
                onClick={handleDownload}
                className="btn btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
                Download JSON
              </button>
            </div>
            <div className="card !p-0 overflow-hidden">
              <div className="bg-[#faf8f5] px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-muted)]">care-plan-{profile.patient.displayName.toLowerCase().replace(/\s+/g, '-')}.json</span>
                <span className="text-[10px] font-bold uppercase text-[var(--color-muted)]">Preview</span>
              </div>
              <pre className="text-[10px] md:text-xs text-[var(--color-text)] p-4 overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                {JSON.stringify(profile, null, 2).slice(0, 2500)}{JSON.stringify(profile, null, 2).length > 2500 ? '\n...' : ''}
              </pre>
            </div>
          </div>
        )}

        {!selected && !loading && (
          <div className="card !p-8 text-center max-w-xl mx-auto">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2">Select a patient to preview the export</h3>
            <p className="text-sm text-[var(--color-text-light)] mb-5">
              Choose a demo profile above to see how Care Circle generates a structured care summary — medications, contacts, tasks, and notes — ready for any appointment.
            </p>
            <Link href="/features/cases/" className="btn btn-primary text-sm">Browse Care Plans</Link>
          </div>
        )}
      </div>
    </div>
  );
}
