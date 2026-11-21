'use client'

import { useRouter } from 'next/navigation'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { canIssueRecommendation, type RecommendationAccess } from '@/lib/award-letters/recommendation-payment'
import { RecommendationUpgrade } from './recommendation-upgrade'
import { requestRecommendation, SavedRecommendations, type SavedRecommendation } from './saved-recommendations'
import { Download } from 'lucide-react'
import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useDashboardMember } from '../_providers/dashboard-member'
import { awardLettersPath, canCreateAwardLetters, letterOptions, recommendationFilename, type LetterKind } from '../_lib/award-letters'

const inputClass = 'mt-2 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-base font-normal text-stone-950 placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-orange-700'
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FFDF45] px-4 py-2 text-sm font-semibold text-[#171412] hover:bg-[#FFD52A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700'

type LetterDetails = { name: string; purpose: string; recipient: string }
type LetterPreview = { image: string; pdf?: string }
type LetterDraft = { kind: LetterKind; details: LetterDetails; preview: LetterPreview | null; saved?: SavedRecommendation }

const DraftContext = createContext<{
  draft: LetterDraft | null
  setDraft: (draft: LetterDraft) => void
} | null>(null)

export function AwardLetterDraft({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<LetterDraft | null>(null)
  return <DraftContext.Provider value={{ draft, setDraft }}>{children}</DraftContext.Provider>
}

function useAwardLetterDraft(kind: LetterKind) {
  const context = useContext(DraftContext)
  if (!context) throw new Error('Award letter draft provider is missing.')
  return { draft: context.draft?.kind === kind ? context.draft : null, setDraft: context.setDraft }
}

export function AwardLetterForm({ kind, allowCheckout }: { kind: LetterKind; allowCheckout: boolean }) {
  const { member } = useDashboardMember()
  const router = useRouter()
  const { draft, setDraft } = useAwardLetterDraft(kind)
  const [historyKey, setHistoryKey] = useState(0)
  const [recommendationAccess, setRecommendationAccess] = useState<RecommendationAccess | null>(null)
  const canWrite = kind === 'invitation' || (recommendationAccess && canIssueRecommendation(recommendationAccess))
  const activeDraft = draft?.saved?.finalized_at ? null : draft
  const details = activeDraft?.details ?? { name: member.name, purpose: '', recipient: '' }
  const { name, purpose, recipient } = details
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const { title, description } = letterOptions[kind]

  function updateDetails(change: Partial<LetterDetails>) {
    setDraft({ kind, details: { ...details, ...change }, preview: null, saved: activeDraft?.saved })
    setError('')
    setNotice('')
  }

  function showSaved(saved: SavedRecommendation) {
    const { name, purpose, recipient, image, pdf } = saved
    setDraft({ kind, details: { name, purpose, recipient }, saved, preview: image ? { image, pdf } : null })
  }

  async function openSaved(letter: SavedRecommendation) {
    setError('')
    setNotice('')
    if (!letter.finalized_at) {
      showSaved(letter)
      formRef.current?.scrollIntoView({ block: 'start' })
      return
    }
    setBusy(true)
    try {
      showSaved(await requestRecommendation({ action: 'open', id: letter.id }))
      router.push(`${awardLettersPath}/${kind}/preview`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open your letter.')
    } finally {
      setBusy(false)
    }
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const preview = !(submitter instanceof HTMLButtonElement && submitter.value === 'save')
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (kind === 'recommendation') {
        const saved = await requestRecommendation({
          action: 'save', name, purpose, recipient, preview,
          id: activeDraft?.saved?.id, revision: activeDraft?.saved?.revision,
        })
        showSaved(saved)
        setHistoryKey(key => key + 1)
        if (preview) router.push(`${awardLettersPath}/${kind}/preview`)
        else setNotice('Draft saved.')
        return
      }
      const response = await fetch('/api/member/award-letters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, purpose, recipient }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Please try again.')
      setDraft({ kind, details, preview: result })
      router.push(`${awardLettersPath}/${kind}/preview`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not prepare your letter.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl text-[#171412]" aria-labelledby="award-letter-heading">
      <h1 id="award-letter-heading" className="text-3xl font-semibold tracking-tight">{title}</h1>
      {canCreateAwardLetters(member) ? <>
        <p className="mt-2 text-sm leading-6 text-[#625449] sm:text-base">{description}</p>
        {kind === 'recommendation' && <RecommendationUpgrade access={recommendationAccess} onAccess={setRecommendationAccess} allowCheckout={allowCheckout} />}
        {canWrite && <form ref={formRef} className="mt-6 scroll-mt-24" onSubmit={generate}>
          <fieldset disabled={busy} className="grid gap-5">
            <div className="grid gap-5">
              <label className="text-sm font-medium">Your full name
                <input className={inputClass} required maxLength={90} autoComplete="name" value={name} onChange={e => updateDetails({ name: e.target.value })} />
              </label>
              <label className="text-sm font-medium">Recipient (optional)
                <input className={inputClass} maxLength={90} placeholder="Selection Committee" value={recipient} onChange={e => updateDetails({ recipient: e.target.value })} />
              </label>
            </div>
            {kind === 'recommendation' && (
              <div>
                <label htmlFor="recommendation-purpose" className="block text-sm font-medium">What are you seeking a recommendation for?</label>
                <input id="recommendation-purpose" className={inputClass} required maxLength={160} placeholder="the Chevening Scholarship" aria-describedby="recommendation-letter-name" value={purpose} onChange={e => updateDetails({ purpose: e.target.value })} />
                <p id="recommendation-letter-name" className="mt-1.5 text-xs text-stone-600">This names your letter in Saved letters and on the PDF download.</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button className={`${buttonClass} disabled:opacity-60`} type="submit">{busy ? 'Please wait…' : 'Preview letter'}</button>
              {kind === 'recommendation' && <button type="submit" value="save" className="min-h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">Save draft</button>}
            </div>
          </fieldset>
          {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mt-4 text-sm text-stone-700">{notice}</p>}
        </form>}
        {kind === 'recommendation' && <SavedRecommendations key={historyKey} busy={busy} selectedId={activeDraft?.saved?.id} onAccess={setRecommendationAccess}
          onOpen={letter => void openSaved(letter)} onNew={() => {
            setError('')
            setNotice('')
            setDraft({ kind, details: { name: member.name, purpose: '', recipient: '' }, preview: null })
            formRef.current?.scrollIntoView({ block: 'start' })
          }} />}
      </> : <p className="mt-2 text-sm text-[#625449]">Letters are available to Top100 awardees.</p>}
    </section>
  )
}

export function AwardLetterPreview({ kind }: { kind: LetterKind }) {
  const { member } = useDashboardMember()
  const { draft, setDraft } = useAwardLetterDraft(kind)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = canCreateAwardLetters(member) ? draft?.preview : null
  const { title } = letterOptions[kind]

  const saved = draft?.saved

  async function finalize() {
    if (!draft || !saved || busy) return
    setConfirmOpen(false)
    setBusy(true)
    setError('')
    try {
      const letter = await requestRecommendation({ action: 'finalize', id: saved.id, revision: saved.revision, confirmed: true })
      if (!letter.pdf || !letter.image) throw new Error('The final PDF is unavailable. Try again.')
      setDraft({ ...draft, saved: letter, preview: { image: letter.image, pdf: letter.pdf } })
      const download = document.createElement('a')
      download.href = 'data:application/pdf;base64,' + letter.pdf
      download.download = recommendationFilename(letter.purpose)
      document.body.appendChild(download)
      download.click()
      download.remove()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finalize your letter.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-4xl text-[#171412]" aria-label="Letter document">
      {preview && <div className="flex flex-wrap items-center justify-end gap-3">
        {saved?.finalized_at && <span className="text-sm font-semibold text-stone-600">Final · Locked</span>}
        {preview.pdf ? <a href={'data:application/pdf;base64,' + preview.pdf} download={kind === 'recommendation' ? recommendationFilename(saved?.purpose ?? '') : 'invitation-letter.pdf'} className={buttonClass}>
          <Download size={16} aria-hidden="true" /> Download PDF
        </a> : saved && <button type="button" disabled={busy} onClick={() => setConfirmOpen(true)} className={buttonClass}>
          <Download size={16} aria-hidden="true" /> {busy ? 'Finalizing…' : 'Download PDF'}
        </button>}
      </div>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize this recommendation?</AlertDialogTitle>
            <AlertDialogDescription>Check the name, recipient and opportunity before downloading. Once you finalize and download, this letter is locked and can’t be edited. If your award payment isn’t confirmed, this uses a free letter first, or one pack credit once your free letters run out. You can download the same PDF again from Saved letters.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep as draft</AlertDialogCancel>
            <AlertDialogAction onClick={() => void finalize()}>Finalize and download</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {preview ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img className="mt-4 h-auto w-full rounded-lg border border-[#E8DFD2]" src={'data:image/jpeg;base64,' + preview.image} alt={`Preview of the ${title.toLowerCase()} for ${draft?.details.name}`} width={989} height={1400} />
      ) : <p className="mt-3 text-sm text-[#625449]">Use the back arrow to enter your details and generate a preview.</p>}
    </section>
  )
}
