'use client';

import { useEffect, useState } from 'react';
import type { CareCase } from '@/types';

export default function CasesFeaturePage() {
  const [cases, setCases] = useState<CareCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cases/list')
      .then((r) => r.json())
      .then((data) => { setCases(data.cases || []); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, []);

  return (
    <div>
      <h1>Cases &amp; Care Coordination</h1>
      <p>Shared care profiles that connect families, caregivers, and healthcare professionals around a single patient record.</p>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>Case — patientName, patientDob, emergencyContact, dischargeNotes, consentGiven</li>
          <li>Coordinator — the healthcare professional managing the case</li>
          <li>Members — family and caregiver users linked with role-based access</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>GET /api/cases/list — List all cases with relations</li>
          <li>POST /api/cases/create — Create a new case</li>
          <li>GET /api/cases/:id — Fetch a single case</li>
        </ul>
      </section>

      <section>
        <h2>Live Cases</h2>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && cases.length === 0 && <p>No cases found.</p>}
        {cases.map((c) => (
          <article key={c.id}>
            <h3>{c.patientName}</h3>
            <p>DOB: {c.patientDob}</p>
            <p>Emergency: {c.emergencyContact}</p>
            <p>Coordinator: {c.coordinator?.name || c.coordinatorId}</p>
            <p>Medications: {c.medications?.length ?? 0}</p>
            <p>Tasks: {c.tasks?.length ?? 0}</p>
            <p>Members: {c.members?.length ?? 0}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
