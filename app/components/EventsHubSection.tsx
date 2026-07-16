"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, ArrowRight, Megaphone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { HomepageAnnouncement, HomepageEvent } from "@/lib/homepage-feed"

interface HubItem {
    id: string
    type: 'event' | 'announcement'
    title: string
    subtitle?: string | null
    content?: string | null
    start_at?: string
    image_url?: string | null
    cta_url?: string | null
    cta_label?: string | null
    is_featured?: boolean
    is_virtual?: boolean
    city?: string | null
    country?: string | null
    location?: string | null
    created_at?: string
}

type EventsHubSectionProps = {
    initialEvents?: HomepageEvent[]
    initialAnnouncements?: HomepageAnnouncement[]
}

const stripHtml = (value?: string | null) =>
    value
        ? value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
        : null

const buildHubItems = (events: HomepageEvent[], announcements: HomepageAnnouncement[]): HubItem[] => {
    const hubItems: HubItem[] = [
        ...events.map((event) => ({
            id: event.id,
            type: "event" as const,
            title: event.title,
            subtitle: event.summary ?? event.subtitle,
            content: event.description,
            start_at: event.start_at,
            image_url: event.featured_image_url,
            cta_url: event.registration_url,
            cta_label: event.registration_label,
            is_featured: event.is_featured,
            is_virtual: event.is_virtual,
            city: event.city,
            country: event.country,
            location: event.location,
            created_at: event.created_at ?? undefined,
        })),
        ...announcements.map((announcement) => ({
            id: announcement.id,
            type: "announcement" as const,
            title: announcement.title,
            subtitle: stripHtml(announcement.content),
            image_url: announcement.image_url,
            cta_url: announcement.cta_url || `/announcements/${announcement.id}`,
            cta_label: announcement.cta_label || "Learn More",
            is_featured: true,
            created_at: announcement.created_at ?? undefined,
        })),
    ]

    hubItems.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1
        if (!a.is_featured && b.is_featured) return 1

        const dateA = new Date(a.start_at || a.created_at || 0).getTime()
        const dateB = new Date(b.start_at || b.created_at || 0).getTime()
        return dateB - dateA
    })

    return hubItems.slice(0, 6)
}

export default function EventsHubSection({ initialEvents, initialAnnouncements }: EventsHubSectionProps) {
    const hasInitialData = initialEvents !== undefined && initialAnnouncements !== undefined
    const [items, setItems] = useState<HubItem[]>(() => buildHubItems(initialEvents ?? [], initialAnnouncements ?? []))
    const [loading, setLoading] = useState(!hasInitialData)

    useEffect(() => {
        if (hasInitialData) {
            return
        }

        async function fetchData() {
            try {
                const [eventsRes, announcementsRes] = await Promise.all([
                    fetch('/api/events', { cache: 'no-store' }),
                    fetch('/api/announcements', { cache: 'no-store' })
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

                setItems(buildHubItems(events, announcements))
            } catch (error) {
                console.error('Error fetching hub data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [hasInitialData])

    if (loading) return (
        <div className="container py-20 flex justify-center" role="status" aria-live="polite">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" aria-hidden="true" />
            <span className="sr-only">Loading events and announcements</span>
        </div>
    )

    if (items.length === 0) return null

    return (
        <section className="py-16 bg-white overflow-hidden">
            <div className="container">
                <div className="flex flex-col items-center text-center gap-4 mb-8 md:mb-12">
                    <div className="space-y-2">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-zinc-900 tracking-tight">
                            Events & <span className="text-orange-600">Announcements</span>
                        </h2>
                        <p className="text-sm md:text-lg text-zinc-500 font-medium">
                            Featured events and announcements from across our community.
                        </p>
                    </div>
                </div>

                {/* Snap-carousel below lg, grid from lg up so cards never overflow the viewport */}
                <div
                    className={cn(
                        "flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory",
                        "lg:mx-0 lg:grid lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0",
                        items.length === 1 ? "lg:grid-cols-1 lg:max-w-4xl lg:mx-auto" : "lg:grid-cols-2"
                    )}
                >
                    {items.map((item) => (
                        <Link
                            key={`${item.type}-${item.id}`}
                            href={item.type === 'announcement' ? `/announcements/${item.id}` : (item.cta_url || '#')}
                            className="group relative flex flex-col md:flex-row bg-zinc-50 rounded-[2rem] overflow-hidden border border-zinc-100 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 snap-center flex-shrink-0 w-[85vw] sm:w-[400px] md:w-[700px] max-w-4xl lg:w-auto lg:max-w-none lg:flex-shrink"
                        >
                            {/* Image Container */}
                            <div className="relative aspect-[16/10] md:aspect-auto md:w-2/5 overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full min-h-[200px] bg-orange-50 flex items-center justify-center">
                                        {item.type === 'event' ? <Calendar className="h-12 w-12 text-orange-200" /> : <Megaphone className="h-12 w-12 text-orange-200" />}
                                    </div>
                                )}

                                {/* Badge */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                                        item.type === 'event' ? "bg-blue-600 text-white" : "bg-orange-600 text-white"
                                    )}>
                                        {item.type}
                                    </span>
                                    {item.is_featured && (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 text-zinc-900 backdrop-blur shadow-sm">
                                            Featured
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 leading-tight line-clamp-2 transition-colors group-hover:text-orange-600">
                                        {item.title}
                                    </h3>
                                    {item.subtitle && (
                                        <p className="text-sm text-zinc-500 font-medium line-clamp-3">
                                            {item.subtitle}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-auto pt-4 space-y-3">
                                    {item.type === 'event' && item.start_at && (
                                        <div className="flex flex-wrap gap-4 text-xs font-bold text-zinc-400">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-orange-500" />
                                                {new Date(item.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-orange-500" />
                                                {new Date(item.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                                                <span className="truncate max-w-[100px]">
                                                    {item.is_virtual ? 'Virtual' : (item.city || item.location || 'Online')}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center text-sm font-black text-zinc-900 uppercase tracking-widest group-hover:text-orange-600 transition-colors">
                                        {item.cta_label}
                                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
