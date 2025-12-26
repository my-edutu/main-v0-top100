"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Clock, Users, ArrowRight, ExternalLink } from "lucide-react"

interface UpcomingEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  location: string | null
  event_type: string
  image_url: string | null
  registration_url: string | null
  is_featured: boolean
  max_attendees: number | null
  current_attendees: number
  tags: string[]
}

const UpcomingEventsSection = () => {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/upcoming-events?limit=3', { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()
          setEvents(data)
        } else {
          console.error('Failed to fetch upcoming events:', response.status)
        }
      } catch (error) {
        console.error('Error fetching upcoming events:', error)
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

  const getEventTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      conference: 'bg-blue-100 text-blue-700',
      workshop: 'bg-green-100 text-green-700',
      webinar: 'bg-purple-100 text-purple-700',
      summit: 'bg-orange-100 text-orange-700',
      networking: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700'
    }
    return colors[type] || colors.other
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
              {event.image_url ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={event.image_url}
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
                {/* Event Type Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${getEventTypeColor(event.event_type)}`}>
                    {event.event_type}
                  </span>
                </div>

                {/* Event Title */}
                <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-orange-500 transition-colors">
                  {event.title}
                </h3>

                {/* Event Description */}
                {event.description && (
                  <p className="text-sm text-slate-900 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Event Meta Information */}
                <div className="space-y-2 text-sm text-slate-700">
                  {/* Date and Time */}
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                    <div>
                      <div className="font-medium">{formatDate(event.event_date)}</div>
                      {event.end_date && event.end_date !== event.event_date && (
                        <div className="text-xs text-slate-900">
                          to {formatDate(event.end_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0 text-orange-500" />
                    <span>{formatTime(event.event_date)}</span>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-orange-500" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}

                  {/* Attendees */}
                  {event.max_attendees && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 flex-shrink-0 text-orange-500" />
                      <span>
                        {event.current_attendees} / {event.max_attendees} attendees
                      </span>
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
