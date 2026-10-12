import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

const sections = [
  {
    id: 'service',
    title: 'The Service',
    body: [
      'Assistedly Cares is a care-coordination platform that helps families, caregivers, and facilities work from a shared care plan during the first 30 days after discharge.',
      'The service provides shared care plans, medication tracking, task coordination, health observations, reminders, and exportable records for follow-up visits.',
      'The service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; and we may update, modify, or discontinue features over time as the platform evolves.',
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts and Roles',
    body: [
      'You must provide accurate information when creating an account and keep your login credentials secure.',
      'The platform uses role-based access: family members, caregivers, and facility staff each see and act within the scope of their authorized role in a care circle.',
      'You are responsible for activity that occurs under your account, and you must notify us promptly of any unauthorized use.',
      'Facility accounts are subject to the agreements between the facility and Assistedly Cares.',
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    body: [
      'Use the service only for legitimate care-coordination purposes: supporting a loved one, coordinating care teams, and tracking post-discharge plans.',
      'You may not misuse the service — including attempting to access data outside your authorized role, uploading unlawful content, interfering with the platform, or using it for unauthorized commercial purposes.',
      'You may not share your credentials or allow unauthorized individuals to access care plans.',
    ],
  },
  {
    id: 'medical',
    title: 'Not Medical Advice',
    body: [
      'Assistedly Cares supports coordination — it does not replace professional medical judgment.',
      'Nothing in the platform constitutes medical advice, diagnosis, or treatment. Medication schedules, observations, and care plans are coordination tools maintained by your care circle.',
      'Always consult a qualified healthcare professional for medical decisions. In an emergency, contact emergency services immediately.',
    ],
  },
  {
    id: 'ownership',
    title: 'Data Ownership',
    body: [
      'You retain ownership of the information you enter into the platform. We do not claim ownership of your care plans, observations, or communications.',
      'You grant Assistedly Cares a limited license to store, process, and display your data solely to provide and improve the service for you and your care circle.',
      'You may export your records at any time and request deletion of your account and associated data as described in our Privacy Policy.',
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: [
      'To the maximum extent permitted by law, Assistedly Cares is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.',
      'Our total liability arising from or related to the service is limited to the amounts you paid to us in the twelve months preceding the claim.',
      'We are not responsible for outcomes of care — coordination tools support decision-making but do not guarantee medical results. You remain responsible for verifying the accuracy of information in your care plan.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    body: [
      'We may update these Terms from time to time to reflect changes in the service, the law, or our practices.',
      'When we make material changes, we will update the effective date and notify users through the platform or by email.',
      'Continued use of the service after changes take effect constitutes acceptance of the updated Terms.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'If you have questions about these Terms, contact us at support@assistedly.ai.',
      'Effective date: October 11, 2026.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="py-16">
      <div className="container max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Legal</p>
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold text-[var(--color-text)] tracking-tight leading-tight mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-[var(--color-text-light)]">
            Effective date: October 11, 2026
          </p>
        </div>

        <div className="card !p-10 md:!p-12 space-y-10">
          <p className="text-[var(--color-text-light)] leading-relaxed">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Assistedly Cares,
            a care-coordination platform operated by Assistedly Cares (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            By creating an account or using the service, you agree to these Terms.
          </p>

          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className="text-xl font-extrabold text-[var(--color-text)] tracking-tight mb-4">
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.body.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[var(--color-text-light)] text-[15px] leading-relaxed">
                    <svg className="w-4 h-4 mt-1 text-[var(--color-primary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}