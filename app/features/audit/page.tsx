'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AuditLogEntry, CareProfile } from '@/types';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const actionColor: Record<string, string> = {
  create: 'bg-[#e6f0e9] text-[#2b5933]',
  update: 'bg-[#e0edfa] text-[#1d4d73]',
  delete: 'bg-[#f5e0e0] text-[#7a1f1f]',
  verify: 'bg-[#ede8f4] text-[#4a2b6b]',
  escalate: 'bg-[#f4e8e0] text-[#7a4514]',
};

export default function AuditFeaturePage() {
  const [profiles, setProfiles] = useState<CareProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingProfiles(true);
    fetch(`${API_BASE}/api/care-profiles`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProfiles(data.patients || []);
        setLoadingProfiles(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoadingProfiles(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedProfile) {
      setAuditLog([]);
      return;
    }
    setLoadingAudit(true);
    setError(null);
    fetch(`${API_BASE}/api/care-profiles/${encodeURIComponent(selectedProfile)}/audit`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAuditLog(data.auditLog || []);
        setLoadingAudit(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setLoadingAudit(false);
      });
  }, [selectedProfile]);

  const actions = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.action).filter(Boolean))),
    [auditLog]
  );
  const entities = useMemo(
    () => Array.from(new Set(auditLog.map((a) => a.entity).filter(Boolean))),
    [auditLog]
  );

  const filteredLog = useMemo(() => {
    const s = search.trim().toLowerCase();
    return auditLog.filter((entry) => {
      const matchesSearch =
        !s ||
        entry.action.toLowerCase().includes(s) ||
        entry.entity.toLowerCase().includes(s) ||
        (entry.entityId || '').toLowerCase().includes(s) ||
        (entry.userId || '').toLowerCase().includes(s);
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      const matchesEntity = entityFilter === 'all' || entry.entity === entityFilter;
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [auditLog, search, actionFilter, entityFilter]);

  const selectedProfileName = useMemo(() => {
    const p = profiles.find((pr) => pr.id === selectedProfile);
    return p?.patient?.displayName || p?.patient?.firstName || selectedProfile;
  }, [profiles, selectedProfile]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[2rem] font-extrabold text-[var(--color-text)] mb-3 leading-tight">
          Compliance &amp; Privacy
        </h1>
        <p className="text-[var(--color-text-light)] !text-[1.05rem] max-w-xl leading-relaxed">
          Every action is logged with before/after snapshots for accountability.
          Full transparency about how your data is handled, stored, and protected.
        </p>
      </div>

      {/* Security Architecture */}
      <section className="card !p-8 mb-10 border-[var(--color-border)]">
        <h2 className="text-xl font-extrabold text-[var(--color-text)] mb-2">How We Protect Your Data</h2>
        <p className="text-[var(--color-text-light)] mb-8 leading-relaxed">
          Your family&apos;s information deserves the highest standard of protection.
          Here&apos;s exactly how we keep it safe.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e9f2ee] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#587a6e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-text)] mb-1">HIPAA-Aware Logging</h3>
              <p className="text-[var(--color-text-light)] text-[0.95rem] leading-relaxed">
                Every access and modification is logged with timestamp, user, action, and full before/after snapshots.
                Nobody can alter a record without being traced.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#f4e8e0] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#8b4d3a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-text)] mb-1">Fine-Grained Access Control</h3>
              <p className="text-[var(--color-text-light)] text-[0.95rem] leading-relaxed">
                Family, caregivers, and professionals each see only what they need.
                You control who has access, and can revoke it at any time.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e8edf5] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#4a6b8a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-text)] mb-1">Global Edge Infrastructure</h3>
              <p className="text-[var(--color-text-light)] text-[0.95rem] leading-relaxed">
                Your data is stored securely and served from a global edge network
                for fast, reliable access anywhere in the world. No single point of failure.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#ede8f4] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#6a5290]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182c.45-.45.847-.858 1.205-1.225L18.597 7.218A10.5 10.5 0 0 0 3.195 17.76L4.031 9.865Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-[var(--color-text)] mb-1">Data Safekeeping</h3>
              <p className="text-[var(--color-text-light)] text-[0.95rem] leading-relaxed">
                Data is encrypted in transit and at rest. We maintain full backups
                with geographic distribution. Your records are never lost, never shared.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#faf8f5] rounded-xl p-6 border border-[var(--color-border)]">
          <h3 className="font-bold text-[var(--color-text)] mb-3">Our Infrastructure Commitment</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-[0.95rem] text-[var(--color-text-light)]">
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>300ms response times, globally</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Zero-downtime deployments</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>JWT-based authentication</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Full data export at any time</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Role-based access control</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Comprehensive audit trails</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="card !p-5 border-[var(--color-border)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)]">Total Entries</div>
          <div className="text-[1.75rem] font-extrabold text-[var(--color-text)] mt-1">{auditLog.length}</div>
        </div>
        <div className="card !p-5 border-[var(--color-border)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)]">Unique Actions</div>
          <div className="text-[1.75rem] font-extrabold text-[var(--color-text)] mt-1">{actions.length}</div>
        </div>
        <div className="card !p-5 border-[var(--color-border)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)]">Entity Types</div>
          <div className="text-[1.75rem] font-extrabold text-[var(--color-text)] mt-1">{entities.length}</div>
        </div>
        <div className="card !p-5 border-[var(--color-border)]">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-light)]">Profile</div>
          <div className="text-sm font-bold text-[var(--color-text)] mt-1 truncate">{selectedProfileName || '—'}</div>
        </div>
      </div>

      {/* Audit Log */}
      <section className="card !p-8 mb-10 border-[var(--color-border)]">
        <h2 className="text-xl font-extrabold text-[var(--color-text)] mb-2">Audit Trail</h2>
        <p className="text-[var(--color-text-light)] mb-8 leading-relaxed">
          Select a profile below to view every recorded action. You can search, filter by action type, expand any row to see before/after comparisons.
        </p>

        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="profile-select" className="block text-sm font-semibold text-[var(--color-text-light)] mb-1.5">
              Select Profile
            </label>
            <select
              id="profile-select"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[var(--color-border)] bg-white px-4 py-3 text-base text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            >
              <option value="">— Choose a profile —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.patient?.displayName || [p.patient?.firstName, p.patient?.lastName].filter(Boolean).join(' ') || p.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-semibold text-[var(--color-text-light)] mb-1.5">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by action, entity, ID, or user"
              className="w-full rounded-xl border-[1.5px] border-[var(--color-border)] bg-white px-4 py-3 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-light)]/50 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            />
          </div>

          <div className="w-full md:w-44">
            <label htmlFor="action-filter" className="block text-sm font-semibold text-[var(--color-text-light)] mb-1.5">
              Action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[var(--color-border)] bg-white px-4 py-3 text-base text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            >
              <option value="all">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-44">
            <label htmlFor="entity-filter" className="block text-sm font-semibold text-[var(--color-text-light)] mb-1.5">
              Entity
            </label>
            <select
              id="entity-filter"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[var(--color-border)] bg-white px-4 py-3 text-base text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            >
              <option value="all">All entities</option>
              {entities.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        </div>

        {loadingProfiles && <p className="text-sm text-[var(--color-text-light)]">Loading profiles…</p>}
        {loadingAudit && <p className="text-sm text-[var(--color-text-light)]">Loading audit log…</p>}
        {error && (
          <div className="rounded-xl border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5 px-5 py-4 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {!loadingAudit && !error && selectedProfile && filteredLog.length === 0 && (
          <p className="text-sm text-[var(--color-text-light)]">
            {auditLog.length === 0
              ? 'No audit entries for this profile.'
              : 'No entries match your current filters.'}
          </p>
        )}

        {!selectedProfile && !loadingProfiles && (
          <p className="text-sm text-[var(--color-text-light)]">Select a profile above to view its audit log.</p>
        )}

        {filteredLog.length > 0 && (
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full text-[0.95rem]">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)] text-left text-xs font-bold uppercase tracking-wider text-[var(--color-text-light)]">
                  <th className="px-3 py-3">Timestamp</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Entity</th>
                  <th className="px-3 py-3">Entity ID</th>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3 w-16" aria-label="Expand" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredLog.map((entry) => {
                  const isOpen = expandedId === entry.id;
                  const badgeClass = actionColor[entry.action] || 'bg-[#f3f0ec] text-[var(--color-text-light)]';
                  return (
                    <>
                      <tr
                        key={entry.id}
                        className="hover:bg-[#faf8f5] cursor-pointer transition-colors"
                        onClick={() => setExpandedId(isOpen ? null : entry.id)}
                      >
                        <td className="px-3 py-4 text-[var(--color-text)] whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </td>
                        <td className="px-3 py-4">
                          <span className={classNames('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', badgeClass)}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-[var(--color-text)]">{entry.entity}</td>
                        <td className="px-3 py-4 text-[var(--color-text-light)] font-mono text-xs">{entry.entityId || '—'}</td>
                        <td className="px-3 py-4 text-[var(--color-text-light)]">{entry.userId || 'System'}</td>
                        <td className="px-3 py-4 text-center">
                          <button type="button" aria-label={isOpen ? 'Collapse' : 'Expand'} className="text-[var(--color-text-light)] hover:text-[var(--color-text)] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }}>
                            ▼
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} className="bg-[#faf8f5] px-5 py-5">
                            <div className="grid gap-5 md:grid-cols-2">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-light)] mb-2">
                                  Before
                                </div>
                                <pre className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-xs text-[var(--color-text)] overflow-x-auto">
                                  {entry.beforeJson
                                    ? JSON.stringify((()=>{try{return JSON.parse(entry.beforeJson!)}catch{return entry.beforeJson}})(),null,2)
                                    : '—'}
                                </pre>
                              </div>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-light)] mb-2">
                                  After
                                </div>
                                <pre className="rounded-xl border border-[var(--color-border)] bg-white p-4 text-xs text-[var(--color-text)] overflow-x-auto">
                                  {entry.afterJson
                                    ? JSON.stringify((()=>{try{return JSON.parse(entry.afterJson!)}catch{return entry.afterJson}})(),null,2)
                                    : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Data Model + API */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="card !p-8 border-[var(--color-border)]">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-4">Data Model</h2>
          <ul className="space-y-3 text-[var(--color-text-light)] text-[0.95rem]">
            <li><span className="font-semibold text-[var(--color-text)]">timestamp</span> — when the action occurred</li>
            <li><span className="font-semibold text-[var(--color-text)]">userId</span> — who performed the action</li>
            <li><span className="font-semibold text-[var(--color-text)]">action</span> — create, update, delete, verify, escalate</li>
            <li><span className="font-semibold text-[var(--color-text)]">entity</span> — profile, medication, task, contact</li>
            <li><span className="font-semibold text-[var(--color-text)]">beforeJson / afterJson</span> — full state snapshots</li>
          </ul>
        </section>

        <section className="card !p-8 border-[var(--color-border)]">
          <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-4">API Endpoints</h2>
          <ul className="space-y-3 text-[var(--color-text-light)] text-[0.95rem]">
            <li className="font-mono text-sm bg-[#faf8f5] px-3 py-2 rounded-lg border border-[var(--color-border)]">GET /api/care-profiles</li>
            <li className="font-mono text-sm bg-[#faf8f5] px-3 py-2 rounded-lg border border-[var(--color-border)]">GET /api/care-profiles/:id/audit</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
