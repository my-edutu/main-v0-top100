import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Claim Your Awardee Profile',
  description: 'Claim and set up your Top100 Africa Future Leaders awardee profile.',
  ...ogMetadata(pageOg('/signup'), { url: '/signup' }),
}

export default function SignupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
