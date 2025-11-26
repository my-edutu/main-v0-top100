'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  FileText,
  Youtube,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  Loader2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { createClient } from '@/utils/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigationItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Awardees', href: '/admin/awardees', icon: Users },
  { label: 'Blog Posts', href: '/admin/blog', icon: FileText },
  { label: 'Events', href: '/admin/events', icon: Calendar },
  { label: 'YouTube', href: '/admin/youtube', icon: Youtube },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  const handleLogout = async () => {
    try {
      toast.loading('Logging out...', { id: 'logout' })

      // Broadcast logout to other tabs FIRST
      if (typeof window !== 'undefined') {
        // Method 1: localStorage event
        localStorage.setItem('logout-event', JSON.stringify({
          timestamp: Date.now(),
          reason: 'manual'
        }))

        // Method 2: BroadcastChannel
        if ('BroadcastChannel' in window) {
          const logoutChannel = new BroadcastChannel('auth-events')
          logoutChannel.postMessage({
            type: 'logout',
            reason: 'manual',
            timestamp: Date.now()
          })
          logoutChannel.close()
        }
      }

      // Create Supabase client and call logout
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Error logging out:', error)
        toast.error('Failed to log out', { id: 'logout' })
        return
      }

      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastActivity')
        sessionStorage.clear()
      }

      toast.success('Logged out successfully', { id: 'logout' })

      // Use hard redirect to ensure clean logout
      setTimeout(() => {
        window.location.href = '/auth/signin?reason=manual'
      }, 500)
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out', { id: 'logout' })
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const handleNavigation = (href: string) => {
    setNavigatingTo(href)
    startTransition(() => {
      router.push(href)
      setIsSheetOpen(false)
    })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg">
      {/* Loading Progress Bar */}
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
          <div className="h-full bg-white animate-[loading_1s_ease-in-out_infinite]"
               style={{
                 width: '40%',
                 animation: 'loading 1s ease-in-out infinite'
               }}
          />
        </div>
      )}

      {/* Top Bar */}
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left Side - Menu and Logo */}
        <div className="flex items-center space-x-3">
          {/* Mobile Menu - now on the left for mobile */}
          <div className="md:hidden mr-2">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-12 w-12"
                  aria-label="Open menu"
                >
                  <Menu className="h-8 w-8" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-gradient-to-b from-orange-500 to-amber-500 p-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex flex-col h-full pt-6">
                  {/* Logo in Sheet */}
                  <div className="px-6 pb-6 flex items-center space-x-3 border-b border-white/20">
                    <div className="h-12 w-20">
                      <Image
                        src="/Top100 Africa Future leaders Logo .png"
                        alt="Top100 Africa Future Leaders Logo"
                        width={80}
                        height={48}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <nav className="flex flex-col space-y-1 px-4 py-6 flex-grow">
                    {navigationItems.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => {
                            if (isPending) {
                              e.preventDefault();
                              return;
                            }
                            setIsSheetOpen(false);
                          }}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            active
                              ? 'bg-white text-orange-600 shadow-md'
                              : 'text-white hover:bg-white/20'
                          } ${isPending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                          {isPending && navigatingTo === item.href ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>

                  {/* Logout in Sheet */}
                  <div className="px-4 pb-6 border-t border-white/20">
                    <Button
                      variant="outline"
                      className="w-full bg-white/20 hover:bg-white/30 text-white border-white/30"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Logo & Brand */}
          <div className="h-12 w-20">
            <Image
              src="/Top100 Africa Future leaders Logo .png"
              alt="Top100 Africa Future Leaders Logo"
              width={80}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        {/* Right Side - Profile and Notifications */}
        <div className="flex items-center space-x-3">
          {/* Search Bar - hidden on mobile */}
          <div className="hidden md:flex max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-800" />
              <Input
                type="search"
                placeholder="Search awardees, posts, events..."
                className="pl-10 bg-white/20 backdrop-blur-sm border-white/30 text-white placeholder:text-orange-100 focus:bg-white focus:text-gray-900"
              />
            </div>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hover:bg-white/20 text-white">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </Button>

          {/* User Profile */}
          <div className="hidden md:flex items-center space-x-2 border-l border-white/30 pl-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-orange-100">Super Admin</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/30">
              <span className="text-sm font-semibold text-white">AU</span>
            </div>
          </div>

          {/* Desktop Logout - hidden on mobile */}
          <div className="hidden md:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Navigation Menu - Hidden on mobile */}
      <nav className="hidden md:flex border-t border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center space-x-1 px-6 py-2 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${active
                    ? 'bg-white text-orange-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                  }
                  ${isPending ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                `}
              >
                {isPending && navigatingTo === item.href ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
