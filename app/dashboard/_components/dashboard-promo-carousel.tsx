'use client'

import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from 'react'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import Image from '@/components/safe-image'
import type { AwardPaymentView } from '@/lib/awards/payment'

const whatsappChannelUrl = 'https://whatsapp.com/channel/0029Vb8lUNm96H4bB5keg402'
const eventVideosUrl = '/dashboard/discover/events'

function awardStatus(payment: AwardPaymentView) {
  if (payment.status === 'paid' || payment.confirmedPayment) return 'Payment confirmed · contact the team for collection or dispatch.'
  if (payment.status === 'pending') return 'Your payment is being confirmed. Check its status before trying again.'
  if (payment.status === 'refunded') return 'Contact the team to review your payment.'
  return 'Official presentation in November 2026. Reserve your physical award.'
}

export function DashboardPromoCarousel({ payment, showCommunity = false }: { payment?: AwardPaymentView | null; showCommunity?: boolean }) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [dragX, setDragX] = useState(0)
  const [showSwipeHint, setShowSwipeHint] = useState(true)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setShowSwipeHint(false), 1500)
    return () => window.clearTimeout(timeout)
  }, [])

  const cards = [
    ...(payment ? [{
      key: 'award',
      href: '/dashboard/me/award/payment',
      image: '/illustrations/promo-award.svg',
      eyebrow: 'Africa Future Leaders · 2026',
      title: 'Your physical award',
      description: awardStatus(payment),
      linkLabel: payment.needsPayment && payment.status !== 'pending' && payment.status !== 'refunded' ? 'View award options' : 'View payment status',
      tone: 'award',
      external: false,
    }] : []),
    {
      key: 'whatsapp',
      href: whatsappChannelUrl,
      image: '/illustrations/promo-whatsapp.svg',
      eyebrow: 'Official updates',
      title: 'Join our WhatsApp channel',
      description: 'Follow announcements and news from Africa Future Leaders.',
      linkLabel: 'Open channel',
      tone: 'whatsapp',
      external: true,
    },
    ...(showCommunity ? [{
      key: 'community',
      href: '/dashboard/discover/groups',
      image: '/illustrations/promo-community.svg',
      eyebrow: 'Meet your people',
      title: 'Join your AFL community',
      description: 'Find your WhatsApp group and connect with fellow Africa Future Leaders.',
      linkLabel: 'Find your group',
      tone: 'community',
      external: false,
    }] : []),
    {
      key: 'videos',
      href: eventVideosUrl,
      image: '/illustrations/promo-learning.svg',
      eyebrow: 'Learn at your own pace',
      title: 'Explore programme events',
      description: 'See event details, speakers and upcoming sessions.',
      linkLabel: 'Explore events',
      tone: 'learning',
      external: false,
    },
  ]
  const activeCardIndex = activeSlide % cards.length
  const switchCard = (direction = 1) => setActiveSlide((current) => (current + direction + cards.length) % cards.length)

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    const start = touchStart.current
    const end = event
    touchStart.current = null
    setDragX(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!start || !end) return
    const distance = end.clientX - start.x
    if (Math.abs(distance) > 45 && Math.abs(distance) > Math.abs(end.clientY - start.y)) {
      swiped.current = true
      event.currentTarget.focus({ preventScroll: true })
      switchCard(distance < 0 ? 1 : -1)
    }
  }

  return (
    <section
      aria-label="Featured updates. Swipe left or right, or use the arrow keys, to switch cards."
      aria-roledescription="carousel"
      className="dashboard-promo"
      data-swipe-hint={showSwipeHint ? 'true' : undefined}
      tabIndex={0}
      style={{ '--promo-drag': `${dragX}px` } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          setShowSwipeHint(false)
          switchCard(event.key === 'ArrowRight' ? 1 : -1)
        }
      }}
      onPointerDown={(event) => {
        setShowSwipeHint(false)
        touchStart.current = { x: event.clientX, y: event.clientY }
        swiped.current = false
      }}
      onPointerMove={(event) => {
        const start = touchStart.current
        if (!start) return
        const x = event.clientX - start.x
        const y = event.clientY - start.y
        if (Math.abs(x) > 10 && Math.abs(x) > Math.abs(y)) {
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragX(Math.max(-120, Math.min(120, x)))
        }
      }}
      onPointerUp={finishSwipe}
      onPointerCancel={() => { touchStart.current = null; setDragX(0) }}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={(event) => {
        if (swiped.current) {
          event.preventDefault()
          event.stopPropagation()
          swiped.current = false
        }
      }}
    >
      <div className="dashboard-promo__stack">
        {cards.map((card, index) => {
          const stackPosition = (index - activeCardIndex + cards.length) % cards.length
          const active = stackPosition === 0
          const cardClass = `dashboard-promo__card dashboard-promo__card--${card.tone} ${active ? 'is-front' : 'is-back'}`
          const cardStyle = {
            '--stack-offset': `${stackPosition * 8}px`,
            '--stack-scale': 1 - stackPosition * 0.035,
            zIndex: cards.length - stackPosition,
            ...(active ? { '--promo-drag': `${dragX}px` } : {}),
          } as CSSProperties
          const contents = <>
            <Image src={card.image} alt="" width={260} height={260} draggable={false} className="dashboard-promo__art" />
            <div className="dashboard-promo__copy">
              <p className="dashboard-promo__eyebrow">{card.eyebrow}</p>
              <h2>{card.title}</h2>
              <p className="dashboard-promo__description">{card.description}</p>
              <span className="dashboard-promo__link">{card.linkLabel}<ArrowUpRight size={17} aria-hidden="true" /></span>
            </div>
          </>

          return card.external ? (
            <a
              key={card.key}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={cardClass}
              style={cardStyle}
            >
              {contents}
            </a>
          ) : (
            <Link
              key={card.key}
              href={card.href}
              aria-hidden={!active}
              tabIndex={active ? 0 : -1}
              className={cardClass}
              style={cardStyle}
            >
              {contents}
            </Link>
          )
        })}
      </div>
      <p className="sr-only" aria-live="polite">{cards[activeCardIndex].eyebrow}: {cards[activeCardIndex].title}, {activeCardIndex + 1} of {cards.length}.</p>
    </section>
  )
}
