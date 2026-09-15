'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Ban, CheckCircle2, Copy, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AccessCode = {
  id: string
  code: string
  label: string | null
  status: 'active' | 'used' | 'expired' | 'revoked'
  redemption_mode: 'single_use' | 'time_limited'
  uses_left: number
  email: string | null
  expires_at: string
  created_at: string
}

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<AccessCode[] | null>(null)
  const [label, setLabel] = useState('Awardee invite')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'single_use' | 'time_limited'>('single_use')
  const [durationHours, setDurationHours] = useState<1 | 24>(1)
  const [copiedCode, setCopiedCode] = useState('')
  const [latestCode, setLatestCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setError('')
    try {
      const res = await fetch('/api/admin/access-codes', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || 'Could not load access codes.')
      }
      const data = await res.json()
      setCodes(data.codes ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load access codes.')
      setCodes([])
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleGenerate() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/access-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: label || 'Awardee invite',
          mode,
          email: mode === 'single_use' ? email.trim() : null,
          durationHours: mode === 'time_limited' ? durationHours : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not generate a code.')
      setLatestCode(data.code.code)
      setLabel('Awardee invite')
      setEmail('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a code.')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard?.writeText(code)
    setCopiedCode(code)
  }

  async function revoke(id: string) {
    setError('')
    try {
      const res = await fetch(`/api/admin/access-codes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message || 'Could not revoke the code.')
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke the code.')
    }
  }

  if (!codes) {
    return (
      <main className="min-h-screen bg-[#fffaf4] p-8">
        <div className="mx-auto max-w-6xl text-sm font-semibold text-slate-500">Loading invite panel...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.1),transparent_24%),linear-gradient(180deg,#fffaf4_0%,#ffffff_46%,#f7efe5_100%)] px-4 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <Button asChild variant="ghost" className="h-auto rounded-full px-0 text-slate-500 hover:bg-transparent hover:text-orange-700">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
            <div>
              <Badge variant="soft" className="border-orange-200 bg-white text-orange-700">
                Invite-only access
              </Badge>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">Awardee codes</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Create a one-person code or open a reusable signup window for 1 or 24 hours.
              </p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full border-orange-200 bg-white text-orange-700 hover:bg-orange-50" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {error ? (
          <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <Card className="border-orange-100 bg-white text-slate-950 shadow-[0_24px_80px_-54px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl font-black">Generate code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                placeholder="Code label"
              />
              <div className="grid grid-cols-2 gap-2" aria-label="Invite code type">
                <button
                  type="button"
                  onClick={() => setMode('single_use')}
                  aria-pressed={mode === 'single_use'}
                  className={cn('rounded-2xl border px-3 py-3 text-left text-sm font-bold transition', mode === 'single_use' ? 'border-orange-400 bg-orange-100 text-orange-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50')}
                >
                  Individual
                  <span className="mt-1 block text-xs font-medium opacity-70">One person, one use</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('time_limited')}
                  aria-pressed={mode === 'time_limited'}
                  className={cn('rounded-2xl border px-3 py-3 text-left text-sm font-bold transition', mode === 'time_limited' ? 'border-orange-400 bg-orange-100 text-orange-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50')}
                >
                  Timed access
                  <span className="mt-1 block text-xs font-medium opacity-70">Reusable until expiry</span>
                </button>
              </div>
              {mode === 'single_use' ? (
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  placeholder="Recipient email"
                  type="email"
                  required
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Expires after</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([1, 24] as const).map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => setDurationHours(hours)}
                        aria-pressed={durationHours === hours}
                        className={cn('rounded-full border px-4 py-2 text-sm font-bold transition', durationHours === hours ? 'border-orange-400 bg-orange-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300 hover:bg-orange-50')}
                      >
                        {hours === 1 ? '1 hour' : '24 hours'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleGenerate} disabled={busy || (mode === 'single_use' && !email.trim())} className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-white shadow-none hover:opacity-95 disabled:opacity-50">
                {busy ? 'Generating...' : 'Generate invite'}
              </Button>
              {latestCode ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="min-w-0 truncate text-slate-700">
                    Latest code: <span className="font-black text-orange-700">{latestCode}</span>
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 rounded-full text-orange-700 hover:bg-orange-100"
                    onClick={() => copyCode(latestCode)}
                    aria-label="Copy latest invite code"
                  >
                    {copiedCode === latestCode ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                    {copiedCode === latestCode ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-orange-100 bg-orange-50/70 shadow-none">
            <CardContent className="flex flex-col justify-center gap-3 p-6 text-sm font-medium text-orange-900">
              <div className="flex items-center gap-2 font-black">
                <ShieldCheck className="h-4 w-4" />
                How the gate works
              </div>
              <p>Codes are stored and validated server-side. A code can only be redeemed while it is <strong>active</strong> and unexpired.</p>
              <p>Individual codes become <strong>used</strong> after one successful signup. Timed codes stay reusable until their selected expiry.</p>
              <p>Approve or suspend the resulting awardee accounts from the <Link href="/admin/member-hub" className="font-black underline">Member hub</Link>.</p>
            </CardContent>
          </Card>
        </section>

        <Card className="border-orange-100 bg-white/92 shadow-none">
          <CardHeader className="border-b border-orange-100">
            <CardTitle className="text-2xl font-black text-slate-950">Codebase</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {codes.length ? codes.map((invite) => {
              const expired = new Date(invite.expires_at).getTime() < Date.now()
              const effectiveStatus = expired && invite.status === 'active' ? 'expired' : invite.status
              return (
                <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{invite.label}</p>
                      <p className="mt-2 text-xl font-black text-slate-950">{invite.code}</p>
                      <p className="mt-1 text-xs font-bold text-orange-700">
                        {invite.redemption_mode === 'time_limited' ? 'Reusable timed code' : 'Individual one-use code'}
                      </p>
                      {invite.email ? <p className="mt-1 text-xs font-medium text-slate-500">for {invite.email}</p> : null}
                    </div>
                    <span className={cn(
                      'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                      effectiveStatus === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500',
                    )}>
                      {effectiveStatus}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Expires {new Date(invite.expires_at).toLocaleString()}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {invite.redemption_mode === 'time_limited' ? 'Reusable until expiry' : `Uses left: ${invite.uses_left}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="rounded-full text-orange-700 hover:bg-orange-50" onClick={() => copyCode(invite.code)}>
                        {copiedCode === invite.code ? <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
                        {copiedCode === invite.code ? 'Copied' : 'Copy'}
                      </Button>
                      {effectiveStatus === 'active' ? (
                        <Button variant="ghost" size="sm" className="rounded-full text-red-600 hover:bg-red-50" onClick={() => revoke(invite.id)}>
                          <Ban className="mr-2 h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="p-4 text-sm font-medium text-slate-500">No codes yet. Generate one to get started.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
