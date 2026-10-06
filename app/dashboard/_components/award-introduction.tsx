'use client'

import { useEffect, useRef, useState } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { shouldPinAwardAction } from '@/lib/awards/award-action-pinning'

export function AwardIntroduction() {
  const actionRef = useRef<HTMLAnchorElement>(null)
  const [isActionPinned, setIsActionPinned] = useState(false)

  useEffect(() => {
    const action = actionRef.current
    if (!action) return

    const updatePinnedState = () => {
      const actionBottom = action.getBoundingClientRect().bottom
      setIsActionPinned(
        shouldPinAwardAction(window.scrollY, actionBottom, window.innerHeight),
      )
    }

    updatePinnedState()
    window.addEventListener('scroll', updatePinnedState, { passive: true })
    window.addEventListener('resize', updatePinnedState)

    return () => {
      window.removeEventListener('scroll', updatePinnedState)
      window.removeEventListener('resize', updatePinnedState)
    }
  }, [])

  return (
    <section
      aria-labelledby="award-introduction-title"
      className="award-cinema relative mx-auto grid w-full max-w-5xl overflow-hidden rounded-[24px] border border-[#39323B] bg-[radial-gradient(ellipse_at_100%_100%,#482319_0%,#21151F_44%,#101014_100%)] text-white md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <div className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[440px]">
        <Image
          src="/IMG_0674.jpg"
          alt="Africa Future Leaders award presentation"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 42vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101014] via-[#10101425] to-transparent md:bg-gradient-to-r md:from-transparent md:via-[#10101435] md:to-[#101014]" />
        <p className="absolute bottom-4 left-5 right-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E] sm:bottom-5 sm:left-6">
          Africa Future Leaders · Recognition
        </p>
      </div>
      <div className="relative flex flex-col justify-center px-5 pb-6 pt-1 sm:px-7 sm:pb-8 md:px-8 md:py-10">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          Recognition confirmed
        </p>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
          Your recognition
        </p>
        <h1
          id="award-introduction-title"
          className="mt-2 text-3xl font-medium leading-tight tracking-[-0.04em] text-white sm:text-4xl"
        >
          Your impact has been recognized.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#D0C9D0] sm:text-base">
          Congratulations on your Africa Future Leaders recognition. It
          celebrates the impact, excellence and leadership you represent — and
          the greater contribution still ahead of you.
        </p>
        <p className="mt-4 max-w-xl border-l-2 border-[#FFB77E] pl-3 text-sm leading-6 text-[#E3DCE3]">
          To receive your physical Africa Future Leaders award, continue to the
          next step.
        </p>
        <Link
          ref={actionRef}
          href="/dashboard/me/award/payment"
          aria-hidden={isActionPinned}
          tabIndex={isActionPinned ? -1 : undefined}
          className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#f97316,#ffb347)] px-5 text-sm font-semibold text-[#171412] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101014] sm:w-fit ${isActionPinned ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        >
          View physical award options
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {isActionPinned ? (
        <div className="award-sticky-action motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 fixed inset-x-0 bottom-0 z-40 border-t border-[#39323B] bg-[#101014]/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_28px_#00000040] backdrop-blur-md sm:px-6 lg:left-[88px] lg:px-6 xl:left-[240px] xl:px-8">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/dashboard/me/award/payment"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(100deg,#f97316,#ffb347)] px-5 text-sm font-semibold text-[#171412] shadow-lg shadow-black/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101014] sm:w-fit"
            >
              View physical award options
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  )
}
