import type { Metadata } from 'next'
import MagazineClient from './MagazineClient'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

export const metadata: Metadata = {
    title: 'Magazine | Top100 Africa Future Leaders',
    description: 'Download and read the official Top100 Africa Future Leaders magazine editions. Featuring stories, insights, and profiles of Africa\'s brightest young leaders.',
    ...ogMetadata(pageOg('/magazine'), { url: '/magazine' }),
}

export default function MagazinePage() {
    return <MagazineClient />
}
