import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowUpRight, Play } from 'lucide-react'

import { requireSessionsAccess } from '@/lib/sessions-access'
import { getSessionBySlug, getSessionsByYear } from '@/lib/sessions'
import { loadAflCalendarEvents } from '@/lib/events/live-calendar'
import { SessionCourseContent } from './session-course-content'

export const metadata: Metadata = { title: 'Member session | Past sessions' }

function getVideoEmbedUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:') return undefined
    const host = url.hostname.toLowerCase().replace(/^www\./, '')

    if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const id = url.pathname === '/watch'
        ? url.searchParams.get('v') ?? undefined
        : url.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : undefined
    }
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : undefined
    }
    if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = url.pathname.match(/(?:video\/)?(\d+)(?:$|\/)/)?.[1]
      return id ? `https://player.vimeo.com/video/${id}` : undefined
    }
  } catch {
    return undefined
  }
  return undefined
}

function isSafeResourceUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl, 'https://top100afl.com')
    return url.protocol === 'https:' && (url.origin === 'https://top100afl.com' || !rawUrl.startsWith('/'))
  } catch {
    return false
  }
}

export default async function SessionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  await requireSessionsAccess(`/dashboard/discover/event-videos/${slug}`)
  const staticSession = getSessionBySlug(slug)
  if (!staticSession) notFound()

  let session = staticSession
  try {
    const calendarEvents = await loadAflCalendarEvents()
    session = getSessionsByYear(calendarEvents)
      .flatMap((year) => year.sessions)
      .find((candidate) => candidate.slug === slug) ?? staticSession
  } catch {
    // The static session content remains available while the calendar is offline.
  }

  const attachedResources = session.resources.filter((resource) => isSafeResourceUrl(resource.url))
  const videos = attachedResources.filter((resource) => resource.type === 'video')
  const featuredVideo = videos[0]
  const videoEmbedUrl = featuredVideo ? getVideoEmbedUrl(featuredVideo.url) : undefined
  // The recording is already available above. Meeting chat is not a member
  // learning resource; admin attached notes, slides, and workshop files remain.
  const resources = attachedResources.filter((resource) => resource.type !== 'video' && !/^session chat$/i.test(resource.title))

  return (
    <main className="event-session event-session-course">
      <section className="event-session-featured-video" aria-label="Session recording">
        {videoEmbedUrl ? (
          <iframe src={videoEmbedUrl} title={`${session.title} recording`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="eager" />
        ) : featuredVideo ? (
          <div className="event-session-video-placeholder" style={session.coverImage ? { backgroundImage: `linear-gradient(120deg,rgba(23,20,18,.82),rgba(23,20,18,.42)),url("${session.coverImage}")` } : undefined}>
            <span className="event-session-video-placeholder__play" aria-hidden="true"><Play size={23} fill="currentColor" /></span>
            <a className="event-session-video-placeholder__link" href={featuredVideo.url} target="_blank" rel="noopener noreferrer">Open session recording <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        ) : (
          <div className="event-session-video-placeholder" style={session.coverImage ? { backgroundImage: `linear-gradient(120deg,rgba(23,20,18,.82),rgba(23,20,18,.42)),url("${session.coverImage}")` } : undefined}>
            <span className="event-session-video-placeholder__play" aria-hidden="true"><Play size={23} fill="currentColor" /></span>
            <p>Session recording coming soon</p>
          </div>
        )}
      </section>
      <SessionCourseContent session={session} resources={resources} />
    </main>
  )
}
