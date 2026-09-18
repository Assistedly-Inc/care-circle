'use client';

import { useEffect, useState } from 'react';
import type { Medication } from '@/types';

export default function MedicationsFeaturePage() {
  const [profiles, setProfiles] = useState<{ id: string; patient: { displayName?: string } }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/care-profiles')
      .then((r) => r.json())
      .then((data) => setProfiles(data.patients || []));
  }, []);

  useEffect(() => {
    if (!selectedProfile) return;
    setLoading(true);
    fetch(`/api/care-profiles/${selectedProfile}/medications`)
      .then((r) => r.json())
      .then((data) => { setMedications(data.medications || []); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [selectedProfile]);

  return (
    <div>
      <h1>Medications Management</h1>
      <p>Track medications, verify sources, and maintain reconciliation across care settings.</p>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>name — medication name (required)</li>
          <li>dosage — dose amount (e.g., "10mg")</li>
          <li>schedule — frequency (e.g., "Daily 8 AM")</li>
          <li>source — hospital, pharmacy, or clinic origin</li>
          <li>verifiedAt — timestamp of last verification</li>
          <li>notes — additional clinical notes</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>GET /api/medications/:caseId — List medications</li>
          <li>POST /api/medications/:caseId — Add medication</li>
          <li>PATCH /api/medications/:caseId/:medId — Update medication</li>
          <li>POST /api/care-profiles/:id/medications/:medId/verify — Verify</li>
        </ul>
      </section>

      <section>
        <h2>Live Medication Data</h2>
        <label>
          Select Profile:
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">— Choose —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.patient?.displayName || p.id}</option>
            ))}
          </select>
        </label>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && medications.length === 0 && selectedProfile && <p>No medications for this profile.</p>}
        {medications.map((m) => (
          <article key={m.id}>
            <h3>{m.name}</h3>
            <span>{m.dosage || 'No dose'}</span>
            <span>{m.schedule}</span>
            <span>{m.source}</span>
            <span>{m.verifiedAt ? 'Verified' : 'Unverified'}</span>
            <p>{m.notes}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
