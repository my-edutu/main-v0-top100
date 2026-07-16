import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalSection, LegalShell } from '../_components/LegalShell'

export const metadata: Metadata = {
  title: 'Privacy & Data Policy | Top100 Africa Future Leaders',
  description:
    'How Top100 Africa Future Leaders collects, uses, protects and deletes your personal information — including the discard-after-selection policy for applicant data.',
}

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy & Data Policy"
      title="Privacy & Data Policy"
      intro="We collect the minimum information needed to run the Top100 Africa Future Leaders platform, we never sell it, and we delete applicant data once a selection cycle successfully concludes. This policy explains exactly what we hold, why, for how long, and the rights you have over it."
      lastUpdated="16 July 2026"
    >
      <LegalSection number="01" title="The short version">
        <ul>
          <li>We only collect what a form actually needs — usually your <strong>name and email</strong>.</li>
          <li>
            <strong>Application details are temporary.</strong> They exist to run one selection
            cycle. After the cohort is successfully picked, the personal data of applicants who were
            not selected is discarded, and selected awardees keep only what their public profile
            needs.
          </li>
          <li>We <strong>never sell</strong> your personal information.</li>
          <li>You can ask us to show, correct or delete your data at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection number="02" title="What we collect and why">
        <p>Depending on how you interact with the site, we collect:</p>
        <ul>
          <li>
            <strong>Applications (ambassador, volunteer, nominations):</strong> your name, email,
            organisation and the answers you give on the form — used solely to review your
            application, contact you about it and run the selection process.
          </li>
          <li>
            <strong>Awardee cohort applications:</strong> collected through Google Forms, so the
            data is stored with Google and handled under the same review-then-discard approach in
            section 04.
          </li>
          <li>
            <strong>Member accounts:</strong> name, email, password (stored in hashed form by our
            authentication provider), invite code and the profile details you choose to add — used
            to operate your awardee workspace and, once approved, your public directory profile.
          </li>
          <li>
            <strong>Contact messages:</strong> name, email and your message — used to reply to you.
          </li>
          <li>
            <strong>Magazine downloads:</strong> name and email — used to deliver the download and,
            if you agreed, occasional updates about future releases.
          </li>
          <li>
            <strong>Newsletter:</strong> your email — used only to send the newsletter until you
            unsubscribe.
          </li>
          <li>
            <strong>Technical data:</strong> anonymised usage analytics and the cookies described in
            our{' '}
            <Link href="/legal/cookies" className="font-semibold text-orange-700">
              Cookie Policy
            </Link>
            .
          </li>
        </ul>
        <p>
          Every form that stores personal data asks for your explicit consent via a checkbox before
          you can submit it.
        </p>
      </LegalSection>

      <LegalSection number="03" title="How we use your information">
        <ul>
          <li>to review applications and select each year&rsquo;s cohort;</li>
          <li>to create and operate awardee accounts and public profiles;</li>
          <li>to respond to messages and partnership enquiries;</li>
          <li>to deliver the magazine and, with consent, related updates;</li>
          <li>to send newsletters you subscribed to;</li>
          <li>to keep the platform secure and understand overall usage (aggregate analytics only).</li>
        </ul>
        <p>
          We do not use your personal information for automated decision-making, we do not build
          advertising profiles, and we do not sell or rent it to anyone.
        </p>
      </LegalSection>

      <LegalSection number="04" title="Data retention — discarded after selection">
        <p>
          Our default is <strong>short retention</strong>. Application data exists to run one
          selection cycle and no longer:
        </p>
        <ul>
          <li>
            <strong>While a cycle is open:</strong> applications sit in the admin review queue and
            are visible only to the review team.
          </li>
          <li>
            <strong>After a successful pick:</strong> once a cohort is finalised and announced, the
            personal details and supporting information of applicants who were{' '}
            <strong>not selected are deleted within 60 days</strong> of the announcement — from our
            database and from the review queue.
          </li>
          <li>
            <strong>If you are selected:</strong> only the details needed for your awardee profile
            and member account are retained, and you review what appears publicly. The rest of your
            application is discarded on the same schedule.
          </li>
          <li>
            <strong>Contact messages</strong> are kept only as long as needed to resolve your
            enquiry, then archived or deleted.
          </li>
          <li>
            <strong>Newsletter and magazine contacts</strong> are kept until you unsubscribe or ask
            us to remove you — every email includes an unsubscribe link.
          </li>
          <li>
            <strong>Member accounts</strong> are kept while your account is active; if you ask us to
            close it, your profile is removed from the directory and your personal data deleted,
            except where we must keep a minimal record to meet a legal obligation.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="05" title="Who we share data with">
        <p>
          We share personal data only with the service providers that run the platform, and only so
          they can provide their service to us:
        </p>
        <ul>
          <li><strong>Supabase</strong> — our database and authentication provider (accounts, applications, messages).</li>
          <li><strong>Vercel</strong> — website hosting and privacy-friendly, aggregated analytics.</li>
          <li><strong>Brevo</strong> — newsletter and transactional email delivery.</li>
          <li><strong>Google Forms</strong> — awardee cohort application intake.</li>
        </ul>
        <p>
          These providers may process data outside your country; they each commit to appropriate
          safeguards under their own terms. Beyond this list, we disclose personal data only if the
          law requires it. Public awardee profiles are, by design, visible to anyone — but only
          after selection and with your involvement in what is shown.
        </p>
      </LegalSection>

      <LegalSection number="06" title="Security">
        <p>
          Access to applicant and member data is restricted to the admin review team, protected by
          authenticated, role-based access. Passwords are hashed by our authentication provider and
          are never visible to us. Data is encrypted in transit. No system is perfectly secure, but
          if a breach ever affects your personal data we will notify you and the relevant authority
          as required by law.
        </p>
      </LegalSection>

      <LegalSection number="07" title="Your rights">
        <p>
          Under the Nigeria Data Protection Act (NDPA) and similar laws such as the GDPR, you can at
          any time:
        </p>
        <ul>
          <li>ask for a copy of the personal data we hold about you;</li>
          <li>ask us to correct inaccurate information;</li>
          <li>ask us to delete your data (&ldquo;right to be forgotten&rdquo;);</li>
          <li>withdraw a consent you previously gave — for example, unsubscribe from emails;</li>
          <li>object to or ask us to restrict a particular use of your data.</li>
        </ul>
        <p>
          Email{' '}
          <a href="mailto:partnership@top100afl.com" className="font-semibold text-orange-700">
            partnership@top100afl.com
          </a>{' '}
          with your request and we will respond within 30 days. You also have the right to complain
          to your data protection authority.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Children">
        <p>
          The platform is aimed at undergraduates and young professionals. We do not knowingly
          collect personal data from anyone under 16. If you believe a child has submitted data to
          us, contact us and we will delete it promptly.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Changes to this policy">
        <p>
          If we change how we handle personal data, we will update this page and its &ldquo;Last
          updated&rdquo; date, and announce material changes on the site. We will never quietly
          weaken the discard-after-selection commitment in section 04 — a change to that would be
          communicated directly to affected applicants.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
