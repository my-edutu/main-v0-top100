import Link from 'next/link'
import { ArrowUpRight, HeartHandshake } from 'lucide-react'

import { DashboardCard } from '../_components/dashboard-card'
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
  return (
    <RouteSection
      eyebrow="Your membership"
      title="Me"
      description="Manage how you show up, publish and stay connected."
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {meNav.map((item) => (
          <DashboardCard
            key={item.href}
            href={item.href}
            title={item.label}
            description={meDescriptions[item.label]}
            icon={item.icon}
            color={item.color}
          />
        ))}
      </div>

      <div className="space-y-3 border-t border-[#E7DDCF] pt-5">
        <Link
          href="/partnership"
          className="flex min-h-11 items-center gap-3 rounded-xl px-1 text-sm font-extrabold text-[#252B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171412] focus-visible:ring-offset-2"
        >
          <HeartHandshake className="h-5 w-5 text-[#6C2600]" aria-hidden="true" />
          <span>Partnerships</span>
          <span className="ml-auto text-xs font-bold text-[#625B52]">Visit public page</span>
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <SignOutControl />
      </div>
    </RouteSection>
  )
}
