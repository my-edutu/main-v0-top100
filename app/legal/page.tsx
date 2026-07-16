import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Cookie, FileText, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Legal | Top100 Africa Future Leaders',
  description:
    'Terms of Use, Privacy & Data Policy and Cookie Policy for the Top100 Africa Future Leaders platform.',
}

const documents = [
  {
    href: '/legal/terms',
    icon: FileText,
    title: 'Terms of Use',
    description:
      'The rules for using the platform — accounts, applications, acceptable use and how the awardee selection process works.',
  },
  {
    href: '/legal/privacy',
    icon: ShieldCheck,
    title: 'Privacy & Data Policy',
    description:
      'What personal information we collect, why we collect it, who we share it with, and when it is deleted — including how applicant data is discarded after each selection cycle.',
  },
  {
    href: '/legal/cookies',
    icon: Cookie,
    title: 'Cookie Policy',
    description:
      'The cookies and similar technologies this site uses, what they do, and how you can control them.',
  },
]

const commitments = [
  {
    title: 'Minimal collection',
    description: 'We only ask for the information a form actually needs — usually your name and email.',
  },
  {
    title: 'Discarded after selection',
    description:
      'Application details are kept for the selection cycle only. Once a cohort is picked, unsuccessful applicants’ data is deleted.',
  },
  {
    title: 'Consent first',
    description:
      'Every signup and application asks you to accept these policies before we store anything, and you can withdraw consent anytime.',
  },
  {
    title: 'No selling of data',
    description: 'We never sell your personal information to anyone, full stop.',
  },
]

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_26%),linear-gradient(180deg,#fffaf4_0%,#ffffff_45%,#f8f1e7_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-orange-700">Legal centre</p>
          <h1 className="text-balance text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Clear terms. Honest data practices.
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Everything that governs how you use Top100 Africa Future Leaders and how we handle your
            information, written in plain language. These documents apply to top100afl.com and every
            form on it.
          </p>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {documents.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="group flex flex-col rounded-[28px] border border-orange-100 bg-white p-6 transition hover:border-orange-300 hover:shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                <doc.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-950">{doc.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{doc.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-700">
                Read the policy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-12 rounded-[32px] border border-orange-100 bg-white p-6 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Our commitments to you</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {commitments.map((item) => (
              <div key={item.title} className="rounded-2xl border border-orange-100 bg-orange-50/60 p-5">
                <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-7 text-slate-500">
            Questions or data requests? Email{' '}
            <a href="mailto:partnership@top100afl.com" className="font-semibold text-orange-700 hover:text-orange-600">
              partnership@top100afl.com
            </a>{' '}
            and we will respond within 30 days.
          </p>
        </section>
      </div>
    </main>
  )
}
