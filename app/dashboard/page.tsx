import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { getSessionBySlug } from '@/lib/sessions'
import { DashboardHome } from './_components/dashboard-home'

const featuredSessions = [
  { slug: '2026-day-1', title: 'Beyond the Paycheck' },
  { slug: '2026-from-idea-to-scale', title: 'From Idea to Scale' },
  { slug: '2026-from-knowledge-to-impact', title: 'From Knowledge to Impact' },
]

function PastSessions() {
  return (
    <section aria-labelledby="past-sessions-title" className="hub-upcoming-events min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 id="past-sessions-title" className="hub-panel-title">Past sessions</h2>
        <Link href="/dashboard/discover/event-videos" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-[#8e3a12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
          See all sessions <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="hub-events-rail mt-3" tabIndex={0} role="region" aria-label="Past session highlights">
        {featuredSessions.map(({ slug, title }) => {
          const session = getSessionBySlug(slug)
          if (!session?.coverImage) return null

          return (
            <Link key={slug} href={`/dashboard/discover/event-videos/${slug}`} className="hub-upcoming-event isolate aspect-[4/3] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
              <Image src={session.coverImage} alt="" fill sizes="220px" className="-z-20 object-cover object-top" />
              <span className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(180deg, transparent 25%, rgba(15, 12, 10, .92) 100%)' }} aria-hidden="true" />
              <span className="flex items-end justify-between gap-2">
                <span>
                  <span className="block text-sm font-semibold leading-tight">{title}</span>
                  {session.presenter && <span className="mt-1 block text-xs leading-snug">{session.presenter}</span>}
                </span>
                <ArrowUpRight size={16} className="shrink-0" aria-hidden="true" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function MemberDashboardPage() {
  return <DashboardHome pastSessions={<PastSessions />} />
}
