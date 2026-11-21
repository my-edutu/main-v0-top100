'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight } from 'lucide-react'
import Image from '@/components/safe-image'
import OpportunitiesSection from '../../opportunities-section'
import { useDashboardMember } from '../../_providers/dashboard-member'

const seenInSession = new Set<string>()

function EdutuWelcome({ memberId }: { memberId: string }) {
  const storageKey = `top100:edutu-welcome:${memberId}`
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      setOpen(!seenInSession.has(storageKey) && localStorage.getItem(storageKey) !== '1')
    } catch {
      setOpen(!seenInSession.has(storageKey))
    }
  }, [storageKey])

  function dismiss() {
    seenInSession.add(storageKey)
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // Keep the dismissal for this tab when browser storage is blocked.
    }
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-[#101b35]" />
        <Dialog.Content className="fixed inset-0 z-[101] overflow-y-auto overscroll-contain bg-[#101b35] text-white">
          <div className="mx-auto grid min-h-full max-w-7xl content-center md:grid-cols-2 md:items-center">
            <div className="order-2 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 md:order-1 md:px-12 md:py-16">
              <div className="flex items-center gap-3">
                <Image src="/edutu-logo.png" alt="" width={44} height={44} className="rounded-xl bg-white p-1" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">Top100 × Edutu</span>
              </div>
              <Dialog.Title className="mt-6 max-w-lg text-3xl font-semibold leading-tight tracking-tight !text-white sm:text-5xl">
                Find your next opportunity
              </Dialog.Title>
              <Dialog.Description className="mt-4 max-w-md text-base leading-7 !text-blue-100">
                Discover scholarships, fellowships, grants and roles. Edutu can help you find a fit and plan your application.
              </Dialog.Description>
              <Dialog.Close className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#ffbc55] px-6 text-sm font-semibold !text-[#171412] hover:bg-[#ffcc7d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:w-auto">
                Continue <ArrowRight size={18} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className="relative order-1 min-h-[30dvh] md:order-2 md:mr-8 md:min-h-[56dvh] md:overflow-hidden md:rounded-2xl">
              <Image src="/edutu-top100-partnership.png" alt="" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default function OpportunitiesPage() {
  const { member } = useDashboardMember()

  return (
    <div className="py-4 pb-24 sm:py-6">
      <EdutuWelcome key={member.id} memberId={member.id} />
      <OpportunitiesSection member={member} />
    </div>
  )
}
