import { DashboardCard } from '../_components/dashboard-card'
import { RouteSection } from '../_components/route-section'
import {
  discoverNav,
  type DashboardColor,
} from '../_lib/navigation'

const discoverDescriptions: Record<string, string> = {
  Members: 'Meet awardees across the continent',
  Groups: 'Join focused member communities',
  Opportunities: 'Browse grants, roles and programmes',
  Saved: 'Return to opportunities you kept',
  Events: 'See invitations and upcoming moments',
  Magazine: 'Read stories from the AFL network',
}

const discoverColors: Record<string, DashboardColor> = {
  Members: 'forest',
  Groups: 'forest',
  Opportunities: 'saffron',
  Saved: 'saffron',
  Events: 'saffron',
  Magazine: 'burgundy',
}

export default function DiscoverPage() {
  return (
    <RouteSection
      eyebrow="Explore the network"
      title="Discover"
      description="People, communities and openings selected for Africa Future Leaders."
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {discoverNav.map((item) => (
          <DashboardCard
            key={item.href}
            href={item.href}
            title={item.label}
            description={discoverDescriptions[item.label]}
            icon={item.icon}
            color={discoverColors[item.label] ?? item.color}
          />
        ))}
      </div>
    </RouteSection>
  )
}
