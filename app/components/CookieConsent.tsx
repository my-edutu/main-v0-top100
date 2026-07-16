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
      className="fixed inset-x-0 bottom-0 z-[9990] p-3 sm:p-5"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-[24px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.45)] sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <Cookie className="h-5 w-5" />
          </div>
          <p className="text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-950">This site uses cookies.</span>{' '}
            Essential ones keep sign-in working; optional ones remember preferences and give us
            anonymous usage stats. See our{' '}
            <Link href="/legal/cookies" className="font-semibold text-orange-700 underline underline-offset-2 hover:text-orange-600">
              Cookie Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:flex-col md:flex-row">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => choose('declined')}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
