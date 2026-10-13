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
      <div aria-hidden="true" className="whatsapp-group-card__icon">
        <UsersRound className="h-7 w-7" />
      </div>
      <p className="whatsapp-group-card__eyebrow">Your community</p>
      <h2 className="whatsapp-group-card__title">{group.label}</h2>
      <p className="whatsapp-group-card__description" role="status" aria-live="polite">
        {created
          ? `You’ve been matched with ${group.label}. Connect with fellow Africa Future Leaders on WhatsApp.`
          : `You’re in ${group.label}. Connect with fellow Africa Future Leaders on WhatsApp.`}
      </p>
      <a
        href={group.inviteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-group-card__cta"
      >
        Join your WhatsApp group
        <ExternalLink aria-hidden="true" className="h-5 w-5" />
      </a>
      <p className="whatsapp-group-card__saved">Your group assignment is saved, so you’ll return to this same group.</p>
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
      <div className="whatsapp-group-card whatsapp-group-card--state" role="status" aria-live="polite">
        <LoaderCircle className="h-8 w-8 animate-spin text-white motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-5 text-lg font-semibold text-white">Finding your WhatsApp group</p>
      </div>
    )
  }

  if (error || !assignment) {
    return (
      <section className="whatsapp-group-card whatsapp-group-card--state" role="alert">
        <UsersRound aria-hidden="true" className="h-9 w-9 text-white" />
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">Your group hasn’t loaded yet</h2>
        <p className="mt-2 max-w-lg text-base leading-7 text-white/85">
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
          className="whatsapp-group-card__cta mt-6 max-w-lg bg-[#0A8A49] text-white hover:bg-[#08773E]"
        >
          <RotateCcw aria-hidden="true" className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </section>
    )
  }

  return <WhatsAppGroupAssigned group={assignment.group} created={assignment.created} />
}
