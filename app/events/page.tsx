
import { Metadata } from 'next'
import { getHomepageAnnouncements, getHomepageEvents } from '@/lib/homepage-feed'
import EventsPageClient from './EventsPageClient'

export const revalidate = 300

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

export const metadata: Metadata = {
    title: 'Events & Summits | Top100 Africa Future Leaders',
    description: 'Join our transformative summits, workshops, and gatherings designed to empower the next generation of African leaders.',
    ...ogMetadata(pageOg('/events'), { url: '/events' }),
}

export default async function EventsPage() {
    const [initialEvents, initialAnnouncements] = await Promise.all([
        getHomepageEvents(),
        getHomepageAnnouncements(),
    ])

    return <EventsPageClient initialEvents={initialEvents} initialAnnouncements={initialAnnouncements} />
}
