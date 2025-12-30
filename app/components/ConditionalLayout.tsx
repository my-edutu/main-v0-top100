'use client'

import { usePathname } from 'next/navigation'
import Header from './Header'
import Footer from './Footer'
import MagazinePopup from './MagazinePopup'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Hide header and footer on admin and auth pages
  const hideLayout = pathname?.startsWith('/admin') || pathname?.startsWith('/auth') || pathname?.startsWith('/dashboard')

  // Show magazine popup only on homepage
  const isHomepage = pathname === '/'

  return (
    <>
      {!hideLayout && <Header />}
      <main className="min-h-screen transition-colors duration-300">
        {children}
      </main>
      {!hideLayout && <Footer />}
      {isHomepage && <MagazinePopup />}
    </>
  )
}
