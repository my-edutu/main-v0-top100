'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Clipboard, KeyRound, Loader2, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'

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
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/team-operations/codes?teamId=${encodeURIComponent(teamId)}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load rep codes.')
      setCodes(payload.codes ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load rep codes.')
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => { setNewCode(null); void load() }, [load])

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

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Rep onboarding</p>
          <h2 className="mt-1 text-xl font-semibold">One-time access codes</h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-zinc-600">Generate a random code for a sales rep to create an account. Codes expire after seven days and work once. New accounts still need admin approval.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} disabled={loading || !teamId} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-medium disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          <button onClick={() => void createCode()} disabled={!teamId || working !== null} className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{working === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}Generate rep code</button>
        </div>
      </div>

      {newCode ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div><p className="text-xs font-medium text-emerald-900">Copy this code now. It is stored as a hash and will not be shown again.</p><code className="mt-2 block select-all font-mono text-lg font-semibold tracking-[0.14em] text-emerald-950">{newCode}</code></div>
        <button onClick={() => void copyCode()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 text-sm font-medium text-emerald-900"><Clipboard className="h-4 w-4" />Copy code</button>
      </div> : null}

      <div className="divide-y divide-zinc-100 border-y border-zinc-100">
        {loading && !codes.length ? <p className="py-5 text-sm text-zinc-500">Loading codes…</p> : codes.length ? codes.map((code) => {
          const state = code.revoked_at ? 'Revoked' : code.redeemed_at ? `Used by ${code.redeemed_email ?? 'a rep'}` : new Date(code.expires_at) <= new Date() ? 'Expired' : 'Ready'
          const canRevoke = state === 'Ready'
          return <div key={code.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div><span className="font-medium text-zinc-800">{state}</span><span className="ml-2 text-xs text-zinc-500">Created {new Date(code.created_at).toLocaleDateString()} · expires {new Date(code.expires_at).toLocaleDateString()}</span></div>
            {canRevoke ? <button onClick={() => void revoke(code.id)} disabled={working !== null} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 text-xs font-medium text-zinc-700 disabled:opacity-50">{working === code.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}Revoke</button> : code.redeemed_at ? <Check className="h-4 w-4 text-emerald-700" /> : null}
          </div>
        }) : <p className="py-5 text-sm text-zinc-500">No access codes created yet.</p>}
      </div>
    </section>
  )
}
