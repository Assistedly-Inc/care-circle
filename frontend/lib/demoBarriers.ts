export type BarrierType = 'transport' | 'medications' | 'placement' | 'insurance' | 'family' | 'pending_test' | 'social' | 'other';
export type BarrierPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type BarrierStatus = 'IDENTIFIED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';

export interface DemoBarrierNote { user: string; text: string; time: string; }

export interface DemoBarrier {
  id: string;
  type: BarrierType;
  priority: BarrierPriority;
  description: string;
  owner: string;
  status: BarrierStatus;
  createdAt: string;
  dueDate?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  notes: DemoBarrierNote[];
}

export interface DemoBarrierCase {
  id: string;
  patient: { displayName: string; primaryDiagnosis: string };
  admissionAt: string;
  dischargeAt?: string;
  barriers: DemoBarrier[];
}

export function genBarrierId(): string {
  return 'bar-' + Math.random().toString(36).slice(2, 10);
}

export function getDemoBarrierCases(): DemoBarrierCase[] {
  return [
    {
      id: 'b-harold',
      patient: { displayName: 'Harold Jenkins', primaryDiagnosis: 'Total Hip Replacement — Post-Op' },
      admissionAt: '2026-10-02T09:30:00',
      barriers: [
        {
          id: 'bar-h1', type: 'placement', priority: 'HIGH',
          description: 'SNF bed at Golden Valley Rehab not confirmed; current bed hold expires Monday',
          owner: 'Dana (Case Mgmt)', status: 'ESCALATED',
          createdAt: '2026-10-02T11:00:00', dueDate: '2026-10-04T17:00:00', escalatedAt: '2026-10-05T09:15:00',
          notes: [
            { user: 'Dana', text: 'Bed hold expires Monday; two facilities declined', time: '2026-10-05T09:20:00' },
            { user: 'Dana', text: 'Third facility tour scheduled for 10/6', time: '2026-10-05T16:00:00' },
          ],
        },
        {
          id: 'bar-h2', type: 'transport', priority: 'MEDIUM',
          description: 'Ambulance pickup for SNF transfer must be scheduled once bed is confirmed',
          owner: 'Marcus (Transport)', status: 'ASSIGNED',
          createdAt: '2026-10-03T10:00:00', dueDate: '2026-10-08T16:00:00',
          notes: [],
        },
        {
          id: 'bar-h3', type: 'insurance', priority: 'LOW',
          description: 'Prior authorization for extended rehab days pending with payer',
          owner: '', status: 'IDENTIFIED',
          createdAt: '2026-10-04T14:00:00', dueDate: '2026-10-09T17:00:00',
          notes: [],
        },
      ],
    },
    {
      id: 'b-ruth',
      patient: { displayName: 'Ruth Alvarez', primaryDiagnosis: 'Congestive Heart Failure — Discharge Day' },
      admissionAt: '2026-09-29T07:45:00', dischargeAt: '2026-09-29T18:20:00',
      barriers: [
        {
          id: 'bar-r1', type: 'medications', priority: 'HIGH',
          description: 'Discharge medications not filled; pharmacy delivery required',
          owner: 'Nadia (Pharmacy Tech)', status: 'RESOLVED',
          createdAt: '2026-09-29T09:00:00', dueDate: '2026-09-29T15:00:00', resolvedAt: '2026-09-29T13:10:00',
          resolutionNote: 'Daughter picked up prescriptions at 13:00; reconciliation confirmed',
          notes: [],
        },
        {
          id: 'bar-r2', type: 'family', priority: 'MEDIUM',
          description: 'Daughter unavailable for pickup until early afternoon',
          owner: '', status: 'RESOLVED',
          createdAt: '2026-09-29T09:00:00', dueDate: '2026-09-29T16:00:00', resolvedAt: '2026-09-29T12:45:00',
          resolutionNote: 'Pickup confirmed with daughter for 12:45',
          notes: [],
        },
      ],
    },
    {
      id: 'b-samuel',
      patient: { displayName: 'Samuel Okafor', primaryDiagnosis: 'Community-Acquired Pneumonia' },
      admissionAt: '2026-09-30T11:15:00', dischargeAt: '2026-10-02T10:30:00',
      barriers: [
        {
          id: 'bar-s1', type: 'transport', priority: 'MEDIUM',
          description: 'MedVan transport needed for discharge to home',
          owner: 'Marcus (Transport)', status: 'RESOLVED',
          createdAt: '2026-10-01T09:00:00', dueDate: '2026-10-01T17:00:00', resolvedAt: '2026-10-01T13:00:00',
          resolutionNote: 'MedVan booked for 10/2 discharge at 10:00',
          notes: [],
        },
        {
          id: 'bar-s2', type: 'pending_test', priority: 'LOW',
          description: 'Awaiting final blood culture before discharge clearance',
          owner: '', status: 'RESOLVED',
          createdAt: '2026-09-30T15:00:00', dueDate: '2026-10-01T12:00:00', resolvedAt: '2026-10-01T08:30:00',
          resolutionNote: 'Final culture resulted; discharge criteria met',
          notes: [],
        },
      ],
    },
    {
      id: 'b-gladys',
      patient: { displayName: 'Gladys Turner', primaryDiagnosis: 'COPD Exacerbation' },
      admissionAt: '2026-10-01T08:00:00',
      barriers: [
        {
          id: 'bar-g1', type: 'insurance', priority: 'MEDIUM',
          description: 'Oxygen equipment coverage requires physician documentation',
          owner: 'Priya (Utilization Review)', status: 'IN_PROGRESS',
          createdAt: '2026-10-01T12:00:00', dueDate: '2026-10-03T17:00:00',
          notes: [{ user: 'Priya', text: 'Peer-to-peer review scheduled for 10/6', time: '2026-10-02T10:00:00' }],
        },
        {
          id: 'bar-g2', type: 'family', priority: 'LOW',
          description: 'Home oxygen setup needs family present; son works nights',
          owner: '', status: 'IDENTIFIED',
          createdAt: '2026-10-03T09:30:00', dueDate: '2026-10-05T17:00:00',
          notes: [],
        },
      ],
    },
    {
      id: 'b-walter',
      patient: { displayName: 'Walter Boyd', primaryDiagnosis: 'Hip Fracture — Post-Op' },
      admissionAt: '2026-09-25T14:00:00', dischargeAt: '2026-09-28T11:00:00',
      barriers: [
        {
          id: 'bar-w1', type: 'medications', priority: 'HIGH',
          description: 'Anticoagulation bridging plan needed before discharge',
          owner: 'Nadia (Pharmacy Tech)', status: 'RESOLVED',
          createdAt: '2026-09-27T10:00:00', dueDate: '2026-09-27T18:00:00', resolvedAt: '2026-09-28T09:00:00',
          resolutionNote: 'Anticoagulation bridge plan confirmed with pharmacist',
          notes: [],
        },
        {
          id: 'bar-w2', type: 'pending_test', priority: 'MEDIUM',
          description: 'Post-op labs pending review',
          owner: '', status: 'RESOLVED',
          createdAt: '2026-09-25T16:00:00', dueDate: '2026-09-26T12:00:00', resolvedAt: '2026-09-26T10:00:00',
          resolutionNote: 'Post-op labs acceptable for discharge',
          notes: [],
        },
      ],
    },
    {
      id: 'b-eleanor',
      patient: { displayName: 'Eleanor Ruiz', primaryDiagnosis: 'Ischemic Stroke — Rehab Placement' },
      admissionAt: '2026-10-05T10:00:00',
      barriers: [
        {
          id: 'bar-e1', type: 'placement', priority: 'HIGH',
          description: 'Inpatient rehab facility acceptance pending; two declined due to acuity',
          owner: 'Dana (Case Mgmt)', status: 'IN_PROGRESS',
          createdAt: '2026-10-05T13:00:00', dueDate: '2026-10-06T17:00:00',
          notes: [
            { user: 'Dana', text: 'Two facilities declined; third tour scheduled', time: '2026-10-05T18:00:00' },
            { user: 'Dana', text: 'Bed available 10/7 pending insurance approval', time: '2026-10-06T11:00:00' },
          ],
        },
      ],
    },
    {
      id: 'b-frank',
      patient: { displayName: 'Frank Delgado', primaryDiagnosis: 'Diabetes — Uncontrolled' },
      admissionAt: '2026-09-28T08:00:00', dischargeAt: '2026-09-28T19:00:00',
      barriers: [
        {
          id: 'bar-f1', type: 'transport', priority: 'MEDIUM',
          description: 'Patient has no ride home; family coordinating',
          owner: '', status: 'RESOLVED',
          createdAt: '2026-09-28T09:00:00', dueDate: '2026-09-28T15:00:00', resolvedAt: '2026-09-28T12:30:00',
          resolutionNote: 'Family arranged ride; driver confirmed',
          notes: [],
        },
        {
          id: 'bar-f2', type: 'medications', priority: 'LOW',
          description: 'Insulin teaching session required before discharge',
          owner: 'Nadia (Pharmacy Tech)', status: 'RESOLVED',
          createdAt: '2026-09-28T10:00:00', dueDate: '2026-09-28T18:00:00', resolvedAt: '2026-09-28T17:00:00',
          resolutionNote: 'Insulin teaching completed with patient',
          notes: [],
        },
      ],
    },
    {
      id: 'b-ida',
      patient: { displayName: 'Ida Nguyen', primaryDiagnosis: 'Total Knee Replacement' },
      admissionAt: '2026-10-06T09:00:00',
      barriers: [
        {
          id: 'bar-i1', type: 'family', priority: 'LOW',
          description: 'Daughter traveling; available for discharge-day support from 10/8',
          owner: '', status: 'IDENTIFIED',
          createdAt: '2026-10-06T14:00:00', dueDate: '2026-10-08T17:00:00',
          notes: [],
        },
      ],
    },
    {
      id: 'b-charles',
      patient: { displayName: 'Charles Whitfield', primaryDiagnosis: 'Sepsis — IV Antibiotics' },
      admissionAt: '2026-09-20T06:30:00', dischargeAt: '2026-09-24T15:00:00',
      barriers: [
        {
          id: 'bar-c1', type: 'transport', priority: 'HIGH',
          description: 'Ambulance transfer to LTAC delayed by availability',
          owner: 'Marcus (Transport)', status: 'RESOLVED',
          createdAt: '2026-09-21T09:00:00', dueDate: '2026-09-21T17:00:00', resolvedAt: '2026-09-22T14:00:00',
          resolutionNote: 'Ambulance availability delayed; escalated to transport supervisor',
          notes: [],
        },
        {
          id: 'bar-c2', type: 'medications', priority: 'MEDIUM',
          description: 'Home health IV antibiotic arrangements not confirmed',
          owner: 'Priya (Utilization Review)', status: 'RESOLVED',
          createdAt: '2026-09-22T10:00:00', dueDate: '2026-09-23T12:00:00', resolvedAt: '2026-09-23T09:00:00',
          resolutionNote: 'Home health confirmed for IV antibiotics; kit delivered',
          notes: [],
        },
      ],
    },
  ];
}
