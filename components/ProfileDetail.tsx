'use client';

import { useState } from 'react';
import type { CareProfile, EmergencyContact, Medication, Task, DischargeInstructions } from '@/types';
import { profilesApi, medicationsApi, tasksApi } from '@/lib/api';

interface Props {
  profile: CareProfile;
  onUpdate: () => void;
}

export function ProfileDetail({ profile, onUpdate }: Props) {
  const [p, setP] = useState<CareProfile>(profile);
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'tasks' | 'contacts' | 'discharge'>('overview');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const { profile: fresh } = await profilesApi.get(p.id);
      setP(fresh);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {p.patient.displayName || `${p.patient.firstName || ''} ${p.patient.lastName || ''}`.trim() || 'Unnamed Patient'}
          </h2>
          <div className="flex gap-4 text-sm text-slate-600 mt-1">
            <span>DOB: {p.patient.dateOfBirth ? new Date(p.patient.dateOfBirth).toLocaleDateString() : '—'}</span>
            <span>Gender: {p.patient.gender || '—'}</span>
            <span>Age: {p.patient.age || '—'}</span>
            <span className={`font-medium ${p.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-500'}`}>{p.status}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(['overview', 'medications', 'tasks', 'contacts', 'discharge'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab profile={p} />}
      {activeTab === 'medications' && <MedicationsTab profile={p} onChange={refresh} />}
      {activeTab === 'tasks' && <TasksTab profile={p} onChange={refresh} />}
      {activeTab === 'contacts' && <ContactsTab profile={p} onChange={refresh} />}
      {activeTab === 'discharge' && <DischargeTab profile={p} onChange={refresh} />}
    </div>
  );
}

