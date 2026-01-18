"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Megaphone, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Announcement = {
    id: string
    title: string
    content: string | null
    image_url: string | null
    cta_label: string
    cta_url: string | null
}

export default function AnnouncementsSection() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAnnouncements() {
            try {
                const response = await fetch("/api/announcements")
                if (!response.ok) throw new Error("Failed to fetch")
                const data = await response.json()
                setAnnouncements(data)
            } catch (error) {
                console.error("Announcements error:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchAnnouncements()
    }, [])

    if (loading) return null
    if (announcements.length === 0) return null

    return (
        <section className="py-8 bg-zinc-50/50">
            <div className="container">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-orange-100 rounded-xl">
                        <Megaphone className="h-6 w-6 text-orange-600" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                        Latest <span className="text-orange-600">Announcements</span>
                    </h2>
                </div>

                <div className="grid gap-8">
                    {announcements.map((item) => (
                        <div
                            key={item.id}
                            className="group relative bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-500"
                        >
                            <div className="flex flex-col md:flex-row min-h-[400px]">
                                {/* Image Side */}
                                {item.image_url && (
                                    <div className="md:w-1/2 lg:w-2/5 relative aspect-square md:aspect-auto">
                                        <Image
                                            src={item.image_url}
                                            alt={item.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:hidden" />
                                    </div>
                                )}

                                {/* Content Side */}
                                <div className={cn(
                                    "flex-1 p-8 sm:p-12 flex flex-col justify-center",
                                    !item.image_url && "text-center md:items-center"
                                )}>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 rounded-full font-bold uppercase tracking-widest text-[10px] px-3">
                                                Featured
                                            </Badge>
                                            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-900 tracking-tight leading-[1.1]">
                                                {item.title}
                                            </h3>
                                        </div>

                                        {item.content && (
                                            <p className="text-lg text-zinc-600 leading-relaxed font-medium">
                                                {item.content}
                                            </p>
                                        )}

                                        <div className="pt-4 flex flex-wrap gap-4">
                                            {item.cta_url && (
                                                <Button asChild size="lg" className="rounded-2xl h-14 px-8 text-lg font-bold bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                                                    <Link href={item.cta_url}>
                                                        {item.cta_label}
                                                        <ArrowRight className="ml-2 h-5 w-5" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

function Badge({ children, className, variant = "default" }: any) {
    return (
        <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
        )}>
            {children}
        </span>
    )
}
