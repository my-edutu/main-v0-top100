'use client'
import Link from 'next/link'
import { useDashboardMember } from '../_providers/dashboard-member'
import { MemberAvatar } from '../_components/member-avatar'
import { ArrowUpRight, BadgeCheck, LockKeyhole } from 'lucide-react'

import { RouteSection } from '../_components/route-section'
import { meNav } from '../_lib/navigation'
import { SignOutControl } from '../dashboard-header'
import { useDashboardBadges } from '../_providers/dashboard-badges'

const meDescriptions: Record<string, string> = {
  Profile: 'Edit your public BIO and visibility',
  'Schedule an interview': 'Request a time to share your impact',
  'Portfolio cover': 'Create a shareable Top100 magazine profile',
  'Project100 Scholarship': 'Apply and save your scholarship application',
  'My award': 'Complete your award and see its confirmation',
  Posts: 'Write and manage your stories',
  'Get featured': 'Pitch your work to the AFL team',
  Settings: 'Choose alerts, privacy and security',
}

export default function MePage() {
  const { member } = useDashboardMember()
  const { awardPayment } = useDashboardBadges()
  const paymentConfirmed = awardPayment?.status === 'paid' || Boolean(awardPayment?.confirmedPayment)
  return (
    <RouteSection
      title="Me"
      description="Manage how you show up, publish and stay connected."
    >
      <header className="flex items-center gap-4 py-3">
        <MemberAvatar
          src={member.avatarUrl}
          initials={member.avatarInitials}
          size={72}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="break-words text-2xl font-medium">{member.name}</h2>
            {paymentConfirmed && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200" title="Award payment confirmed">
              <BadgeCheck size={15} aria-hidden="true" />
              Payment confirmed
            </span>}
          </div>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {member.headline}
          </p>
        </div>
      </header>
      <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {meNav.map((item) => {
          const content = <>
            <item.icon size={21} strokeWidth={1.6} className="shrink-0 text-orange-700" />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-neutral-500">{meDescriptions[item.label]}</span>
            </span>
            {item.label === 'Get featured'
              ? <LockKeyhole size={17} className="shrink-0 text-neutral-400" aria-hidden="true" />
              : <ArrowUpRight size={18} className="shrink-0 text-neutral-400" />}
          </>

          if (item.label === 'Get featured') {
            return <div key={item.href} aria-disabled="true" aria-label="Get featured, currently locked" className="flex min-h-20 cursor-not-allowed items-center gap-4 px-4 py-4 opacity-60">
              {content}
            </div>
          }

          return <Link key={item.href} href={item.href} className="flex min-h-20 items-center gap-4 px-4 py-4 hover:bg-orange-50 focus-visible:outline-orange-600">
            {content}
          </Link>
        })}
      </div>

      <div className="space-y-3 border-t border-[#E7DDCF] pt-5">
        <SignOutControl />
      </div>
    </RouteSection>
  )
}
