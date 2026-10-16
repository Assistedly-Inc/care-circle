'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getDemoProfiles } from '@/lib/demoData';

const API_BASE = 'https://care-backend-mvp.forwardjump-com198.workers.dev';

type EmergencyContact = {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
};

type DischargeInstructions = {
  summary?: string;
  dischargeDate?: string;
  followUp?: string;
  redFlags?: string[];
  activity?: string;
  diet?: string;
};

type CareProfile = {
  id: string;
  patient: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    dateOfBirth?: string;
    age?: string;
    gender?: string;
    phone?: string;
    address?: string;
    primaryDiagnosis?: string;
    notes?: string;
  };
  emergencyContacts: EmergencyContact[];
  dischargeInstructions: DischargeInstructions;
  consent: {
    given: boolean;
    scope?: string;
    givenBy?: string;
    givenAt?: string | null;
  };
  medications?: {
    id: string;
    name: string;
    dose: string;
    schedule: string;
    source?: string;
    verified: boolean;
  }[];
  tasks?: {
    id: string;
    title: string;
    owner?: string;
    status: string;
    description?: string;
    escalated?: boolean;
  }[];
  status: string;
};

/** Sample care profiles shown to visitors so health tracking is interactive immediately. */
function demoCareProfiles(): CareProfile[] {
  return getDemoProfiles().map((d) => ({
    id: d.id,
    patient: {
      displayName: d.patient.displayName,
      firstName: d.patient.firstName,
      lastName: d.patient.lastName,
      dateOfBirth: d.patient.dateOfBirth,
      primaryDiagnosis: d.patient.primaryDiagnosis,
      gender: d.patient.gender,
      phone: d.patient.phone,
      address: d.patient.address,
      notes: (d.tasks || []).map((t) => `${t.title}${t.description ? ` — ${t.description}` : ''}`).join('\n'),
    },
    emergencyContacts: (d.emergencyContacts || []).map((c) => ({
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      email: c.email,
    })),
    medications: (d.medications || []).map((m) => ({
      id: m.id,
      name: m.name,
      dose: m.dose,
      schedule: m.schedule,
      source: m.source,
      verified: m.verified,
    })),
    tasks: (d.tasks || []).map((t) => ({
      id: t.id,
      title: t.title,
      owner: t.owner,
      status: t.status,
      description: t.description,
      escalated: t.escalated,
    })),
    dischargeInstructions: {
      summary: `${d.patient.primaryDiagnosis} recovery plan. ${
        (d.notifications || []).filter((n) => n.type === 'Check-in').length
      } check-in reminder(s) scheduled.`,
      followUp: (d.tasks || []).find((t) => /follow[- ]?up/i.test(t.title))?.title || 'Follow-up scheduled per care team.',
      redFlags: (d.tasks || []).filter((t) => t.escalated).map((t) => t.title),
      activity: (d.tasks || []).find((t) => t.owner === d.patient.displayName)?.title || '—',
      diet: 'Follow discharge nutrition guidance.',
      dischargeDate: (d.updatedAt || '').slice(0, 10) || undefined,
    },
    consent: {
      given: true,
      scope: 'Sample demo data — no real patient information.',
      givenBy: d.patient.displayName,
      givenAt: d.updatedAt || null,
    },
    status: d.status === 'pending' ? 'PENDING' : 'ACTIVE',
  }));
}

const isDemoId = (id: string) => id.startsWith('demo-') || id.startsWith('local-');

function Loading() {
  return <p style={{ color: '#64748b' }}>Loading profiles...</p>;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const colors: Record<string, React.CSSProperties> = {
    primary: { background: '#2563eb', color: '#fff', border: '1px solid #2563eb' },
    secondary: { background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' },
    danger: { background: '#ef4444', color: '#fff', border: '1px solid #ef4444' },
    ghost: { background: 'transparent', color: '#475569', border: '1px solid transparent' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: 14,
        ...colors[variant],
      }}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 6,
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          fontSize: 14,
          background: '#fff',
        }}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
  );
}

