'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MemberProfile } from '@/lib/member-hub'
import {
  RSVP_CHOICES,
  RSVP_LABELS,
  fetchEventInvitations,
  fetchPublicEvents,
  markInvitationSeen,
  setInvitationRsvp,
  type EventInvitation,
  type PublicEvent,
  type RsvpChoice,
} from '@/lib/events/invitations-client'

// Same fallbacks the dashboard's public events listing already used, so an
// event with no cover still renders as a picture card rather than a black box.
const FALLBACK_COVERS = [
  '/top100-africa-future-leaders-2024-magazine-cover-w.jpg',
  '/magazine-cover-2025.jpg',
  '/young-african-man-business-leader.jpg',
]

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  void member

  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')

    fetchEventInvitations()
      .then((payload) => {
        if (!cancelled) setInvitations(payload.invitations)
      })
      .catch((error) => {
        if (!cancelled) {
          setInvitations([])
          setLoadError(error instanceof Error ? error.message : 'Could not load your invitations.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // Stamp seen_at once per unseen invitation, on first render of the section.
  // Tracked in a ref so a re-render (an RSVP, say) never re-sends the stamp.
  const stamped = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const invitation of invitations) {
      if (invitation.seenAt || stamped.current.has(invitation.id)) continue
      stamped.current.add(invitation.id)
      void markInvitationSeen(invitation.id)
    }
  }, [invitations])

  const handleRsvp = useCallback(
    async (invitation: EventInvitation, rsvp: RsvpChoice) => {
      if (invitation.rsvp === rsvp) return

      const previous = invitation.rsvp
      // Optimistic: flip the choice immediately, then roll back if the server
      // rejects it (a past event, most likely).
      setInvitations((current) =>
        current.map((item) => (item.id === invitation.id ? { ...item, rsvp } : item)),
      )

      try {
        const saved = await setInvitationRsvp(invitation.id, rsvp)
        setInvitations((current) =>
          current.map((item) => (item.id === invitation.id ? saved : item)),
        )
      } catch (error) {
        setInvitations((current) =>
          current.map((item) => (item.id === invitation.id ? { ...item, rsvp: previous } : item)),
        )
        toast.error(error instanceof Error ? error.message : 'Could not save your RSVP.')
      }
    },
    [],
  )

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">Events</h2>
      </div>

      <Card className="rounded-[30px] border-orange-100 bg-white shadow-none">
        <CardContent className="space-y-8 p-5 sm:p-7">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                Personal invitations
              </p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">Your invitations.</h3>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
                Summits and programmes you have been invited to directly. Let the team know whether to
                expect you.
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4" aria-hidden>
                {[0, 1].map((row) => (
                  <div
                    key={row}
                    className="min-h-[190px] animate-pulse rounded-[28px] border border-orange-100 bg-orange-50/60"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div role="alert" className="rounded-[28px] border border-orange-100 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-orange-700">{loadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
                  onClick={() => setReloadKey((key) => key + 1)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-orange-200 bg-[#fffaf4] p-8 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
                <h4 className="mt-3 text-lg font-bold text-black">No invitations yet</h4>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-black/55">
                  No invitations yet — you&apos;ll see summit and programme invites here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {invitations.map((invitation, index) => (
                  <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    coverFallback={FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                    onRsvp={handleRsvp}
                  />
                ))}
              </div>
            )}
          </div>

          <AllEventsPanel />
        </CardContent>
      </Card>
    </section>
  )
}

function InvitationCard({
  invitation,
  coverFallback,
  onRsvp,
}: {
  invitation: EventInvitation
  coverFallback: string
  onRsvp: (invitation: EventInvitation, rsvp: RsvpChoice) => void
}) {
  const event = invitation.event
  const past = hasPassed(event?.startAt)
  const isNew = invitation.rsvp === 'pending'

  return (
    <article className="overflow-hidden rounded-[28px] border border-orange-100 bg-white">
      <div className="relative h-40 w-full sm:h-48">
        <Image
          src={event?.cover || coverFallback}
          alt={event?.title || 'Event'}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.42)_52%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div className="flex flex-wrap items-center gap-2">
            {isNew ? (
              <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#fffaf0]">
                New invitation
              </span>
            ) : null}
            {past ? (
              <span className="rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#fffaf0]/85">
                Already took place
              </span>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#fffaf0]/75">
              {formatEventDate(event?.startAt)}
            </p>
            <h4 className="mt-1.5 text-2xl font-bold tracking-tight text-[#fffaf0]">
              {event?.title || 'Untitled event'}
            </h4>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {event?.location ? (
          <p className="flex items-center gap-2 text-sm font-medium text-black/60">
            <MapPin className="h-4 w-4 shrink-0 text-orange-500" strokeWidth={2.2} />
            {event.location}
          </p>
        ) : null}

        {event?.summary ? (
          <p className="text-sm font-medium leading-6 text-black/60">{event.summary}</p>
        ) : null}

        {invitation.message ? (
          <div className="rounded-2xl border border-orange-100 bg-[#fffaf4] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
              A note from the team
            </p>
            <p className="mt-1.5 text-sm font-medium leading-6 text-black/70">{invitation.message}</p>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
            {past ? 'Your response' : 'Will you be there?'}
          </p>
          <div
            role="group"
            aria-label={`RSVP to ${event?.title || 'this event'}`}
            className="mt-2.5 inline-flex flex-wrap gap-1.5 rounded-full border border-orange-100 bg-[#fffaf4] p-1.5"
          >
            {RSVP_CHOICES.map((choice) => {
              const selected = invitation.rsvp === choice
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={selected}
                  disabled={past}
                  onClick={() => onRsvp(invitation, choice)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'bg-orange-500 text-[#fffaf0]'
                      : 'text-black/60 hover:bg-orange-100 hover:text-black',
                    past && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                  )}
                >
                  {RSVP_LABELS[choice]}
                </button>
              )
            })}
          </div>
          {past ? (
            <p className="mt-2 text-xs font-medium text-black/45">
              This event has already taken place, so the RSVP is locked.
            </p>
          ) : null}
        </div>

        {event?.registrationUrl ? (
          <Button
            asChild
            variant="outline"
            className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
          >
            <Link href={event.registrationUrl}>
              {event.registrationLabel}
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  )
}

/**
 * The public events listing the dashboard already showed, kept intact so
 * nothing is lost by moving members into this section.
 */
function AllEventsPanel() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)

    fetchPublicEvents(6)
      .then((payload) => {
        if (!cancelled) setEvents(payload)
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([])
          setLoadFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return (
    <div className="space-y-5 border-t border-orange-100 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Open to everyone</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">All events.</h3>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
            Browse upcoming summits, live sessions, and community programs from the main events hub.
          </p>
        </div>
        <Button asChild className="rounded-full bg-[#050505] px-7 py-6 text-[#fffaf0] hover:bg-[#171717]">
          <Link href="/events">
            Open events hub
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="min-h-[250px] animate-pulse rounded-[28px] border border-orange-100 bg-orange-50/60"
            />
          ))}
        </div>
      ) : loadFailed ? (
        <div role="alert" className="rounded-[28px] border border-orange-100 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-orange-700">Could not load events right now.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-orange-200 bg-[#fffaf4] p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
          <h4 className="mt-3 text-lg font-bold text-black">No events scheduled yet</h4>
          <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-6 text-black/55">
            New summits, live sessions, and programs will show up here as soon as they are announced.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event, index) => (
            <article
              key={event.id}
              className="relative min-h-[250px] overflow-hidden rounded-[28px] border border-orange-100 bg-black p-6 text-[#fffaf0]"
            >
              <Image
                src={event.cover || event.featured_image_url || FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                alt={event.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,0,0,0.84)_0%,rgba(0,0,0,0.58)_46%,rgba(0,0,0,0.82)_100%)]" />
              <div className="relative z-10 flex h-full min-h-[250px] flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#fffaf0]/70">
                    {formatEventDate(event.start_at)}
                  </p>
                  <h4 className="mt-4 text-2xl font-bold tracking-tight">{event.title}</h4>
                  <p className="mt-2 max-w-md text-sm font-medium leading-6 text-[#fffaf0]/75">
                    {event.summary || 'Program details from the Africa Future Leaders events hub.'}
                  </p>
                </div>
                <div className="mt-6">
                  <Button asChild className="rounded-full bg-[#fffaf0] px-6 py-5 text-black hover:bg-[#fffaf0]/90">
                    <Link href={event.registration_url || '/events'}>
                      {event.registration_label || 'Join event'}
                      <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.8} />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// Mirrors formatDashboardDate() in app/dashboard/page.tsx so dates read the
// same across the dashboard.
function formatEventDate(value?: string | null) {
  if (!value) return 'Upcoming'

  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return 'Upcoming'
  }
}

function hasPassed(startAt?: string | null) {
  if (!startAt) return false
  const time = new Date(startAt).getTime()
  return !Number.isNaN(time) && time < Date.now()
}