/* ---------- Overview ---------- */
function OverviewTab({ profile }: { profile: CareProfile }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Patient Details</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Phone</dt><dd className="font-medium">{profile.patient.phone || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Address</dt><dd className="font-medium">{profile.patient.address || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Diagnosis</dt><dd className="font-medium">{profile.patient.primaryDiagnosis || '—'}</dd></div>
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Consent</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Given</dt><dd className="font-medium">{profile.consent.given ? 'Yes' : 'No'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Scope</dt><dd className="font-medium">{profile.consent.scope || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">By</dt><dd className="font-medium">{profile.consent.givenBy || '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">At</dt><dd className="font-medium">{profile.consent.givenAt ? new Date(profile.consent.givenAt).toLocaleString() : '—'}</dd></div>
        </dl>
      </div>
      <div className="md:col-span-2">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Notes</h3>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{profile.patient.notes || 'No notes recorded.'}</p>
      </div>
    </div>
  );
}

/* ---------- Medications ---------- */
function MedicationsTab({ profile, onChange }: { profile: CareProfile; onChange: () => void }) {
  const [form, setForm] = useState({ name: '', dosage: '', dose: '', schedule: '', source: '', notes: '' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await profilesApi.addMedication(profile.id, form);
      setForm({ name: '', dosage: '', dose: '', schedule: '', source: '', notes: '' });
      setAdding(false);
      onChange();
    } catch {
      alert('Failed to add medication');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Medications</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm text-blue-600 font-medium hover:underline">
          {adding ? 'Cancel' : '+ Add Medication'}
        </button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name*" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Field label="Dosage" value={form.dosage} onChange={(v) => setForm((f) => ({ ...f, dosage: v }))} />
          <Field label="Dose" value={form.dose} onChange={(v) => setForm((f) => ({ ...f, dose: v }))} />
          <Field label="Schedule" value={form.schedule} onChange={(v) => setForm((f) => ({ ...f, schedule: v }))} />
          <Field label="Source" value={form.source} onChange={(v) => setForm((f) => ({ ...f, source: v }))} />
          <Field label="Notes" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="md:col-span-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
          </div>
        </form>
      )}
      <div className="grid gap-3">
        {(profile.medications || []).length === 0 && <p className="text-sm text-slate-400 italic">No medications recorded.</p>}
        {(profile.medications || []).map((med: Medication) => (
          <div key={med.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-900">{med.name}</p>
              <p className="text-sm text-slate-600">{med.dosage}{med.dose ? ` • ${med.dose}` : ''}{med.schedule ? ` • ${med.schedule}` : ''}</p>
              {med.notes && <p className="text-sm text-slate-500 mt-1">{med.notes}</p>}
            </div>
            {med.source && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{med.source}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tasks ---------- */
function TasksTab({ profile, onChange }: { profile: CareProfile; onChange: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', status: 'PENDING' });
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await (profilesApi.addTask?.(profile.id, { ...form, escalationLevel: 0, comments: [] }) ?? tasksApi.create(profile.id, { ...form, escalationLevel: 0, comments: [] }));
      setForm({ title: '', description: '', dueDate: '', status: 'PENDING' });
      setAdding(false);
      onChange();
    } catch {
      alert('Failed to add task');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
        <button onClick={() => setAdding((a) => !a)} className="text-sm text-blue-600 font-medium hover:underline">
          {adding ? 'Cancel' : '+ Add Task'}
        </button>
      </div>
      {adding && (
        <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Title*" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Field label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2">
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
          </div>
        </form>
      )}
      <div className="grid gap-3">
        {(profile.tasks || []).length === 0 && <p className="text-sm text-slate-400 italic">No tasks recorded.</p>}
        {(profile.tasks || []).map((task: Task) => (
          <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-500' : task.status === 'BLOCKED' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                <p className="font-semibold text-slate-900">{task.title}</p>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{task.status}</span>
              </div>
              {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
              {task.dueDate && <p className="text-xs text-slate-500 mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Contacts ---------- */
function ContactsTab({ profile, onChange }: { profile: CareProfile; onChange: () => void }) {
  const [contacts, setContacts] = useState<EmergencyContact[]>(profile.emergencyContacts || []);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = () => setContacts((c) => [...c, { name: '', relationship: '', phone: '', email: '' }]);
  const update = (i: number, field: keyof EmergencyContact, value: string) => setContacts((c) => c.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  const remove = (i: number) => setContacts((c) => c.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await profilesApi.updateEmergencyContacts(profile.id, contacts.filter((c) => c.name.trim()));
      setEditing(false);
      onChange();
    } catch {
      alert('Failed to save contacts');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Emergency Contacts</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="text-sm text-blue-600 font-medium hover:underline">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setEditing(false); setContacts(profile.emergencyContacts || []); }} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        )}
      </div>
      {editing && (
        <button onClick={add} className="text-sm text-blue-600 font-medium hover:underline">+ Add Contact</button>
      )}
      <div className="grid gap-3">
        {(editing ? contacts : profile.emergencyContacts || []).length === 0 && <p className="text-sm text-slate-400 italic">No emergency contacts recorded.</p>}
        {(editing ? contacts : profile.emergencyContacts || []).map((c, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-lg p-4">
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Field label="Name" value={c.name} onChange={(v) => update(i, 'name', v)} />
                <Field label="Relationship" value={c.relationship || ''} onChange={(v) => update(i, 'relationship', v)} />
                <Field label="Phone" type="tel" value={c.phone || ''} onChange={(v) => update(i, 'phone', v)} />
                <div className="flex gap-2 items-end">
                  <div className="flex-1"><Field label="Email" type="email" value={c.email || ''} onChange={(v) => update(i, 'email', v)} /></div>
                  <button onClick={() => remove(i)} className="text-red-500 text-sm mb-2">Remove</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-900">{c.name}</p>
                <p className="text-sm text-slate-600">{c.relationship}{c.phone ? ` • ${c.phone}` : ''}{c.email ? ` • ${c.email}` : ''}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Discharge ---------- */
function DischargeTab({ profile, onChange }: { profile: CareProfile; onChange: () => void }) {
  const [form, setForm] = useState<Partial<DischargeInstructions>>({
    summary: profile.dischargeInstructions?.summary || '',
    redFlags: profile.dischargeInstructions?.redFlags || [],
    activity: profile.dischargeInstructions?.activity || '',
    diet: profile.dischargeInstructions?.diet || '',
    followUp: profile.dischargeInstructions?.followUp || '',
    dischargeDate: profile.dischargeInstructions?.dischargeDate || '',
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const addRedFlag = () => setForm((f) => ({ ...f, redFlags: [...(f.redFlags || []), ''] }));
  const updateRedFlag = (i: number, value: string) => setForm((f) => ({ ...f, redFlags: (f.redFlags || []).map((x, idx) => (idx === i ? value : x)) }));
  const removeRedFlag = (i: number) => setForm((f) => ({ ...f, redFlags: (f.redFlags || []).filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      await profilesApi.updateDischarge(profile.id, {
        ...form,
        redFlags: (form.redFlags || []).filter((s) => s.trim()),
      });
      setEditing(false);
      onChange();
    } catch {
      alert('Failed to save discharge instructions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Discharge Instructions</h3>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="text-sm text-blue-600 font-medium hover:underline">{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="text-sm text-slate-500 hover:underline">Cancel</button>
          </div>
        )}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {editing ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
              <textarea rows={3} value={form.summary || ''} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Activity" value={form.activity || ''} onChange={(v) => setForm((f) => ({ ...f, activity: v }))} />
              <Field label="Diet" value={form.diet || ''} onChange={(v) => setForm((f) => ({ ...f, diet: v }))} />
              <Field label="Follow-up" value={form.followUp || ''} onChange={(v) => setForm((f) => ({ ...f, followUp: v }))} />
              <Field label="Discharge Date" type="date" value={form.dischargeDate || ''} onChange={(v) => setForm((f) => ({ ...f, dischargeDate: v }))} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">Red Flags</label>
                <button onClick={addRedFlag} className="text-sm text-blue-600 font-medium hover:underline">+ Add</button>
              </div>
              <div className="space-y-2">
                {(form.redFlags || []).map((flag, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" value={flag} onChange={(e) => updateRedFlag(i, e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
                    <button onClick={() => removeRedFlag(i)} className="text-red-500 text-sm">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-slate-500">Summary</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{profile.dischargeInstructions?.summary || 'No summary recorded.'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-slate-500">Activity:</span> {profile.dischargeInstructions?.activity || '—'}</div>
              <div><span className="font-medium text-slate-500">Diet:</span> {profile.dischargeInstructions?.diet || '—'}</div>
              <div><span className="font-medium text-slate-500">Follow-up:</span> {profile.dischargeInstructions?.followUp || '—'}</div>
              <div><span className="font-medium text-slate-500">Discharge Date:</span> {profile.dischargeInstructions?.dischargeDate ? new Date(profile.dischargeInstructions.dischargeDate).toLocaleDateString() : '—'}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Red Flags</p>
              {(profile.dischargeInstructions?.redFlags || []).length === 0 ? (
                <p className="text-sm text-slate-400 italic">No red flags recorded.</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                  {(profile.dischargeInstructions?.redFlags || []).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
    </div>
  );
}
