import Link from 'next/link'
import { ArrowUpRight, CirclePlay } from 'lucide-react'

import { RouteSection } from '../../_components/route-section'

export default function EventVideosPage() {
  return (
    <RouteSection
      className="event-videos-route"
      eyebrow="Learning library"
      title="Event videos"
      description="Return to class recordings and past sessions whenever you’re ready."
    >
      <section className="event-videos-empty" aria-labelledby="event-videos-empty-title" role="status">
        <div aria-hidden="true" className="event-videos-empty__icon">
          <CirclePlay size={28} strokeWidth={1.8} />
        </div>
        <p className="event-videos-empty__eyebrow">Classes · courses · replays</p>
        <h2 id="event-videos-empty-title">Your learning library is getting ready</h2>
        <p className="event-videos-empty__description">
          Class recordings and previous courses will appear here as they’re added, one session at a time.
        </p>
        <Link href="/dashboard/discover/events" className="event-videos-empty__link">
          Explore upcoming events <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </RouteSection>
  )
}
