'use client'

import { useEffect, useState } from 'react'

const launchDate = '2026-12-01T00:00:00+01:00'
const launchTime = Date.parse(launchDate)

export function Project100Countdown() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    function updateCountdown() {
      const remaining = Math.max(0, Math.ceil((launchTime - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining === 0) window.clearInterval(interval)
    }

    const interval = window.setInterval(updateCountdown, 1000)
    updateCountdown()
    return () => window.clearInterval(interval)
  }, [])

  const remaining = secondsLeft ?? 0
  const units = [
    [Math.floor(remaining / 86400), 'days'],
    [Math.floor(remaining / 3600) % 24, 'hrs'],
    [Math.floor(remaining / 60) % 60, 'min'],
    [remaining % 60, 'sec'],
  ] as const

  return (
    <div className="flex min-h-16 flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-xl bg-amber-100 px-3 py-2 text-center text-[#211d19]">
      <p className="text-sm font-semibold">
        {secondsLeft === 0 ? 'Campaign launch date' : 'Campaign launches'}{' '}
        <time dateTime={launchDate}>Dec 1, 2026 (WAT)</time>
      </p>
      {secondsLeft !== null && secondsLeft > 0 && (
        <p role="timer" aria-label="Time until the Project100 campaign launch" className="flex gap-2 text-sm tabular-nums">
          {units.map(([value, label]) => (
            <span key={label}><strong>{String(value).padStart(2, '0')}</strong> {label}</span>
          ))}
        </p>
      )}
    </div>
  )
}
