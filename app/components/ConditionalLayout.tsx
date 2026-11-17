'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import { MENTOR_PORTAL } from '@/lib/mentors/contracts'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hide header and footer on admin and auth pages
  const hideLayout =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/dashboard') ||
    pathname?.startsWith('/edit-profile')
  const hideFooter = hideLayout || pathname === MENTOR_PORTAL

  return (
    <>
      {!hideLayout && <Header />}
      <main className="min-h-screen transition-colors duration-300">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </>
  )
}
