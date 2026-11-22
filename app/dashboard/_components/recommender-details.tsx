'use client'

import { useState } from 'react'
import { Copy, LockKeyhole, Mail } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { recommender } from '@/lib/award-letters/recommender'

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700'

export function RecommenderDetails({ applicant, opportunity }: { applicant: string; opportunity: string }) {
  const [details, setDetails] = useState<typeof recommender | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  async function loadDetails() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/member/recommendation-letters/recommender', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setDetails(result)
    } catch {
      setError('Could not load recommender details. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fields = details ? [
    ['Full name', details.name],
    ['Job title', details.title],
    ['Organisation', details.organisation],
    ['Relationship to applicant', 'Top100 award programme representative'],
    ['Work email', details.email],
    ['Organisation website', details.website],
  ] : []

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(fields.map(([label, value]) => `${label}: ${value}`).join('\n'))
      setCopyStatus('Recommender details copied.')
    } catch {
      setCopyStatus('Select and copy the details directly from the list.')
    }
  }

  const requestBody = [
    'Hello Top100 team,',
    '',
    'My application requires a direct reply or submission from my recommender. Please follow up with me.',
    '',
    `Applicant name: ${applicant}`,
    `Opportunity or programme: ${opportunity}`,
    'School or organisation:',
    'Official contact email or submission instructions:',
    'Application or reference number (if available):',
    'Deadline and time zone:',
    'What the school needs from Top100:',
    '',
    'Thank you.',
  ].join('\r\n')

  return (
    <div className="mt-4">
      <Dialog onOpenChange={open => {
        setCopyStatus('')
        if (open && !details) void loadDetails()
      }}>
        <DialogTrigger className={button}>
          <LockKeyhole size={16} aria-hidden="true" /> Get recommender details
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white text-[#171412]">
          <DialogTitle className="pr-12 leading-snug">Recommender details</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-stone-600">
            These details are available in your signed-in dashboard for your application. Please use them discreetly and share them only with the school or organisation handling your application.
          </DialogDescription>
          {loading && <p role="status" className="text-sm text-stone-600">Loading recommender details…</p>}
          {error && <div className="space-y-2">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" className={button} onClick={() => void loadDetails()}>Try again</button>
          </div>}
          {details && <>
            <dl className="grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-2">
              {fields.map(([label, value]) => <div key={label} className="min-w-0">
                <dt className="text-stone-600">{label}</dt>
                <dd className="break-words font-semibold">{value}</dd>
              </div>)}
            </dl>
            <div>
              <button type="button" className={button} onClick={() => void copyDetails()}><Copy size={16} aria-hidden="true" /> Copy details</button>
              {copyStatus && <p role="status" className="mt-2 text-sm text-stone-600">{copyStatus}</p>}
            </div>
            <section className="space-y-3 border-t border-stone-200 pt-4" aria-labelledby="recommender-follow-up">
              <h3 id="recommender-follow-up" className="font-semibold">Does the school need a direct reply?</h3>
              <p className="text-sm leading-6 text-stone-600">Open an email draft to Top100. Add the school’s official contact or submission instructions, your reference number, and the deadline with its time zone. If you already have an email from the school, forward it to the address above so the team can review it and follow up with you.</p>
              <a className={button} href={`mailto:${details.email}?subject=${encodeURIComponent('Recommendation follow-up request')}&body=${encodeURIComponent(requestBody)}`}>
                <Mail size={16} aria-hidden="true" /> Open follow-up email draft
              </a>
            </section>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
