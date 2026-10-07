/**
 * Case Invitation Types and Interfaces
 * HIPAA-compliant internal data models for invitation workflow
 */

export type InvitationStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface CaseInvitation {
  id: string;
  caseId: string;
  email: string;
  role: 'COORDINATOR' | 'CAREGIVER' | 'FAMILY';
  status: InvitationStatus;
  token: string; // Encrypted token for URL validation
  createdAt: Date;
  expiresAt: Date;
  invitedBy: string; // User ID who sent the invitation
}

export interface InvitationCreateInput {
  caseId: string;
  email: string;
  role: 'COORDINATOR' | 'CAREGIVER' | 'FAMILY';
  invitedBy: string;
}

export interface InvitationAcceptInput {
  token: string;
  email: string;
  role?: 'COORDINATOR' | 'CAREGIVER' | 'FAMILY'; // Optional if derived from token/owner
}

export interface InvitationListResponse {
  invitations: CaseInvitation[];
  totalCount: number;
}

export interface InvitationAcceptResponse {
  success: boolean;
  message: string;
  caseMember?: {
    id: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  };
}