'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Image from '@/components/safe-image'
import { ArrowUpRight } from 'lucide-react'
import { FESTIVAL_COUNTDOWN_TARGET, FESTIVAL_IMAGE } from '@/lib/festival/config'
import './festival.css'

const targetTime = Date.parse(FESTIVAL_COUNTDOWN_TARGET)

export function FestivalCard() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    function update() {
      const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) window.clearInterval(timer)
    }

    const timer = window.setInterval(update, 1000)
    update()
    return () => window.clearInterval(timer)
  }, [])

  const countingDown = secondsLeft > 0
  const units = [
    [Math.floor(secondsLeft / 86_400), 'Days'],
    [Math.floor(secondsLeft / 3600) % 24, 'Hours'],
    [Math.floor(secondsLeft / 60) % 60, 'Minutes'],
    [secondsLeft % 60, 'Seconds'],
  ] as const

  return (
    <Link
      href="/dashboard/festival/rsvp"
      className="festival-card"
      aria-labelledby="festival-card-title"
      data-countdown={countingDown || undefined}
    >
      <Image
        src={FESTIVAL_IMAGE}
        alt="Africa Future Leaders Festival 2026 stage in an auditorium"
        fill
        sizes="(min-width: 1024px) 1000px, 100vw"
        priority
      />
      <span className="festival-card__shade" aria-hidden="true" />
      {countingDown && (
        <span className="festival-card__countdown">
          <time dateTime={FESTIVAL_COUNTDOWN_TARGET}>Monday, 11:00 a.m. WAT</time>
          <span className="festival-card__timer" role="timer" aria-label="Time remaining until Monday at 11 a.m. West Africa Time">
            {units.map(([value, label]) => (
              <span key={label}><strong>{String(value).padStart(2, '0')}</strong>{label}</span>
            ))}
          </span>
        </span>
      )}
      <span className="festival-card__content">
        <span id="festival-card-title" className="festival-card__title">
          Attend Africa Future Leaders Festival
        </span>
        <span className="festival-card__action">
          Register your interest <ArrowUpRight size={18} aria-hidden="true" />
        </span>
      </span>
    </Link>
  )
}
