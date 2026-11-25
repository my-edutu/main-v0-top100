'use client'

import Link from 'next/link'
import { Check, Clock3 } from 'lucide-react'
import { useDashboardBadges } from '@/app/dashboard/_providers/dashboard-badges'
import { canOfferPhysicalAward } from '@/lib/awards/popup'
import styles from './award-popups.module.css'

export default function FloatingAwardLink() {
  const { awardPayment, awardNeedsAttention } = useDashboardBadges()
  const eligible = awardNeedsAttention && canOfferPhysicalAward(awardPayment)
  const confirmed = !!awardPayment?.confirmedPayment || awardPayment?.status === 'paid'
  const pending = !confirmed && awardPayment?.status === 'pending'
  const hasPaymentStatus = confirmed || pending

  if (!eligible && !hasPaymentStatus) return null

  return (
    <Link
      href="/dashboard/me/award"
      className={`${styles.giftTrigger} ${hasPaymentStatus ? styles.giftStatusTrigger : ''}`}
      aria-label="View your physical award"
    >
      {!hasPaymentStatus && <svg viewBox="0 0 88 88" className={styles.giftConfetti} aria-hidden="true" focusable="false">
        <g className={styles.confettiLeft}>
          <rect x="8" y="22" width="4" height="9" rx="1" fill="#FF7900" transform="rotate(-28 10 26)" />
          <path d="M4 46q6-6 9 1" fill="none" stroke="#D6A13D" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="18" cy="9" r="2" fill="#E9BD65" />
        </g>
        <g className={styles.confettiRight}>
          <rect x="75" y="24" width="4" height="8" rx="1" fill="#D6A13D" transform="rotate(30 77 28)" />
          <path d="m69 8 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5Z" fill="#FF7900" />
          <path d="M76 48q5-5 8 0" fill="none" stroke="#FF7900" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>}
      <svg viewBox="0 0 64 64" className={styles.giftIcon} aria-hidden="true" focusable="false">
        <path d="m12 29 20-7 20 7v25l-20 7-20-7Z" fill="#E7BE76" stroke="#A8732B" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="m12 29 20 7 20-7-20-7Z" fill="#FFF0CC" />
        <path d="M32 36v25l20-7V29Z" fill="#D6A456" />
        <path d="m25 33 7 3 7-3v25l-7 3-7-3Z" fill="#B77B23" />
        <path d="m9 24 23-8 23 8v8l-23 8-23-8Z" fill="#F5DEAF" stroke="#A8732B" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="m32 32 23-8v8l-23 8Z" fill="#DBB16B" />
        <path d="m9 24 23 8 23-8-23-8Z" fill="#FFF2D5" />
        <path d="m25 18 23 8-7 3-23-8Z" fill="#CF963B" />
        <path d="m18 29 7-3 23-8-7-3-23 8Z" fill="#E1B35C" />
        <path d="m25 30 7 2 7-2v8l-7 2-7-2Z" fill="#C18A32" />
        <path d="M31 21C24 20 14 16 17 10c3-6 13 3 14 11Z" fill="#E9BE65" stroke="#A8732B" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M33 21c7-1 17-5 14-11-3-6-13 3-14 11Z" fill="#F4D48B" stroke="#A8732B" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M20 12c3 1 7 4 9 7m15-7c-3 1-7 4-9 7" fill="none" stroke="#FFF0BB" strokeWidth="1.5" strokeLinecap="round" />
        <path d="m30 22-9 10 6-1 1 5 5-13m1-1 9 10-6-1-1 5-5-13" fill="#D19A40" stroke="#A8732B" strokeWidth="1" strokeLinejoin="round" />
        <ellipse cx="32" cy="22" rx="4" ry="3.5" fill="#F4D48B" stroke="#A8732B" strokeWidth="1.2" />
      </svg>
      {hasPaymentStatus && <span className={`${styles.giftStatusBadge} ${confirmed ? styles.giftConfirmed : styles.giftPending}`} aria-hidden="true">
        {confirmed ? <Check size={15} strokeWidth={3} /> : <Clock3 size={15} strokeWidth={2.5} />}
      </span>}
    </Link>
  )
}
