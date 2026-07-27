import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Talk100 Live',
  description: 'Conversations with the people building Africa\'s future, from the Top100 network.',
  ...ogMetadata(pageOg('/initiatives/talk100-live'), { url: '/initiatives/talk100-live' }),
}

export default function Talk100LiveLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
