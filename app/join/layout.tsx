import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

export const metadata: Metadata = {
  title: 'Join the Top100 Africa Future Leaders Network',
  description: 'Join the Top100 Africa Future Leaders network.',
  ...ogMetadata(pageOg('/join'), { url: '/join' }),
}

export default function JoinLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
