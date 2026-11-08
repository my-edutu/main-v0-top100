'use client'
import { useCallback, useEffect, useState } from 'react'
import type { TalentRecord } from '@/lib/talent/types'
export type TalentMemberResponse = { talent: TalentRecord; name: string; slug: string; completeness: number; policyVersion: string }
export async function talentFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, credentials: 'same-origin', cache: 'no-store', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(body.message || 'This action could not be completed.'), { status: response.status })
  return body as T
}
export function useTalentMember() {
  const [data, setData] = useState<TalentMemberResponse | null>(null)
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await talentFetch<TalentMemberResponse>('/api/member/talent')); setDisabled(false) }
    catch (e) { const status = (e as { status?: number }).status; if (status === 404) setDisabled(true); else setError(e instanceof Error ? e.message : 'Could not load your talent profile.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  return { data, setData, error, disabled, loading, reload: load }
}
