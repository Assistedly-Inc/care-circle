export interface DemoProfile {
  id: string;
  patient: {
    displayName: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    primaryDiagnosis: string;
    gender: string;
    phone: string;
    address: string;
  };
  emergencyContacts: { name: string; relationship: string; phone: string; email: string }[];
  medications: {
    id: string;
    name: string;
    dose: string;
    schedule: string;
    source: string;
    verified: boolean;
    notes: string;
  }[];
  tasks: {
    id: string;
    title: string;
    owner: string;
    dueDate: string;
    status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
    description: string;
    escalated: boolean;
    comments: { user: string; text: string; time: string }[];
  }[];
  notifications: {
    id: string;
    title: string;
    type: 'Medication' | 'Appointment' | 'Task' | 'Check-in';
    time: string;
    status: 'pending' | 'sent' | 'read';
  }[];
  status: string;
  updatedAt: string;
}

export function getDemoProfiles(): DemoProfile[] {
  return [
    {
      id: 'demo-001',
      patient: {
        displayName: 'Margaret Chen',
        firstName: 'Margaret',
        lastName: 'Chen',
        dateOfBirth: '1953-04-12',
        primaryDiagnosis: 'Total Knee Replacement — Post-Discharge',
        gender: 'Female',
        phone: '(415) 555-0192',
        address: '1247 Oak Hill Lane, San Rafael, CA 94901',
      },
      emergencyContacts: [
        { name: 'David Chen', relationship: 'Son', phone: '(415) 555-0234', email: 'david.chen@email.com' },
        { name: 'Dr. Lisa Park', relationship: 'Orthopedic Surgeon', phone: '(415) 555-0789', email: '' },
      ],
      medications: [
        { id: 'm1', name: 'Oxycodone', dose: '5mg', schedule: 'Every 4-6 hours as needed', source: 'Discharge orders', verified: true, notes: 'Take with food. Stop after Day 5.' },
        { id: 'm2', name: 'Acetaminophen', dose: '500mg', schedule: 'Every 6 hours', source: 'Discharge orders', verified: true, notes: 'Max 3000mg/day.' },
        { id: 'm3', name: 'Enoxaparin', dose: '40mg', schedule: 'Once daily (subcutaneous)', source: 'Discharge orders', verified: false, notes: 'Anticoagulant for 10 days.' },
      ],
      tasks: [
        { id: 't1', title: 'Change surgical dressing', owner: 'Home health nurse', dueDate: '2026-09-19', status: 'todo', description: 'Clean incision site and apply fresh sterile dressing.', escalated: false, comments: [] },
        { id: 't2', title: 'Ice and elevate leg', owner: 'Margaret', dueDate: '2026-09-19', status: 'in_progress', description: '20 minutes on, 20 minutes off. Pillow under calf, not knee.', escalated: false, comments: [] },
        { id: 't3', title: 'Follow-up with orthopedic surgeon', owner: 'David Chen', dueDate: '2026-09-24', status: 'todo', description: 'Bring discharge summary and medication list. Check range of motion.', escalated: false, comments: [] },
      ],
      notifications: [
        { id: 'n1', title: 'Oxycodone due in 30 minutes', type: 'Medication', time: '2026-09-19T14:30:00Z', status: 'pending' },
        { id: 'n2', title: 'Ice therapy reminder', type: 'Check-in', time: '2026-09-19T16:00:00Z', status: 'pending' },
        { id: 'n3', title: 'Orthopedic follow-up tomorrow', type: 'Appointment', time: '2026-09-23T08:00:00Z', status: 'sent' },
      ],
      status: 'active',
      updatedAt: '2026-09-19T10:15:00Z',
    },
    {
      id: 'demo-002',
      patient: {
        displayName: 'Robert Johnson',
        firstName: 'Robert',
        lastName: 'Johnson',
        dateOfBirth: '1958-01-22',
        primaryDiagnosis: 'Cardiac Catheterization — Post-Discharge',
        gender: 'Male',
        phone: '(510) 555-0412',
        address: '892 Maplewood Drive, Berkeley, CA 94707',
      },
      emergencyContacts: [
        { name: 'Angela Johnson', relationship: 'Wife', phone: '(510) 555-0413', email: 'angela.j@email.com' },
        { name: 'Dr. James Wu', relationship: 'Cardiologist', phone: '(510) 555-0991', email: '' },
      ],
      medications: [
        { id: 'm4', name: 'Atorvastatin', dose: '40mg', schedule: 'Once daily at bedtime', source: 'Discharge orders', verified: true, notes: 'Take consistently. Check liver enzymes at 6 weeks.' },
        { id: 'm5', name: 'Aspirin', dose: '81mg', schedule: 'Once daily', source: 'Discharge orders', verified: true, notes: 'Do not stop without cardiologist approval.' },
        { id: 'm6', name: 'Clopidogrel', dose: '75mg', schedule: 'Once daily', source: 'Discharge orders', verified: false, notes: 'Dual antiplatelet therapy. 12-month minimum.' },
      ],
      tasks: [
        { id: 't4', title: 'Monitor groin site for bleeding', owner: 'Angela Johnson', dueDate: '2026-09-19', status: 'done', description: 'Check every 4 hours for swelling, bruising, or oozing.', escalated: false, comments: [{ user: 'Angela', text: 'Site looks good — no swelling, dry dressing.', time: '2026-09-19T08:00:00Z' }] },
        { id: 't5', title: 'Weigh daily and log', owner: 'Robert Johnson', dueDate: '2026-09-20', status: 'todo', description: 'Same time every morning. Alert if +3 lbs in 2 days.', escalated: false, comments: [] },
        { id: 't6', title: 'Cardiac rehab intake call', owner: 'Care team', dueDate: '2026-09-21', status: 'todo', description: 'Schedule first appointment within 2 weeks of discharge.', escalated: true, comments: [] },
      ],
      notifications: [
        { id: 'n4', title: 'Clopidogrel not yet verified', type: 'Medication', time: '2026-09-19T09:00:00Z', status: 'sent' },
        { id: 'n5', title: 'Daily weight check', type: 'Check-in', time: '2026-09-20T07:00:00Z', status: 'pending' },
      ],
      status: 'active',
      updatedAt: '2026-09-19T09:00:00Z',
    },
    {
      id: 'demo-003',
      patient: {
        displayName: 'Sarah Williams',
        firstName: 'Sarah',
        lastName: 'Williams',
        dateOfBirth: '1951-08-05',
        primaryDiagnosis: 'Pneumonia Recovery — Post-Discharge',
        gender: 'Female',
        phone: '(203) 555-0277',
        address: '45 Chestnut Street, New Haven, CT 06511',
      },
      emergencyContacts: [
        { name: 'Emily Williams', relationship: 'Daughter', phone: '(203) 555-0278', email: 'emily.w@email.com' },
        { name: 'Dr. Michael Torres', relationship: 'Pulmonologist', phone: '(203) 555-0612', email: '' },
      ],
      medications: [
        { id: 'm7', name: 'Amoxicillin-Clavulanate', dose: '875/125mg', schedule: 'Twice daily', source: 'Discharge orders', verified: true, notes: 'Complete full 7-day course even if feeling better.' },
        { id: 'm8', name: 'Albuterol inhaler', dose: '90mcg', schedule: 'Every 4 hours as needed', source: 'Discharge orders', verified: true, notes: '2 puffs. Track frequency.' },
      ],
      tasks: [
        { id: 't7', title: 'Incentive spirometry', owner: 'Sarah Williams', dueDate: '2026-09-19', status: 'in_progress', description: '10 reps every hour while awake. Goal: 1500mL.', escalated: false, comments: [] },
        { id: 't8', title: 'Hydration log — 2L/day', owner: 'Emily Williams', dueDate: '2026-09-19', status: 'todo', description: 'Track fluid intake. Watch for shortness of breath.', escalated: false, comments: [] },
      ],
      notifications: [
        { id: 'n6', title: 'Amoxicillin dose due', type: 'Medication', time: '2026-09-19T20:00:00Z', status: 'pending' },
      ],
      status: 'pending',
      updatedAt: '2026-09-19T08:00:00Z',
    },
  ];
}

export const STATUS_OPTIONS = ['todo', 'in_progress', 'blocked', 'done', 'cancelled'] as const;

export function generateId() {
  return 'id-' + Math.random().toString(36).slice(2, 9);
}
