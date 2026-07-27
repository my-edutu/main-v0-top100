import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'

// The page below is a client component and cannot export metadata itself.
export const metadata: Metadata = {
  title: 'Member Sign In',
  description: 'Sign in to your Top100 Africa Future Leaders member account.',
  ...ogMetadata(pageOg('/login'), { url: '/login' }),
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
