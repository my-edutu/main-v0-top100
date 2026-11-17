'use client'

import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'
import { parseTalentDraft, profileCompleteness } from '@/lib/talent/contracts'
import { mergeTalentRecords } from '@/lib/talent/editor-state'
import type { TalentRecord } from '@/lib/talent/types'

export type TalentMemberResponse = {
  talent: TalentRecord
  name: string
  slug: string
  completeness: number
  policyVersion: string
}

export class TalentRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'TalentRequestError'
  }
}

export async function talentFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (typeof init.body === 'string' && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store', headers })
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new TalentRequestError('We could not read the server response. The result has not been confirmed; reload before retrying a save.', response.ok ? 502 : response.status)
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TalentRequestError('The server returned an unexpected response. Please reload and try again.', response.ok ? 502 : response.status)
  }
  if (!response.ok) {
    const message = 'message' in body && typeof body.message === 'string' ? body.message : 'This action could not be completed.'
    throw new TalentRequestError(message, response.status)
  }
  return body as T
}

function validateRecord(value: TalentRecord | undefined): TalentRecord {
  if (!value || typeof value.profile_id !== 'string' || !Number.isInteger(value.revision) || value.revision < 0 ||
    !Number.isSafeInteger(value.visibility_revision) || value.visibility_revision < 0 ||
    !['draft', 'submitted', 'approved', 'changes_requested'].includes(value.publication_status) ||
    [value.discovery_enabled, value.introductions_enabled, value.promotion_enabled, value.outreach_email_opt_out].some(flag => typeof flag !== 'boolean') ||
    (value.consent_version !== null && typeof value.consent_version !== 'string')) {
    throw new TalentRequestError('The saved profile response was incomplete. Reload before retrying.', 502)
  }
  return { ...value, draft: parseTalentDraft(value.draft, 'draft') }
}

/** One resource per mounted member workspace. Pass it to embedded controls;
 * never create a second independent copy of privacy/profile state inside it. */
export function useTalentMember() {
  const [data, setServerData] = useState<TalentMemberResponse | null>(null)
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const currentData = useRef<TalentMemberResponse | null>(null)
  const generation = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const writing = useRef(false)

  const cancelRead = useCallback(() => {
    generation.current += 1
    controller.current?.abort()
    controller.current = null
  }, [])

  const publish = useCallback((next: TalentMemberResponse | null) => {
    if (!mounted.current) return
    currentData.current = next
    setServerData(next)
  }, [])

  const setData = useCallback((update: SetStateAction<TalentMemberResponse | null>) => {
    if (!mounted.current) return
    cancelRead()
    publish(typeof update === 'function' ? update(currentData.current) : update)
    setLoading(false)
    setError('')
    setDisabled(false)
  }, [cancelRead, publish])

  const load = useCallback(async (): Promise<TalentMemberResponse | null> => {
    if (writing.current || !mounted.current) return null
    cancelRead()
    const request = new AbortController()
    controller.current = request
    const version = generation.current
    const active = () => mounted.current && generation.current === version && !request.signal.aborted
    setLoading(true)
    setError('')
    try {
      const result = await talentFetch<TalentMemberResponse>('/api/member/talent', { signal: request.signal })
      if (!active()) return null
      const next = { ...result, talent: validateRecord(result.talent) }
      if (typeof next.name !== 'string' || typeof next.slug !== 'string' || typeof next.policyVersion !== 'string') {
        throw new TalentRequestError('The profile response was incomplete. Please reload.', 502)
      }
      const merged = currentData.current ? { ...next, talent: mergeTalentRecords(currentData.current.talent, next.talent) } : next
      publish(merged)
      setDisabled(false)
      return merged
    } catch (reason) {
      if (!active()) return null
      const status = (reason as { status?: number }).status
      if (status === 401 || status === 403 || status === 404) publish(null)
      setDisabled(status === 404)
      if (status !== 404) setError(reason instanceof Error ? reason.message : 'Could not load your talent profile.')
      return null
    } finally {
      if (active()) setLoading(false)
    }
  }, [cancelRead, publish])

  /** Serialise profile and privacy writes in this workspace. A successful
   * mutation invalidates older reads; failed writes never become saved state. */
  const mutate = useCallback(async (body: Record<string, unknown>): Promise<TalentRecord> => {
    if (writing.current) throw new TalentRequestError('Another change is still saving. Please try again after it finishes.', 409)
    const member = currentData.current
    if (!member || !mounted.current) throw new TalentRequestError('Reload your member profile before saving.', 409)
    writing.current = true
    cancelRead()
    setLoading(false)
    setSaving(true)
    try {
      const result = await talentFetch<{ talent: TalentRecord }>('/api/member/talent', { method: 'PATCH', body: JSON.stringify(body) })
      const talent = validateRecord(result.talent)
      if (talent.profile_id !== member.talent.profile_id) throw new TalentRequestError('The saved profile did not match your account. Please sign in again.', 502)
      if (mounted.current && currentData.current?.talent.profile_id === member.talent.profile_id) {
        const merged = mergeTalentRecords(currentData.current.talent, talent)
        publish({ ...currentData.current, talent: merged, completeness: profileCompleteness(merged.draft) })
        setError('')
      }
      return talent
    } catch (reason) {
      const status = (reason as { status?: number }).status
      if (mounted.current && (status === 401 || status === 403)) {
        publish(null)
        setError(reason instanceof Error ? reason.message : 'Please sign in again.')
      }
      throw reason
    } finally {
      writing.current = false
      if (mounted.current) setSaving(false)
    }
  }, [cancelRead, publish])

  useEffect(() => {
    mounted.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Start the member request with the hook's shared loading and cancellation state.
    void load()
    return () => { mounted.current = false; cancelRead() }
  }, [load, cancelRead])

  return { data, setData, error, disabled, loading, saving, reload: load, mutate }
}

export type TalentMemberResource = ReturnType<typeof useTalentMember>

export type TalentMemberState = TalentMemberResource
