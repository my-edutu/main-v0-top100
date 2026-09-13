'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import AwardsSection, { AwardRouteLoading } from '../../awards-section'
import type { AwardPaymentReturnState } from '../../award-payment-view'
import { AwardIntroduction } from '../../_components/award-introduction'
import { useDashboardBadges } from '../../_providers/dashboard-badges'
import { useDashboardMember } from '../../_providers/dashboard-member'

function AwardOverviewContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const { member } = useDashboardMember()
  const { setAwardNeedsAttention } = useDashboardBadges()
  const payment = searchParams.get('payment')
  const returnState: AwardPaymentReturnState =
    payment === 'done' || payment === 'cancelled'
      ? payment
      : 'none'
  const demoReturn = searchParams.get('demo') === '1' && returnState === 'done'
  const introComplete = searchParams.get('intro') === 'continued'
  const showIntroduction =
    returnState === 'none' &&
    !demoReturn &&
    !introComplete

  useEffect(() => {
    if (introComplete || (returnState === 'none' && !demoReturn)) return

    const nextParams = new URLSearchParams({ intro: 'continued' })
    if (returnState === 'cancelled') nextParams.set('payment', 'cancelled')
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
  }, [demoReturn, introComplete, pathname, returnState, router])

  if (showIntroduction) {
    return <AwardIntroduction continueTo={`${pathname}?intro=continued`} />
  }

  return (
    <AwardsSection
      member={member}
      paymentReturn={returnState}
      demoReturn={demoReturn}
      onClaimStateChange={setAwardNeedsAttention}
    />
  )
}

export default function AwardOverviewPage() {
  return (
    <Suspense fallback={<AwardRouteLoading label="Loading your award return" />}>
      <AwardOverviewContent />
    </Suspense>
  )
}
