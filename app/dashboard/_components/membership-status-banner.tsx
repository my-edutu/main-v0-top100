'use client'
import { useState } from 'react'
import { AlertTriangle, Clock3, X, type LucideIcon } from 'lucide-react'

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
    title: 'Account pending review',
    body: 'You can update your profile and browse while we review your account.',
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
  const [dismissed, setDismissed] = useState(false)
  if (dismissed && member.status === 'pending') return null
  if (member.status === 'approved') return null

  const status = statusCopy[member.status]
  const Icon = status.icon

  return (
    <div role="status" className={cn('flex gap-2 rounded-xl border px-3 py-2', status.tone)}>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{status.title}</p>
        <p className="mt-1 text-xs font-normal leading-5 opacity-80">{status.body}</p>
      </div>
      {member.status === 'pending' && <button type="button" aria-label="Dismiss pending review notice" onClick={() => setDismissed(true)} className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-lg hover:bg-white/50"><X size={18} aria-hidden="true" /></button>}
    </div>
  )
}
