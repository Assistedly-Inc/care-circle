// API client for care-circle backend
// Matches routes from backend/src/api (Express + Prisma, JWT bearer auth)

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://care-backend-mvp.forwardjump-com198.workers.dev';

const TOKEN_KEY = 'carecircle_token';

export function setToken(token: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      res.status === 401
        ? 'Authentication required — please sign in.'
        : (data.error as string | undefined) || `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

export const auth = {
  login: async (email: string, password: string) => {
    const res = await api<{ token: string; expiresIn: number; user: { id: string; email: string; name: string } }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    );
    setToken(res.token);
    return res;
  },
  me: () => api<{ user: unknown }>('/api/auth/me'),
};

export const cases = {
  list: () => api<CareCase[]>('/api/cases/list'),
  get: (id: string) => api<CareCase>(`/api/cases/${id}`),
  create: (data: { patientName: string; patientDob: string; emergencyContact: string; coordinatorId?: string }) =>
    api<CareCase>('/api/cases/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const medicationsApi = {
  list: (caseId: string) => api<Medication[]>(`/api/medications/${caseId}`),
  create: (caseId: string, data: { name: string; dosage?: string; schedule?: string; source?: string; notes?: string }) =>
    api<Medication>(`/api/medications/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (
    caseId: string,
    medId: string,
    data: { name?: string; dosage?: string; schedule?: string; source?: string; notes?: string; verifiedAt?: string | null }
  ) =>
    api<Medication>(`/api/medications/${caseId}/${medId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

export const tasksApi = {
  list: (caseId: string) => api<Task[]>(`/api/tasks/${caseId}`),
  create: (caseId: string, data: Partial<Task> & { title: string; dueDate: string }) =>
    api<Task>(`/api/tasks/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (caseId: string, taskId: string, data: Partial<Task>) =>
    api<Task>(`/api/tasks/${caseId}/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  addComment: (caseId: string, taskId: string, content: string) =>
    api<TaskComment>(`/api/tasks/${caseId}/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
};

export interface BarrierNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string } | null;
}

export interface Barrier {
  id: string;
  caseId: string;
  type: string;
  priority: string;
  description: string;
  ownerId?: string | null;
  status: string;
  dueDate?: string | null;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string } | null;
  notes?: BarrierNote[];
}

export interface BarrierMetrics {
  casesConsidered: number;
  sameDayDischargeRate: number | null;
  medianTimeToResolutionHoursByType: Record<string, number>;
  slaBreachRate: number | null;
  openBarrierCount: number;
}

export interface BarrierReadiness {
  status: 'GREEN' | 'AMBER' | 'RED';
  openBarriers: number;
  highPriority: number;
}

export const barriersApi = {
  list: (caseId: string) => api<Barrier[]>(`/api/barriers/${caseId}`),
  metrics: () => api<BarrierMetrics>('/api/barriers/metrics'),
  readiness: (caseId: string) => api<BarrierReadiness>(`/api/barriers/${caseId}/readiness`),
  update: (
    caseId: string,
    barrierId: string,
    data: Partial<Pick<Barrier, 'type' | 'priority' | 'description' | 'status' | 'dueDate'>> & {
      resolutionNote?: string;
      ownerId?: string | null;
    }
  ) =>
    api<Barrier>(`/api/barriers/${caseId}/${barrierId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  addNote: (caseId: string, barrierId: string, content: string) =>
    api<BarrierNote>(`/api/barriers/${caseId}/${barrierId}/notes`, {
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
  addTask: (id: string, data: Omit<Task, 'id'>) =>
    api<{ task: Task }>(`/api/care-profiles/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  audit: (id: string) => api<{ auditLog: AuditLogEntry[] }>(`/api/care-profiles/${id}/audit`),
};

export const exportApi = {
  download: () => api<{ message: string }>('/api/export'),
};

export const health = {
  check: () => api<{ status: string; kv: boolean; service: string }>('/api/health'),
};