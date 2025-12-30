import type { Metadata } from 'next'
import MagazineClient from './MagazineClient'

export const metadata: Metadata = {
    title: 'Magazine | Top100 Africa Future Leaders',
    description: 'Download and read the official Top100 Africa Future Leaders magazine editions. Featuring stories, insights, and profiles of Africa\'s brightest young leaders.',
    openGraph: {
        title: 'Magazine | Top100 Africa Future Leaders',
        description: 'Download and read the official Top100 Africa Future Leaders magazine editions.',
        images: ['/top100-africa-future-leaders-2024-magazine-cover-w.jpg'],
    },
}

export default function MagazinePage() {
    return <MagazineClient />
}
