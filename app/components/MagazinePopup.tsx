'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useDashboardBadges } from '@/app/dashboard/_providers/dashboard-badges'
import { useDashboardMember } from '@/app/dashboard/_providers/dashboard-member'
import type { MemberProfile } from '@/lib/member-hub'
import { AWARD_POPUP_VARIANTS, awardPopupDay, awardPopupStorageKey, canOfferPhysicalAward, nextAwardPopupVisit, readAwardPopupVisit, type AwardPopupVisit } from '@/lib/awards/popup'
import { trackAwardFunnel } from '@/lib/awards/funnel'
import { AwardPopupDesign } from './award-popup-designs'
import styles from './award-popups.module.css'
import Link from 'next/link'
import { Check, Clock3, ArrowRight } from 'lucide-react'

export default function MagazinePopup({ member }: { member: Pick<MemberProfile, 'id' | 'name' | 'dashboardLoginCount'> }) {
  const { awardPayment, awardNeedsAttention, refreshBadges } = useDashboardBadges()
  const { dashboardVisitReady } = useDashboardMember()
  const [visit, setVisit] = useState<AwardPopupVisit | null>(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const previousFocus = useRef<HTMLElement | null>(null)
  const shownForLogin = useRef<number | null>(null)
  const eligible = awardNeedsAttention && canOfferPhysicalAward(awardPayment)
  const confirmed = !!awardPayment?.confirmedPayment || awardPayment?.status === 'paid'
  const pending = !confirmed && awardPayment?.status === 'pending'
  const hasPaymentStatus = confirmed || pending

  useEffect(() => { void refreshBadges() }, [refreshBadges])

  const login = member.dashboardLoginCount ?? 0

  useEffect(() => {
    if (!dashboardVisitReady || !eligible || shownForLogin.current === login) return
    let candidate: AwardPopupVisit | null = null
    const key = awardPopupStorageKey(member.id)
    try {
      candidate = nextAwardPopupVisit(readAwardPopupVisit(localStorage.getItem(key)), login, awardPopupDay(), Math.floor(Math.random() * AWARD_POPUP_VARIANTS.length))
    } catch {
      // Storage restrictions do not stop this visit's invitation.
      candidate = nextAwardPopupVisit(null, login, awardPopupDay())
    }
    if (!candidate) return
    const nextVisit = candidate
    const timer = window.setTimeout(() => {
      if (shownForLogin.current === login) return
      // Another tab may already have shown this login's offer.
      try {
        const previous = readAwardPopupVisit(localStorage.getItem(key))
        if (previous?.login === nextVisit.login) return
        localStorage.setItem(key, JSON.stringify(nextVisit))
      } catch { /* Keep the dialog usable without browser storage. */ }
      shownForLogin.current = login
      setVisit(nextVisit)
      trackAwardFunnel(member.id, 'popup_viewed', AWARD_POPUP_VARIANTS[nextVisit.variant].id)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [dashboardVisitReady, eligible, login, member.id])

  const handleClose = () => { setVisit(null); setStatusOpen(false) }
  const handleGiftClick = () => {
    if (!dashboardVisitReady) return
    if (hasPaymentStatus) { setStatusOpen(true); void refreshBadges(); return }
    if (!eligible) return
    const key = awardPopupStorageKey(member.id)
    let nextVisit: AwardPopupVisit | null = null
    try {
      const previous = readAwardPopupVisit(localStorage.getItem(key))
      nextVisit = previous?.login === login
        ? previous
        : nextAwardPopupVisit(previous, login, awardPopupDay(), Math.floor(Math.random() * AWARD_POPUP_VARIANTS.length))
      if (nextVisit) localStorage.setItem(key, JSON.stringify(nextVisit))
    } catch {
      nextVisit = nextAwardPopupVisit(null, login, awardPopupDay())
    }
    if (!nextVisit) return
    shownForLogin.current = login
    setVisit(nextVisit)
    trackAwardFunnel(member.id, 'popup_viewed', AWARD_POPUP_VARIANTS[nextVisit.variant].id)
  }
  const variant = visit ? AWARD_POPUP_VARIANTS[visit.variant] : AWARD_POPUP_VARIANTS[0]

  return (
    <>
    {(eligible || hasPaymentStatus) && <button
      type="button"
      className={`${styles.giftTrigger} ${hasPaymentStatus ? styles.giftStatusTrigger : ''}`}
      onClick={handleGiftClick}
      disabled={!dashboardVisitReady}
      aria-label={confirmed ? "View your confirmed award payment" : pending ? "View your award payment verification" : "Open your physical award offer"}
      title="Your physical award"
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
    </button>}
    <Dialog open={statusOpen || (!!visit && eligible)} onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent
        className="award-offer-dialog z-[9999] flex w-[calc(100%-32px)] max-h-[calc(100dvh-32px)] max-w-[450px] gap-0 overflow-hidden rounded-[20px] border-[#E6E1DA] bg-white p-0 shadow-2xl motion-reduce:animate-none"
        overlayClassName="z-[9998] bg-[#171412]/30 backdrop-blur-md motion-reduce:animate-none"
        onOpenAutoFocus={() => { previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }}
        onCloseAutoFocus={event => { if (previousFocus.current?.isConnected) { event.preventDefault(); previousFocus.current.focus() } }}
      >
        {statusOpen ? <div className={styles.paymentStatusCard}>
          <div className={`${styles.paymentStatusIcon} ${confirmed ? styles.giftConfirmed : styles.giftPending}`}>
            {confirmed ? <Check size={30} strokeWidth={2.5} /> : <Clock3 size={30} />}
          </div>
          <p className={styles.paymentStatusLabel}>{confirmed ? 'Payment confirmed' : 'Awaiting confirmation'}</p>
          <DialogTitle className={styles.title}>{confirmed ? 'Your award is reserved.' : 'Your payment is being verified.'}</DialogTitle>
          <DialogDescription className={styles.description}>
            {confirmed ? 'Your physical award payment is confirmed. Check your award page for collection and dispatch arrangements.' : 'We’re checking your payment status. Your award reservation will be confirmed once payment is verified.'}
          </DialogDescription>
          <p className={styles.paymentStatusNote}>{confirmed ? 'Delivery arrangements and charges are handled separately.' : 'Please wait for the result before making another payment.'}</p>
          <Link href="/dashboard/me/award" onClick={handleClose} className={styles.cta}>View my award <ArrowRight size={20} aria-hidden="true" /></Link>
        </div> : awardPayment && <AwardPopupDesign variant={variant} name={member.name.trim().split(/\s+/)[0]} onReserve={() => {
          trackAwardFunnel(member.id, 'reserve_clicked', variant.id)
          handleClose()
        }} />}
      </DialogContent>
    </Dialog>
    </>
  )
}
