import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Opportunities for African Youth',
  description: 'Scholarships, fellowships, grants, and internships for African youth, curated by Top100 Africa Future Leaders.',
  ...ogMetadata(pageOg('/initiatives/opportunities'), { url: '/initiatives/opportunities' }),
}

export default function OpportunitiesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
