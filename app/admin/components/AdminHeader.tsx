'use client'

import { useRouter, usePathname } from 'next/navigation'
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
  Menu
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

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

  const handleLogout = async () => {
    try {
      toast.loading('Logging out...', { id: 'logout' })
      toast.success('Logged out successfully', { id: 'logout' })
      router.push('/auth/signin')
      router.refresh()
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
    router.push(href)
    setIsSheetOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg">
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
                  className="text-white hover:bg-white/20"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-gradient-to-b from-orange-500 to-amber-500 p-0">
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
                        <button
                          key={item.href}
                          onClick={() => handleNavigation(item.href)}
                          className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                            active
                              ? 'bg-white text-orange-600 shadow-md'
                              : 'text-white hover:bg-white/20'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </button>
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
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                  ${active
                    ? 'bg-white text-orange-600 shadow-md'
                    : 'text-white hover:bg-white/20'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
