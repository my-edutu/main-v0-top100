import Link from 'next/link'
import { ArrowUpRight, BadgeCent, Bell, ChevronRight, CircleUserRound, Settings, Wallet } from 'lucide-react'
import { signOutAction } from '@/app/actions'
import { requireMember } from '@/lib/auth'
import { getNotifications } from '@/lib/data'
import { Avatar } from '@/components/ui'

export const metadata = { title: 'Menu' }
export const dynamic = 'force-dynamic'

export default async function MenuPage() {
  const member = await requireMember()
  const { unread } = await getNotifications(member)
  const groups = [
    {
      title: 'Workspace',
      items: [
        { href: '/earnings', label: 'Earnings', detail: 'Rewards and payment history', icon: BadgeCent },
        { href: '/withdrawals', label: 'Withdrawals', detail: 'Request or review payouts', icon: Wallet },
      ],
    },
    {
      title: 'Account',
      items: [
        { href: '/profile', label: 'Profile', detail: 'Name, phone and sign-in email', icon: CircleUserRound },
        { href: '/settings', label: 'Settings', detail: 'Account and payout preferences', icon: Settings },
        { href: '/notifications', label: 'Notifications', detail: unread ? `${unread} unread` : 'Updates from your team', icon: Bell },
      ],
    },
  ]

  return (
    <div className="menu-page mx-auto max-w-3xl space-y-5">
      <section className="card overflow-hidden">
        <div className="flex items-center gap-4 p-5">
          <Avatar name={member.membership.full_name} className="h-14 w-14 bg-sand text-lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{member.membership.full_name}</p>
            <p className="truncate text-sm text-muted">{member.user.email}</p>
            <p className="mt-1 text-xs capitalize text-muted">{member.membership.role.replaceAll('_', ' ')}</p>
          </div>
          <Link href="/profile" aria-label="Edit profile" className="rounded-full border border-ink/10 p-2.5 text-muted hover:bg-ink/[0.04] hover:text-ink">
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {groups.map((group) => (
        <section className="card overflow-hidden" key={group.title}>
          <h2 className="label px-5 pb-2 pt-4">{group.title}</h2>
          <nav aria-label={group.title}>
            {group.items.map(({ href, label, detail, icon: Icon }) => (
              <Link key={href} href={href} className="flex min-h-[68px] items-center gap-3 border-t border-ink/[0.07] px-5 py-3 first:border-t-0 hover:bg-ink/[0.025]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-ink/70"><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted/70" />
              </Link>
            ))}
          </nav>
        </section>
      ))}

      <form action={signOutAction}>
        <button type="submit" className="flex min-h-12 w-full items-center justify-center rounded-xl border border-ink/10 bg-paper text-sm font-semibold text-ink/75 hover:bg-ink/[0.03]">Sign out</button>
      </form>
    </div>
  )
}
