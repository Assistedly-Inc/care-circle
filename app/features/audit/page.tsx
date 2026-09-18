'use client';

import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '@/types';

export default function AuditFeaturePage() {
  const [profiles, setProfiles] = useState<{ id: string; patient: { displayName?: string } }[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
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
    fetch(`/api/care-profiles/${selectedProfile}/audit`)
      .then((r) => r.json())
      .then((data) => { setAuditLog(data.auditLog || []); setLoading(false); })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, [selectedProfile]);

  return (
    <div>
      <h1>Audit &amp; Compliance</h1>
      <p>Every action is logged with before/after snapshots for regulatory compliance and accountability.</p>

      <section>
        <h2>Data Model</h2>
        <ul>
          <li>timestamp — when the action occurred</li>
          <li>userId — who performed the action</li>
          <li>action — create, update, delete, verify, escalate</li>
          <li>entity — profile, medication, task, contact</li>
          <li>beforeJson / afterJson — full state snapshots</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>GET /api/care-profiles/:id/audit — Full audit trail</li>
        </ul>
      </section>

      <section>
        <h2>Live Audit Log</h2>
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
        {!loading && auditLog.length === 0 && selectedProfile && <p>No audit entries for this profile.</p>}
        {auditLog.map((entry) => (
          <article key={entry.id}>
            <h3>{entry.action}</h3>
            <p>Entity: {entry.entity} {entry.entityId}</p>
            <p>Time: {entry.timestamp}</p>
            <p>User: {entry.userId || 'System'}</p>
            <details>
              <summary>Before / After</summary>
              <pre>{entry.beforeJson ? JSON.stringify(JSON.parse(entry.beforeJson), null, 2) : '—'}</pre>
              <pre>{entry.afterJson ? JSON.stringify(JSON.parse(entry.afterJson), null, 2) : '—'}</pre>
            </details>
          </article>
        ))}
      </section>
    </div>
  );
}
