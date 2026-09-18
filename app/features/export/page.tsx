'use client';

import Link from 'next/link';

export default function ExportFeaturePage() {
  return (
    <div>
      <h1>Export &amp; Data Portability</h1>
      <p>Download structured care data for continuity, compliance, and patient portability rights.</p>

      <section>
        <h2>Available Exports</h2>
        <ul>
          <li>Care Profile — patient demographics, diagnoses, notes</li>
          <li>Medication List — all prescribed medications with doses and schedules</li>
          <li>Task History — completed, escalated, and open tasks with audit trail</li>
          <li>Emergency Contacts — current contacts for continuity</li>
          <li>Full Audit Log — regulatory-ready before/after snapshots</li>
        </ul>
      </section>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>GET /api/export — Returns export payload</li>
          <li>GET /api/care-profiles/:id/audit — Full audit history</li>
        </ul>
      </section>

      <section>
        <h2>Compliance</h2>
        <p>All exports include timestamps, actor attribution, and before/after states for regulatory review.</p>
        <p>Export formats: JSON, PDF (placeholder for generation pipeline).</p>
      </section>
    </div>
  );
}
