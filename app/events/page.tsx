
import { Metadata } from 'next'
import EventsPageClient from './EventsPageClient'

export const metadata: Metadata = {
    title: 'Events & Summits | Top100 Africa Future Leaders',
    description: 'Join our transformative summits, workshops, and gatherings designed to empower the next generation of African leaders.',
    openGraph: {
        title: 'Events & Summits | Top100 Africa Future Leaders',
        description: 'Join our transformative summits, workshops, and gatherings designed to empower the next generation of African leaders.',
        images: [{ url: '/magazine-cover-2025.jpg', width: 1200, height: 630, alt: 'Top100 Events' }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Events & Summits | Top100 Africa Future Leaders',
        description: 'Join our transformative summits, workshops, and gatherings designed to empower the next generation of African leaders.',
        images: ['/magazine-cover-2025.jpg'],
    }
}

export default function EventsPage() {
    return <EventsPageClient />
}
