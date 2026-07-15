"use client";

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import type { HomepageAnnouncement, HomepageEvent } from "@/lib/homepage-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Globe2,
  MapPin,
  Megaphone,
  Sparkles,
} from "lucide-react"

interface CombinedItem {
  id: string
  type: 'event' | 'announcement'
  title: string
  subtitle?: string | null
  summary?: string | null
  description?: string | null
  location?: string | null
  city?: string | null
  country?: string | null
  is_virtual?: boolean
  start_at?: string
  end_at?: string | null
  registration_url?: string | null
  registration_label?: string
  featured_image_url?: string | null
  tags?: string[]
  is_featured?: boolean
  created_at?: string | null
  updated_at?: string | null
}

type EventsPageProps = {
  initialEvents?: HomepageEvent[]
  initialAnnouncements?: HomepageAnnouncement[]
}

const hasLiveSupabaseKey =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("eyJ"))

const formatRange = (startAt: string, endAt: string | null) => {
  try {
    const start = new Date(startAt)
    if (!endAt) {
      return format(start, "EEEE, MMMM d, yyyy 'at' h:mm a")
    }
    const end = new Date(endAt)
    if (start.toDateString() === end.toDateString()) {
      return `${format(start, "EEEE, MMMM d, yyyy")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`
    }
    return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`
  } catch (error) {
    return startAt
  }
}

const eventPlace = (item: CombinedItem) => {
  if (item.is_virtual) return "Virtual"
  return item.city || item.location || [item.city, item.country].filter(Boolean).join(", ") || "Onsite"
}

const buildCombinedItems = (events: HomepageEvent[], announcements: HomepageAnnouncement[]) => {
  const combined: CombinedItem[] = [
    ...events.map((event) => ({
      ...event,
      type: 'event' as const,
    })),
    ...announcements.map((announcement) => ({
      ...announcement,
      type: 'announcement' as const,
      summary: announcement.content,
      featured_image_url: announcement.image_url,
      registration_url: announcement.cta_url,
      registration_label: announcement.cta_label,
      start_at: announcement.scheduled_at || announcement.created_at || new Date().toISOString(),
      is_featured: true,
    })),
  ]

  return combined
}

export default function EventsPage({ initialEvents, initialAnnouncements }: EventsPageProps) {
  const hasInitialData = initialEvents !== undefined && initialAnnouncements !== undefined
  const [items, setItems] = useState<CombinedItem[]>(() => buildCombinedItems(initialEvents ?? [], initialAnnouncements ?? []))
  const [loading, setLoading] = useState(!hasInitialData)
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchData = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    try {
      if (withSpinner) {
        setLoading(true)
      }

      const [eventsRes, announcementsRes] = await Promise.all([
        fetch("/api/events", { cache: "no-store" }),
        fetch("/api/announcements", { cache: "no-store" })
      ])

      let events: HomepageEvent[] = []
      let announcements: HomepageAnnouncement[] = []

      if (eventsRes.ok) {
        const payload = await eventsRes.json()
        events = Array.isArray(payload) ? payload : []
      }

      if (announcementsRes.ok) {
        const payload = await announcementsRes.json()
        announcements = Array.isArray(payload) ? payload : []
      }

      setItems(buildCombinedItems(events, announcements))
    } catch (error) {
      console.error("Error loading events/announcements", error)
    } finally {
      if (withSpinner) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (hasInitialData) {
      return
    }

    fetchData()
  }, [fetchData, hasInitialData])

  useEffect(() => {
    if (!hasLiveSupabaseKey) {
      return
    }

    const channel = supabase
      .channel("public-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchData({ withSpinner: false }))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchData({ withSpinner: false }))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const upcomingItems = useMemo(() => {
    const now = Date.now()
    return items
      .filter(item => {
        if (item.type === 'announcement') return true
        const start = new Date(item.start_at || 0).getTime()
        const end = item.end_at ? new Date(item.end_at).getTime() : start
        return Math.max(start, end) >= now
      })
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1
        if (!a.is_featured && b.is_featured) return 1
        return new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime()
      })
  }, [items])

  const pastItems = useMemo(() => {
    const now = Date.now()
    return items
      .filter(item => {
        if (item.type === 'announcement') return false
        const start = new Date(item.start_at || 0).getTime()
        const end = item.end_at ? new Date(item.end_at).getTime() : start
        return Math.max(start, end) < now
      })
      .sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime())
  }, [items])

  const featuredItem = useMemo(
    () => upcomingItems.find((item) => item.type === 'event' && item.is_featured) ?? upcomingItems.find((item) => item.type === 'event') ?? upcomingItems[0] ?? null,
    [upcomingItems],
  )

  const listItems = useMemo(
    () => upcomingItems.filter((item) => !(featuredItem && item.id === featuredItem.id && item.type === featuredItem.type)),
    [upcomingItems, featuredItem],
  )

  const openDetail = (item: CombinedItem) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_26%),linear-gradient(180deg,#fffaf4_0%,#ffffff_55%,#f5efe4_100%)]">
      {/* Hero */}
      <section className="px-4 pb-10 pt-16 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-6xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-orange-700 shadow-sm">
            Events &amp; gatherings
          </div>
          <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Where Africa&apos;s future leaders gather.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-8 text-slate-600 sm:text-lg">
            Summits, workshops, and community gatherings crafted to amplify bold African voices.
            Save your seat for what&apos;s next, or look back at the moments that shaped the movement.
          </p>
          {!loading && (
            <p className="mt-6 text-sm font-medium text-slate-500">
              {upcomingItems.length > 0
                ? `${upcomingItems.length} upcoming ${upcomingItems.length === 1 ? "listing" : "listings"}`
                : "No upcoming listings"}
              {pastItems.length > 0 && ` · ${pastItems.length} past ${pastItems.length === 1 ? "event" : "events"}`}
            </p>
          )}
        </div>
      </section>

      {loading ? (
        <section className="px-4 pb-24 sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
          <div className="mx-auto max-w-6xl space-y-10">
            <div className="grid gap-6 overflow-hidden rounded-[32px] border border-[#e9dfd0] bg-white p-6 sm:p-8 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="h-6 w-36 animate-pulse rounded-full bg-orange-100/80" />
                <div className="h-9 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
                <div className="h-12 w-44 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="min-h-[240px] animate-pulse rounded-3xl bg-slate-100" />
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-24 animate-pulse rounded-3xl border border-[#efe6d7] bg-white/70" />
              ))}
            </div>
            <span className="sr-only">Loading events…</span>
          </div>
        </section>
      ) : items.length === 0 ? (
        <section className="px-4 pb-28 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[32px] border border-[#e9dfd0] bg-white px-6 py-16 text-center shadow-[0_24px_60px_-40px_rgba(15,23,42,0.18)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
              <CalendarDays className="h-6 w-6 text-orange-600" aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold text-slate-950">Nothing on the calendar yet</h2>
            <p className="text-sm leading-6 text-slate-600">
              New summits, workshops, and community gatherings will appear here as soon as they&apos;re announced. Check back soon.
            </p>
            <Button asChild variant="outline" className="mt-2 rounded-full border-orange-200 text-orange-700 hover:bg-orange-50">
              <Link href="/get-started">
                Explore the community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* Featured spotlight */}
          {featuredItem && (
            <section className="px-4 pb-14 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-6xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                <div className="grid overflow-hidden rounded-[32px] border border-orange-200/80 bg-white shadow-[0_32px_80px_-48px_rgba(194,65,12,0.35)] lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="flex flex-col justify-center gap-5 p-7 sm:p-10">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      {featuredItem.type === 'announcement' ? 'Latest update' : 'Next up'}
                    </div>

                    <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                      {featuredItem.title}
                    </h2>

                    {featuredItem.summary && (
                      <p className="max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                        {featuredItem.summary}
                      </p>
                    )}

                    <dl className="space-y-2.5 text-[15px] text-slate-700">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                        <span>
                          {featuredItem.type === 'announcement'
                            ? `Published ${format(new Date(featuredItem.start_at || 0), "PPP")}`
                            : formatRange(featuredItem.start_at || '', featuredItem.end_at || null)}
                        </span>
                      </div>
                      {featuredItem.type === 'event' && (
                        <div className="flex items-center gap-3">
                          {featuredItem.is_virtual ? (
                            <Globe2 className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                          ) : (
                            <MapPin className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                          )}
                          <span>
                            {featuredItem.is_virtual
                              ? "Virtual experience — join from anywhere"
                              : featuredItem.location || [featuredItem.city, featuredItem.country].filter(Boolean).join(", ") || "Onsite venue"}
                          </span>
                        </div>
                      )}
                    </dl>

                    {featuredItem.tags && featuredItem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {featuredItem.tags.slice(0, 4).map((tag) => (
                          <Badge key={`featured-${tag}`} variant="outline" className="rounded-full border-[#e9dfd0] bg-[#fffaf4] font-medium text-slate-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-1">
                      {featuredItem.type === 'announcement' ? (
                        <>
                          <Button asChild className="h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 text-[#fff] shadow-none hover:opacity-95">
                            <Link href={featuredItem.registration_url || `/announcements/${featuredItem.id}`}>
                              {featuredItem.registration_label || "Learn more"}
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="h-12 rounded-full border-orange-200 px-7 text-orange-700 hover:bg-orange-50">
                            <Link href={`/announcements/${featuredItem.id}`}>Read the full update</Link>
                          </Button>
                        </>
                      ) : (
                        <>
                          {featuredItem.registration_url ? (
                            <Button asChild className="h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 text-[#fff] shadow-none hover:opacity-95">
                              <a href={featuredItem.registration_url} target="_blank" rel="noopener noreferrer">
                                {featuredItem.registration_label || "Register"}
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          ) : (
                            <Button disabled variant="outline" className="h-12 rounded-full border-[#e9dfd0] px-7 text-slate-500">
                              Registration opens soon
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-12 rounded-full border-orange-200 px-7 text-orange-700 hover:bg-orange-50"
                            onClick={() => openDetail(featuredItem)}
                          >
                            Event details
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="relative min-h-[260px] bg-slate-950 lg:min-h-full">
                    {featuredItem.featured_image_url ? (
                      <img
                        src={featuredItem.featured_image_url}
                        alt={featuredItem.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#431407_0%,#7c2d12_45%,#c2410c_100%)]">
                        <CalendarDays className="h-14 w-14 text-orange-200/70" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Upcoming list */}
          {listItems.length > 0 && (
            <section className="px-4 pb-16 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-6xl">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Coming up</h2>
                <div className="mt-6 overflow-hidden rounded-[28px] border border-[#e9dfd0] bg-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.25)]">
                  {listItems.map((item, index) => {
                    const start = new Date(item.start_at || 0)
                    const isAnnouncement = item.type === 'announcement'
                    const rowInner = (
                      <div className="grid grid-cols-[auto_1fr] items-center gap-4 px-5 py-5 sm:gap-6 sm:px-7 lg:grid-cols-[auto_1fr_auto]">
                        <div
                          className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl ${
                            isAnnouncement ? "bg-slate-950 text-[#fff]" : "border border-orange-200 bg-orange-50 text-orange-800"
                          }`}
                          aria-hidden="true"
                        >
                          {isAnnouncement ? (
                            <>
                              <Megaphone className="h-5 w-5" />
                              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest">New</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold uppercase tracking-widest">{format(start, "MMM")}</span>
                              <span className="text-2xl font-semibold leading-none">{format(start, "dd")}</span>
                            </>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold leading-snug text-slate-950 sm:text-xl">
                            {item.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                            {isAnnouncement ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="h-4 w-4 text-orange-600" aria-hidden="true" />
                                Community update · {format(start, "MMM d, yyyy")}
                              </span>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-4 w-4 text-orange-600" aria-hidden="true" />
                                  {format(start, "EEE, MMM d · h:mm a")}
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                  {item.is_virtual ? (
                                    <Globe2 className="h-4 w-4 text-orange-600" aria-hidden="true" />
                                  ) : (
                                    <MapPin className="h-4 w-4 text-orange-600" aria-hidden="true" />
                                  )}
                                  {eventPlace(item)}
                                </span>
                                {item.registration_url && (
                                  <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                                    Registration open
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {item.summary && (
                            <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-600">
                              {item.summary}
                            </p>
                          )}
                        </div>

                        <ArrowUpRight
                          className="hidden h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-orange-600 lg:block"
                          aria-hidden="true"
                        />
                      </div>
                    )

                    const rowClasses = `group block w-full text-left transition-colors hover:bg-[#fff7ed] focus-visible:bg-[#fff7ed] focus-visible:outline-none ${
                      index > 0 ? "border-t border-[#f0e7d8]" : ""
                    }`

                    return isAnnouncement ? (
                      <Link key={`${item.type}-${item.id}`} href={`/announcements/${item.id}`} className={rowClasses}>
                        {rowInner}
                      </Link>
                    ) : (
                      <button key={`${item.type}-${item.id}`} type="button" onClick={() => openDetail(item)} className={rowClasses}>
                        {rowInner}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Past highlights */}
          {pastItems.length > 0 && (
            <section className="px-4 pb-24 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-6xl">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Past highlights</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                      Relive the summits and gatherings that brought the community together.
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(270px,1fr))]">
                  {pastItems.map((item) => {
                    const start = new Date(item.start_at || 0)
                    return (
                      <button
                        key={`past-${item.id}`}
                        type="button"
                        onClick={() => openDetail(item)}
                        className="group overflow-hidden rounded-3xl border border-[#e9dfd0] bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_24px_50px_-32px_rgba(194,65,12,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                      >
                        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                          {item.featured_image_url ? (
                            <img
                              src={item.featured_image_url}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#f5efe4_0%,#fde8d4_100%)]">
                              <CalendarDays className="h-9 w-9 text-orange-300" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                            {format(start, "MMMM d, yyyy")}
                          </p>
                          <h3 className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-slate-950">
                            {item.title}
                          </h3>
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-slate-600">
                            {item.is_virtual ? (
                              <Globe2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            ) : (
                              <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                            )}
                            {eventPlace(item)}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border border-[#e9dfd0] bg-white text-slate-900 shadow-xl">
          {selectedItem && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-950 sm:text-3xl">{selectedItem.title}</DialogTitle>
                {selectedItem.subtitle && (
                  <DialogDescription className="text-base text-slate-600 sm:text-lg">{selectedItem.subtitle}</DialogDescription>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 md:text-base">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-orange-600" aria-hidden="true" />
                    <span>
                      {selectedItem.type === 'announcement'
                        ? `Updated ${format(new Date(selectedItem.start_at || 0), "PPP")}`
                        : formatRange(selectedItem.start_at || '', selectedItem.end_at || null)}
                    </span>
                  </div>
                  {selectedItem.type === 'event' && (
                    <>
                      <Separator orientation="vertical" className="h-4 bg-[#e9dfd0]" />
                      <div className="flex items-center gap-2">
                        {selectedItem.is_virtual ? (
                          <Globe2 className="h-4 w-4 text-orange-600" aria-hidden="true" />
                        ) : (
                          <MapPin className="h-4 w-4 text-orange-600" aria-hidden="true" />
                        )}
                        <span>
                          {selectedItem.is_virtual
                            ? "Virtual"
                            : selectedItem.location || [selectedItem.city, selectedItem.country].filter(Boolean).join(", ") || "Onsite venue"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {selectedItem.featured_image_url && (
                  <div className="overflow-hidden rounded-2xl border border-[#e9dfd0]">
                    <img
                      src={selectedItem.featured_image_url}
                      alt={selectedItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
                  {selectedItem.description ? (
                    <p className="whitespace-pre-line">{selectedItem.description}</p>
                  ) : selectedItem.summary ? (
                    <p>{selectedItem.summary}</p>
                  ) : (
                    <p>Stay tuned for more details about this experience.</p>
                  )}
                </div>
                {selectedItem.tags && selectedItem.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag) => (
                      <Badge key={`detail-${tag}`} variant="outline" className="rounded-full border-[#e9dfd0] bg-[#fffaf4] font-medium text-slate-700">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-500">
                  Last updated {format(new Date(selectedItem.updated_at || selectedItem.created_at || new Date()), "MMM d, yyyy")}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedItem.registration_url ? (
                    <Button asChild className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-[#fff] shadow-none hover:opacity-95">
                      {selectedItem.type === 'announcement' ? (
                        <Link href={selectedItem.registration_url}>
                          {selectedItem.registration_label || "Learn more"}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      ) : (
                        <a href={selectedItem.registration_url} target="_blank" rel="noopener noreferrer">
                          {selectedItem.registration_label || "Register"}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      )}
                    </Button>
                  ) : selectedItem.type === 'event' && (
                    <Button disabled variant="outline" className="rounded-full border-[#e9dfd0] text-slate-500">
                      Registration unavailable
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-full border-[#e9dfd0] text-slate-700 hover:bg-[#fffaf4]" onClick={closeDialog}>
                    Close
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
