'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  buildApplicationMessage,
  buildApplicationSubject,
  type ApplicationFormProgram,
} from '@/lib/applications'
import LegalConsent from '@/app/components/LegalConsent'

type ApplicationFormProps = {
  program: ApplicationFormProgram
}

const createInitialValues = (program: ApplicationFormProgram) =>
  Object.fromEntries(program.fields.map((field) => [field.name, '']))

export default function ApplicationForm({ program }: ApplicationFormProps) {
  const [values, setValues] = useState<Record<string, string>>(() => createInitialValues(program))
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const primaryNameField = useMemo(
    () => program.fields.find((field) => field.name === 'fullName' || field.name === 'contactName')?.name || program.fields[0]?.name,
    [program.fields],
  )

  const primaryEmailField = useMemo(
    () => program.fields.find((field) => field.name === 'email')?.name || '',
    [program.fields],
  )

  const handleChange = (name: string, nextValue: string) => {
    setValues((current) => ({
      ...current,
      [name]: nextValue,
    }))
  }

  const resetForm = () => {
    setValues(createInitialValues(program))
    setStatus('idle')
    setMessage('')
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    const subject = buildApplicationSubject(program, values)
    const body = buildApplicationMessage(program, values)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationType: program.type,
          name: values[primaryNameField] || values.contactName || values.fullName || values.organization || 'New applicant',
          email: values[primaryEmailField] || '',
          organization: values.organization || '',
          subject,
          message: body,
          values,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed')
      }

      setStatus('success')
      setMessage(data.message || 'Submission received')
      toast.success('Application sent to the admin team')
    } catch (error) {
      setStatus('error')
      const text = error instanceof Error ? error.message : 'Something went wrong'
      setMessage(text)
      toast.error(text)
    }
  }

  if (status === 'success') {
    return (
      <Card className="overflow-hidden border-orange-100 bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.32)]">
        <div className={cn("h-1.5 bg-gradient-to-r", program.accent)} />
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
            Submitted
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Your application is in the admin queue.
              </h2>
              <p className="text-sm leading-7 text-slate-600">
                {message || program.adminNote}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Admin team notified',
              'Review in progress',
              'Email follow-up next',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className={cn("rounded-full bg-gradient-to-r px-5 py-6 text-[#fff] shadow-none hover:opacity-95", program.accent)}>
              <Link href="/get-started">
                Back to get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="rounded-full border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              Submit another
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-orange-100 bg-white shadow-[0_22px_70px_-36px_rgba(15,23,42,0.35)]">
      <div className={cn("h-1.5 bg-gradient-to-r", program.accent)} />
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-2">
          <div className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-700">
            {program.badge}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Complete the application
          </h2>
          <p className="text-sm leading-7 text-slate-600">
            Fields marked with an asterisk are required. Your submission is stored in the admin review queue and can be followed up by the team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {program.fields.map((field) => {
              const inputClass = 'rounded-2xl border-slate-200 bg-white px-4 py-3 shadow-sm placeholder:text-slate-400 focus-visible:border-orange-400 focus-visible:ring-orange-200'
              const wrapperClass = cn('space-y-2', field.span === 2 || field.type === 'textarea' ? 'md:col-span-2' : '')

              return (
                <div key={field.name} className={wrapperClass}>
                  <Label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                    {field.label}{field.required ? <span className="ml-1 text-orange-500">*</span> : null}
                  </Label>
                  {field.helper ? <p className="text-xs leading-6 text-slate-500">{field.helper}</p> : null}
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      name={field.name}
                      rows={field.rows || 4}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={values[field.name] || ''}
                      onChange={(event) => handleChange(field.name, event.target.value)}
                      className={cn(inputClass, 'min-h-[120px]')}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      autoComplete={field.autoComplete}
                      value={values[field.name] || ''}
                      onChange={(event) => handleChange(field.name, event.target.value)}
                      className={inputClass}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-xs leading-6 text-orange-800">
            {program.adminNote}
          </div>

          <LegalConsent id={`apply-legal-consent-${program.type}`} />

          {status === 'error' ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={status === 'loading'}
              className={cn("rounded-full bg-gradient-to-r px-6 py-6 text-[#fff] shadow-none transition hover:opacity-95", program.accent)}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {program.submitLabel}
                </>
              )}
            </Button>
            <Link href="/login?from=/get-started" className="text-sm font-medium text-slate-600 underline decoration-orange-200 underline-offset-4 hover:text-slate-950">
              Already approved? Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
