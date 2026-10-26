import Link from 'next/link'
import { ArrowUpRight, Bell, CircleUserRound, Wallet } from 'lucide-react'
import { Card, PageHeader } from '@/components/ui'
import { requireMember } from '@/lib/auth'

export const metadata = { title: 'Settings' }

const settingsLinks = [
  { href: '/profile', title: 'Personal details', description: 'Update your name and phone number.', icon: CircleUserRound },
  { href: '/withdrawals', title: 'Bank and payout details', description: 'Enter bank details when requesting a withdrawal.', icon: Wallet },
  { href: '/notifications', title: 'Notifications', description: 'Review team and account updates.', icon: Bell },
]

export default async function SettingsPage() {
  await requireMember()
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your contact information, payout destination and updates." />
      <Card className="divide-y divide-ink/[0.07] overflow-hidden">
        {settingsLinks.map(({ href, title, description, icon: Icon }) => (
          <Link href={href} key={href} className="flex min-h-[76px] items-center gap-3 px-4 py-3 hover:bg-ink/[0.025] md:px-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream text-muted"><Icon className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-muted">{description}</span></span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        ))}
      </Card>
    </div>
  )
}
