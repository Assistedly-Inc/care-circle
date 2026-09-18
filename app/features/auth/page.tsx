'use client';

import { useState } from 'react';

export default function AuthFeaturePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div>
      <h1>Authentication &amp; Role-Based Access</h1>
      <p>Care Circle uses JWT-based authentication with role-based access control. Supported roles: Coordinator, Caregiver, Family Member.</p>

      <section>
        <h2>API Endpoints</h2>
        <ul>
          <li>POST /api/auth/login — Authenticate and receive JWT</li>
          <li>GET /api/auth/me — Fetch current user</li>
        </ul>
      </section>

      <section>
        <h2>Role Middleware</h2>
        <ul>
          <li>requireAuth — Require valid JWT on protected routes</li>
          <li>requireRole — Enforce role-based access (Coordinator, Caregiver, Family)</li>
          <li>auditMiddleware — Log every action with before/after snapshots</li>
        </ul>
      </section>

      <section>
        <h2>Try It</h2>
        <p>The backend demo returns a placeholder token for any credentials.</p>
        <form onSubmit={handleLogin}>
          <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <button type="submit">Login</button>
        </form>
        {result && <pre>{result}</pre>}
      </section>
    </div>
  );
}