export default function HealthFeaturePage() {
  const [profiles, setProfiles] = useState<CareProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedProfile, setSelectedProfile] = useState<CareProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const patients = data.patients || [];
      if (patients.length === 0) {
        // No care profiles yet → sample data so visitors can try health tracking now.
        setProfiles(demoCareProfiles());
        setDemoMode(true);
        setError(null);
      } else {
        setProfiles(patients);
        setDemoMode(false);
        setError(null);
      }
    } catch (e: unknown) {
      // Visitors without a session hit the auth-required backend → sample data.
      setProfiles(demoCareProfiles());
      setDemoMode(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const backToList = useCallback(() => {
    setView('list');
    setSelectedProfile(null);
    if (!demoMode) fetchProfiles();
  }, [fetchProfiles, demoMode]);

  const refreshAndShow = useCallback(
    async (profileId?: string) => {
      if (profileId && isDemoId(profileId)) return; // demo data lives in local state
      await fetchProfiles();
      if (profileId) {
        const res = await fetch(`${API_BASE}/api/care-profiles/${profileId}`);
        if (res.ok) {
          const data = await res.json();
          setSelectedProfile(data.patient || data);
        }
      }
    },
    [fetchProfiles]
  );

  async function createProfile(form: Record<string, string>) {
    setSaving(true);
    if (demoMode) {
      // Demo: create the profile locally so visitors can try the flow.
      const local: CareProfile = {
        id: `local-${Date.now()}`,
        status: form.status || 'ACTIVE',
        patient: {
          displayName: form.displayName,
          dateOfBirth: form.dateOfBirth,
          primaryDiagnosis: form.primaryDiagnosis,
          notes: form.notes,
        },
        emergencyContacts: [],
        dischargeInstructions: { redFlags: [] },
        consent: { given: false },
      };
      setProfiles((prev) => [...prev, local]);
      setSelectedProfile(local);
      setView('detail');
      setSaving(false);
      return;
    }
    try {
      const body: Partial<CareProfile> = {
        status: form.status || 'ACTIVE',
        patient: {
          displayName: form.displayName,
          dateOfBirth: form.dateOfBirth,
          primaryDiagnosis: form.primaryDiagnosis,
          notes: form.notes,
        },
        emergencyContacts: [],
        dischargeInstructions: { redFlags: [] },
        consent: { given: false },
      };
      const res = await fetch(`${API_BASE}/api/care-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to create profile');
      const created = await res.json();
      setSelectedProfile(created.patient || created);
      setView('detail');
      await fetchProfiles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function updateProfile(profileId: string, body: Partial<CareProfile>) {
    setSaving(true);
    if (isDemoId(profileId)) {
      // Demo: apply updates locally so visitors can try the flow.
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, ...body } : p)));
      setSelectedProfile((prev) => (prev && prev.id === profileId ? { ...prev, ...body } : prev));
      setSaving(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/care-profiles/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      setSelectedProfile(updated.patient || updated);
      await fetchProfiles();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
      <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', margin: 0 }}>Health Tracking & Care Profiles</h1>
          <p style={{ color: '#475569', margin: '6px 0 0' }}>Complete care profiles with demographics, emergency contacts, discharge instructions, and consent.</p>
        </div>
        {view === 'list' && <Button onClick={() => setView('create')}>+ New Profile</Button>}
        {view !== 'list' && <Button variant="secondary" onClick={backToList}>← Back to List</Button>}
      </header>

      {demoMode && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #f59e0b',
            background: '#fdf9f3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.5 }}>
            <strong style={{ color: '#b45309' }}>Demo mode — </strong>
            you&apos;re exploring sample health tracking.{' '}
            <Link href="/features/auth" style={{ fontWeight: 600, color: '#2563eb' }}>
              Sign in
            </Link>{' '}
            to manage real care plans.
          </p>
        </div>
      )}

      {view === 'list' && (
        <section>
          {loading && <Loading />}
          {error && (
            <Card style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
              <p style={{ color: '#991b1b', fontWeight: 600 }}>Error loading profiles</p>
              <p style={{ color: '#991b1b', fontSize: 14 }}>{error}</p>
              <Button variant="secondary" onClick={fetchProfiles}>Retry</Button>
            </Card>
          )}
          {!loading && profiles.length === 0 && !error && (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#64748b', fontSize: 16 }}>No care profiles found.</p>
              <Button onClick={() => setView('create')}>Create your first profile →</Button>
            </Card>
          )}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {profiles.map((p) => {
              const name =
                p.patient.displayName ||
                `${p.patient.firstName || ''} ${p.patient.lastName || ''}`.trim() ||
                'Unnamed Patient';
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProfile(p);
                    setView('detail');
                  }}
                  style={{
                    textAlign: 'left',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{name}</h3>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: p.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                        color: p.status === 'ACTIVE' ? '#166534' : '#334155',
                      }}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.6 }}>
                    <p style={{ margin: 0 }}>
                      <strong>DOB:</strong>{' '}
                      {p.patient.dateOfBirth ? new Date(p.patient.dateOfBirth).toLocaleDateString() : '—'}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Diagnosis:</strong> {p.patient.primaryDiagnosis || '—'}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Gender:</strong> {p.patient.gender || '—'}
                    </p>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
                    <span>{p.emergencyContacts?.length ?? 0} contacts</span>
                    <span>{p.dischargeInstructions?.redFlags?.length ?? 0} red flags</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {view === 'create' && <CreateProfileForm onSubmit={createProfile} saving={saving} />}

      {view === 'detail' && selectedProfile && (
        <ProfileDetail
          profile={selectedProfile}
          onUpdate={(partial) => updateProfile(selectedProfile.id, partial)}
          onRefresh={() => refreshAndShow(selectedProfile.id)}
          saving={saving}
        />
      )}
    </div>
  );
}

function CreateProfileForm({
  onSubmit,
  saving,
}: {
  onSubmit: (form: Record<string, string>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    displayName: '',
    dateOfBirth: '',
    primaryDiagnosis: '',
    notes: '',
    status: 'ACTIVE',
  });

  return (
    <Card>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginTop: 0 }}>Create Profile</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <Input label="Display Name" value={form.displayName} onChange={(v) => setForm((s) => ({ ...s, displayName: v }))} />
        <Input label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm((s) => ({ ...s, dateOfBirth: v }))} />
        <Input label="Primary Diagnosis" value={form.primaryDiagnosis} onChange={(v) => setForm((s) => ({ ...s, primaryDiagnosis: v }))} />
        <Input label="Notes" value={form.notes} onChange={(v) => setForm((s) => ({ ...s, notes: v }))} />
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 6,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              background: '#fff',
            }}
          >
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>DISCHARGED</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button type="submit" variant="primary">
            {saving ? 'Saving…' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ProfileDetail({
  profile,
  onUpdate,
  onRefresh,
  saving,
}: {
  profile: CareProfile;
  onUpdate: (partial: Partial<CareProfile>) => void;
  onRefresh: () => void;
  saving: boolean;
}) {
  const [patient, setPatient] = useState(profile.patient);
  const [contacts, setContacts] = useState<EmergencyContact[]>(profile.emergencyContacts || []);
  const [instructions, setInstructions] = useState<DischargeInstructions>(profile.dischargeInstructions || { redFlags: [] });
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  useEffect(() => {
    setPatient(profile.patient);
    setContacts(profile.emergencyContacts || []);
    setInstructions(profile.dischargeInstructions || { redFlags: [] });
  }, [profile]);

  const name = patient.displayName || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unnamed Patient';

  function saveAll() {
    const updates: Partial<CareProfile> = {
      patient,
      emergencyContacts: contacts,
      dischargeInstructions: instructions,
    };
    onUpdate(updates);
    setMode('view');
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>{name}</h2>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 999,
              background: profile.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
              color: profile.status === 'ACTIVE' ? '#166534' : '#334155',
            }}
          >
            {profile.status}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {mode === 'view' ? (
            <>
              <Button variant="secondary" onClick={onRefresh}>
                Refresh
              </Button>
              <Button variant="primary" onClick={() => setMode('edit')}>
                Edit
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setMode('view')}>
                Cancel
              </Button>
              <Button variant="primary" onClick={saveAll}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <Section title="Patient Information">
          {mode === 'view' ? (
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, fontSize: 14, color: '#334155' }}>
              <div>
                <dt style={{ fontWeight: 600 }}>Display Name</dt>
                <dd style={{ margin: 0 }}>{patient.displayName || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>First Name</dt>
                <dd style={{ margin: 0 }}>{patient.firstName || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Last Name</dt>
                <dd style={{ margin: 0 }}>{patient.lastName || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Date of Birth</dt>
                <dd style={{ margin: 0 }}>{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Gender</dt>
                <dd style={{ margin: 0 }}>{patient.gender || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Phone</dt>
                <dd style={{ margin: 0 }}>{patient.phone || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Address</dt>
                <dd style={{ margin: 0 }}>{patient.address || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Primary Diagnosis</dt>
                <dd style={{ margin: 0 }}>{patient.primaryDiagnosis || '—'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt style={{ fontWeight: 600 }}>Notes</dt>
                <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{patient.notes || '—'}</dd>
              </div>
            </dl>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0 16px' }}>
              <Input label="Display Name" value={patient.displayName || ''} onChange={(v) => setPatient((s) => ({ ...s, displayName: v }))} />
              <Input label="First Name" value={patient.firstName || ''} onChange={(v) => setPatient((s) => ({ ...s, firstName: v }))} />
              <Input label="Last Name" value={patient.lastName || ''} onChange={(v) => setPatient((s) => ({ ...s, lastName: v }))} />
              <Input label="Date of Birth" type="date" value={patient.dateOfBirth || ''} onChange={(v) => setPatient((s) => ({ ...s, dateOfBirth: v }))} />
              <Input label="Gender" value={patient.gender || ''} onChange={(v) => setPatient((s) => ({ ...s, gender: v }))} />
              <Input label="Phone" value={patient.phone || ''} onChange={(v) => setPatient((s) => ({ ...s, phone: v }))} />
              <Input label="Address" value={patient.address || ''} onChange={(v) => setPatient((s) => ({ ...s, address: v }))} />
              <Input label="Primary Diagnosis" value={patient.primaryDiagnosis || ''} onChange={(v) => setPatient((s) => ({ ...s, primaryDiagnosis: v }))} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Input label="Notes" value={patient.notes || ''} onChange={(v) => setPatient((s) => ({ ...s, notes: v }))} />
              </div>
            </div>
          )}
        </Section>

        <Section title="Medications">
          {mode === 'view' ? (
            (profile.medications || []).length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {(profile.medications || []).map((m) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{m.name}</div>
                    <div style={{ color: '#475569' }}>{m.dose} · {m.schedule}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: m.verified ? '#065f46' : '#c4956a', background: m.verified ? '#d1fae5' : '#fbeedf', padding: '2px 8px', borderRadius: 999 }}>
                      {m.verified ? 'Verified' : 'Needs verification'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 14 }}>No medications recorded.</p>
            )
          ) : (
            <p style={{ color: '#64748b', fontSize: 13 }}>Medications are managed from the Medications page.</p>
          )}
        </Section>

        <Section title="Tasks">
          {mode === 'view' ? (
            (profile.tasks || []).length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {(profile.tasks || []).map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: '#f8fafc', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
                    <div style={{ color: '#0f172a', fontWeight: 600 }}>{t.title}</div>
                    <div style={{ color: '#475569', fontSize: 13 }}>{t.owner || '—'} · {t.status}</div>
                    {t.escalated && <span style={{ fontSize: 12, fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: 999 }}>Escalated</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: 14 }}>No tasks yet.</p>
            )
          ) : (
            <p style={{ color: '#64748b', fontSize: 13 }}>Tasks are managed from the Tasks page.</p>
          )}
        </Section>

        <Section title="Emergency Contacts">
          <div style={{ display: 'grid', gap: 10 }}>
            {contacts.map((c, idx) => (
              <Card key={idx} style={{ background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {c.name || 'New Contact'} {c.relationship ? `(${c.relationship})` : ''}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>
                      <span style={{ display: 'block' }}>{c.phone || '—'}</span>
                      <span style={{ display: 'block' }}>{c.email || '—'}</span>
                    </div>
                  </div>
                  {mode === 'edit' && (
                    <Button variant="danger" onClick={() => setContacts((cc) => cc.filter((_, i) => i !== idx))}>
                      Remove
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {mode === 'edit' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                <Input label="Name" value={''} onChange={(v) => setContacts((cc) => [...cc, { name: v }])} />
              </div>
            )}
            {mode === 'edit' && (
              <AddContactInline onAdd={(c) => setContacts((cc) => [...cc, c])} />
            )}
            {contacts.length === 0 && <p style={{ color: '#64748b', fontSize: 14 }}>No emergency contacts.</p>}
          </div>
        </Section>

        <Section title="Discharge Instructions">
          {mode === 'view' ? (
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, fontSize: 14, color: '#334155' }}>
              <div>
                <dt style={{ fontWeight: 600 }}>Discharge Date</dt>
                <dd style={{ margin: 0 }}>{instructions.dischargeDate ? new Date(instructions.dischargeDate).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Follow Up</dt>
                <dd style={{ margin: 0 }}>{instructions.followUp || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Activity</dt>
                <dd style={{ margin: 0 }}>{instructions.activity || '—'}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600 }}>Diet</dt>
                <dd style={{ margin: 0 }}>{instructions.diet || '—'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt style={{ fontWeight: 600 }}>Summary</dt>
                <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{instructions.summary || '—'}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt style={{ fontWeight: 600 }}>Red Flags</dt>
                <dd style={{ margin: 0 }}>
                  {(instructions.redFlags || []).length === 0 ? (
                    '—'
                  ) : (
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      {(instructions.redFlags || []).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0 16px' }}>
              <Input
                label="Summary"
                value={instructions.summary || ''}
                onChange={(v) => setInstructions((s) => ({ ...s, summary: v }))}
              />
              <Input
                label="Follow Up"
                value={instructions.followUp || ''}
                onChange={(v) => setInstructions((s) => ({ ...s, followUp: v }))}
              />
              <Input
                label="Red Flags (comma-separated)"
                value={(instructions.redFlags || []).join(', ')}
                onChange={(v) =>
                  setInstructions((s) => ({
                    ...s,
                    redFlags: v
                      .split(',')
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <Input
                label="Activity"
                value={instructions.activity || ''}
                onChange={(v) => setInstructions((s) => ({ ...s, activity: v }))}
              />
              <Input
                label="Diet"
                value={instructions.diet || ''}
                onChange={(v) => setInstructions((s) => ({ ...s, diet: v }))}
              />
              <Input
                label="Discharge Date"
                type="date"
                value={instructions.dischargeDate || ''}
                onChange={(v) => setInstructions((s) => ({ ...s, dischargeDate: v }))}
              />
            </div>
          )}
        </Section>

        <Section title="Consent">
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, fontSize: 14, color: '#334155' }}>
            <div>
              <dt style={{ fontWeight: 600 }}>Given</dt>
              <dd style={{ margin: 0 }}>{profile.consent?.given ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Scope</dt>
              <dd style={{ margin: 0 }}>{profile.consent?.scope || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Given By</dt>
              <dd style={{ margin: 0 }}>{profile.consent?.givenBy || '—'}</dd>
            </div>
            <div>
              <dt style={{ fontWeight: 600 }}>Given At</dt>
              <dd style={{ margin: 0 }}>
                {profile.consent?.givenAt ? new Date(profile.consent.givenAt).toLocaleString() : '—'}
              </dd>
            </div>
          </dl>
        </Section>
      </Card>
    </div>
  );
}

function AddContactInline({ onAdd }: { onAdd: (c: EmergencyContact) => void }) {
  const [c, setC] = useState<EmergencyContact>({ name: '', relationship: '', phone: '', email: '' });

  return (
    <Card style={{ background: '#f8fafc' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0 16px' }}>
        <Input label="Name" value={c.name} onChange={(v) => setC((s) => ({ ...s, name: v }))} />
        <Input label="Relationship" value={c.relationship || ''} onChange={(v) => setC((s) => ({ ...s, relationship: v }))} />
        <Input label="Phone" value={c.phone || ''} onChange={(v) => setC((s) => ({ ...s, phone: v }))} />
        <Input label="Email" value={c.email || ''} onChange={(v) => setC((s) => ({ ...s, email: v }))} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Button
          onClick={() => {
            if (!c.name.trim()) return;
            onAdd(c);
            setC({ name: '', relationship: '', phone: '', email: '' });
          }}
        >
          Add Contact
        </Button>
      </div>
    </Card>
  );
}
