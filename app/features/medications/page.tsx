'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

interface Profile {
  id: string;
  patient: { displayName?: string };
}

interface Medication {
  id: string;
  name: string;
  dosage?: string;
  dose?: string;
  schedule?: string;
  source?: string;
  verifiedAt?: string | null;
  notes?: string;
}

export default function MedicationsFeaturePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    dose: '',
    schedule: '',
    source: '',
    notes: '',
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/care-profiles`)
      .then((r) => r.json())
      .then((data) => setProfiles(data.patients || []))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  function loadMedications(profileId: string) {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/care-profiles/${profileId}/medications`)
      .then((r) => r.json())
      .then((data) => {
        setMedications(data.medications || []);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
  }

  useEffect(() => {
    if (!selectedProfile) {
      setMedications([]);
      return;
    }
    loadMedications(selectedProfile);
  }, [selectedProfile]);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProfile) return;
    fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/medications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
      .then((r) => r.json())
      .then(() => {
        setForm({ name: '', dose: '', schedule: '', source: '', notes: '' });
        loadMedications(selectedProfile);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }

  function handleVerify(medId: string) {
    if (!selectedProfile) return;
    fetch(`${API_BASE}/api/care-profiles/${selectedProfile}/medications/${medId}/verify`, {
      method: 'POST',
    })
      .then((r) => r.json())
      .then(() => loadMedications(selectedProfile))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }

  return (
    <div>
      <h1>Medications Management</h1>
      <p>Track medications, verify sources, and maintain reconciliation across care settings.</p>

      <section>
        <label>
          Select Profile:{" "}
          <select value={selectedProfile} onChange={(e) => setSelectedProfile(e.target.value)}>
            <option value="">— Choose —</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.patient?.displayName || p.id}
              </option>
            ))}
          </select>
        </label>
      </section>

      {selectedProfile && (
        <section>
          <h2>Add Medication</h2>
          <form onSubmit={handleCreate}>
            <div>
              <label>
                Name:{" "}
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
            </div>
            <div>
              <label>
                Dose:{" "}
                <input value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
              </label>
            </div>
            <div>
              <label>
                Schedule:{" "}
                <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
              </label>
            </div>
            <div>
              <label>
                Source:{" "}
                <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </label>
            </div>
            <div>
              <label>
                Notes:{" "}
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
            </div>
            <button type="submit">Add</button>
          </form>
        </section>
      )}

      <section>
        <h2>Medications</h2>
        {loading && <p>Loading...</p>}
        {error && <p>Error: {error}</p>}
        {!loading && medications.length === 0 && selectedProfile && <p>No medications for this profile.</p>}
        {!selectedProfile && <p>Select a profile to view medications.</p>}

        {medications.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dose</th>
                <th>Schedule</th>
                <th>Source</th>
                <th>Verified</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.dosage || '—'}</td>
                  <td>{m.schedule || '—'}</td>
                  <td>{m.source || '—'}</td>
                  <td>{m.verifiedAt ? 'Yes' : 'No'}</td>
                  <td>{m.notes || '—'}</td>
                  <td>
                    <button onClick={() => handleVerify(m.id)}>Verify</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
