'use client';

import { useEffect, useState } from 'react';
import type { CareProfile } from '@/types';

export default function HealthFeaturePage() {
  const [profiles, setProfiles] = useState<CareProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/care-profiles')
      .then((r) => r.json())
      .then((data) => { setProfiles(data.patients || []); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, []);

  return (
    <div>
      <h1>Health Tracking &amp; Care Profiles</h1>
      <p>Complete care profiles with demographics, emergency contacts, discharge instructions, consent, tasks, and medications.</p>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>Patient — name, DOB, age, gender, phone, address, diagnosis, notes</li>
          <li>Emergency Contacts — name, relationship, phone, email</li>
          <li>Discharge Instructions — summary, redFlags, activity, diet, followUp</li>
          <li>Consent — given, scope, givenBy, givenAt</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>GET /api/care-profiles — List all profiles</li>
          <li>POST /api/care-profiles — Create profile</li>
          <li>GET /api/care-profiles/:id — Single profile</li>
          <li>PUT /api/care-profiles/:id — Update profile</li>
          <li>PUT /api/care-profiles/:id/emergency-contacts — Update contacts</li>
          <li>PUT /api/care-profiles/:id/discharge-instructions — Update discharge</li>
        </ul>
      </section>

      <section>
        <h2>Live Profiles</h2>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && profiles.length === 0 && <p>No profiles found.</p>}
        {profiles.map((p) => (
          <article key={p.id}>
            <h3>{p.patient.displayName || `${p.patient.firstName} ${p.patient.lastName}`}</h3>
            <p>DOB: {p.patient.dateOfBirth}</p>
            <p>Diagnosis: {p.patient.primaryDiagnosis}</p>
            <p>Status: {p.status}</p>
            <p>Contacts: {p.emergencyContacts?.length ?? 0}</p>
            <p>Medications: {p.medications?.length ?? 0}</p>
            <p>Tasks: {p.tasks?.length ?? 0}</p>
            <details>
              <summary>Discharge Instructions</summary>
              <p>{p.dischargeInstructions?.summary}</p>
              <p>Follow-up: {p.dischargeInstructions?.followUp}</p>
              <p>Red flags: {(p.dischargeInstructions?.redFlags || []).join(', ')}</p>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
