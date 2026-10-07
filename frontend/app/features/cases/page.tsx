'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoProfile, generateId, getDemoProfiles } from '@/lib/demoData';

export default function CasesDemoPage() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    leadName: '',
    leadEmail: '',
    leadRole: 'family',
    patientFirstName: '',
    patientLastName: '',
    diagnosis: '',
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setProfiles(getDemoProfiles());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const statusCount = useMemo(() => {
    return profiles.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [profiles]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leadName.trim() || !form.leadEmail.trim() || !form.patientFirstName.trim()) return;

    const newProfile: DemoProfile = {
      id: generateId(),
      patient: {
        displayName: `${form.patientFirstName} ${form.patientLastName}`.trim(),
        firstName: form.patientFirstName,
        lastName: form.patientLastName,
        dateOfBirth: '—',
        primaryDiagnosis: form.diagnosis || 'Pending intake',
        gender: '—',
        phone: '—',
        address: '—',
      },
      emergencyContacts: [],
      medications: [],
      tasks: [],
      notifications: [],
      status: 'pending',
      updatedAt: new Date().toISOString(),
    };

    setProfiles(prev => [newProfile, ...prev]);
    setShowForm(false);
    setSubmitted(true);
  }

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Care Plans</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Shared care transitions that keep everyone connected
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed mb-6">
            Every discharge plan lives in one place — medications, follow-ups, contacts, and daily tasks. Families, caregivers, and facilities stay in sync through the first 30 days.
          </p>
          {!showForm && !submitted && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary btn-lg">
              Create a Demo Care Plan
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            </button>
          )}
          {submitted && (
            <div className="inline-flex items-center gap-2 bg-[#d1fae5] text-[#065f46] px-5 py-3 rounded-[var(--radius-md)] font-semibold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
              Submitted! A care specialist will follow up within 24 hours.
            </div>
          )}
        </div>
      </div>

      {/* Lead + Create Form */}
      {showForm && (
        <div className="container mt-8">
          <div className="card !p-6 md:!p-8 max-w-2xl mx-auto border border-[var(--color-accent)]/20">
            <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-1">Start a Care Transition</h2>
            <p className="text-sm text-[var(--color-text-light)] mb-6">Fill in your details and a demo care plan will be created. A specialist will reach out to help you set up the real thing.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Your Name</label>
                  <input required type="text" value={form.leadName} onChange={e => setForm(f => ({ ...f, leadName: e.target.value }))} className="field w-full" placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Email</label>
                  <input required type="email" value={form.leadEmail} onChange={e => setForm(f => ({ ...f, leadEmail: e.target.value }))} className="field w-full" placeholder="jane@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Your Role</label>
                <select value={form.leadRole} onChange={e => setForm(f => ({ ...f, leadRole: e.target.value }))} className="field w-full">
                  <option value="family">Family Member</option>
                  <option value="caregiver">Professional Caregiver</option>
                  <option value="facility">Facility / Discharge Planner</option>
                  <option value="patient">Patient / Loved One</option>
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Patient First Name</label>
                  <input required type="text" value={form.patientFirstName} onChange={e => setForm(f => ({ ...f, patientFirstName: e.target.value }))} className="field w-full" placeholder="Margaret" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Patient Last Name</label>
                  <input type="text" value={form.patientLastName} onChange={e => setForm(f => ({ ...f, patientLastName: e.target.value }))} className="field w-full" placeholder="Chen" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">Primary Diagnosis / Reason</label>
                <input type="text" value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} className="field w-full" placeholder="e.g. Total Knee Replacement" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn btn-primary">Create Demo Plan</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="container mt-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Plans', value: statusCount.active || 0, color: 'text-[var(--color-primary)]' },
            { label: 'Pending', value: statusCount.pending || 0, color: 'text-[var(--color-accent)]' },
            { label: 'Contacts', value: profiles.reduce((a, p) => a + p.emergencyContacts.length, 0), color: 'text-[var(--color-secondary)]' },
            { label: 'Tasks', value: profiles.reduce((a, p) => a + p.tasks.length, 0), color: 'text-[#4a6b8a]' },
          ].map(s => (
            <div key={s.label} className="card text-center !p-5">
              <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-[var(--color-muted)] uppercase mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Profile List */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--color-text-light)]">Loading care plans...</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map(p => (
            <article key={p.id} className={`card group hover:-translate-y-1 transition-transform ${p.status === 'pending' ? 'border-l-4 border-l-[var(--color-accent)]' : 'border-l-4 border-l-[var(--color-primary)]'}`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-extrabold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                  {p.patient.displayName}
                </h3>
                <span className={`badge text-xs font-bold px-2 py-0.5 ${p.status === 'active' ? 'bg-[#d1fae5] text-[#065f46]' : 'bg-[#dbeafe] text-[#1e40af]'}`}>
                  {p.status}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-light)] mb-1 leading-relaxed">{p.patient.primaryDiagnosis}</p>
              <div className="flex flex-wrap gap-2 my-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[var(--color-primary)]/8 text-[var(--color-primary)] px-2 py-0.5 rounded-md">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.5-4.5S12 5.765 12 8.25c0 1.734.999 3.219 2.456 4.042M12 8.25a4.5 4.5 0 0 1-4.5-4.5S7.5 3.765 12 3.765 16.5 5.765 16.5 8.25c0 1.734-.999 3.219-2.456 4.042"/></svg>
                  {p.emergencyContacts.length} contacts
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded-md">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"/></svg>
                  {p.medications.length} meds
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] px-2 py-0.5 rounded-md">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  {p.tasks.length} tasks
                </span>
              </div>
              <div className="text-xs text-[var(--color-muted)] border-t border-[var(--color-border)] pt-3 mt-1">
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </div>
            </article>
          ))}
          {profiles.length === 0 && !loading && (
            <p className="text-[var(--color-text-light)] col-span-full">No care plans yet. Create your first one above.</p>
          )}
        </div>
      </div>
    </div>
  );
}
