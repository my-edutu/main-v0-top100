import Link from 'next/link'
import { CalendarDays, ChevronRight, LogOut, ShieldCheck } from 'lucide-react'
import { BrandMark } from '@/components/brand'
import { Avatar } from '@/components/ui'
import { MobileTabBar, SidebarNav, type NavItem } from '@/components/nav'
import { signOutAction } from '@/app/actions'
import type { SessionMember } from '@/lib/types'
import { isAdmin } from '@/lib/auth'

function agentNav(unread: number): NavItem[] {
  return [
    { href: '/dashboard', label: 'Overview', icon: 'overview' },
    { href: '/awardees', label: 'My Awardees', icon: 'awardees' },
    { href: '/follow-ups', label: 'Follow-Ups', icon: 'followups' },
    { href: '/earnings', label: 'Earnings', icon: 'earnings' },
    { href: '/withdrawals', label: 'Withdrawals', icon: 'withdrawals' },
    { href: '/notifications', label: 'Notifications', icon: 'notifications', badge: unread },
    { href: '/profile', label: 'Profile', icon: 'profile' },
  ]
}

function leaderNav(unread: number): NavItem[] {
  return [
    { href: '/dashboard', label: 'Team Overview', icon: 'overview' },
    { href: '/awardees', label: 'Awardees', icon: 'awardees' },
    { href: '/earnings', label: 'Earnings', icon: 'earnings' },
    { href: '/withdrawals', label: 'Withdrawals', icon: 'withdrawals' },
    { href: '/notifications', label: 'Notifications', icon: 'notifications', badge: unread },
    { href: '/profile', label: 'Profile', icon: 'profile' },
  ]
}

export function AppShell({
  member,
  unread,
  children,
}: {
  member: SessionMember
  unread: number
  children: React.ReactNode
}) {
  const nav = member.membership.role === 'team_leader' || isAdmin(member.membership.role)
    ? leaderNav(unread)
    : agentNav(unread)
  const roleLabel =
    member.membership.role === 'super_admin'
      ? 'Team lead'
      : member.membership.role === 'team_leader'
        ? 'Team leader'
        : 'Sales agent'
  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date())

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-ink px-4 pb-5 pt-6 text-cream lg:flex">
        <div className="px-2">
          <BrandMark />
        </div>
        <div className="mt-8 flex-1 overflow-y-auto pr-1">
          <SidebarNav items={nav} label="Workspace" />
        </div>
        <div className="mt-5 rounded-2xl bg-white/[0.055] p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={member.membership.full_name} className="h-8 w-8 bg-cream text-ink" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-cream">{member.membership.full_name}</p>
              <p className="truncate text-[10px] text-cream/45">{roleLabel}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg p-1.5 text-cream/50 transition hover:bg-white/10 hover:text-cream"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
          <div className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-[10px] text-cream/40">
            <ShieldCheck className="h-3 w-3" />
            <span className="truncate">{member.team.name}</span>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-ink/[0.08] bg-paper/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 md:px-7">
            <div className="text-ink lg:hidden">
              <BrandMark compact />
            </div>
            <div className="hidden items-center gap-2 text-[11px] text-muted md:flex">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-cream px-2.5 py-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                Internal workspace
              </span>
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span>{member.team.name}</span>
            </div>
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <span className="hidden items-center gap-1.5 text-[11px] text-muted sm:flex">
                <CalendarDays className="h-3.5 w-3.5" />
                {today}
              </span>
              <Link href="/menu" className="flex items-center gap-2 rounded-full border border-ink/10 bg-cream py-1 pl-1 pr-3" aria-label="Open menu">
                <Avatar name={member.membership.full_name} className="h-7 w-7" />
                <span className="hidden text-[11px] font-semibold sm:block">Menu</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-24 pt-6 md:px-7 md:pt-8 lg:pb-10">
          {children}
        </main>

        <footer className="no-print mx-auto hidden w-full max-w-[1440px] items-center justify-between px-7 pb-6 text-[10px] text-muted/70 lg:flex">
          <span>Top100 Africa Future Leaders · Team platform</span>
          <span>Financial records are append-only and audited.</span>
        </footer>
      </div>

      <MobileTabBar items={nav} />
    </div>
  )
}
