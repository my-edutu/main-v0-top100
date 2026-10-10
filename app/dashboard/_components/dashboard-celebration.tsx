'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight, Sparkles, Trophy, X } from 'lucide-react'

import {
  dashboardCelebrationStorageKey,
  shouldShowDashboardCelebration,
} from '@/lib/dashboard/celebration'
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'

const confettiColors = ['#fb923c', '#facc15', '#34d399', '#60a5fa', '#f472b6', '#fff']
const confetti = Array.from({ length: 44 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  delay: `${(index % 10) * 0.055}s`,
  duration: `${1.75 + (index % 5) * 0.05}s`,
  color: confettiColors[index % confettiColors.length],
  shape: index % 3 === 0 ? 'circle' : 'square',
}))

const balloons = [
  { left: '7%', delay: '0s', duration: '2s', color: '#fb923c', size: '48px' },
  { left: '22%', delay: '.16s', duration: '2s', color: '#facc15', size: '38px' },
  { left: '72%', delay: '.08s', duration: '2s', color: '#34d399', size: '52px' },
  { left: '89%', delay: '.22s', duration: '2s', color: '#f472b6', size: '42px' },
]

export function DashboardCelebration({
  memberId,
  name,
  dashboardLoginCount,
}: {
  memberId: string
  name: string
  dashboardLoginCount: number
}) {
  const storageKey = useMemo(() => dashboardCelebrationStorageKey(memberId), [memberId])
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [burst, setBurst] = useState(false)
  const firstName = name.trim().split(/\s+/)[0] || 'Leader'

  useEffect(() => {
    if (dashboardLoginCount !== 1) return

    let dismissed = false
    try {
      dismissed = window.localStorage.getItem(storageKey) === 'true'
    } catch {
      // If storage is unavailable, keep the first-visit celebration available.
    }

    if (!shouldShowDashboardCelebration(dashboardLoginCount, dismissed)) return
    const frame = window.requestAnimationFrame(() => setOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [dashboardLoginCount, storageKey])

  useEffect(() => {
    if (!burst) return
    const timeout = window.setTimeout(() => setBurst(false), 2_200)
    return () => window.clearTimeout(timeout)
  }, [burst])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen) return
    if (dashboardLoginCount === 1 && !reducedMotion) setBurst(true)

    try {
      window.localStorage.setItem(storageKey, 'true')
    } catch {
      // Dismissing still works when storage is unavailable for this browser.
    }
    window.dispatchEvent(new Event('afl:dashboard-celebration-dismissed'))
  }

  return (
    <>
      {burst ? (
        <>
          <div aria-hidden="true" className="dashboard-celebration-balloons dashboard-entry-burst">
            {balloons.map((balloon, index) => (
              <span
                key={index}
                className="dashboard-celebration-balloon"
                style={{
                  left: balloon.left,
                  animationDelay: balloon.delay,
                  animationDuration: balloon.duration,
                  width: balloon.size,
                  height: `calc(${balloon.size} * 1.25)`,
                  '--balloon-color': balloon.color,
                } as CSSProperties}
              />
            ))}
          </div>
          <div aria-hidden="true" className="dashboard-celebration-confetti dashboard-entry-burst">
            {confetti.map((piece, index) => (
              <span
                key={index}
                className={`dashboard-celebration-confetti-piece is-${piece.shape}`}
                style={{
                  left: piece.left,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                  backgroundColor: piece.color,
                }}
              />
            ))}
          </div>
        </>
      ) : null}
      <Dialog open={open} onOpenChange={handleOpenChange} modal={false}>
      <DialogPortal>
        <DialogOverlay className="dashboard-celebration-overlay" />
        <DialogPrimitive.Content className="dashboard-celebration-card">
          <DialogPrimitive.Close aria-label="Close congratulations" className="dashboard-celebration-close">
            <X size={20} aria-hidden="true" />
          </DialogPrimitive.Close>
          <div className="dashboard-celebration-mark" aria-hidden="true">
            <Trophy size={30} strokeWidth={1.7} />
            <Sparkles className="dashboard-celebration-sparkle" size={17} />
          </div>
          <p className="dashboard-celebration-kicker">Africa Future Leaders</p>
          <DialogTitle className="dashboard-celebration-title">Congratulations, {firstName}!</DialogTitle>
          <DialogDescription className="dashboard-celebration-copy">
            You’ve earned your place among Africa’s leaders. Welcome to a community ready to connect, learn, and build what comes next.
          </DialogDescription>
          <button type="button" className="dashboard-celebration-continue" onClick={() => handleOpenChange(false)}>
            Enter your dashboard <ArrowRight size={19} aria-hidden="true" />
          </button>
          <p className="dashboard-celebration-footnote">Your people and opportunities are waiting.</p>
        </DialogPrimitive.Content>
      </DialogPortal>
      </Dialog>
    </>
  )
}
