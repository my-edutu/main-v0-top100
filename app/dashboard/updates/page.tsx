import { RouteSection } from '../_components/route-section'
import { NotificationsSection } from '../_sections/notifications-section'

export default function UpdatesPage() {
  return (
    <RouteSection eyebrow="Inbox" title="Updates" description="News, opportunities and award milestones from the AFL team.">
      <NotificationsSection />
    </RouteSection>
  )
}
