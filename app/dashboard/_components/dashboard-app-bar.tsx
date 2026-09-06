'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Bell } from 'lucide-react'

import { resolveDashboardTitle } from '../_lib/navigation'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { useDashboardMember } from '../_providers/dashboard-member'
import { top100DashboardTheme } from '@/lib/dashboard/theme'
import { MemberAvatar } from './member-avatar'

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="hub-count absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#171717] px-1 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function DashboardAppBar() {
  const pathname = usePathname()
  const router = useRouter()
  const { member } = useDashboardMember()
  const { unreadUpdates } = useDashboardBadges()
  const isHome = pathname === '/dashboard'
  const title = resolveDashboardTitle(pathname)

  return (
    <header className={`hub-app-bar sticky top-0 z-40 h-[60px] border-b text-[#171412] ${top100DashboardTheme.appBar}`}>
      <div className="flex h-full items-center gap-2 px-4 sm:px-6">
        {isHome ? (
          <Link
            href="/dashboard"
            className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
          >
            <span className="flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden bg-white">
              <Image
                src="/Top100 Africa Future leaders Logo .png"
                alt="Top100 Africa Future Leaders"
                width={112}
                height={48}
                className="h-12 w-28 object-contain"
                priority
              />
            </span>
          </Link>
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#171412] transition hover:bg-[#FFE7D5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/dashboard/updates"
            aria-label={unreadUpdates > 0 ? `Updates (${unreadUpdates} unread)` : 'Updates'}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl text-[#171412] transition hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
          >
            <Bell className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
            <CountBadge count={unreadUpdates} />
          </Link>
          <Link
            href="/dashboard/me"
            aria-label={`Open ${member.name}'s account`}
            className="flex h-11 w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2"
          >
            <MemberAvatar src={member.avatarUrl} initials={member.avatarInitials} />
          </Link>
        </div>
      </div>
    </header>
  )
}
