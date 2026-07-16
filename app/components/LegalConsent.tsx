'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'

type LegalConsentProps = {
  /** Unique per form — ids must not collide when several forms render on one page. */
  id: string
  /** 'dark' adjusts text colors for dark backgrounds (e.g. the contact section). */
  variant?: 'light' | 'dark'
  /** Extra sentence appended after the standard consent text. */
  extra?: string
  className?: string
}

/**
 * Required legal-acceptance checkbox used on every form that stores personal
 * data. Uses a native required checkbox so the browser blocks submission
 * until it is ticked — no extra state needed in the host form.
 */
export default function LegalConsent({ id, variant = 'light', extra, className }: LegalConsentProps) {
  const dark = variant === 'dark'

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-left',
        dark ? 'border-zinc-700 bg-white/5' : 'border-orange-100 bg-orange-50/60',
        className,
      )}
    >
      <input
        id={id}
        name="legalConsent"
        type="checkbox"
        required
        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-orange-600"
      />
      <span className={cn('text-xs leading-6', dark ? 'text-zinc-300' : 'text-slate-600')}>
        I have read and agree to the{' '}
        <Link
          href="/legal/terms"
          target="_blank"
          className={cn('font-semibold underline underline-offset-2', dark ? 'text-orange-300' : 'text-orange-700')}
        >
          Terms of Use
        </Link>{' '}
        and the{' '}
        <Link
          href="/legal/privacy"
          target="_blank"
          className={cn('font-semibold underline underline-offset-2', dark ? 'text-orange-300' : 'text-orange-700')}
        >
          Privacy &amp; Data Policy
        </Link>
        , including how my details are stored and discarded after each selection cycle.
        {extra ? ` ${extra}` : ''}
      </span>
    </label>
  )
}
