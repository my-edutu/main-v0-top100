'use client'

import { useEffect, useMemo, useState } from 'react'

const BALLOON_COLORS = [
  '#f97316', // orange
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#0ea5e9', // sky
  '#10b981', // emerald
]

const SHOW_MS = 7000
const BANNER_MS = 5200

type Balloon = {
  id: number
  left: number // vw
  size: number // px
  color: string
  duration: number // s
  delay: number // s
  sway: number // deg
}

/**
 * One-time celebration overlay: a flight of balloons and a welcome banner,
 * shown for a few seconds on a member's first dashboard visit after signup.
 * Pointer events pass straight through; unmounts itself when done.
 */
export default function WelcomeBalloons({ name, onDone }: { name: string; onDone?: () => void }) {
  const [visible, setVisible] = useState(true)
  const [bannerVisible, setBannerVisible] = useState(false)

  const balloons = useMemo<Balloon[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        left: 3 + Math.random() * 92,
        size: 40 + Math.random() * 28,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
        duration: 4.6 + Math.random() * 2.8,
        delay: Math.random() * 1.6,
        sway: (Math.random() - 0.5) * 24,
      })),
    []
  )

  useEffect(() => {
    const bannerIn = window.setTimeout(() => setBannerVisible(true), 250)
    const bannerOut = window.setTimeout(() => setBannerVisible(false), BANNER_MS)
    const hide = window.setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, SHOW_MS)
    return () => {
      window.clearTimeout(bannerIn)
      window.clearTimeout(bannerOut)
      window.clearTimeout(hide)
    }
  }, [onDone])

  if (!visible) return null

  const firstName = name.trim().split(/\s+/)[0] || name

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {balloons.map((b) => (
        <div
          key={b.id}
          className="afl-balloon absolute"
          style={{
            left: `${b.left}vw`,
            bottom: `-${b.size * 2.2}px`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
            ['--sway' as string]: `${b.sway}deg`,
          }}
        >
          {/* balloon body */}
          <div
            style={{
              width: `${b.size}px`,
              height: `${b.size * 1.2}px`,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 42%), ${b.color}`,
              borderRadius: '50% 50% 50% 50% / 44% 44% 56% 56%',
            }}
          />
          {/* knot */}
          <div
            className="mx-auto"
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: `7px solid ${b.color}`,
              marginTop: '-2px',
            }}
          />
          {/* string */}
          <div
            className="mx-auto"
            style={{ width: '1.5px', height: `${b.size * 1.1}px`, background: 'rgba(100,116,139,0.5)' }}
          />
        </div>
      ))}

      <div
        className="absolute inset-x-0 top-[18%] flex justify-center px-4 transition-all duration-700"
        style={{
          opacity: bannerVisible ? 1 : 0,
          transform: bannerVisible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
        }}
      >
        <div className="rounded-3xl border border-orange-200/80 bg-white/95 px-8 py-6 text-center shadow-[0_30px_80px_-30px_rgba(249,115,22,0.45)] backdrop-blur">
          <p className="text-3xl">🎈</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.22em] text-orange-600">
            Welcome, Africa Future Leader
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{firstName}!</p>
          <p className="mt-2 text-sm text-slate-500">Your profile is now yours. Make it shine.</p>
        </div>
      </div>

      <style>{`
        .afl-balloon {
          animation-name: afl-balloon-rise;
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
          animation-fill-mode: both;
        }
        @keyframes afl-balloon-rise {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          55% {
            transform: translateY(-58vh) rotate(var(--sway, 8deg));
          }
          100% {
            transform: translateY(-125vh) rotate(calc(var(--sway, 8deg) * -0.6));
            opacity: 0.85;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .afl-balloon {
            animation: none;
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
