'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

const STORAGE_KEY = 'afl-cookie-consent'

/**
 * Cookie notice shown once per browser until a choice is made. The choice is
 * stored in localStorage ('accepted' | 'declined') and read by anything that
 * wants to gate non-essential scripts.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      // Storage unavailable (private mode etc.) — skip the banner rather than nag forever.
    }
  }, [])

  const choose = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // Ignore storage failures; the banner still dismisses for this visit.
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[9990] p-3 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[min(34rem,calc(100vw-2.5rem))] sm:p-0"
    >
      <div className="mx-auto flex w-full flex-col gap-3 rounded-[20px] border border-orange-100 bg-white p-4 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] sm:gap-4 sm:rounded-[24px] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 sm:h-10 sm:w-10 sm:rounded-2xl">
            <Cookie className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <p className="text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
            <span className="font-semibold text-slate-950">This site uses cookies.</span>{' '}
            Essential ones keep sign-in working; optional ones remember preferences and give us
            anonymous usage stats. See our{' '}
            <Link href="/legal/cookies" className="font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-xs font-semibold text-white transition hover:opacity-95 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
