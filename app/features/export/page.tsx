'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

interface Profile {
  id: string;
  patient: { displayName?: string };
}

export default function ExportFeaturePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<object | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/care-profiles`).then(r => r.json()).then(d => setProfiles(d.patients || []));
  }, []);

  async function handleExport() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${selected}`);
      setData(await res.json());
    } catch (e) {
      setData({ error: String(e) });
    }
    setLoading(false);
  }

  function handleDownload() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-profile-${selected}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div className="container">
          <h1>Export &amp; Data Portability</h1>
          <p>Download structured care data for continuity, compliance, and patient portability rights.</p>
        </div>
      </div>
      <div className="container">
        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Export Full Profile</h2>
          <label>Select Profile</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">— Choose —</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.patient?.displayName || p.id}</option>)}
          </select>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-primary" disabled={!selected || loading} onClick={handleExport}>Export JSON</button>
            {data && <button className="btn btn-secondary" onClick={handleDownload}>Download File</button>}
          </div>
          {loading && <p className="mt-3">Loading...</p>}
          {data && <pre className="mt-3">{JSON.stringify(data, null, 2)}</pre>}
        </section>
      </div>
    </div>
  );
}
