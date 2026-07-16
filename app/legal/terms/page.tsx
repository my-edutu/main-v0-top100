import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalSection, LegalShell } from '../_components/LegalShell'

export const metadata: Metadata = {
  title: 'Terms of Use | Top100 Africa Future Leaders',
  description:
    'The terms that govern your use of the Top100 Africa Future Leaders platform, accounts, applications and the awardee selection process.',
}

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms of Use"
      title="Terms of Use"
      intro="These terms govern your use of top100afl.com and every service Top100 Africa Future Leaders provides through it — browsing, applying, creating an account, downloading the magazine or subscribing to updates. By using the site or ticking the acceptance box on any form, you agree to them."
      lastUpdated="16 July 2026"
    >
      <LegalSection number="01" title="Who we are">
        <p>
          Top100 Africa Future Leaders (&ldquo;Top100 AFL&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an
          initiative that spotlights outstanding undergraduates and young professionals building
          Africa&rsquo;s future. We operate the website at top100afl.com, the annual awardee
          selection, the digital magazine, events and related programmes. You can reach us at{' '}
          <a href="mailto:partnership@top100afl.com" className="font-semibold text-orange-700">
            partnership@top100afl.com
          </a>{' '}
          or by phone on +234 816 940 0427 (Lagos, Nigeria).
        </p>
      </LegalSection>

      <LegalSection number="02" title="Acceptance of these terms">
        <p>
          You accept these terms by using the site, and you confirm that acceptance explicitly when
          you tick the &ldquo;I agree&rdquo; box on any of our forms — account signup, ambassador or
          volunteer applications, contact messages, newsletter subscription or magazine downloads.
          If you do not agree, please do not submit our forms or create an account.
        </p>
        <p>
          You must be at least 16 years old to submit personal information through this site. If you
          are applying on behalf of an organisation, you confirm you are authorised to accept these
          terms for it.
        </p>
      </LegalSection>

      <LegalSection number="03" title="Applications and the selection process">
        <p>
          Applications and nominations to Top100 AFL programmes (awardee cohorts, ambassador and
          volunteer roles) are reviewed by our admin team. By applying you understand and agree that:
        </p>
        <ul>
          <li>
            Submitting an application does <strong>not</strong> guarantee selection, recognition or
            any award. All selection decisions are made at our sole discretion and are final.
          </li>
          <li>
            The information you submit is used <strong>only</strong> to assess and process your
            application, contact you about it, and complete the selection cycle.
          </li>
          <li>
            <strong>After a selection cycle successfully concludes, application data is discarded.</strong>{' '}
            If you are selected, the details needed for your public awardee profile are carried over
            (with your involvement); everything else, including unsuccessful applications, is deleted
            as described in our{' '}
            <Link href="/legal/privacy" className="font-semibold text-orange-700">
              Privacy &amp; Data Policy
            </Link>
            .
          </li>
          <li>
            You are responsible for the accuracy of the information you submit. False or misleading
            information can lead to disqualification or removal from a cohort, even after selection.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number="04" title="Accounts">
        <p>
          Awardee accounts are invite-only and created with an admin-issued access code. You agree
          to keep your password and access code confidential, to provide accurate profile
          information, and to tell us promptly if you believe your account has been compromised. We
          may suspend or remove accounts that breach these terms, misuse member tools, or are
          created with codes not issued to the person using them.
        </p>
      </LegalSection>

      <LegalSection number="05" title="Acceptable use">
        <p>When using the site, member tools or messaging features you agree not to:</p>
        <ul>
          <li>harass, abuse, impersonate or defame anyone, including other members;</li>
          <li>upload content that is unlawful, hateful, obscene or infringes someone else&rsquo;s rights;</li>
          <li>scrape, harvest or republish other members&rsquo; personal information;</li>
          <li>attempt to gain unauthorised access to accounts, admin areas or our infrastructure;</li>
          <li>use the platform to send spam or unsolicited commercial messages.</li>
        </ul>
        <p>We may remove content or restrict access where we reasonably believe this section has been breached.</p>
      </LegalSection>

      <LegalSection number="06" title="Content and intellectual property">
        <p>
          The site, its design, the Top100 AFL name and logo, the magazine and our editorial content
          belong to us or our licensors. You may share links to our public pages and quote short
          excerpts with attribution, but you may not reproduce substantial parts of the site or
          magazine commercially without written permission.
        </p>
        <p>
          Content you submit (profiles, application answers, messages) remains yours. You grant us a
          licence to use it for the purpose you submitted it for — for example, displaying your
          awardee profile in the public directory once you are selected and have agreed to appear.
        </p>
      </LegalSection>

      <LegalSection number="07" title="Third-party services">
        <p>
          Some journeys leave our site: awardee cohort applications run on Google Forms, newsletters
          are delivered through Brevo, and some events or opportunities link to external sites.
          Those services have their own terms and privacy policies, and we are not responsible for
          their content or practices.
        </p>
      </LegalSection>

      <LegalSection number="08" title="Disclaimers and liability">
        <p>
          The site is provided &ldquo;as is&rdquo;. We work hard to keep information accurate and the
          platform available, but we do not guarantee uninterrupted access or that every listing,
          opportunity or event detail is error-free. To the fullest extent permitted by law, we are
          not liable for indirect or consequential losses arising from your use of the site. Nothing
          in these terms excludes liability that cannot be excluded under applicable law.
        </p>
      </LegalSection>

      <LegalSection number="09" title="Changes and governing law">
        <p>
          We may update these terms as the platform evolves. The &ldquo;Last updated&rdquo; date above
          always reflects the current version, and material changes will be announced on the site.
          Continued use after a change means you accept the updated terms. These terms are governed
          by the laws of the Federal Republic of Nigeria.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
