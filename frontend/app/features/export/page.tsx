'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cases } from '@/lib/api';
import { getDemoProfiles } from '@/lib/demoData';

const isDemoId = (id: string) => id.startsWith('demo-') || id.startsWith('local-');

/** Sample case shown to visitors so export is usable without an account. */
function demoCaseView() {
  const d = getDemoProfiles()[0];
  return {
    id: d.id,
    patientName: d.patient.displayName,
    patientDob: d.patient.dateOfBirth,
    emergencyContacts: d.emergencyContacts,
    medications: d.medications,
    tasks: d.tasks,
    notifications: d.notifications,
    dischargeNotes: d.patient.primaryDiagnosis,
    status: d.status,
    updatedAt: d.updatedAt,
  };
}

/** Care-plan JSON payload for the client-side demo export. */
function buildDemoExportJson(p: any) {
  return {
    exportedAt: new Date().toISOString(),
    source: 'demo-sample-data',
    patient: {
      id: p.id,
      name: p.patientName,
      dateOfBirth: p.patientDob,
      primaryDiagnosis: p.dischargeNotes,
      emergencyContacts: p.emergencyContacts || [],
    },
    medications: p.medications || [],
    tasks: p.tasks || [],
    notifications: p.notifications || [],
    dischargeNotes: p.dischargeNotes,
  };
}

export default function ExportPage() {
  const [casesList, setCasesList] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await cases.list();
        if (cancelled) return;
        if (list && list.length > 0) {
          setCasesList(list);
          setDemoMode(false);
          setError(null);
        } else {
          // No cases yet → sample data so visitors can try export now.
          const demo = demoCaseView();
          setCasesList([demo]);
          setSelected(demo.id);
          setDemoMode(true);
          setError(null);
        }
      } catch (e) {
        // Visitors without a session hit the auth-required backend → sample data.
        if (cancelled) return;
        const demo = demoCaseView();
        setCasesList([demo]);
        setSelected(demo.id);
        setDemoMode(true);
        setError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const profile = useMemo(() => casesList.find((c) => c.id === selected), [casesList, selected]);

  function handleDownload() {
    if (!profile) return;
    setExporting(true);
    setMessage(null);
    if (isDemoId(profile.id)) {
      // Demo ids have no backend case → build the export client-side.
      const json = JSON.stringify(buildDemoExportJson(profile), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'margaret-chen-care-plan.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('Demo care plan JSON downloaded — check your downloads folder.');
      setExporting(false);
      return;
    }
    const a = document.createElement('a');
    a.href = `/api/export?caseId=${profile.id}`;
    a.download = `care-plan-${profile.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setMessage('PDF export downloaded — check your downloads folder.');
    setExporting(false);
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
            Export a patient's complete care plan — medications, tasks, discharge instructions — as a portable record for providers, facilities, and family.
          </p>
        </div>
      </div>

      {/* Demo-mode notice (sample data for visitors) */}
      {demoMode && (
        <div className="container mt-6">
          <div className="card !p-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--color-accent)]/30 bg-[#fdf9f3]">
            <p className="text-sm text-[var(--color-text-light)] leading-relaxed">
              <span className="font-bold text-[var(--color-accent)]">Demo mode — </span>
              you&apos;re exploring sample data export.{' '}
              <Link href="/features/auth/" className="font-semibold text-[var(--color-primary)] hover:underline">
                Sign in
              </Link>{' '}
              to export real care plans.
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
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="field max-w-sm"
            >
              <option value="">— Choose a patient —</option>
              {casesList.map((c) => (
                <option key={c.id} value={c.id}>{c.patientName}</option>
              ))}
            </select>
          )}
        </div>

        {selected && profile && (
          <div className="card !p-6 max-w-xl">
            <h3 className="text-base font-extrabold text-[var(--color-text)] mb-2">{profile.patientName}</h3>
            <p className="text-sm text-[var(--color-text-light)] mb-4">
              DOB: {profile.patientDob ? new Date(profile.patientDob).toLocaleDateString() : '—'}
              {profile.admissionAt ? ` · Admitted: ${new Date(profile.admissionAt).toLocaleDateString()}` : ''}
              {profile.dischargeAt ? ` · Discharged: ${new Date(profile.dischargeAt).toLocaleDateString()}` : ''}
            </p>

            <button
              onClick={handleDownload}
              disabled={exporting}
              className="btn btn-primary"
            >
              {exporting ? 'Exporting…' : 'Export Care Plan'}
            </button>
            {message && <p className="text-sm text-[var(--color-muted)] mt-3">{message}</p>}

            <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
              <Link href="/features/cases/" className="text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-secondary)] transition-colors">
                ← Back to Care Plans
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}