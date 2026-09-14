'use client'

import { Award, LockKeyhole } from 'lucide-react'

export function AwardCertificateCard() {
  return (
    <section className="rounded-[22px] border border-orange-200 bg-[#fffaf4] p-5 sm:p-7" aria-labelledby="award-certificate-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
            <Award className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Your recognition</p>
            <h2 id="award-certificate-title" className="mt-2 text-2xl font-semibold tracking-tight text-[#171412]">Download your award certificate</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#625B52]">Keep a digital certificate of your Top100 Africa Future Leaders recognition for your records and professional profiles.</p>
          </div>
        </div>
        <button
          type="button"
          disabled
          aria-label="Download certificate, locked"
          title="Certificate download is locked"
          className="inline-flex min-h-12 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-stone-200 px-5 text-sm font-semibold text-stone-500 opacity-80"
        >
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          Locked
        </button>
      </div>
    </section>
  )
}
