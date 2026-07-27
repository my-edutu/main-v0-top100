import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Africa Future Leaders Summit',
  description: 'The Africa Future Leaders Summit — the continent\'s rising leaders, in one room.',
  ...ogMetadata(pageOg('/initiatives/summit'), { url: '/initiatives/summit' }),
}

export default function SummitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
