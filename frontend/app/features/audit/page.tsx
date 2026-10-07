'use client';

import { useEffect, useMemo, useState } from 'react';
import { DemoProfile, getDemoProfiles } from '@/lib/demoData';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

function generateAuditLog(profileId: string, profile: DemoProfile): AuditEntry[] {
  const base: AuditEntry[] = [
    { id: generateId(), timestamp: profile.updatedAt, user: 'System', action: 'create', entity: 'profile', entityId: profileId, details: `Created care profile for ${profile.patient.displayName}` },
    { id: generateId(), timestamp: new Date(new Date(profile.updatedAt).getTime() - 86400000).toISOString(), user: profile.emergencyContacts[0]?.name || 'Family Member', action: 'add_contact', entity: 'emergency-contact', entityId: 'ec-1', details: `Added ${profile.emergencyContacts[0]?.name || 'emergency contact'} as contact` },
  ];

  profile.medications.forEach((med, i) => {
    if (med.verified) {
      base.push({ id: generateId(), timestamp: new Date(new Date(profile.updatedAt).getTime() + (i + 1) * 3600000).toISOString(), user: 'Caregiver', action: 'verify', entity: 'medication', entityId: med.id, details: `Verified ${med.name} ${med.dose}` });
    }
  });

  profile.tasks.forEach((task, i) => {
    if (task.escalated) {
      base.push({ id: generateId(), timestamp: new Date(new Date(profile.updatedAt).getTime() + (i + 2) * 7200000).toISOString(), user: 'System', action: 'escalate', entity: 'task', entityId: task.id, details: `Escalated: ${task.title}` });
    }
    base.push({ id: generateId(), timestamp: new Date(new Date(profile.updatedAt).getTime() + (i + 1) * 3600000).toISOString(), user: task.owner || 'Family Member', action: 'update', entity: 'task', entityId: task.id, details: `Status ${task.status}: ${task.title}` });
  });

  base.push({ id: generateId(), timestamp: new Date().toISOString(), user: 'System', action: 'export', entity: 'profile', entityId: profileId, details: 'Exported care plan for primary care follow-up' });

  return base.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}

function generateId() {
  return 'a-' + Math.random().toString(36).slice(2, 9);
}

export default function AuditDemoPage() {
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setProfiles(getDemoProfiles()); setLoading(false); }, 400);
    return () => clearTimeout(t);
  }, []);

  const profile = useMemo(() => profiles.find(p => p.id === selectedProfile), [profiles, selectedProfile]);
  const auditLog = useMemo(() => {
    if (!profile) return [];
    return generateAuditLog(profile.id, profile);
  }, [profile]);

  const actions = useMemo(() => Array.from(new Set(auditLog.map(a => a.action))), [auditLog]);

  const filteredLog = useMemo(() => {
    const s = search.trim().toLowerCase();
    return auditLog.filter(entry => {
      const matchesSearch = !s || entry.action.includes(s) || entry.entity.includes(s) || entry.user.toLowerCase().includes(s);
      const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [auditLog, search, actionFilter]);

  return (
    <div className="pb-16">
      {/* Hero */}
      <div className="bg-[linear-gradient(135deg,#f4fbf8_0%,#f7fafc_100%)] border-b border-[var(--color-border)]">
        <div className="container py-10 md:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Compliance</p>
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-extrabold text-[var(--color-text)] mb-3 tracking-tight">
            Full accountability — who did what, and when
          </h1>
          <p className="text-[var(--color-text-light)] max-w-2xl leading-relaxed">
            Every access, update, and export is logged with a timestamp and user. Families and facilities get complete transparency into the care record.
          </p>
        </div>
      </div>

      <div className="container mt-8">
        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {[
            { icon: '🔍', title: 'Complete Transparency', desc: 'Every action leaves a trace. No one can modify a record without it being visible to everyone with access.' },
            { icon: '📄', title: 'Regulatory Ready', desc: 'Export full audit trails for compliance reviews, insurance claims, or facility inspections in seconds.' },
            { icon: '🛡️', title: 'Family Peace of Mind', desc: 'See who viewed, changed, or exported your loved one\'s records. Full visibility builds trust.' },
          ].map(b => (
            <div key={b.title} className="card !p-6">
              <div className="text-2xl mb-2">{b.icon}</div>
              <h3 className="text-sm font-extrabold text-[var(--color-text)] mb-1">{b.title}</h3>
              <p className="text-xs text-[var(--color-text-light)] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Profile selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">Select Patient</label>
          {loading ? (
            <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          ) : (
            <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)} className="field max-w-sm">
              <option value="">— Choose a patient —</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.patient.displayName}</option>)}
            </select>
          )}
        </div>

        {selectedProfile && profile && (
          <div className="card !p-6 md:!p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
              <div className="flex-1">
                <h2 className="text-lg font-extrabold text-[var(--color-text)] mb-1">Audit Trail</h2>
                <p className="text-sm text-[var(--color-text-light)]">{profile.patient.displayName} — {filteredLog.length} entries</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <input type="text" placeholder="Search actions, entities, users..." value={search} onChange={e => setSearch(e.target.value)} className="field text-xs min-w-[200px]" />
                <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="field text-xs w-auto">
                  <option value="all">All actions</option>
                  {actions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {filteredLog.length === 0 ? (
              <p className="text-sm text-[var(--color-text-light)]">No audit entries match your filters.</p>
            ) : (
              <div className="space-y-2">
                {filteredLog.map(entry => (
                  <div key={entry.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
                    <button
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#faf8f5] transition-colors"
                    >
                      <span className="text-xs text-[var(--color-muted)] whitespace-nowrap w-28 shrink-0 hidden sm:block">{formatDate(entry.timestamp)}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                        entry.action === 'create' ? 'bg-[#e6f0e9] text-[#2b5933]' :
                        entry.action === 'update' ? 'bg-[#e0edfa] text-[#1d4d73]' :
                        entry.action === 'verify' ? 'bg-[#ede8f4] text-[#4a2b6b]' :
                        entry.action === 'escalate' ? 'bg-[#f5e0e0] text-[#7a1f1f]' :
                        'bg-[#f3f0ec] text-[var(--color-text-light)]'
                      }`}>{entry.action}</span>
                      <span className="text-xs font-semibold text-[var(--color-text)] flex-1 truncate">{entry.details}</span>
                      <span className="text-xs text-[var(--color-muted)] hidden md:block">{entry.user}</span>
                      <svg className="w-4 h-4 text-[var(--color-muted)] shrink-0 transition-transform" style={{ transform: expandedId === entry.id ? 'rotate(180deg)' : undefined }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    {expandedId === entry.id && (
                      <div className="bg-[#faf8f5] px-5 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-light)] leading-relaxed">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold text-[var(--color-text)]">User:</span> {entry.user}
                          </div>
                          <div>
                            <span className="font-semibold text-[var(--color-text)]">Entity:</span> {entry.entity} ({entry.entityId})
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-semibold text-[var(--color-text)]">Full details:</span> {entry.details}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-semibold text-[var(--color-text)]">Timestamp:</span> {new Date(entry.timestamp).toISOString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
