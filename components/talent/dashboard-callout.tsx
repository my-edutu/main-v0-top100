'use client'

import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Settings2 } from 'lucide-react'
import { talentVisibilityStatus } from '@/lib/talent/visibility'
import { useTalentMember } from './use-talent'

const editorHref = '/dashboard/me/profile#talent-profile'
const privacyHref = '/dashboard/me/settings#talent-privacy'

export function TalentDashboardCallout() {
  const { data, disabled, loading, error } = useTalentMember()
  if (disabled || loading || error || !data) return null

  const profile = data.talent
  const isPublic = profile.discovery_enabled && Boolean(profile.published)
  let description = 'Add your skills and work, then send your profile to Top100 for review. You choose when employers can find you.'
  let action = { label: profile.revision > 0 ? 'Continue your profile' : 'Build your work profile', href: editorHref }

  if (profile.publication_status === 'submitted') {
    description = isPublic
      ? 'Top100 is reviewing your updates. Employers can still see your last approved version.'
      : 'Top100 is reviewing your profile. It stays hidden until it’s approved and you turn on discovery.'
    action = { label: 'Check your profile', href: editorHref }
  } else if (profile.publication_status === 'changes_requested') {
    description = 'Top100 left feedback on your profile. Review it, make your changes, and send it back.'
    action = { label: 'Review feedback', href: editorHref }
  } else if (profile.published && !isPublic) {
    description = 'You have an approved profile. Turn on discovery when you’re ready for employers to find it.'
    action = { label: 'Choose who can find you', href: privacyHref }
  } else if (isPublic) {
    description = profile.introductions_enabled
      ? 'Employers can find your approved work profile. Review requests from Top100 in your introductions inbox.'
      : 'Employers can find your approved work profile. You can turn on introduction requests in Settings.'
    action = { label: 'View your work profile', href: `/awardees/${encodeURIComponent(data.slug)}#talent-portfolio` }
  }

  return (
    <section aria-labelledby="talent-welcome" className="mb-5 rounded-2xl border border-stone-200 bg-[#fff] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="talent-welcome" className="text-lg font-semibold tracking-tight text-stone-950 sm:text-xl">Talent Discovery</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${isPublic ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>
          {talentVisibilityStatus(profile)}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href={action.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ff9d00] px-4 text-sm font-semibold text-[#171412] hover:bg-[#ffb329] focus-visible:outline-2 focus-visible:outline-offset-2">
          {action.label} <ArrowRight size={16} aria-hidden="true" />
        </Link>
        <Link href="/dashboard/introductions" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-stone-700 hover:underline">
          <BriefcaseBusiness size={16} aria-hidden="true" /> Introductions
        </Link>
        {action.href !== privacyHref && (
          <Link href={privacyHref} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-stone-700 hover:underline">
            <Settings2 size={16} aria-hidden="true" /> Visibility
          </Link>
        )}
        {isPublic && <Link href={editorHref} className="inline-flex min-h-11 items-center text-sm font-medium text-stone-700 hover:underline">Edit profile</Link>}
        <Link href="/dashboard/applications" className="inline-flex min-h-11 items-center text-sm font-medium text-stone-700 hover:underline">Applications</Link>
      </div>
    </section>
  )
}
