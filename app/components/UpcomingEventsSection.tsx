"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, Users, ArrowRight, ExternalLink } from "lucide-react"

interface UpcomingEvent {
  id: string
  title: string
  summary: string | null
  description: string | null
  start_at: string
  end_at: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  featured_image_url: string | null
  registration_url: string | null
  is_featured: boolean
  capacity: number | null
  tags: string[]
  status: string
  visibility: string
}

const UpcomingEventsSection = () => {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch from the same API as admin uses - the events table
        const response = await fetch('/api/events', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          // Filter to only show upcoming events (start_at > now) and limit to 3
          const now = new Date()
          const upcomingEvents = data
            .filter((event: UpcomingEvent) => {
              const startDate = new Date(event.start_at)
              return startDate > now && event.status === 'published' && event.visibility === 'public'
            })
            .sort((a: UpcomingEvent, b: UpcomingEvent) =>
              new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
            )
            .slice(0, 3)
          setEvents(upcomingEvents)
        } else {
          console.error('Failed to fetch events:', response.status)
        }
      } catch (error) {
        console.error('Error fetching events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventLocation = (event: UpcomingEvent) => {
    if (event.is_virtual) return 'Virtual Event'
    if (event.city && event.country) return `${event.city}, ${event.country}`
    if (event.city) return event.city
    if (event.location) return event.location
    return 'Location TBD'
  }

  if (loading) {
    return (
      <section className="py-8">
        <div className="container space-y-6 sm:space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-semibold">Upcoming Events</h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-900">
              Loading events...
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm">
                  <div className="h-48 bg-muted"></div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (events.length === 0) {
    return null // Don't show section if no upcoming events
  }

  return (
    <section className="py-8">
      <div className="container space-y-6 sm:space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl sm:text-4xl font-semibold">Upcoming Events</h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-900">
            Join us at our upcoming events and be part of Africa's leadership movement
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="group overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Event Image */}
              {event.featured_image_url ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.featured_image_url}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  {event.is_featured && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-lg">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-48 bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                  <Calendar className="h-16 w-16 text-orange-500/40" />
                  {event.is_featured && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-500 text-white shadow-lg">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Event Details */}
              <div className="p-6 space-y-4">
                {/* Event Title */}
                <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-orange-500 transition-colors">
                  {event.title}
                </h3>

                {/* Event Description */}
                {(event.summary || event.description) && (
                  <p className="text-sm text-slate-900 line-clamp-2">
                    {event.summary || event.description}
                  </p>
                )}

                {/* Event Meta Information */}
                <div className="space-y-2 text-sm text-slate-700">
                  {/* Date and Time */}
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                    <div>
                      <div className="font-medium">{formatDate(event.start_at)}</div>
                      {event.end_at && event.end_at !== event.start_at && (
                        <div className="text-xs text-slate-900">
                          to {formatDate(event.end_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0 text-orange-500" />
                    <span>{formatTime(event.start_at)}</span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-orange-500" />
                    <span className="line-clamp-1">{getEventLocation(event)}</span>
                  </div>

                  {/* Capacity */}
                  {event.capacity && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 flex-shrink-0 text-orange-500" />
                      <span>{event.capacity} spots available</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-slate-100 text-slate-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Registration Button */}
                {event.registration_url && (
                  <div className="pt-2">
                    <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                      <Link href={event.registration_url}>
                        Register Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* View All Events Link */}
        <div className="flex justify-center pt-4">
          <Button asChild variant="outline" size="lg">
            <Link href="/events" className="text-base sm:text-lg">
              View All Events
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export default UpcomingEventsSection

