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
    <section className="award-flow space-y-6">
      <nav aria-label="Award journey progress" className="award-progress">
        <ol className="grid grid-cols-4 gap-2">
          {AWARD_JOURNEY_STEPS.map((step, index) => {
            const complete = index < currentIndex
            const active = step === current
            return (
              <li key={step}>
                <div
                  aria-current={active ? 'step' : undefined}
                  className={`award-step flex min-w-0 flex-col items-center gap-2 ${
                    active
                      ? 'is-active'
                      : complete
                        ? 'is-complete'
                        : ''
                  }`}
                >
                  <span className="award-step-number flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {complete ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="text-xs font-medium">{STEP_LABELS[step]}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      <div>
        <header className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-3 pb-6 sm:grid-cols-[minmax(0,1fr)_104px]">
          <div>
            <h1 className="text-2xl font-medium leading-tight tracking-tight text-[#171412] sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm font-normal leading-6 text-[#625B52]">{description}</p>
          </div>
          <Image src={imageSrc} alt={imageAlt} width={104} height={104} className="h-auto w-16 object-contain sm:w-[104px]" priority />
        </header>
        <div>{children}</div>
      </div>
    </section>
  )
}
