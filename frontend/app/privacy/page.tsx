import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

const sections = [
  {
    id: 'collect',
    title: 'Information We Collect',
    body: [
      'Account information — name, email address, role, and contact details you provide when creating an account or being invited to a care circle.',
      'Care profiles — information about the person receiving care, including dates relevant to discharge, providers, facilities, and the care team involved.',
      'Care plans and tasks — shared care transition plans, daily tasks, observations, and notes added by members of the care circle.',
      'Medication information — medication lists, schedules, doses, and adherence logs entered by care circle members.',
      'Communications — messages, comments, and updates exchanged within the platform between authorized members of a care circle.',
      'Usage information — basic technical data such as device type, browser, and interactions with the platform to keep it secure and functioning.',
    ],
  },
  {
    id: 'use',
    title: 'How We Use Your Information',
    body: [
      'To provide, operate, and improve the care coordination platform, including shared care plans, medication tracking, task coordination, and notifications.',
      'To coordinate care within your care circle — helping families, caregivers, and facilities stay aligned during the first 30 days after discharge.',
      'To communicate with you about the service, including reminders, updates, and support.',
      'To maintain security, prevent abuse, and comply with legal obligations.',
    ],
  },
  {
    id: 'phi',
    title: 'Health Information and HIPAA Awareness',
    body: [
      'Assistedly Cares is built with HIPAA-aware principles: we apply safeguards designed to protect the confidentiality, integrity, and availability of the health-related information you entrust to us.',
      'The platform is a care coordination tool. It is not a medical device, and it does not provide diagnosis, treatment, or clinical decision support. The health information you enter is used to coordinate care — not to make medical decisions.',
      'If you are a covered entity or business associate, you are responsible for evaluating whether your use of the platform satisfies your own HIPAA compliance obligations. We handle data with appropriate administrative, technical, and physical safeguards as described below.',
    ],
  },
  {
    id: 'sharing',
    title: 'How We Share Information',
    body: [
      'Information is shared only within your care circle — with the roles you have authorized (family members, caregivers, and facility staff invited to a care plan).',
      'We do not sell your personal information. We do not share it with third parties for advertising or marketing.',
      'We may share information with service providers who help us operate the platform (such as hosting and infrastructure), under contractual obligations to protect it.',
      'We may disclose information where required by law, regulation, or legal process, or to protect the rights, safety, and security of users and the platform.',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention',
    body: [
      'We retain information only as long as needed to provide the service, meet your expectations, and satisfy legal obligations.',
      'Care plan data is retained for the duration of your active care circle and for a reasonable period after, so you can review and export records for follow-up visits.',
      'You may request deletion of your account and associated data at any time, subject to legal retention requirements such as audit logs required for compliance.',
    ],
  },
  {
    id: 'logging',
    title: 'Access and Audit Logging',
    body: [
      'Every access is logged and every change is traceable. We maintain audit logs that record who accessed a care plan, when, and what actions were taken.',
      'Audit logs are available to authorized members and facility administrators for compliance and accountability purposes.',
      'Log data is protected and retained in accordance with our data retention practices.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    body: [
      'Data is encrypted in transit and at rest using industry-standard encryption.',
      'Access is controlled through role-based permissions — each care circle member sees only what their role authorizes.',
      'We apply administrative and technical safeguards, including access controls, secure authentication, and ongoing monitoring, to protect against unauthorized access or disclosure.',
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights and Choices',
    body: [
      'You can review and correct the account information associated with your profile at any time.',
      'You can export care plan records for your own records or for a primary care visit.',
      'You can request a copy of the personal information we hold about you, request deletion, or ask us to restrict processing, subject to legal and operational requirements.',
      'You may withdraw consent or close your account at any time by contacting us using the details below.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: [
      'If you have questions about this Privacy Policy, your data, or your rights, contact us at support@assistedly.ai.',
      'Effective date: October 11, 2026.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="py-16">
      <div className="container max-w-3xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-accent)] mb-2">Privacy</p>
          <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold text-[var(--color-text)] tracking-tight leading-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-[var(--color-text-light)]">
            Effective date: October 11, 2026
          </p>
        </div>

        <div className="card !p-10 md:!p-12 space-y-10">
          <p className="text-[var(--color-text-light)] leading-relaxed">
            Assistedly Cares (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides a care-coordination
            platform for post-discharge care. This Privacy Policy explains what information we collect,
            how we use it, how we protect it, and the rights you have over it. By using Assistedly Cares,
            you agree to the practices described in this policy.
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