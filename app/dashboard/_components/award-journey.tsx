import Image from 'next/image'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  AWARD_JOURNEY_STEPS,
  type AwardJourneyStep,
} from '../_lib/award-journey'

const STEP_LABELS: Record<AwardJourneyStep, string> = {
  address: 'Address',
  review: 'Review',
  payment: 'Payment',
  tracking: 'Tracking',
}

export function AwardJourney({
  current,
  title,
  description,
  imageSrc,
  imageAlt,
  children,
}: {
  current: AwardJourneyStep
  title: string
  description: string
  imageSrc: string
  imageAlt: string
  children: ReactNode
}) {
  const currentIndex = AWARD_JOURNEY_STEPS.indexOf(current)

  return (
    <section className="space-y-5">
      <nav aria-label="Award journey progress" className="overflow-x-auto pb-1">
        <ol className="grid min-w-[360px] grid-cols-4 gap-2">
          {AWARD_JOURNEY_STEPS.map((step, index) => {
            const complete = index < currentIndex
            const active = step === current
            return (
              <li key={step}>
                <div
                  aria-current={active ? 'step' : undefined}
                  className={`flex min-h-14 items-center gap-2 rounded-[14px] border px-3 py-2 ${
                    active
                      ? 'border-orange-300 bg-[#FFE7D5] text-[#6C2600]'
                      : complete
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-[#E7DDCF] bg-white text-[#625B52]'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-extrabold">
                    {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="text-xs font-extrabold sm:text-sm">{STEP_LABELS[step]}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="overflow-hidden rounded-[20px] border border-[#E7DDCF] bg-white">
        <header className="grid items-center gap-4 border-b border-[#E7DDCF] bg-[#FBF7EF] p-5 sm:grid-cols-[minmax(0,1fr)_176px] sm:p-7">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-700">Your Africa Future Leaders Award</p>
            <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-[-0.025em] text-[#171412] sm:text-[32px]">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#625B52] sm:text-base">{description}</p>
          </div>
          <Image src={imageSrc} alt={imageAlt} width={176} height={176} className="mx-auto h-auto w-32 max-w-[176px] object-contain sm:w-44" priority />
        </header>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </section>
  )
}
