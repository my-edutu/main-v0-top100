'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MEMBER_CONTACT_TEMPLATES, memberContactMessage, type MemberContactTemplate } from '@/lib/admin/member-contact'
import { remainingContacts, type ContactReview, type ContactResult } from '@/lib/admin/member-contact-review'

type Recipient = { id: string; name: string; email?: string }
type Review = { recipients: ContactReview[]; origin: string; smtpReady: boolean; message?: string }
export default function MemberContactDialog({ recipients, onClose }: { recipients: Recipient[]; onClose: () => void }) {
  const [template, setTemplate] = useState<MemberContactTemplate>('welcome')
  const [review, setReview] = useState<Review | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<ContactResult[]>([])
  const [sampleId, setSampleId] = useState('')
  const [notice, setNotice] = useState('')
  const sending = useRef(false)
  const stopRequested = useRef(false)
  const pending = remainingContacts(review?.recipients ?? [], results)
  const sampleRecipient = review?.recipients.find(r => r.id === sampleId) ?? review?.recipients.find(r => r.eligible) ?? review?.recipients[0]
  const sample = review && sampleRecipient ? memberContactMessage({ template, name: sampleRecipient.name,
    code: sampleRecipient.activated ? undefined : '[Personal code issued when sent]', origin: review.origin }) : null

  const loadReview = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/admin/awardees/contact/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeIds: recipients.map(r => r.id) }), signal })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || 'Could not check recipients.')
      setReview(body)
    } catch (cause) {
      if (signal?.aborted) return
      setReview(null)
      setError(cause instanceof Error ? cause.message : 'Could not check recipients. Please try again.')
    } finally { if (!signal?.aborted) setChecking(false) }
  }, [recipients])
  async function checkRecipients() {
    setChecking(true)
    setError('')
    await loadReview()
  }
  useEffect(() => {
    const controller = new AbortController()
    // The loader updates state only after the asynchronous recipient check.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReview(controller.signal)
    return () => controller.abort()
  }, [loadReview])
  useEffect(() => {
    if (!busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  async function send() {
    if (sending.current || checking || !review?.smtpReady || !pending.length) return
    sending.current = true
    stopRequested.current = false
    setBusy(true)
    setNotice('')
    try {
      for (const recipient of pending) {
        if (stopRequested.current) { setNotice('Paused. Remaining recipients have not been contacted.'); break }
        try {
          const response = await fetch('/api/admin/awardees/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awardeeId: recipient.id, template, expectedEmail: recipient.email, expectedActivated: recipient.activated }), signal: AbortSignal.timeout(60_000) })
          const body = await response.json()
          const outcome: ContactResult['outcome'] = ['accepted', 'not_sent', 'unknown', 'skipped'].includes(body.outcome) ? body.outcome : response.status >= 500 ? 'unknown' : 'skipped'
          // A service/auth failure has not attempted this recipient: keep it available after a fresh check.
          if ([503, 401, 403, 429].includes(response.status)) {
            setNotice(body.message || 'Sending stopped. Check recipients before continuing.')
            setReview(null)
            break
          }
          setResults(previous => [...previous, { id: recipient.id, name: recipient.name, outcome,
            message: body.message || 'Check the delivery record before sending again.' }])
        } catch {
          setResults(previous => [...previous, { id: recipient.id, name: recipient.name, outcome: 'unknown', message: 'Connection interrupted. Check delivery before sending to this person again.' }])
          setNotice('Sending stopped. You can continue with the remaining recipients; this person will not be retried.')
          break
        }
      }
    } finally {
      sending.current = false
      setBusy(false)
    }
  }
  const accepted = results.filter(r => r.outcome === 'accepted').length
  const issues = results.filter(r => r.outcome !== 'accepted').length
  return <Dialog open onOpenChange={open => { if (!open && !sending.current) onClose() }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-2xl">
      <DialogHeader><DialogTitle>{recipients.length === 1 ? `Contact ${recipients[0].name}` : `Contact ${recipients.length} awardees`}</DialogTitle>
        <DialogDescription>Review who will receive each message. Emails are sent individually. Keep this window open until sending finishes or you pause.</DialogDescription></DialogHeader>
      <div className="space-y-2"><label className="text-sm font-medium" htmlFor="contact-template">Message</label>
        <select id="contact-template" value={template} disabled={busy || results.length > 0} onChange={event => setTemplate(event.target.value as MemberContactTemplate)} className="min-h-11 w-full rounded-md border bg-white px-3 text-sm">
          {Object.entries(MEMBER_CONTACT_TEMPLATES).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select>
      </div>
      {checking && <p role="status" className="text-sm">Checking email addresses and previous contact attempts…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {review && <>
        {!review.smtpReady && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm">{review.message}</p>}
        <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
          <p><strong className="block text-lg">{pending.length}</strong>Ready to send</p>
          <p><strong className="block text-lg">{review.recipients.filter(r => !r.eligible).length}</strong>Excluded</p>
          <p><strong className="block text-lg">{accepted}</strong>Accepted</p>
        </div>
        <details><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Recipients and exclusions</summary>
          <ul className="max-h-48 divide-y overflow-auto text-sm">{review.recipients.map(r => <li key={r.id} className="py-2 break-words">
            <p className="font-medium">{r.name}</p><p>{r.email || 'No email address'}</p>
            <p className={r.eligible ? 'text-zinc-500' : 'text-amber-800'}>{r.eligible ? r.activated ? 'Profile reminder with dashboard link' : 'Activation message with personal code' : r.reason}</p>
          </li>)}</ul>
        </details>
        {sample && sampleRecipient && <section className="space-y-3 rounded-lg border bg-stone-50 p-4">
          <div><label className="text-sm font-medium" htmlFor="contact-preview">Preview for</label>
            <select id="contact-preview" value={sampleRecipient.id} onChange={e => setSampleId(e.target.value)} className="mt-1 min-h-11 w-full rounded border bg-white px-2 text-sm">
              {review.recipients.map(r => <option key={r.id} value={r.id}>{r.name}{r.eligible ? '' : ' (excluded)'}</option>)}
            </select>
          </div>
          <p className="break-words text-xs text-zinc-600">To: {sampleRecipient.email || 'No email address'}</p>
          <p className="font-medium text-sm">{sample.subject}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{sample.text}</p>
          {!sampleRecipient.activated && <p className="text-xs text-zinc-500">A personal code is issued only when sending. It is valid for seven days.</p>}
        </section>}
      </>}
      {results.length > 0 && <section className="space-y-2" aria-live="polite">
        <h3 className="text-sm font-medium">{accepted} accepted · {issues} need attention{pending.length ? ` · ${pending.length} remaining` : ''}</h3>
        <p className="text-xs text-zinc-500">Accepted means the email service accepted the message. Inbox delivery is not confirmed.</p>
        <details><summary className="min-h-11 cursor-pointer py-2 text-sm">View individual results</summary><ul className="max-h-48 space-y-2 overflow-auto text-sm">{results.map(r => <li key={r.id}><strong>{r.name}:</strong> {r.message}</li>)}</ul></details>
      </section>}
      {notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{notice}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy || checking} onClick={() => void checkRecipients()}>Check again</Button>
        <Button variant="outline" disabled={busy} onClick={onClose}>Close</Button>
        {busy ? <Button variant="outline" onClick={() => { stopRequested.current = true; setNotice('Pausing after the current email…') }}>Pause after current</Button>
          : <Button disabled={checking || !review?.smtpReady || !pending.length} onClick={() => void send()}>
            {results.length > 0 ? pending.length ? `Continue with ${pending.length} remaining` : 'Sending complete' : `Send to ${pending.length} ${pending.length === 1 ? 'person' : 'people'}`}
          </Button>}
      </div>
    </DialogContent>
  </Dialog>
}
