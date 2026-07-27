'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import LegalConsent from '@/app/components/LegalConsent'
import { cn } from '@/lib/utils'

type Prefill = { fullName?: string; email?: string; country?: string }

const CURRENT_YEAR = new Date().getFullYear()
const COHORT_YEARS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, index) => CURRENT_YEAR - index)

const selectClass =
  'mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'

export default function ApplyForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [captchaToken, setCaptchaToken] = useState('')
  // Controlled, because prefill arrives after mount and defaultValue would be
  // ignored by then. Filling only empty fields keeps a slow response from
  // overwriting something the applicant has already typed.
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')

  const applyPrefill = (prefill: Prefill) => {
    setFullName((current) => current || prefill.fullName || '')
    setEmail((current) => current || prefill.email || '')
    setCountry((current) => current || prefill.country || '')
  }

  /**
   * Prefill runs here rather than on the server: reading auth cookies in the
   * page's server component would make the whole public route dynamic. A 401
   * for an anonymous visitor is the expected case, not an error.
   */
  useEffect(() => {
    let cancelled = false

    const loadPrefill = async () => {
      try {
        const response = await fetch('/api/member/me')
        if (!response.ok) {
          return
        }

        const data = await response.json()
        if (cancelled || !data?.member) {
          return
        }

        applyPrefill({
          fullName: data.member.name,
          email: data.member.email,
          country: data.member.location,
        })
      } catch {
        // Anonymous visitor or a network hiccup — the form works either way.
      }
    }

    void loadPrefill()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('loading')
    setMessage('')
    setFieldErrors({})

    const formData = new FormData(event.currentTarget)
    if (captchaToken) {
      formData.set('captchaToken', captchaToken)
    }

    try {
      const response = await fetch('/api/interviews/apply', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setStatus('idle')
        setFieldErrors(data.fieldErrors ?? {})
        // The form keeps everything the applicant typed — it is never reset here.
        setMessage(data.message || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      setMessage(data.message)
      formRef.current?.reset()
      // reset() does not clear controlled inputs.
      setFullName('')
      setEmail('')
      setCountry('')
    } catch {
      setStatus('idle')
      setMessage('We could not reach the server. Check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-[28px] border border-orange-100 bg-[#fffaf4] px-6 py-14 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-orange-600" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-bold text-slate-900">Application received</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
    )
  }

  const errorFor = (name: string) => fieldErrors[name]

  const fieldClass = (name: string) =>
    cn('mt-1.5', errorFor(name) && 'border-red-400 focus-visible:ring-red-400')

  const ErrorText = ({ name }: { name: string }) =>
    errorFor(name) ? <p className="mt-1 text-xs text-red-600">{errorFor(name)}</p> : null

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-orange-100 bg-white p-6 sm:p-9"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name *</Label>
          <Input
            id="fullName"
            name="fullName"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={fieldClass('fullName')}
          />
          <ErrorText name="fullName" />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass('email')}
          />
          <ErrorText name="email" />
        </div>

        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" className="mt-1.5" />
        </div>

        <div>
          <Label htmlFor="country">Country *</Label>
          <Input
            id="country"
            name="country"
            required
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={fieldClass('country')}
          />
          <ErrorText name="country" />
        </div>

        <div>
          <Label htmlFor="cohortYear">Year you were recognised *</Label>
          <select id="cohortYear" name="cohortYear" required defaultValue="" className={selectClass}>
            <option value="" disabled>
              Select a year
            </option>
            {COHORT_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ErrorText name="cohortYear" />
        </div>

        <div>
          <Label htmlFor="roleTitle">Current role or title</Label>
          <Input id="roleTitle" name="roleTitle" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="organisation">Organisation</Label>
          <Input id="organisation" name="organisation" className="mt-1.5" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="bio">Short bio (about 100 words) *</Label>
          <Textarea id="bio" name="bio" rows={5} required className={fieldClass('bio')} />
          <ErrorText name="bio" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="impactStory">What should this interview be about? *</Label>
          <Textarea
            id="impactStory"
            name="impactStory"
            rows={5}
            required
            placeholder="The work, the turning point, what you learned the hard way."
            className={fieldClass('impactStory')}
          />
          <ErrorText name="impactStory" />
        </div>

        <div>
          <Label htmlFor="linkedinUrl">LinkedIn</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            placeholder="https://linkedin.com/in/…"
            className={fieldClass('linkedinUrl')}
          />
          <ErrorText name="linkedinUrl" />
        </div>

        <div>
          <Label htmlFor="otherLink">Website or portfolio</Label>
          <Input
            id="otherLink"
            name="otherLink"
            placeholder="https://…"
            className={fieldClass('otherLink')}
          />
          <ErrorText name="otherLink" />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="preferredFormat">Preferred format *</Label>
          <select
            id="preferredFormat"
            name="preferredFormat"
            required
            defaultValue="either"
            className={selectClass}
          >
            <option value="video">Video interview</option>
            <option value="written">Written Q&amp;A</option>
            <option value="either">Either is fine</option>
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Choose written Q&amp;A if bandwidth or scheduling makes a recorded call difficult.
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="headshot">Headshot (JPG, PNG or WEBP, max 5 MB)</Label>
          <input
            id="headshot"
            name="headshot"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-orange-50 file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-orange-700"
          />
        </div>
      </div>

      <div className="mt-6">
        <LegalConsent id="interview-legal-consent" />
      </div>

      <label
        htmlFor="consentRecorded"
        className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3"
      >
        <input
          id="consentRecorded"
          name="consentRecorded"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-orange-600"
        />
        <span className="text-xs leading-6 text-slate-600">
          I agree to be recorded and for the interview to be published on Top100 Africa Future
          Leaders channels.
        </span>
      </label>

      <div className="mt-6">
        <TurnstileCaptcha onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} />
      </div>

      {message ? (
        <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={status === 'loading'}
        className="mt-6 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-sm font-semibold text-white hover:opacity-95 sm:w-auto sm:px-10"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            Submit application
          </>
        )}
      </Button>
    </form>
  )
}
