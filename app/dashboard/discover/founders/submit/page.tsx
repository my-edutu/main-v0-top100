'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { founderListingSchema, type FounderListing } from '@/lib/founder-listing'
import { FOUNDERS_NETWORK_PATH } from '@/lib/founders-network'
import { RouteSection } from '../../../_components/route-section'
import { useDashboardMember } from '../../../_providers/dashboard-member'

export default function SubmitStartupPage() {
  const { member } = useDashboardMember()
  const [draft, setDraft] = useState<FounderListing | null>(null)
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const startupName = member.career?.type === 'startup' ? member.career.name : ''

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch('/api/member/founders?mine=1', { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)
        setPublished(Boolean(data.listing))
        setDraft(data.listing ?? { startup: startupName, summary: '', linkedinUrl: '' })
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load your startup.')
      }
    }
    void load()
    return () => controller.abort()
  }, [startupName, attempt])

  async function update(method: 'PUT' | 'DELETE', listing?: FounderListing) {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/member/founders', {
        method,
        ...(listing ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(listing) } : {}),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      setPublished(Boolean(data.listing))
      setDraft(data.listing ?? { startup: startupName, summary: '', linkedinUrl: '' })
      setConfirmRemoval(false)
      toast.success(data.listing ? 'Your startup is listed in the Founders Network.' : 'Your startup was removed from the network.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your listing.')
    } finally {
      setSaving(false)
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = founderListingSchema.safeParse(draft)
    if (!result.success) { setError(result.error.issues[0]?.message || 'Check your startup details.'); return }
    void update('PUT', result.data)
  }

  return (
    <RouteSection title="Startup listing">
      <Link href={FOUNDERS_NETWORK_PATH} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-neutral-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden="true" /> Founders Network
      </Link>
      {!draft && !error && <p role="status" className="text-sm text-neutral-600">Loading your startup…</p>}
      {draft && (
        <form onSubmit={save} className="max-w-xl space-y-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div>
            <h2 className="text-xl font-semibold">{published ? 'Your startup listing' : 'Submit your startup'}</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-600">Approved Top100 members can see your listing and use your LinkedIn link to connect with you.</p>
          </div>
          <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="founder-startup">Startup name</Label>
              <Input id="founder-startup" className="min-h-11" required maxLength={160} value={draft.startup}
                onChange={event => setDraft({ ...draft, startup: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founder-summary">What are you building?</Label>
              <Textarea id="founder-summary" required rows={4} maxLength={400} value={draft.summary}
                onChange={event => setDraft({ ...draft, summary: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founder-linkedin">Your LinkedIn profile</Label>
              <Input id="founder-linkedin" className="min-h-11" type="url" required maxLength={500}
                placeholder="https://www.linkedin.com/in/your-name/" value={draft.linkedinUrl}
                onChange={event => setDraft({ ...draft, linkedinUrl: event.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="min-h-11">{saving ? 'Saving…' : published ? 'Save listing' : 'List my startup'}</Button>
              {published && <Button type="button" variant="ghost" className="min-h-11 text-red-800"
                onClick={() => confirmRemoval ? void update('DELETE') : setConfirmRemoval(true)}>
                {confirmRemoval ? 'Confirm removal' : 'Remove listing'}
              </Button>}
            </div>
          </fieldset>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {!draft && error && member.status === 'approved' && (
        <Button variant="outline" onClick={() => { setError(''); setAttempt(attempt + 1) }}>Try again</Button>
      )}
    </RouteSection>
  )
}
