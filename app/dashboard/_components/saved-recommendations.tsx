'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, FilePenLine, LockKeyhole, Plus } from 'lucide-react'
import type { RecommendationAccess } from '@/lib/award-letters/recommendation-payment'
import type { RecommendationSummary } from '@/lib/award-letters/recommendations'

export type SavedRecommendation = RecommendationSummary & { image?: string; pdf?: string }
const endpoint = '/api/member/recommendation-letters'

export async function requestRecommendation(action: Record<string, unknown>): Promise<SavedRecommendation> {
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || 'Please try again.')
  return result
}

export function SavedRecommendations({ selectedId, busy, onOpen, onNew, onAccess }: {
  selectedId?: string
  busy: boolean
  onOpen: (letter: SavedRecommendation) => void
  onNew: () => void
  onAccess: (access: RecommendationAccess) => void
}) {
  const [letters, setLetters] = useState<SavedRecommendation[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error()
        const result = await response.json()
        if (!controller.signal.aborted) {
          setLetters(result.letters)
          onAccess(result.access)
        }
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, onAccess])

  return (
    <section className="mt-8 border-t border-stone-200 pt-5" aria-labelledby="saved-recommendations">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="saved-recommendations" className="text-xl font-semibold tracking-tight">Saved letters</h2>
        {selectedId && <button type="button" disabled={busy} onClick={onNew} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-[#813307] hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-700">
          <Plus size={16} aria-hidden="true" /> New letter
        </button>}
      </div>
      {error ? <p role="status" className="mt-2 text-sm">Couldn’t load your letters. <button type="button" className="min-h-11 underline" onClick={() => { setError(false); setAttempt(attempt + 1) }}>Try again</button></p>
        : !letters ? <p role="status" className="mt-2 text-sm">Loading saved letters…</p>
        : letters.length === 0 ? <p className="mt-2 text-sm text-stone-600">Your drafts and final letters will appear here.</p>
        : <ul className="mt-3 grid gap-2">
          {letters.map(letter => {
            const isFinal = Boolean(letter.finalized_at)
            const selected = letter.id === selectedId
            const Icon = isFinal ? LockKeyhole : FilePenLine
            return (
              <li key={letter.id}>
                <button type="button" disabled={busy} onClick={() => onOpen(letter)}
                  className={`group flex min-h-[68px] w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:opacity-60 sm:px-4 ${selected ? 'border-amber-400 bg-amber-50' : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'}`}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${isFinal ? 'bg-[#EEEAFE] text-[#564281]' : 'bg-[#FFF2CF] text-[#765300]'}`}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold leading-5">{letter.purpose}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-stone-600">{isFinal ? 'Final · Locked' : selected ? 'Draft · Open' : 'Draft'}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-stone-700 sm:text-sm">
                    {isFinal ? 'View' : 'Edit'} <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>}
    </section>
  )
}
