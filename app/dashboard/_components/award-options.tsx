'use client'

import { Truck } from 'lucide-react'
import Link from 'next/link'

import { AwardCertificateCard } from '../award-certificate-card'

export function AwardOptions() {
  return (
    <div id="my-award-options" className="scroll-mt-6 space-y-6 text-white">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
          Your awards
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Your recognition is ready.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[#D0C9D0] sm:text-base">
          Choose how you would like to receive and keep your Africa Future Leaders recognition.
        </p>
      </header>

      <section
        className="rounded-[22px] border border-[#4B434C] bg-[#211C24] p-5 sm:p-7"
        aria-labelledby="physical-award-title"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#3B2824] text-[#FFB77E]">
              <Truck className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
                Physical award
              </p>
              <h3 id="physical-award-title" className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Arrange delivery of your award
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#D0C9D0]">
                Share your delivery details and we’ll guide you through the next step.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/me/award/address"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#FFDF45] px-5 text-sm font-semibold text-[#171412] transition hover:bg-[#FFE66C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#211C24]"
          >
            Get delivery price
            <Truck className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <AwardCertificateCard />
    </div>
  )
}
