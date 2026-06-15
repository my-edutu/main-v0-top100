'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Copy, KeyRound, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  generateInviteCode,
  getMemberHubState,
  MemberHubState,
  resetMemberBioUpdateLimit,
  updateMemberStatus,
} from '@/lib/member-hub-local'
import { cn } from '@/lib/utils'

export default function AdminInvitesPage() {
  const [state, setState] = useState<MemberHubState | null>(null)
  const [label, setLabel] = useState('Awardee invite')
  const [copiedCode, setCopiedCode] = useState('')

  function refresh() {
    setState(getMemberHubState())
  }

  useEffect(() => {
    refresh()
  }, [])

  const pendingMembers = useMemo(
    () => state?.members.filter((member) => member.status === 'pending') || [],
    [state],
  )

  function handleGenerate() {
    const invite = generateInviteCode(label || 'Awardee invite')
    setLabel('Awardee invite')
    setCopiedCode(invite.code)
    refresh()
  }

  async function copyCode(code: string) {
    await navigator.clipboard?.writeText(code)
    setCopiedCode(code)
  }

  function setStatus(memberId: string, status: 'approved' | 'rejected') {
    updateMemberStatus(memberId, status)
    refresh()
  }

  function resetBioLimit(memberId: string) {
    resetMemberBioUpdateLimit(memberId)
    refresh()
  }

  if (!state) {
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
            </div>
          </div>
          <Button variant="outline" className="rounded-full border-orange-200 bg-white text-orange-700 hover:bg-orange-50" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <Card className="border-orange-100 bg-slate-950 text-white shadow-[0_24px_80px_-54px_rgba(15,23,42,0.75)]">
            <CardHeader>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl font-black">Generate code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/45"
                placeholder="Code label"
              />
              <Button onClick={handleGenerate} className="w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 py-6 text-white shadow-none hover:opacity-95">
                Generate invite
              </Button>
              {copiedCode ? (
                <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm">
                  Latest code: <span className="font-black text-orange-200">{copiedCode}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-orange-100 bg-white/92 shadow-none">
            <CardHeader className="border-b border-orange-100">
              <CardTitle className="text-2xl font-black text-slate-950">Pending awardees</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {pendingMembers.length ? pendingMembers.map((member) => (
                <div key={member.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-black text-orange-700">
                      {member.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-black text-slate-950">{member.name}</h2>
                      <p className="text-sm text-slate-500">{member.email}</p>
                      <p className="mt-1 text-sm font-medium text-slate-700">{member.headline}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={() => setStatus(member.id, 'approved')}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button variant="outline" className="rounded-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => setStatus(member.id, 'rejected')}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-sm font-medium text-slate-500">No pending awardees.</div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="border-orange-100 bg-white/92 shadow-none">
          <CardHeader className="border-b border-orange-100">
            <CardTitle className="text-2xl font-black text-slate-950">Codebase</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {state.invites.map((invite) => (
              <div key={invite.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{invite.label}</p>
                    <p className="mt-2 text-xl font-black text-slate-950">{invite.code}</p>
                  </div>
                  <span className={cn(
                    'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                    invite.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500',
                  )}>
                    {invite.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Uses left: {invite.usesLeft}</span>
                  <Button variant="ghost" size="sm" className="rounded-full text-orange-700 hover:bg-orange-50" onClick={() => copyCode(invite.code)}>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    {copiedCode === invite.code ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-white/92 shadow-none">
          <CardHeader className="border-b border-orange-100">
            <CardTitle className="text-2xl font-black text-slate-950">BIO update limits</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {state.members.map((member) => {
              const remaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)

              return (
                <div key={member.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h2 className="font-black text-slate-950">{member.name}</h2>
                    <p className="text-sm text-slate-500">{member.email}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {remaining} of {member.bioUpdateLimit} BIO updates remaining
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => resetBioLimit(member.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reset BIO limit
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-orange-100 bg-orange-50/70 shadow-none">
          <CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm font-semibold text-orange-800">
            <ShieldCheck className="h-4 w-4" />
            This local panel validates the invite flow. The production version should store hashed accounts and codes server-side.
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
