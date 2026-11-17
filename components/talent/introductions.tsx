'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Handshake } from 'lucide-react'
import type { IntroductionStatus } from '@/lib/talent/types'
import type { TalentIntroduction } from '@/lib/talent/workspace-types'
import { talentFetch } from './use-talent'
import { Field, inputClass, primaryClass, secondaryClass, TalentNotice } from './ui'
const label=(value:string)=>value.replaceAll('_',' ')
const introductionStatus: Record<IntroductionStatus, string> = {
  awaiting_member: 'Needs your reply',
  accepted: 'Accepted',
  declined: 'Declined',
  introduced: 'Introduction made',
  withdrawn: 'Permission withdrawn',
  reported: 'Reported to Top100',
  closed: 'Closed',
  expired: 'Expired',
}

function needsReply(row: TalentIntroduction, now: number) {
  return row.status === 'awaiting_member' && Date.parse(row.expires_at) > now
}

export function MemberIntroductions() {
  const [rows, setRows] = useState<TalentIntroduction[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)

  const load = useCallback(async (next?: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await talentFetch<{ introductions: TalentIntroduction[]; nextCursor: string | null }>(`/api/member/introductions${next ? `?cursor=${next}` : ''}`)
      setRows(previous => next ? [...previous, ...data.introductions] : data.introductions)
      setCursor(data.nextCursor)
      setNow(Date.now())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load introductions.')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the inbox request and expose its loading state.
  useEffect(() => { void load() }, [load])

  const pending = rows.filter(row => needsReply(row, now)).sort((a, b) => Date.parse(a.expires_at) - Date.parse(b.expires_at))
  const history = rows.filter(row => !needsReply(row, now)).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[#171412] sm:text-[32px]">Introductions</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">See who wants to meet you, what they’re offering, and when you need to reply.</p>
        </div>
        <Link href="/dashboard/me/settings#talent-privacy" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-700 underline underline-offset-4">
          Manage introductions <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </header>
      {error && <TalentNotice kind="error">{error} <button type="button" className="min-h-11 underline" onClick={() => void load()}>Retry</button></TalentNotice>}
      {loading && !rows.length && <p role="status" className="py-8 text-sm text-stone-500">Loading your introductions…</p>}
      {!loading && !error && !rows.length && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-[#fff] p-6 sm:p-8">
          <Handshake className="size-7 text-stone-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold text-stone-950">No introduction requests yet</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-stone-600">Add your work and skills, then choose to receive requests. Top100 will notify you when there’s a match to review.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard/me/profile#talent-profile" className={secondaryClass}>Edit work profile</Link>
            <Link href="/dashboard/me/settings#talent-privacy" className={secondaryClass}>Check my settings</Link>
          </div>
        </div>
      )}
      {pending.length > 0 && (
        <section aria-labelledby="intro-needs-reply" className="space-y-3">
          <h2 id="intro-needs-reply" className="text-lg font-semibold text-stone-950">Needs your reply</h2>
          {pending.map(row => <IntroductionCard key={row.id} row={row} now={now} onChange={() => void load()} />)}
        </section>
      )}
      {history.length > 0 && (
        <section aria-labelledby="intro-history" className="space-y-3">
          <h2 id="intro-history" className="text-lg font-semibold text-stone-950">Earlier introductions</h2>
          {history.map(row => <IntroductionCard key={row.id} row={row} now={now} onChange={() => void load()} />)}
        </section>
      )}
      {cursor && <button className={secondaryClass} type="button" disabled={loading} onClick={() => void load(cursor)}>Load more introductions</button>}
    </section>
  )
}
const decisionActions = {
  accepted: 'Accept introduction',
  declined: 'Decline introduction',
  withdrawn: 'Withdraw permission',
  reported: 'Send report',
}

function IntroductionCard({ row, now, onChange }: { row: TalentIntroduction; now: number; onChange: () => void }) {
  const [decision, setDecision] = useState<keyof typeof decisionActions | ''>('')
  const [note, setNote] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const expired = Date.parse(row.expires_at) <= now
  const awaitingReply = row.status === 'awaiting_member' && !expired
  const canWithdraw = ['accepted', 'introduced', 'awaiting_member'].includes(row.status)
  const canReport = !['closed', 'expired', 'reported'].includes(row.status)
  const brief = row.brief

  function clearDecision() {
    setDecision('')
    setNote('')
    setAgree(false)
    setError('')
  }

  async function respond() {
    setBusy(true)
    setError('')
    try {
      await talentFetch('/api/member/introductions', {
        method: 'PATCH',
        body: JSON.stringify({ introductionId: row.id, revision: row.revision, decision, note }),
      })
      clearDecision()
      onChange()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your response was not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="space-y-4 rounded-2xl border border-stone-200 bg-[#fff] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm text-stone-600">{brief?.organisation || 'Organisation details unavailable'}</p>
          <h3 className="mt-1 break-words text-xl font-semibold text-stone-950">{brief?.title || 'Introduction request'}</h3>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${awaitingReply ? 'bg-amber-100 text-stone-900' : 'bg-stone-100 text-stone-700'}`}>
          {expired && row.status === 'awaiting_member' ? 'Reply window closed' : introductionStatus[row.status]}
        </span>
      </div>
      {awaitingReply && (
        <p className="text-sm font-medium text-stone-700">
          Reply by {new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Africa/Lagos' }).format(new Date(row.expires_at))}
        </p>
      )}
      {brief && (
        <>
          <dl className="grid gap-3 rounded-xl bg-stone-50 p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-stone-600">Pay or funding</dt><dd className="mt-1 font-medium text-stone-950">{brief.compensation}</dd></div>
            <div><dt className="text-xs text-stone-600">Location</dt><dd className="mt-1 text-stone-950">{brief.country || 'To confirm'} · {brief.work_mode}</dd></div>
            <div><dt className="text-xs text-stone-600">Job deadline</dt><dd className="mt-1 text-stone-950">{brief.deadline || 'To confirm'}</dd></div>
          </dl>
          <p className="whitespace-pre-line break-words text-sm leading-6 text-stone-700">{brief.description}</p>
          {brief.website && <a href={brief.website} className="inline-flex min-h-11 items-center text-sm text-stone-700 underline underline-offset-4" target="_blank" rel="noopener noreferrer">Organisation website</a>}
        </>
      )}
      {row.introduction_note && <p className="border-l-2 border-amber-300 pl-3 text-sm leading-6 text-stone-600"><strong className="font-medium">Note from Top100:</strong> {row.introduction_note}</p>}

      {!decision && (
        <div className="flex flex-wrap items-start gap-3">
          {awaitingReply && (
            <>
              <button type="button" className={primaryClass} onClick={() => setDecision('accepted')}>Review and accept</button>
              <button type="button" className={secondaryClass} onClick={() => setDecision('declined')}>Decline</button>
            </>
          )}
          {(canWithdraw || canReport) && (
            <details>
              <summary className="min-h-11 cursor-pointer px-2 py-3 text-sm font-medium text-stone-700">More actions</summary>
              <div className="flex flex-wrap gap-2">
                {canWithdraw && <button type="button" className={secondaryClass} onClick={() => setDecision('withdrawn')}>Withdraw permission</button>}
                {canReport && <button type="button" className={secondaryClass} onClick={() => setDecision('reported')}>Report a concern</button>}
              </div>
            </details>
          )}
        </div>
      )}
      {decision && (
        <section className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <h4 className="font-semibold text-stone-950">{decisionActions[decision]}</h4>
          {decision === 'accepted' ? (
            <label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-stone-700">
              <input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-700" />
              <span>Top100 may share my name, account email and public work profile with this organisation for this opportunity. Accepting lets us meet. It does not mean I have a job offer.</span>
            </label>
          ) : (
            <p className="text-sm leading-6 text-stone-600">
              {decision === 'withdrawn' ? 'This stops any new sharing through this introduction. The organisation may still have details you already shared.'
                : decision === 'reported' ? 'Tell Top100 what concerns you. Your report stays private.'
                  : 'You can decline without giving a reason.'}
            </p>
          )}
          <Field label={decision === 'reported' ? 'Your concern' : 'Optional note'} htmlFor={`intro-note-${row.id}`}>
            <textarea id={`intro-note-${row.id}`} className={inputClass} rows={3} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryClass} disabled={busy || (decision === 'accepted' && !agree) || (decision === 'reported' && note.trim().length < 10)} onClick={() => void respond()}>
              {busy ? 'Saving…' : decisionActions[decision]}
            </button>
            <button type="button" className={secondaryClass} disabled={busy} onClick={clearDecision}>Cancel</button>
          </div>
        </section>
      )}
      {error && <TalentNotice kind="error">{error} Your note has been kept.</TalentNotice>}
      {['accepted', 'introduced', 'closed', 'withdrawn'].includes(row.status) && <OutcomeForm introductionId={row.id} />}
    </article>
  )
}
function OutcomeForm({introductionId}:{introductionId:string}){
  const [open,setOpen]=useState(false),[kind,setKind]=useState('interview'),[summary,setSummary]=useState(''),[url,setUrl]=useState(''),[permission,setPermission]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
  async function save(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');setMessage('');try{await talentFetch('/api/member/talent-outcomes',{method:'POST',body:JSON.stringify({introductionId,kind,summary,evidenceUrl:url,publicationPermission:permission})});setMessage('Your outcome has been recorded as self-reported. Top100 will review any supporting confirmation before counting it as confirmed.')}catch(reason){setError(reason instanceof Error?reason.message:'Your outcome could not be saved.')}finally{setBusy(false)}}
  return <section className="border-t border-stone-100 pt-4"><button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-orange-800" onClick={()=>setOpen(!open)} aria-expanded={open}><CheckCircle2 className="size-4" aria-hidden="true"/>Tell us what happened next</button>{open&&<form onSubmit={save} className="mt-3 space-y-4"><Field label="Outcome" htmlFor={`outcome-${introductionId}`}><select id={`outcome-${introductionId}`} className={inputClass} value={kind} onChange={event=>setKind(event.target.value)}>{['interview','offer','placement','scholarship','grant','mentorship','other'].map(value=><option value={value} key={value}>{label(value)}</option>)}</select></Field><Field label="What happened?" htmlFor={`outcome-summary-${introductionId}`} hint="Include the date, organisation and what you personally received or achieved."><textarea id={`outcome-summary-${introductionId}`} className={inputClass} required minLength={10} maxLength={2000} rows={4} value={summary} onChange={event=>setSummary(event.target.value)}/></Field><Field label="Optional reference link for reviewers" htmlFor={`outcome-url-${introductionId}`} hint="Use a public https link. Do not include private documents or access tokens."><input id={`outcome-url-${introductionId}`} className={inputClass} type="url" maxLength={500} value={url} onChange={event=>setUrl(event.target.value)}/></Field><label className="flex min-h-11 items-start gap-3 text-sm leading-6 text-stone-600"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-orange-700" checked={permission} onChange={event=>setPermission(event.target.checked)}/>Top100 may consider this outcome for public impact reporting after confirming it. This is optional.</label><button type="submit" className={primaryClass} disabled={busy}>{busy?'Saving…':'Record my outcome'}</button>{error&&<TalentNotice kind="error">{error}</TalentNotice>}{message&&<TalentNotice>{message}</TalentNotice>}<p className="text-xs leading-6 text-stone-500">Submitting the same outcome type again updates your report and returns it to review. It does not create an additional confirmed result.</p></form>}</section>
}
