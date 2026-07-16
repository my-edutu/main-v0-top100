import Link from 'next/link'
import type { ReactNode } from 'react'

type LegalShellProps = {
  eyebrow: string
  title: string
  intro: string
  lastUpdated: string
  children: ReactNode
}

export function LegalShell({ eyebrow, title, intro, lastUpdated, children }: LegalShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_26%),linear-gradient(180deg,#fffaf4_0%,#ffffff_45%,#f8f1e7_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-slate-500">
          <Link href="/legal" className="font-semibold text-orange-700 hover:text-orange-600">
            Legal
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span>{title}</span>
        </nav>

        <header className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-700">{eyebrow}</p>
          <h1 className="text-balance text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">{intro}</p>
          <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="mt-10 space-y-10">{children}</div>

        <footer className="mt-14 rounded-[28px] border border-orange-100 bg-white p-6 text-sm leading-7 text-slate-600">
          Questions about this document? Contact the Top100 Africa Future Leaders team at{' '}
          <a href="mailto:partnership@top100afl.com" className="font-semibold text-orange-700 hover:text-orange-600">
            partnership@top100afl.com
          </a>
          . See also our{' '}
          <Link href="/legal/terms" className="font-semibold text-orange-700 hover:text-orange-600">
            Terms of Use
          </Link>
          ,{' '}
          <Link href="/legal/privacy" className="font-semibold text-orange-700 hover:text-orange-600">
            Privacy &amp; Data Policy
          </Link>{' '}
          and{' '}
          <Link href="/legal/cookies" className="font-semibold text-orange-700 hover:text-orange-600">
            Cookie Policy
          </Link>
          .
        </footer>
      </div>
    </main>
  )
}

type LegalSectionProps = {
  number: string
  title: string
  children: ReactNode
}

export function LegalSection({ number, title, children }: LegalSectionProps) {
  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-6 sm:p-8">
      <div className="flex items-baseline gap-3">
        <span className="text-sm font-black text-orange-500">{number}</span>
        <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
