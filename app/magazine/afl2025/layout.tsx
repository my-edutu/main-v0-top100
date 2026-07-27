import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Africa Future Leaders Magazine 2025',
  description: 'Read the 2025 edition of the Africa Future Leaders Magazine.',
  ...ogMetadata(pageOg('/magazine/afl2025'), { url: '/magazine/afl2025' }),
}

export default function Magazine2025Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
