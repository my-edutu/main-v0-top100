'use client'

// Persistent dashboard header: the logo + workspace title stay pinned to the
// top of the viewport while the member scrolls. Also hosts the notification
// bell, message badge, and sign-out.
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, Menu, MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        'absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function HeaderIconButton({
  label,
  count = 0,
  onClick,
  children,
}: {
  label: string
  count?: number
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `${label} (${count} unread)` : label}
      onClick={onClick}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-black/70 transition hover:border-orange-300 hover:text-black"
    >
      {children}
      <CountBadge count={count} />
    </button>
  )
}

export function SignOutControl({ compact = false }: { compact?: boolean }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  if (compact) {
    return (
      <button
        type="button"
        aria-label="Sign out"
        onClick={handleSignOut}
        disabled={isLoading}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-white text-black/70 transition hover:border-orange-300 hover:text-black disabled:opacity-60"
      >
        <LogOut className="h-5 w-5" strokeWidth={2.4} />
      </button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full justify-start gap-2 rounded-2xl border-orange-200 bg-white text-black/75 hover:bg-orange-50 hover:text-orange-700"
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}

export default function DashboardHeader({
  memberName,
  memberInitials,
  unreadNotifications,
  unreadMessages,
  onOpenNotifications,
  onOpenMessages,
  mobileNav,
  mobileNavOpen,
  onMobileNavOpenChange,
}: {
  memberName: string
  memberInitials: string
  unreadNotifications: number
  unreadMessages: number
  onOpenNotifications: () => void
  onOpenMessages: () => void
  mobileNav: React.ReactNode
  mobileNavOpen: boolean
  onMobileNavOpenChange: (open: boolean) => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/92 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top100 Africa Future Leaders"
            width={132}
            height={44}
            className="h-10 w-auto shrink-0 object-contain"
            priority
          />
          <span className="hidden h-7 w-px bg-orange-100 sm:block" />
          <span className="hidden truncate text-sm font-bold tracking-tight text-black sm:block">
            Awardee Workspace
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <HeaderIconButton label="Messages" count={unreadMessages} onClick={onOpenMessages}>
            <MessageCircle className="h-5 w-5" strokeWidth={2.4} />
          </HeaderIconButton>
          <HeaderIconButton label="Notifications" count={unreadNotifications} onClick={onOpenNotifications}>
            <Bell className="h-5 w-5" strokeWidth={2.4} />
          </HeaderIconButton>
          <SignOutControl compact />

          <div
            className="hidden h-11 items-center gap-2 rounded-2xl bg-orange-50 pl-1.5 pr-4 md:flex"
            title={memberName}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500 text-xs font-bold text-white">
              {memberInitials}
            </span>
            <span className="max-w-[140px] truncate text-sm font-semibold text-black">{memberName}</span>
          </div>

          <Sheet open={mobileNavOpen} onOpenChange={onMobileNavOpenChange}>
            <SheetTrigger asChild>
              <Button
                aria-label="Open dashboard navigation"
                className="h-11 w-11 rounded-2xl bg-[#050505] p-0 text-[#fffaf0] hover:bg-[#171717] lg:hidden"
              >
                <Menu className="h-5 w-5" strokeWidth={2.8} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[86vw] max-w-sm border-r border-orange-100 bg-white p-0 text-black">
              <h2 className="sr-only">Dashboard navigation</h2>
              {mobileNav}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
