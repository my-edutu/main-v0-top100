import { AlertTriangle, Clock3, type LucideIcon } from 'lucide-react'

import type { MemberProfile, MemberStatus } from '@/lib/member-hub'
import { cn } from '@/lib/utils'

type RestrictedMemberStatus = Exclude<MemberStatus, 'approved'>

const statusCopy: Record<RestrictedMemberStatus, {
  title: string
  body: string
  icon: LucideIcon
  tone: string
}> = {
  pending: {
    title: 'Your awardee account is pending review',
    body: 'You can complete your BIO and browse the network while the team reviews your account.',
    icon: Clock3,
    tone: 'border-amber-300 bg-[#FFF3C7] text-[#563700]',
  },
  rejected: {
    title: 'Your account application was not approved',
    body: 'Contact info@top100afl.com if you believe this decision was made in error.',
    icon: AlertTriangle,
    tone: 'border-rose-300 bg-[#F8DCE6] text-[#6E1636]',
  },
  suspended: {
    title: 'Your account is suspended',
    body: 'Some member features are unavailable. Contact the team to resolve your account status.',
    icon: AlertTriangle,
    tone: 'border-rose-300 bg-[#F8DCE6] text-[#6E1636]',
  },
}

export function MembershipStatusBanner({ member }: { member: MemberProfile }) {
  if (member.status === 'approved') return null

  const status = statusCopy[member.status]
  const Icon = status.icon

  return (
    <div role="status" className={cn('flex gap-3 rounded-[16px] border p-4', status.tone)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/15 bg-white/45">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold">{status.title}</p>
        <p className="mt-1 text-sm font-semibold leading-5 opacity-80">{status.body}</p>
      </div>
    </div>
  )
}
