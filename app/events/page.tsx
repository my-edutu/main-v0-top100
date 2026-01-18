"use client";

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
  created_at?: string
  updated_at?: string
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

export default function EventsPage() {
  const [items, setItems] = useState<CombinedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<CombinedItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [eventsRes, announcementsRes] = await Promise.all([
        fetch("/api/events", { cache: "no-store" }),
        fetch("/api/announcements", { cache: "no-store" })
      ])

      let combined: CombinedItem[] = []

      if (eventsRes.ok) {
        const events = await eventsRes.json()
        combined = [...combined, ...events.map((e: any) => ({ ...e, type: 'event' }))]
      }

      if (announcementsRes.ok) {
        const announcements = await announcementsRes.json()
        combined = [...combined, ...announcements.map((a: any) => ({
          ...a,
          type: 'announcement',
          summary: a.content,
          featured_image_url: a.image_url,
          registration_url: a.cta_url,
          registration_label: a.cta_label,
          start_at: a.scheduled_at || a.created_at, // Use scheduling/creation date as the primary date for display
          is_featured: true // Treat all active announcements as featured for the events hub
        }))]
      }

      setItems(combined)
    } catch (error) {
      console.error("Error loading events/announcements", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel("public-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const upcomingItems = useMemo(() => {
    return items
      .filter(item => {
        if (item.type === 'announcement') return true // Show all active announcements as "current/upcoming"
        const now = new Date()
        const start = new Date(item.start_at || 0)
        return start.getTime() >= now.getTime()
      })
      .sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1
        if (!a.is_featured && b.is_featured) return 1
        return new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime()
      })
  }, [items])

  const pastItems = useMemo(() => {
    return items
      .filter(item => {
        if (item.type === 'announcement') return false // Announcements are either active or not, don't show in past list
        const now = new Date()
        const start = new Date(item.start_at || 0)
        return start.getTime() < now.getTime()
      })
      .sort((a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime())
  }, [items])

  const featuredItem = useMemo(() => upcomingItems.find((item) => item.is_featured) ?? upcomingItems[0] ?? null, [upcomingItems])

  const openDetail = (item: CombinedItem) => {
    setSelectedItem(item)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
  }

  const renderCard = (item: CombinedItem, variant: "upcoming" | "past") => {
    const start = new Date(item.start_at || 0)
    const month = format(start, "MMM")
    const day = format(start, "dd")

    if (item.type === 'announcement') {
      return (
        <Link
          key={`${item.type}-${item.id}`}
          href={`/announcements/${item.id}`}
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl ${variant === "upcoming" ? "backdrop-blur" : "backdrop-blur-sm"} block`}
        >
          <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
          <div className="relative z-10 flex flex-col gap-4">
            {/* Same content structure */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm md:text-base text-orange-300">
                  <CalendarDays className="h-4 w-4" />
                  <span>Latest Update</span>
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {item.title}
                </h3>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
                <span className="text-xs md:text-sm tracking-[0.2em] uppercase">NEW</span>
                <span className="text-xl font-bold">!</span>
              </div>
            </div>
            {item.summary && (
              <p className="text-sm md:text-base leading-relaxed text-zinc-300 line-clamp-3">
                {item.summary}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-zinc-300">
              <div className="flex items-center gap-2 font-bold text-orange-400">
                <Sparkles className="h-4 w-4" />
                <span>Featured Announcement</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.tags?.slice(0, 3).map((tag) => (
                <Badge key={`${item.id}-${tag}`} variant="outline" className="border-white/20 text-white">
                  {tag}
                </Badge>
              ))}
              {variant === "upcoming" && (
                <Badge className="bg-orange-500/20 text-orange-200">
                  Learn more
                </Badge>
              )}
            </div>
          </div>
        </Link>
      )
    }

    return (
      <button
        key={`${item.type}-${item.id}`}
        onClick={() => openDetail(item)}
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/70 hover:bg-white/10 hover:shadow-xl ${variant === "upcoming" ? "backdrop-blur" : "backdrop-blur-sm"}`}
      >
        <div className="absolute inset-0 bg-orange-400/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm md:text-base text-orange-300">
                <CalendarDays className="h-4 w-4" />
                <span>{format(start, "EEEE, MMMM d")}</span>
              </div>
              <h3 className="mt-2 text-2xl font-semibold text-white">
                {item.title}
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl bg-white/10 px-3 py-2 text-white">
              <span className="text-xs md:text-sm tracking-[0.2em] uppercase">{month}</span>
              <span className="text-xl font-bold">{day}</span>
            </div>
          </div>
          {item.summary && (
            <p className="text-sm md:text-base leading-relaxed text-zinc-300 line-clamp-3">
              {item.summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-zinc-300">
            <>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{format(start, "h:mm a")}</span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                {item.is_virtual ? (
                  <>
                    <Globe2 className="h-4 w-4" />
                    <span>Virtual experience</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    <span>{item.city || item.location || "Onsite"}</span>
                  </>
                )}
              </div>
            </>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags?.slice(0, 3).map((tag) => (
              <Badge key={`${item.id}-${tag}`} variant="outline" className="border-white/20 text-white">
                {tag}
              </Badge>
            ))}
            {variant === "upcoming" && (item.registration_url) && (
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
    <div className="relative min-h-[70vh] sm:min-h-screen bg-black py-12 sm:py-24 text-white">
      <div className="absolute inset-0 bg-[url('/textures/noise.png')] opacity-50 mix-blend-soft-light" aria-hidden="true" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 md:px-6">
        <div className="space-y-6 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Stories that shape the future of African leadership
          </h1>
          <p className="mx-auto max-w-3xl text-lg sm:text-xl text-zinc-300 md:mx-0">
            Dive into our archive of summits, workshops, and community gatherings. Each program is crafted to amplify
            bold African voices and create lasting impact. Tap any event to relive the moments or save your seat for what's next.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-lg text-zinc-400">Loading ecosystem updates...</div>
        ) : (
          <div className="space-y-16">
            {featuredItem && (
              <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm sm:text-base uppercase tracking-[0.3em] text-orange-300">
                    <Sparkles className="h-4 w-4" />
                    {featuredItem.type === 'announcement' ? 'Latest Spotlight' : 'Featured Experience'}
                  </div>
                </div>
                <Card className="overflow-hidden border border-orange-500/40 bg-white/10 backdrop-blur">
                  <CardContent className="grid gap-8 p-8 md:grid-cols-2 items-stretch">
                    <div className="space-y-4 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-3 py-1 text-xs sm:text-sm font-semibold uppercase tracking-wide text-orange-100 w-fit">
                        {featuredItem.type === 'announcement' ? 'Community update' : 'Upcoming spotlight'}
                      </div>
                      <h2 className="text-3xl font-semibold text-white md:text-4xl">{featuredItem.title}</h2>
                      <p className="text-sm leading-relaxed text-zinc-200 md:text-base lg:text-lg">
                        {featuredItem.summary ?? "Join us for a transformational gathering designed to accelerate changemakers across the continent."}
                      </p>
                      <dl className="space-y-3 text-sm md:text-base text-zinc-200">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-5 w-5 text-orange-300" />
                          <span>{featuredItem.type === 'announcement' ? `Published ${format(new Date(featuredItem.start_at || 0), "PPP")}` : formatRange(featuredItem.start_at || '', featuredItem.end_at || null)}</span>
                        </div>
                        {featuredItem.type === 'event' && (
                          <div className="flex items-center gap-3">
                            {featuredItem.is_virtual ? (
                              <>
                                <Globe2 className="h-5 w-5 text-orange-300" />
                                <span>Virtual experience</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="h-5 w-5 text-orange-300" />
                                <span>{featuredItem.location || [featuredItem.city, featuredItem.country].filter(Boolean).join(", ") || "Onsite venue"}</span>
                              </>
                            )}
                          </div>
                        )}
                      </dl>
                      <div className="flex flex-wrap gap-2">
                        {featuredItem.tags?.slice(0, 4).map((tag) => (
                          <Badge key={`featured-${tag}`} variant="outline" className="border-white/25 text-white">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-2">
                        {featuredItem.type === 'announcement' ? (
                          <div className="flex flex-wrap gap-3">
                            <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
                              <Link href={featuredItem.registration_url || `/announcements/${featuredItem.id}`}>
                                {featuredItem.registration_label || "Learn More"}
                                <ExternalLink className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                            <Button asChild variant="outline" className="border-white/30 text-white">
                              <Link href={`/announcements/${featuredItem.id}`}>
                                Explore details
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <>
                            {featuredItem.registration_url ? (
                              <Button asChild className="bg-yellow-500 text-black hover:bg-yellow-400">
                                <a href={featuredItem.registration_url} target="_blank" rel="noopener noreferrer">
                                  {featuredItem.registration_label || "Register"}
                                  <ExternalLink className="ml-2 h-4 w-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button disabled variant="outline" className="border-white/30 text-white">
                                Registration coming soon
                              </Button>
                            )}
                            <Button variant="outline" className="border-white/30 text-white" onClick={() => openDetail(featuredItem)}>
                              Explore details
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 aspect-square md:aspect-auto md:max-h-[400px]">
                      {featuredItem.featured_image_url ? (
                        <img
                          src={featuredItem.featured_image_url}
                          alt={featuredItem.title}
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
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border border-zinc-200 bg-white text-zinc-900 shadow-xl">
          {selectedItem && (
            <>
              <DialogHeader className="space-y-2">
                <DialogTitle className="text-2xl sm:text-3xl font-semibold text-zinc-900">{selectedItem.title}</DialogTitle>
                {selectedItem.subtitle && <DialogDescription className="text-base sm:text-lg text-zinc-600">{selectedItem.subtitle}</DialogDescription>}
                <div className="flex flex-wrap items-center gap-3 text-sm md:text-base text-zinc-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-orange-500" />
                    <span>{selectedItem.type === 'announcement' ? `Updated ${format(new Date(selectedItem.start_at || 0), "PPP")}` : formatRange(selectedItem.start_at || '', selectedItem.end_at || null)}</span>
                  </div>
                  {selectedItem.type === 'event' && (
                    <>
                      <Separator orientation="vertical" className="h-4 bg-zinc-300" />
                      <div className="flex items-center gap-2">
                        {selectedItem.is_virtual ? (
                          <>
                            <Globe2 className="h-4 w-4 text-orange-500" />
                            <span>Virtual</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span>{selectedItem.location || [selectedItem.city, selectedItem.country].filter(Boolean).join(", ") || "Onsite venue"}</span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {selectedItem.featured_image_url && (
                  <div className="overflow-hidden rounded-2xl border border-zinc-200">
                    <img
                      src={selectedItem.featured_image_url}
                      alt={selectedItem.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-4 text-sm sm:text-base leading-relaxed text-zinc-700">
                  {selectedItem.description ? (
                    <p className="whitespace-pre-line">{selectedItem.description}</p>
                  ) : selectedItem.summary ? (
                    <p>{selectedItem.summary}</p>
                  ) : (
                    <p>Stay tuned for more details about this experience.</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags?.map((tag) => (
                    <Badge key={`detail-${tag}`} variant="outline" className="border-zinc-300 text-zinc-700">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div className="text-xs sm:text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Last updated {format(new Date(selectedItem.updated_at || selectedItem.created_at || new Date()), "MMM d, yyyy")}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedItem.registration_url ? (
                    <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
                      {selectedItem.type === 'announcement' ? (
                        <Link href={selectedItem.registration_url}>
                          {selectedItem.registration_label || "Learn More"}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                      ) : (
                        <a href={selectedItem.registration_url} target="_blank" rel="noopener noreferrer">
                          {selectedItem.registration_label || "Register"}
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      )}
                    </Button>
                  ) : selectedItem.type === 'event' && (
                    <Button disabled variant="outline" className="border-zinc-300 text-zinc-500">
                      Registration unavailable
                    </Button>
                  )}
                  <Button variant="outline" className="border-zinc-300 text-zinc-700 hover:bg-zinc-100" onClick={closeDialog}>
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