'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

interface CareProfile {
  id: string;
  patient: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    primaryDiagnosis?: string;
  };
  emergencyContacts: { name: string; relationship?: string; phone?: string }[];
  medications: { name: string; dose: string }[];
  tasks: { title: string; status: string }[];
  status: string;
  updatedAt: string;
}

export default function CasesFeaturePage() {
  const [cases, setCases] = useState<CareProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles`);
      const data = await res.json();
      setCases(data.patients || []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container page-content">
      <div className="page-header">
        <div className="container">
          <h1>Cases &amp; Care Coordination</h1>
          <p>Shared care profiles that connect families, caregivers, and healthcare professionals around a single patient record.</p>
        </div>
      </div>
      <div className="container">
        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Data Model</h2>
          <ul>
            <li>Case — patient displayName, dateOfBirth, diagnosis, status</li>
            <li>Emergency Contacts — linked to each care profile</li>
            <li>Members — implied through profile access</li>
          </ul>
        </section>

        <section className="card">
          <h2 className="siteSurfaceSectionTitle">API Endpoints</h2>
          <ul>
            <li>GET /api/care-profiles — List all profiles</li>
            <li>POST /api/care-profiles — Create profile</li>
            <li>GET /api/care-profiles/:id — Single profile</li>
          </ul>
        </section>

        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="siteSurfaceSectionTitle m-0">Live Cases</h2>
            <button className="btn btn-sm btn-secondary" onClick={load}>Refresh</button>
          </div>
          {loading && <p>Loading...</p>}
          {error && <p className="text-[var(--color-danger)]">Error: {error}</p>}
          {!loading && cases.length === 0 && <p>No cases found.</p>}
          <div className="grid-2">
            {cases.map((c) => (
              <article key={c.id} className="card">
                <h3>{c.patient?.displayName || `${c.patient?.firstName} ${c.patient?.lastName}` || 'Unnamed'}</h3>
                <span className="badge badge-muted">{c.status}</span>
                <p>DOB: {c.patient?.dateOfBirth || '—'}</p>
                <p>Diagnosis: {c.patient?.primaryDiagnosis || '—'}</p>
                <p>Contacts: {c.emergencyContacts?.length ?? 0}</p>
                <p>Medications: {c.medications?.length ?? 0}</p>
                <p>Tasks: {c.tasks?.length ?? 0}</p>
                <p className="text-xs text-[var(--color-text-light)]">Updated: {new Date(c.updatedAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
