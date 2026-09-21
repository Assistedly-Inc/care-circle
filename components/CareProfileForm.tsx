'use client';

import { useState } from 'react';
import type { CareProfile, EmergencyContact, DischargeInstructions } from '@/types';
import { profilesApi } from '@/lib/api';

interface Props {
  onSuccess: (profile: CareProfile) => void;
  onCancel: () => void;
}

export function CareProfileForm({ onSuccess, onCancel }: Props) {
  const [patient, setPatient] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    phone: '',
    address: '',
    primaryDiagnosis: '',
    notes: '',
  });
  const [status, setStatus] = useState('ACTIVE');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [discharge, setDischarge] = useState<Partial<DischargeInstructions>>({ redFlags: [] });
  const [consent, setConsent] = useState({ given: false, scope: '', givenBy: '', givenAt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePatient = (field: keyof typeof patient, value: string) => setPatient((p) => ({ ...p, [field]: value }));

  const addContact = () => setEmergencyContacts((c) => [...c, { name: '', relationship: '', phone: '', email: '' }]);
  const updateContact = (i: number, field: keyof EmergencyContact, value: string) => {
    setEmergencyContacts((c) => c.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };
  const removeContact = (i: number) => setEmergencyContacts((c) => c.filter((_, idx) => idx !== i));

  const addRedFlag = () => setDischarge((d) => ({ ...d, redFlags: [...(d.redFlags || []), ''] }));
  const updateRedFlag = (i: number, value: string) =>
    setDischarge((d) => ({ ...d, redFlags: (d.redFlags || []).map((x, idx) => (idx === i ? value : x)) }));
  const removeRedFlag = (i: number) =>
    setDischarge((d) => ({ ...d, redFlags: (d.redFlags || []).filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        patient,
        status,
        emergencyContacts: emergencyContacts.filter((c) => c.name.trim()),
        dischargeInstructions: {
          ...discharge,
          redFlags: (discharge.redFlags || []).filter((s) => s.trim()),
        },
        consent,
      };
      const res = await profilesApi.create(payload);
      onSuccess(res.profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>}

      {/* Patient Info */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="First Name" value={patient.firstName} onChange={(v) => updatePatient('firstName', v)} />
          <Field label="Last Name" value={patient.lastName} onChange={(v) => updatePatient('lastName', v)} />
          <Field label="Display Name" value={patient.displayName} onChange={(v) => updatePatient('displayName', v)} />
          <Field label="Date of Birth" type="date" value={patient.dateOfBirth} onChange={(v) => updatePatient('dateOfBirth', v)} />
          <Field label="Age" value={patient.age} onChange={(v) => updatePatient('age', v)} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select
              value={patient.gender}
              onChange={(e) => updatePatient('gender', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— Select —</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-binary">Non-binary</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <Field label="Phone" type="tel" value={patient.phone} onChange={(v) => updatePatient('phone', v)} />
          <Field label="Address" value={patient.address} onChange={(v) => updatePatient('address', v)} />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Primary Diagnosis</label>
            <input
              type="text"
              value={patient.primaryDiagnosis}
              onChange={(e) => updatePatient('primaryDiagnosis', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={patient.notes}
              onChange={(e) => updatePatient('notes', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Emergency Contacts</h2>
          <button type="button" onClick={addContact} className="text-sm text-blue-600 font-medium hover:underline">+ Add Contact</button>
        </div>
        <div className="space-y-4">
          {emergencyContacts.map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <Field label="Name" value={c.name} onChange={(v) => updateContact(i, 'name', v)} />
              <Field label="Relationship" value={c.relationship || ''} onChange={(v) => updateContact(i, 'relationship', v)} />
              <Field label="Phone" type="tel" value={c.phone || ''} onChange={(v) => updateContact(i, 'phone', v)} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Email" type="email" value={c.email || ''} onChange={(v) => updateContact(i, 'email', v)} />
                </div>
                <button type="button" onClick={() => removeContact(i)} className="text-red-500 hover:text-red-700 mb-2 text-sm">Remove</button>
              </div>
            </div>
          ))}
          {emergencyContacts.length === 0 && <p className="text-sm text-slate-400 italic">No contacts added yet.</p>}
        </div>
      </section>

      {/* Discharge Instructions */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Discharge Instructions</h2>
        <div className="space-y-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Summary</label>
            <textarea
              rows={3}
              value={discharge.summary || ''}
              onChange={(e) => setDischarge((d) => ({ ...d, summary: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Activity Restrictions" value={discharge.activity || ''} onChange={(v) => setDischarge((d) => ({ ...d, activity: v }))} />
            <Field label="Diet" value={discharge.diet || ''} onChange={(v) => setDischarge((d) => ({ ...d, diet: v }))} />
            <Field label="Follow-up" value={discharge.followUp || ''} onChange={(v) => setDischarge((d) => ({ ...d, followUp: v }))} />
            <Field label="Discharge Date" type="date" value={discharge.dischargeDate || ''} onChange={(v) => setDischarge((d) => ({ ...d, dischargeDate: v }))} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Red Flags</label>
              <button type="button" onClick={addRedFlag} className="text-sm text-blue-600 font-medium hover:underline">+ Add</button>
            </div>
            <div className="space-y-2">
              {(discharge.redFlags || []).map((flag, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={flag}
                    onChange={(e) => updateRedFlag(i, e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button type="button" onClick={() => removeRedFlag(i)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Consent */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Consent</h2>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={consent.given}
            onChange={(e) => setConsent((c) => ({ ...c, given: e.target.checked }))}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-slate-700">Consent obtained for care coordination</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Scope" value={consent.scope} onChange={(v) => setConsent((c) => ({ ...c, scope: v }))} />
          <Field label="Given By" value={consent.givenBy} onChange={(v) => setConsent((c) => ({ ...c, givenBy: v }))} />
          <Field label="Given At" type="datetime-local" value={consent.givenAt} onChange={(v) => setConsent((c) => ({ ...c, givenAt: v }))} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Create Profile'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
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
