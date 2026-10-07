export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseMember {
  id: string;
  caseId: string;
  userId: string;
  role: string;
}

export interface Medication {
  id: string;
  caseId?: string;
  name: string;
  dosage?: string;
  dose?: string;
  schedule?: string;
  source?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  caseId?: string;
  title: string;
  description?: string;
  ownerId?: string;
  owner?: User;
  dueDate: string;
  status: string;
  escalationLevel: number;
  comments: TaskComment[];
}

export interface CareCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  patientName: string;
  patientDob: string;
  emergencyContact: string;
  dischargeNotes?: string;
  coordinatorId: string;
  coordinator: Pick<User, 'id' | 'name' | 'email'>;
  members: CaseMember[];
  medications: Medication[];
  tasks: Task[];
  consentGiven: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface DischargeInstructions {
  summary?: string;
  dischargeDate?: string;
  followUp?: string;
  redFlags: string[];
  activity?: string;
  diet?: string;
}

export interface CareProfile {
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
  medications: Medication[];
  dischargeInstructions: DischargeInstructions;
  consent: {
    given: boolean;
    scope?: string;
    givenBy?: string;
    givenAt?: string | null;
  };
  tasks: Task[];
  status: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeJson?: string;
  afterJson?: string;
}

export interface Notification {
  id: string;
  type: 'push' | 'sms' | 'email';
  title: string;
  body: string;
  sentAt?: string;
  read: boolean;
}

export type Persona = 'family' | 'caregiver' | 'professional' | 'patient';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
