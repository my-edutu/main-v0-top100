import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react'

import { ogMetadata } from '@/lib/og'
import { createAdminClient } from '@/lib/supabase/server'
import type { ApplicantResultView } from '@/lib/selection/contracts'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const resultDescription = 'Private application result and assessment explanation.'

export const metadata: Metadata = {
  title: 'Application Result — Top100 Africa Future Leaders',
  description: resultDescription,
  ...ogMetadata(
    {
      title: 'Application Result',
      eyebrow: 'Top100 Africa Future Leaders',
      subtitle: 'Private assessment result',
    },
    {
      url: '/selection-results',
      description: resultDescription,
    },
  ),
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
}

type PageProps = {
  params: Promise<{ token: string }>
}

const verdictDetails = (verdict: ApplicantResultView['verdict']) => {
  if (verdict === 'qualified') {
    return {
      label: 'Qualified',
      description: 'Your application met the published requirements for this selection cycle.',
      Icon: CheckCircle2,
      panel: 'border-emerald-200 bg-emerald-50 text-emerald-950',
      icon: 'bg-emerald-600 text-white',
    }
  }

  if (verdict === 'needs_review') {
    return {
      label: 'Additional review',
      description: 'A final decision has not yet been issued.',
      Icon: Clock3,
      panel: 'border-amber-200 bg-amber-50 text-amber-950',
      icon: 'bg-amber-500 text-white',
    }
  }

  return {
    label: 'Not selected',
    description:
      'Your application was assessed but did not qualify under this cycle’s published requirements.',
    Icon: XCircle,
    panel: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'bg-rose-600 text-white',
  }
}

const scoreLabels: Array<{
  key: keyof ApplicantResultView['scoreBreakdown']
  label: string
}> = [
  { key: 'academic', label: 'Academic excellence' },
  { key: 'leadership', label: 'Leadership responsibility' },
  { key: 'impact', label: 'Measurable impact' },
  { key: 'initiative', label: 'Initiative and service' },
  { key: 'communication', label: 'Communication and clarity' },
]

export default async function SelectionResultPage({ params }: PageProps) {
  const { token } = await params
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('selection_public_results')
    .select('payload, is_published, published_at, expires_at')
    .eq('access_token', token)
    .eq('is_published', true)
    .or('expires_at.is.null,expires_at.gt.now')
    .maybeSingle()

  if (error || !data) notFound()

  const result = data.payload as ApplicantResultView
  if (!result || typeof result !== 'object' || !result.verdict) notFound()

  const verdict = verdictDetails(result.verdict)
  const VerdictIcon = verdict.Icon

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_28%),linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#f7f3ec_100%)] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-[30px] border border-orange-100 bg-white/95 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)] sm:p-9">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
                <ShieldCheck className="size-4" />
                Private result
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                  Application result
                </h1>
                <p className="mt-2 text-sm leading-6 text-zinc-600 sm:text-base">
                  {result.cycleName}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              <div className="font-semibold text-zinc-950">{result.applicantName}</div>
              {result.country && <div>{result.country}</div>}
            </div>
          </div>
        </header>

        <section className={`rounded-[28px] border p-6 sm:p-8 ${verdict.panel}`}>
          <div className="flex items-start gap-4">
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${verdict.icon}`}
            >
              <VerdictIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{verdict.label}</h2>
              <p className="mt-1 leading-7 opacity-80">{verdict.description}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[28px] border border-orange-100 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
              Overall merit score
            </p>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight text-zinc-950">
                {result.totalScore}
              </span>
              <span className="pb-1 text-lg text-zinc-500">/ 100</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Published merit threshold:{' '}
              <strong className="text-zinc-950">{result.minimumMeritScore}/100</strong>
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-zinc-950">Score breakdown</h2>
            <div className="mt-5 space-y-4">
              {scoreLabels.map(({ key, label }) => {
                const score = result.scoreBreakdown[key]
                const percentage =
                  score.maximum > 0 ? Math.round((score.score / score.maximum) * 100) : 0
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-medium text-zinc-700">{label}</span>
                      <span className="font-semibold tabular-nums text-zinc-950">
                        {score.score}/{score.maximum}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-zinc-950">Why this result was issued</h2>
          <div className="mt-5 space-y-3">
            {result.reasons.map((reason, index) => (
              <div
                key={`${index}-${reason}`}
                className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700"
              >
                {reason}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-4 text-sm leading-6 text-orange-950">
            <strong>Next step:</strong> {result.nextStep}
          </div>
        </section>

        {result.appeal && (
          <section className="rounded-[28px] border border-zinc-200 bg-zinc-950 p-6 text-white sm:p-8">
            <h2 className="text-xl font-bold">Appeal and correction window</h2>
            <p className="mt-3 text-sm leading-7 text-white/75">{result.appeal.message}</p>
            <p className="mt-4 text-sm font-semibold text-orange-300">
              Deadline:{' '}
              {new Date(result.appeal.deadline).toLocaleString('en-GB', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          </section>
        )}

        <footer className="px-4 text-center text-xs leading-5 text-zinc-500">
          This private link contains your application result. Do not publish it unless you choose
          to share your own result.
        </footer>
      </div>
    </main>
  )
}
