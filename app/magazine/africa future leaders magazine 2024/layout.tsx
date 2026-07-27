import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Africa Future Leaders Magazine 2024',
  description: 'Read the 2024 edition of the Africa Future Leaders Magazine.',
  ...ogMetadata(pageOg('/magazine/africa future leaders magazine 2024'), { url: '/magazine/africa future leaders magazine 2024' }),
}

export default function Magazine2024Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
