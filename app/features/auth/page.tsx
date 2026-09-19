'use client';

import { useState } from 'react';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

export default function AuthFeaturePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setResult('Note: Auth endpoint is not yet implemented in this Cloudflare Workers backend.\n\nThe backend currently serves:\n- /api/health — health check\n- /api/care-profiles — full CRUD for care profiles\n- /api/task-templates — task template definitions\n- Profile sub-routes: /medications, /tasks, /audit, /emergency-contacts, /discharge-instructions');
  }

  return (
    <div className="container page-content">
      <div className="page-header">
        <div className="container">
          <h1>Authentication &amp; Role-Based Access</h1>
          <p>Care Circle uses role-based access control. In the Cloudflare Workers backend, access is currently open for demo purposes.</p>
        </div>
      </div>
      <div className="container">
        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Role Middleware Architecture</h2>
          <div className="grid-2">
            <div>
              <h3 className="font-bold mb-2">requireAuth</h3>
              <p className="text-sm text-[var(--color-text-light)]">Require valid JWT on protected routes. Currently returns demo token for any credentials.</p>
            </div>
            <div>
              <h3 className="font-bold mb-2">requireRole</h3>
              <p className="text-sm text-[var(--color-text-light)]">Enforce role-based access (Coordinator, Caregiver, Family). Implemented in backend middleware.</p>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Supported Roles</h2>
          <ul className="space-y-2">
            <li><strong>Coordinator</strong> — Full read/write access, can create cases, assign members</li>
            <li><strong>Caregiver</strong> — Can update tasks, verify medications, log health observations</li>
            <li><strong>Family</strong> — Read-only access to care profiles, export data</li>
          </ul>
        </section>

        <section className="card">
          <h2 className="siteSurfaceSectionTitle">Audit Middleware</h2>
          <p>Every action is logged with before/after snapshots via KV storage. See the <a href="/features/audit">Audit page</a> for live audit logs.</p>
        </section>
      </div>
    </div>
  );
}
