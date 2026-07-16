import type { Metadata } from 'next'
import Link from 'next/link'

import { LegalSection, LegalShell } from '../_components/LegalShell'

export const metadata: Metadata = {
  title: 'Cookie Policy | Top100 Africa Future Leaders',
  description:
    'The cookies and similar technologies used on top100afl.com, what they do, and how to control them.',
}

export default function CookiesPage() {
  return (
    <LegalShell
      eyebrow="Cookie Policy"
      title="Cookie Policy"
      intro="This site uses a small number of cookies and similar technologies to keep you signed in, remember your preferences and understand overall usage. We do not use advertising or cross-site tracking cookies."
      lastUpdated="16 July 2026"
    >
      <LegalSection number="01" title="What cookies are">
        <p>
          Cookies are small text files a website stores in your browser. Similar technologies —
          local storage and session storage — hold small pieces of data on your device in the same
          way. This policy covers all of them, and we use the word &ldquo;cookies&rdquo; for
          simplicity.
        </p>
      </LegalSection>

      <LegalSection number="02" title="The cookies we use">
        <ul>
          <li>
            <strong>Essential — authentication (Supabase):</strong> keep you signed in to your
            awardee workspace and admin tools, and protect your session. The site&rsquo;s member
            areas cannot work without them. They expire when your session ends or you sign out.
          </li>
          <li>
            <strong>Essential — security:</strong> short-lived tokens used by our bot-protection
            (CAPTCHA) when you submit forms.
          </li>
          <li>
            <strong>Preferences (local storage):</strong> remember choices like your theme, whether
            you have dismissed pop-ups such as the magazine prompt or notification prompt, and your
            answer to the cookie notice itself — so we do not ask you again.
          </li>
          <li>
            <strong>Analytics (Vercel Analytics):</strong> anonymised, aggregated page-view counts
            that help us understand which pages are useful. This does not use cross-site tracking
            and does not identify you personally.
          </li>
          <li>
            <strong>Email delivery (Brevo):</strong> if you interact with our newsletter widgets,
            Brevo&rsquo;s script may set cookies to make subscription forms work.
          </li>
        </ul>
        <p>We do not use advertising cookies, and we do not allow third parties to track you across other websites through our site.</p>
      </LegalSection>

      <LegalSection number="03" title="Your choices">
        <p>
          When you first visit, a notice lets you <strong>accept</strong> or <strong>decline</strong>{' '}
          non-essential cookies. If you decline, essential cookies still operate (the site cannot
          function without them), but your choice is remembered and respected.
        </p>
        <p>
          You can also clear or block cookies in your browser settings at any time. Blocking
          essential cookies will prevent sign-in and some forms from working. To change your choice
          later, clear this site&rsquo;s data in your browser and the notice will appear again.
        </p>
      </LegalSection>

      <LegalSection number="04" title="More information">
        <p>
          Cookies that involve personal data are handled under our{' '}
          <Link href="/legal/privacy" className="font-semibold text-orange-700">
            Privacy &amp; Data Policy
          </Link>
          . If you have questions, email{' '}
          <a href="mailto:partnership@top100afl.com" className="font-semibold text-orange-700">
            partnership@top100afl.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
