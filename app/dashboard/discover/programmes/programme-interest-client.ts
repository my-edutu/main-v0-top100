'use client'

import { useEffect, useState } from 'react'

export type Interest = { id: string; kind: string; activity_id: string | null }
type Activity = { id: string; title: string }
type Interests = { activities?: Activity[]; interests: Interest[] }

const endpoint = '/api/member/programme-interest'

export function useProgrammeInterest(community = false) {
  const [saved, setSaved] = useState<Interests>({ interests: [] })
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(community ? endpoint + '?scope=community' : endpoint, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]) })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load signups')
        return await response.json() as Interests
      })
      .then(result => {
        if (controller.signal.aborted) return
        setSaved(result)
        setLoad('ready')
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoad('error')
      })
    return () => controller.abort()
  }, [community, attempt])

  function retry() {
    setLoad('loading')
    setAttempt(value => value + 1)
  }

  function remember(interest: Interest) {
    setSaved(current => ({
      ...current,
      interests: [...current.interests.filter(item => item.id !== interest.id), interest],
    }))
    setLoad('ready')
  }

  function forget(id: string) {
    setSaved(current => ({ ...current, interests: current.interests.filter(item => item.id !== id) }))
  }

  return { ...saved, load, retry, remember, forget }
}

export async function changeProgrammeInterest(method: 'POST' | 'DELETE', payload: object) {
  const response = await fetch(endpoint, {
    method,
    signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await response.json().catch(() => ({})) as {
    interest?: Interest
    alreadyRecorded?: boolean
    message?: string
    error?: string
    field?: string
  }
  return { ...body, ok: response.ok }
}
