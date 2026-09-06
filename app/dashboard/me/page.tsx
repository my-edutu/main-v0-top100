'use client'
import Link from 'next/link'
import { useDashboardMember } from '../_providers/dashboard-member'
import { MemberAvatar } from '../_components/member-avatar'
import { ArrowUpRight } from 'lucide-react'

import { RouteSection } from '../_components/route-section'
import { meNav } from '../_lib/navigation'
import { SignOutControl } from '../dashboard-header'

const meDescriptions: Record<string, string> = {
  Profile: 'Edit your public BIO and visibility',
  'Portfolio cover': 'Create a shareable Top100 magazine profile',
  'My award': 'Claim, pay and track delivery',
  Posts: 'Write and manage your stories',
  'Get featured': 'Pitch your work to the AFL team',
  Settings: 'Choose alerts, privacy and security',
}

export default function MePage() {
  const { member } = useDashboardMember()
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
          <h2 className="break-words text-2xl font-medium">{member.name}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            {member.headline}
          </p>
        </div>
      </header>
      <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200">
        {meNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-20 items-center gap-4 px-4 py-4 hover:bg-orange-50 focus-visible:outline-orange-600"
          >
            <item.icon
              size={21}
              strokeWidth={1.6}
              className="shrink-0 text-orange-700"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-neutral-500">
                {meDescriptions[item.label]}
              </span>
            </span>
            <ArrowUpRight size={18} className="shrink-0 text-neutral-400" />
          </Link>
        ))}
      </div>

      <div className="space-y-3 border-t border-[#E7DDCF] pt-5">
        <SignOutControl />
      </div>
    </RouteSection>
  )
}
