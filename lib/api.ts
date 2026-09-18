// API client for care-circle backend
// Matches routes from JoshFialkoff/care-circle backend

import type {
  CareCase,
  CareProfile,
  Medication,
  Task,
  TaskComment,
  AuditLogEntry,
  EmergencyContact,
  DischargeInstructions,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://care-circle-backend.forwardjump-com198.workers.dev';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const auth = {
  login: (email: string, password: string) =>
    api<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => api<{ user: unknown }>('/api/auth/me'),
};

export const cases = {
  list: () => api<{ cases: CareCase[] }>('/api/cases/list'),
  get: (id: string) => api<{ case: CareCase }>(`/api/cases/${id}`),
  create: (data: Omit<CareCase, 'id' | 'createdAt' | 'updatedAt' | 'coordinator' | 'members' | 'medications' | 'tasks'>) =>
    api<{ case: CareCase }>('/api/cases/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const medicationsApi = {
  list: (caseId: string) => api<{ medications: Medication[] }>(`/api/medications/${caseId}`),
  create: (caseId: string, data: Omit<Medication, 'id'>) =>
    api<{ medication: Medication }>(`/api/medications/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (caseId: string, medId: string, data: Partial<Medication>) =>
    api<{ medication: Medication }>(`/api/medications/${caseId}/${medId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const tasksApi = {
  list: (caseId: string) => api<{ tasks: Task[] }>(`/api/tasks/${caseId}`),
  create: (caseId: string, data: Omit<Task, 'id'>) =>
    api<{ task: Task }>(`/api/tasks/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (caseId: string, taskId: string, data: Partial<Task>) =>
    api<{ task: Task }>(`/api/tasks/${caseId}/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  addComment: (caseId: string, taskId: string, content: string) =>
    api<{ comment: TaskComment }>(`/api/tasks/${caseId}/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

export const profilesApi = {
  list: () => api<{ patients: CareProfile[] }>('/api/care-profiles'),
  get: (id: string) => api<{ profile: CareProfile }>(`/api/care-profiles/${id}`),
  create: (data: Partial<CareProfile>) =>
    api<{ profile: CareProfile }>('/api/care-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CareProfile>) =>
    api<{ profile: CareProfile }>(`/api/care-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  addMedication: (id: string, data: Omit<Medication, 'id'>) =>
    api<{ medication: Medication; medications: Medication[] }>(`/api/care-profiles/${id}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEmergencyContacts: (id: string, contacts: EmergencyContact[]) =>
    api<{ emergencyContacts: EmergencyContact[] }>(`/api/care-profiles/${id}/emergency-contacts`, {
      method: 'PUT',
      body: JSON.stringify({ emergencyContacts: contacts }),
    }),
  updateDischarge: (id: string, instructions: Partial<DischargeInstructions>) =>
    api<{ dischargeInstructions: DischargeInstructions }>(`/api/care-profiles/${id}/discharge-instructions`, {
      method: 'PUT',
      body: JSON.stringify(instructions),
    }),
  audit: (id: string) => api<{ auditLog: AuditLogEntry[] }>(`/api/care-profiles/${id}/audit`),
};

export const exportApi = {
  download: () => api<{ message: string }>('/api/export'),
};

export const health = {
  check: () => api<{ status: string; kv: boolean; service: string }>('/api/health'),
};
