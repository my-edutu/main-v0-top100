import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import ApplicationForm from '../_components/application-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APPLY_AWARDEE_FORM_URL, applicationOrder, applicationPrograms, getApplicationProgram, type ApplicationFormProgram } from '@/lib/applications'
import { cn } from '@/lib/utils'

export const generateStaticParams = async () => applicationOrder.map((type) => ({ type }))

export const generateMetadata = async ({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> => {
  const { type } = await params
  const program = getApplicationProgram(type)

  if (!program) {
    return {
      title: 'Application',
    }
  }

  return {
    title: `${program.title} - Top100 Africa Future Leaders`,
    description: program.description,
  }
}

export default async function ApplicationPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const program = applicationPrograms[type as keyof typeof applicationPrograms]

  if (!program) {
    notFound()
  }

  const Icon = program.icon
  const formProgram: ApplicationFormProgram = {
    type: program.type,
    badge: program.badge,
    href: program.href,
    accent: program.accent,
    fields: program.fields,
    submitLabel: program.submitLabel,
    adminNote: program.adminNote,
  }

  if (program.type === 'awardee') {
    redirect(APPLY_AWARDEE_FORM_URL)
  }

  if (program.type === 'partnership') {
    redirect('/#partner-with-us')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_25%),linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#f6efe4_100%)]">
      <section className="container py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
            <div className="space-y-6">
              <Badge className="rounded-full border border-orange-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-orange-700 shadow-sm">
                {program.badge}
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  {program.title}
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  {program.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild className={cn('rounded-full bg-gradient-to-r px-6 py-6 text-[#fff] shadow-none hover:opacity-95', program.accent)}>
                  <Link href="#application-form">
                    <span className="mr-2">Start application</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-orange-200 bg-white px-6 py-6 text-orange-700 hover:bg-orange-50">
                  <Link href="/get-started">Get started</Link>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {program.highlights.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)] backdrop-blur">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <h2 className="mt-3 text-sm font-semibold text-slate-950">{item.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="overflow-hidden border-orange-100 bg-slate-950 text-[#fff] shadow-[0_24px_80px_-40px_rgba(15,23,42,0.72)]">
              <div className={`h-1.5 bg-gradient-to-r ${program.accent}`} />
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/90 backdrop-blur">
                      Admin review
                    </div>
                    <p className="text-sm leading-7 text-white/75">
                      {program.adminNote}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/90 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  {program.steps.map((step) => (
                    <div key={step.title} className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                      <div className="text-sm font-semibold text-white">{step.title}</div>
                      <p className="mt-1 text-sm leading-6 text-white/72">{step.description}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[22px] border border-orange-300/30 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-transparent p-5">
                  <p className="text-xs uppercase tracking-[0.32em] text-orange-200">How we use your submission</p>
                  <p className="mt-2 text-sm leading-7 text-white/78">
                    The admin team receives your form, reviews it manually, and reaches out by email when there is a fit or a next step.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div id="application-form" className="mx-auto w-full" style={{ maxWidth: '56rem' }}>
            <ApplicationForm program={formProgram} />
          </div>
        </div>
      </section>
    </div>
  )
}
