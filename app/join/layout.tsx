import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Join the Top100 Africa Future Leaders Network',
  description: 'Join the Top100 Africa Future Leaders network of 400+ awardees across 31 countries.',
  ...ogMetadata(pageOg('/join'), { url: '/join' }),
}

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
