'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, KeyRound, Loader2, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import styles from './team-operations.module.css'

type AccessCode = {
  id: string
  created_at: string
  expires_at: string
  revoked_at: string | null
  redeemed_at: string | null
  redeemed_email: string | null
}

export function AccessCodePanel({ teamId }: { teamId: string }) {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [newCode, setNewCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/team-operations/codes?teamId=${encodeURIComponent(teamId)}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load rep codes.')
      setCodes(payload.codes ?? [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load rep codes.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  // The parent keys this panel by team, so generated codes reset on team changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function createCode() {
    if (!teamId) return
    setWorking('create')
    try {
      const response = await fetch('/api/admin/team-operations/codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not create a rep code.')
      setNewCode(payload.code)
      toast.success(payload.message)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create a rep code.')
    } finally { setWorking(null) }
  }

  async function revoke(codeId: string) {
    setWorking(codeId)
    try {
      const response = await fetch('/api/admin/team-operations/codes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, codeId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not revoke that code.')
      toast.success(payload.message)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke that code.')
    } finally { setWorking(null) }
  }

  async function copyCode() {
    if (!newCode) return
    try {
      await navigator.clipboard.writeText(newCode)
      toast.success('Code copied.')
    } catch {
      toast.error('Copy is unavailable. Select and copy the code.')
    }
  }

  function stateOf(code: AccessCode) {
    return code.revoked_at ? 'Revoked' : code.redeemed_at ? 'Used' : new Date(code.expires_at) <= new Date() ? 'Expired' : 'Ready'
  }
  const visible = codes.filter(code => filter === 'all' || stateOf(code) === filter)
  const date = (value: string) => new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(value))

  return (
    <section className={styles.codePanel} aria-label="Rep access codes">
      <div className={styles.codeToolbar}>
        <select aria-label="Filter access codes" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">Recent codes ({codes.length})</option>
          {['Ready', 'Used', 'Expired', 'Revoked'].map(state => <option key={state} value={state}>{state} ({codes.filter(code => stateOf(code) === state).length})</option>)}
        </select>
        <button onClick={() => void load()} disabled={loading || !teamId} className={styles.button}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh codes</button>
        <button onClick={() => void createCode()} disabled={!teamId || working !== null} className={`${styles.button} ${styles.primary}`}>{working === 'create' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <KeyRound size={15} aria-hidden="true" />}Generate rep code</button>
      </div>
      {error ? <p className={styles.notice} role="alert">{error}</p> : null}
      {newCode ? <div className={styles.newCode}>
        <p>Copy this code now. It will not be shown again after you close this window.</p>
        <code className="select-all">{newCode}</code>
        <button onClick={() => void copyCode()} className={styles.button}><Clipboard size={15} aria-hidden="true" />Copy code</button>
      </div> : null}
      {loading && !codes.length ? <p className={styles.help} role="status">Loading codes…</p> : visible.length ? <div className={styles.codeGrid}>
        {visible.map(code => {
          const state = stateOf(code)
          return <article key={code.id} className={styles.codeCard}>
            <div><strong>{state}</strong>{state === 'Used' ? <Check size={15} className="text-emerald-700" aria-hidden="true" /> : null}</div>
            {code.redeemed_email ? <p>{code.redeemed_email}</p> : null}
            <p>Created {date(code.created_at)}<br />Expires {date(code.expires_at)}</p>
            {state === 'Ready' ? <button onClick={() => void revoke(code.id)} disabled={working !== null} className={styles.button}>{working === code.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <X size={14} aria-hidden="true" />}Revoke<span className="sr-only"> code created {date(code.created_at)}</span></button> : null}
          </article>
        })}
      </div> : <p className={styles.help}>{error && !codes.length ? 'Code history could not be loaded.' : codes.length ? 'No codes match this status.' : 'No access codes created yet.'}</p>}
    </section>
  )
}
