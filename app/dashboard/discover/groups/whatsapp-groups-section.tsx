'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, LoaderCircle, RotateCcw, UsersRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { WhatsAppGroup } from '@/lib/groups/whatsapp'
import { GroupsLockedState } from '../../_components/groups-locked-state'

type Assignment = { group: WhatsAppGroup; created: boolean }
type AssignmentResponse = { group?: Partial<WhatsAppGroup>; created?: unknown; message?: unknown }

export async function requestWhatsAppGroupAssignment(isDemoPreview = false): Promise<Assignment> {
  const endpoint = isDemoPreview ? '/api/dev-dashboard/whatsapp-group' : '/api/member/whatsapp-group'
  const response = await fetch(endpoint, { method: 'POST' })
  const payload = (await response.json().catch(() => null)) as AssignmentResponse | null

  if (!response.ok) {
    throw new Error(typeof payload?.message === 'string' ? payload.message : 'Could not load your group. Please try again.')
  }

  const group = payload?.group
  if (
    !group ||
    !['group-1', 'group-2', 'group-3'].includes(group.key ?? '') ||
    typeof group.label !== 'string' ||
    typeof group.inviteUrl !== 'string' ||
    !group.inviteUrl.startsWith('https://chat.whatsapp.com/') ||
    typeof payload?.created !== 'boolean'
  ) {
    throw new Error('Your group could not be verified. Please try again.')
  }

  return { group: group as WhatsAppGroup, created: payload.created }
}

export function WhatsAppGroupAssigned({ group, created }: Assignment) {
  return (
    <div className={`whatsapp-group-card${created ? ' whatsapp-group-card--reveal' : ''}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7EC] text-[#176B35]">
        <UsersRound aria-hidden="true" className="h-6 w-6" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#8a5a00]">Your community</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#171412]">{group.label}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#625B52]" role="status" aria-live="polite">
        {created
          ? `You’ve been matched with ${group.label}. Connect with fellow Africa Future Leaders on WhatsApp.`
          : `You’re in ${group.label}. Connect with fellow Africa Future Leaders on WhatsApp.`}
      </p>
      <a
        href={group.inviteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#176B35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#10542A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B35]"
      >
        Join your WhatsApp group
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
      </a>
      <p className="mt-3 text-xs leading-5 text-[#746B61]">Your group assignment is saved, so you’ll return to this same group.</p>
    </div>
  )
}

export function WhatsAppGroupsSection({ approved, isDemoPreview = false }: { approved: boolean; isDemoPreview?: boolean }) {
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!approved) return
    let active = true

    requestWhatsAppGroupAssignment(isDemoPreview)
      .then((result) => {
        if (active) setAssignment(result)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your group. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [approved, attempt, isDemoPreview])

  if (!approved) {
    return <GroupsLockedState />
  }

  if (loading) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-[#E7DDCF] bg-white p-8 text-center" role="status" aria-live="polite">
        <LoaderCircle className="h-7 w-7 animate-spin text-[#176B35] motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-[#625B52]">Finding your WhatsApp group</p>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <section className="rounded-3xl border border-[#E7DDCF] bg-white p-7 text-center sm:p-10" role="alert">
        <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Your group hasn’t loaded yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#625B52]">
          {error || 'Please try again to discover your WhatsApp group.'}
        </p>
        <Button
          type="button"
          onClick={() => {
            setAssignment(null)
            setError('')
            setLoading(true)
            setAttempt((current) => current + 1)
          }}
          className="mt-5 bg-[#171412] text-white hover:bg-[#312B27]"
        >
          <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </section>
    )
  }

  return <WhatsAppGroupAssigned group={assignment.group} created={assignment.created} />
}
