"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, ArrowRight, Megaphone, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

export default function EventsHubSection() {
    const [items, setItems] = useState<HubItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [eventsRes, announcementsRes] = await Promise.all([
                    fetch('/api/events', { cache: 'no-store' }),
                    fetch('/api/announcements', { cache: 'no-store' })
                ])

                let hubItems: HubItem[] = []

                if (eventsRes.ok) {
                    const events = await eventsRes.json()
                    hubItems = [
                        ...hubItems,
                        ...events
                            .filter((e: any) => e.status === 'published' && e.visibility === 'public')
                            .map((e: any) => ({
                                id: e.id,
                                type: 'event' as const,
                                title: e.title,
                                subtitle: e.summary,
                                content: e.description,
                                start_at: e.start_at,
                                image_url: e.featured_image_url,
                                cta_url: e.registration_url,
                                cta_label: 'Register Now',
                                is_featured: e.is_featured,
                                is_virtual: e.is_virtual,
                                city: e.city,
                                country: e.country,
                                location: e.location
                            }))
                    ]
                }

                if (announcementsRes.ok) {
                    const announcements = await announcementsRes.json()
                    hubItems = [
                        ...hubItems,
                        ...announcements.map((a: any) => ({
                            id: a.id,
                            type: 'announcement' as const,
                            title: a.title,
                            subtitle: a.content,
                            image_url: a.image_url,
                            cta_url: a.cta_url || `/announcements/${a.id}`,
                            cta_label: a.cta_label || 'Learn More',
                            is_featured: true,
                            created_at: a.created_at
                        }))
                    ]
                }

                // Sort items: Featured first, then by date (upcoming events or recent announcements)
                hubItems.sort((a, b) => {
                    if (a.is_featured && !b.is_featured) return -1
                    if (!a.is_featured && b.is_featured) return 1

                    const dateA = new Date(a.start_at || a.created_at || 0).getTime()
                    const dateB = new Date(b.start_at || b.created_at || 0).getTime()
                    return dateB - dateA // Most recent first for mixed hub
                })

                setItems(hubItems.slice(0, 6)) // Limit to 6 items
            } catch (error) {
                console.error('Error fetching hub data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) return (
        <div className="container py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
    )

    if (items.length === 0) return null

    return (
        <section className="py-16 bg-white overflow-hidden">
            <div className="container">
                <div className="flex flex-col items-center text-center gap-6 mb-12">
                    <div className="space-y-2">
                        <h2 className="text-4xl md:text-5xl font-semibold text-zinc-900 tracking-tight">
                            Events & <span className="text-orange-600">Announcements</span>
                        </h2>
                        <p className="text-lg text-zinc-500 font-medium">
                            Featured events and announcements from across our community.
                        </p>
                    </div>
                    <Button asChild variant="outline" className="rounded-full border-zinc-200 font-bold hover:bg-zinc-50">
                        <Link href="/events">View All Calendar</Link>
                    </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <Link
                            key={`${item.type}-${item.id}`}
                            href={item.type === 'announcement' ? `/announcements/${item.id}` : (item.cta_url || '#')}
                            className="group relative flex flex-col bg-zinc-50 rounded-[2rem] overflow-hidden border border-zinc-100 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1"
                        >
                            {/* Image Container */}
                            <div className="relative aspect-[16/10] overflow-hidden">
                                {item.image_url ? (
                                    <Image
                                        src={item.image_url}
                                        alt={item.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-orange-50 flex items-center justify-center">
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
                            <div className="flex-1 p-6 sm:p-8 flex flex-col space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 leading-tight line-clamp-2 transition-colors group-hover:text-orange-600">
                                        {item.title}
                                    </h3>
                                    {item.subtitle && (
                                        <p className="text-sm text-zinc-500 font-medium line-clamp-2">
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
