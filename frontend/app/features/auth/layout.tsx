import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { absolute: 'Private, Role-Based Access for Family Caregivers | Care Circle' },
  description:
    'Care Circle gives every caregiver the right information at the right time — with role-based access, audit logs, and privacy controls built for family care.',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
