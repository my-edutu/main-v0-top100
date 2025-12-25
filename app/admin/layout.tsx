'use client'

import { useState, useEffect } from 'react'
import AdminSidebar from './components/AdminSidebar'
import AdminFooter from './components/AdminFooter'
import SessionSecurityGuard from '@/app/components/SessionSecurityGuard'
import { Bell, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex font-sans selection:bg-orange-200 selection:text-orange-800">
      {/* Session Security */}
      <SessionSecurityGuard
        timeoutMinutes={30}
        warningMinutes={2}
        enabled={true}
      />

      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300">
        {/* Floating Top Bar */}
        <header
          className={cn(
            "sticky top-0 z-40 flex h-16 items-center justify-between px-4 lg:px-8 transition-all duration-300",
            scrolled ? "bg-white/80 backdrop-blur-md border-b border-orange-100 shadow-sm" : "bg-transparent",
            "pl-16 lg:pl-8" // Account for mobile menu button
          )}
        >
          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-orange-500 transition-colors" />
              <Input
                placeholder="Search..."
                className="bg-white border-zinc-200 pl-10 h-10 rounded-xl focus:ring-1 focus:ring-orange-300 focus:border-orange-300 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-orange-600 hover:bg-orange-50 relative rounded-full">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-orange-500 rounded-full border-2 border-white" />
            </Button>

            <div className="h-4 w-[1px] bg-zinc-200 mx-1 hidden sm:block" />

            <Button variant="ghost" className="gap-2 px-2 hover:bg-orange-50 rounded-xl group transition-all">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-800 leading-none">Admin</p>
                <p className="text-[10px] text-zinc-500 leading-none mt-0.5">Superuser</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 p-[2px] shadow-md shadow-orange-100">
                <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </Button>
          </div>
        </header>

        {/* Dynamic Canvas Area */}
        <main className="flex-grow px-4 lg:px-8 pb-12 pt-4 max-w-[1600px] mx-auto w-full">
          {children}
        </main>

        <AdminFooter />
      </div>
    </div>
  )
}
