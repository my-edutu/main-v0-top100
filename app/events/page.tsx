"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  CalendarDays,
  Clock,
  MapPin,
  ExternalLink,
  Globe2,
  Sparkles,
} from "lucide-react"

interface PublicEvent {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  start_at: string
  end_at: string | null
  registration_url: string | null
  registration_label: string
  featured_image_url: string | null
  tags: string[]
  is_featured: boolean
  created_at: string
  updated_at: string
}

const formatRange = (startAt: string, endAt: string | null) => {
  try {
    const start = new Date(startAt)
    if (!endAt) {
      return format(start, "EEEE, MMMM d yyyy 'at' h:mm a")
    }
    const end = new Date(endAt)
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, "EEEE, MMMM d yyyy")} 'at' ${format(start, "h:mm a")} - ${format(end, "h:mm a")}`
    }
    return `${format(start, "MMM d, yyyy 'at' h:mm a")} - ${format(end, "MMM d, yyyy 'at' h:mm a")}`
  } catch (error) {
    return startAt
  }
}

const isUpcoming = (event: PublicEvent) => {
  const now = new Date()
  const start = new Date(event.start_at)
  return start.getTime() >= now.getTime()
}

const sortUpcoming = (a: PublicEvent, b: PublicEvent) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
const sortPast = (a: PublicEvent, b: PublicEvent) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime()

export default function EventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/events", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to fetch events")
      }
      const data = (await response.json()) as PublicEvent[]
      setEvents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading events", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    const channel = supabase
      .channel("public-events-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        fetchEvents()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEvents])

  const upcomingEvents = useMemo(() => events.filter(isUpcoming).sort(sortUpcoming), [events])
  const pastEvents = useMemo(() => events.filter((event) => !isUpcoming(event)).sort(sortPast), [events])
  const featuredEvent = useMemo(() => upcomingEvents.find((event) => event.is_featured) ?? upcomingEvents[0] ?? null, [upcomingEvents])

  const openEventDetail = (event: PublicEvent) => {
    setSelectedEvent(event)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
  }

  const renderEventCard = (event: PublicEvent, variant: "upcoming" | "past") => {
    const start = new Date(event.start_at)
    const month = format(start, "MMM")
    const day = format(start, "dd")

    return (
      <button
        key={event.id}
        onClick={() => openEventDetail(event)}
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl ${variant === "upcoming" ? "backdrop-blur" : "backdrop-blur-sm"}`}
      >
        <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-orange-300">
                <CalendarDays className="h-4 w-4" />
                <span>{format(start, "EEEE, MMMM d")}</span>
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {event.title}
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
              <span className="text-xs tracking-[0.2em] uppercase">{month}</span>
              <span className="text-xl font-bold">{day}</span>
            </div>
          </div>
          {event.summary && (
            <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
              {event.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{format(start, "h:mm a")}</span>
            </div>
            <Separator orientation="vertical" className="h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              {event.is_virtual ? (
                <>
                  <Globe2 className="h-4 w-4" />
                  <span>Virtual experience</span>
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  <span>{event.city || event.location || "Onsite"}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {event.tags?.slice(0, 3).map((tag) => (
              <Badge key={`${event.id}-${tag}`} variant="outline" className="border-white/20 text-white">
                {tag}
              </Badge>
            ))}
            {variant === "upcoming" && event.registration_url && (
              <Badge className="bg-orange-500/20 text-orange-200">
                Registration open
              </Badge>
            )}
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="relative min-h-screen bg-black py-24 text-white">
      <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-50 mix-blend-soft-light" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 md:px-6">
        <div className="space-y-6 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Stories that shape the future of African leadership
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-zinc-300 md:mx-0">
            Dive into our archive of summits, workshops, and community gatherings. Each program is crafted to amplify
            bold African voices and create lasting impact. Tap any event to relive the moments or save your seat for what's next.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-lg text-zinc-400">Loading events...</div>
        ) : (
          <div className="space-y-16">
            {featuredEvent && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm uppercase tracking-[0.3em] text-orange-300">
                    <Sparkles className="h-4 w-4" />
                    Featured Experience
                  </div>
                  <Link href="#past-events" className="text-sm text-orange-200 hover:text-orange-100">
                    Jump to past highlights →
                  </Link>
                </div>
                <Card className="overflow-hidden border border-orange-500/40 bg-white/10 backdrop-blur">
                  <CardContent className="grid gap-8 p-8 md:grid-cols-[2fr_3fr]">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-100">
                        Upcoming spotlight
                      </div>
                      <h2 className="text-3xl font-semibold text-white md:text-4xl">{featuredEvent.title}</h2>
                      <p className="text-sm leading-relaxed text-zinc-200 md:text-base">
                        {featuredEvent.summary ?? "Join us for a transformational gathering designed to accelerate changemakers across the continent."}
                      </p>
                      <dl className="space-y-3 text-sm text-zinc-200">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-orange-300" />
                          <span>{formatRange(featuredEvent.start_at, featuredEvent.end_at)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {featuredEvent.is_virtual ? (
                            <>
                              <Globe2 className="h-5 w-5 text-orange-300" />
                              <span>Virtual experience</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="h-5 w-5 text-orange-300" />
                              <span>{featuredEvent.location || [featuredEvent.city, featuredEvent.country].filter(Boolean).join(", ") || "Onsite venue"}</span>
                            </>
                          )}
                        </div>
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        {featuredEvent.tags?.slice(0, 4).map((tag) => (
                          <Badge key={`featured-${tag}`} variant="outline" className="border-white/25 text-white">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-2">
                        {featuredEvent.registration_url ? (
                          <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
                            <a href={featuredEvent.registration_url} target="_blank" rel="noopener noreferrer">
                              {featuredEvent.registration_label || "Register"}
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button disabled variant="outline" className="border-white/30 text-white">
                            Registration coming soon
                          </Button>
                        )}
                        <Button variant="outline" className="border-white/30 text-white" onClick={() => openEventDetail(featuredEvent)}>
                          Explore details
                        </Button>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                      {featuredEvent.featured_image_url ? (
                        <img
                          src={featuredEvent.featured_image_url}
                          alt={featuredEvent.title}
                          className="h-full w-full object-cover opacity-100"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-sm text-zinc-500">
                          Visual coming soon
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Upcoming Gatherings</h2>
                  <p className="text-sm text-zinc-300">Reserve your spot before capacity fills up.</p>
                </div>
                <Badge className="bg-white/10 text-orange-200">
                  {upcomingEvents.length + 1} upcoming
                </Badge>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Africa Future Leaders Summit 2026 */}
                <div 
                  className="group cursor-pointer relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl backdrop-blur"
                  onClick={() => window.location.href = '/initiatives/summit'}
                >
                  <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-orange-300">
                          <CalendarDays className="h-4 w-4" />
                          <span>2026</span>
                        </div>
                        <h3 className="mt-2 text-2xl font-semibold text-white">
                          Africa Future Leaders Summit 2026
                        </h3>
                      </div>
                      <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
                        <span className="text-xs tracking-[0.2em] uppercase">2026</span>
                        <span className="text-xl font-bold">TBD</span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
                      Join us in co-creating a gathering that accelerates Africa's next generation of changemakers.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4" />
                        <span>Hybrid experience</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-orange-500/20 text-orange-200">
                        Registration opening soon
                      </Badge>
                    </div>
                  </div>
                </div>

                {upcomingEvents.map((event) => renderEventCard(event, "upcoming"))}
              </div>
            </section>

            <section id="past-events" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Past Highlights</h2>
                  <p className="text-sm text-zinc-300">Relive the moments that have shaped our network.</p>
                </div>
                <Badge className="bg-white/10 text-zinc-200">{pastEvents.length + 2} recorded</Badge>
              </div>
              {(pastEvents.length === 0 && upcomingEvents.length > 0) ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-zinc-300">
                  Our timeline is just getting started. Check back for recaps from recent programs.
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Africa Future Leaders Summit 2025 - Past Event */}
                  <div 
                    className="group cursor-pointer relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl backdrop-blur"
                    onClick={() => window.location.href = '/initiatives/summit'}
                  >
                    <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-orange-300">
                            <CalendarDays className="h-4 w-4" />
                            <span>2025</span>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            Africa Future Leaders Summit 2025
                          </h3>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
                          <span className="text-xs tracking-[0.2em] uppercase">2025</span>
                          <span className="text-lg font-bold">TBD</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
                        Join us in co-creating a gathering that accelerates Africa's next generation of changemakers.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4" />
                          <span>Hybrid experience</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Africa Future Leaders Summit 2024 - Past Event */}
                  <div 
                    className="group cursor-pointer relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl backdrop-blur"
                    onClick={() => window.location.href = '/initiatives/summit'}
                  >
                    <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
                    <div className="relative z-10 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm text-orange-300">
                            <CalendarDays className="h-4 w-4" />
                            <span>2024</span>
                          </div>
                          <h3 className="mt-2 text-xl font-semibold text-white">
                            Africa Future Leaders Summit 2024
                          </h3>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
                          <span className="text-xs tracking-[0.2em] uppercase">2024</span>
                          <span className="text-lg font-bold">TBD</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-zinc-300 line-clamp-3">
                        Empowering Africa's Future Leaders - Recap of the groundbreaking summit.
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4" />
                          <span>Hybrid experience</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {pastEvents.map((event) => renderEventCard(event, "past"))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-white/10 bg-zinc-950/95 text-white backdrop-blur-xl">
          {selectedEvent && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-3xl font-semibold">{selectedEvent.title}</DialogTitle>
                {selectedEvent.subtitle && <DialogDescription className="text-base text-zinc-300">{selectedEvent.subtitle}</DialogDescription>}
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-orange-300" />
                    <span>{formatRange(selectedEvent.start_at, selectedEvent.end_at)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-white/10" />
                  <div className="flex items-center gap-2">
                    {selectedEvent.is_virtual ? (
                      <>
                        <Globe2 className="h-4 w-4 text-orange-300" />
                        <span>Virtual</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 text-orange-300" />
                        <span>{selectedEvent.location || [selectedEvent.city, selectedEvent.country].filter(Boolean).join(", ") || "Onsite venue"}</span>
                      </>
                    )}
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {selectedEvent.featured_image_url && (
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={selectedEvent.featured_image_url}
                      alt={selectedEvent.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-4 text-sm leading-relaxed text-zinc-200">
                  {selectedEvent.description ? (
                    <p className="whitespace-pre-line">{selectedEvent.description}</p>
                  ) : selectedEvent.summary ? (
                    <p>{selectedEvent.summary}</p>
                  ) : (
                    <p>Stay tuned for more details about this experience.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.tags?.map((tag) => (
                    <Badge key={`detail-${tag}`} variant="outline" className="border-white/20 text-white">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  Last updated {format(new Date(selectedEvent.updated_at), "MMM d, yyyy")}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedEvent.registration_url ? (
                    <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
                      <a href={selectedEvent.registration_url} target="_blank" rel="noopener noreferrer">
                        {selectedEvent.registration_label || "Register"}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="border-white/30 text-white">
                      Registration unavailable
                    </Button>
                  )}
                  <Button variant="outline" className="border-white/30 text-white" onClick={closeDialog}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}