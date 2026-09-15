'use client'

import { LockKeyhole, Truck } from 'lucide-react'

import { AwardCertificateCard } from '../award-certificate-card'

export function AwardOptions() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
          Your awards
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412] sm:text-3xl">
          Your recognition is ready.
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-[#625B52] sm:text-base">
          Choose how you would like to receive and keep your Africa Future Leaders recognition.
        </p>
      </header>

      <section
        className="rounded-[22px] border border-orange-200 bg-[#fffaf4] p-5 sm:p-7"
        aria-labelledby="physical-award-title"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
              <Truck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                Physical award
              </p>
              <h2 id="physical-award-title" className="mt-2 text-xl font-semibold tracking-tight text-[#171412] sm:text-2xl">
                Arrange delivery of your award
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#625B52]">
                Share your delivery details and we’ll guide you through the next step.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-label="Arrange delivery, coming soon"
            title="Coming soon"
            className="inline-flex min-h-12 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-stone-200 px-5 text-sm font-semibold text-stone-500 opacity-80"
          >
            Coming soon
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <AwardCertificateCard />
    </div>
  )
}
