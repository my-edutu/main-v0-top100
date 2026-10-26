'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui'

export function MemberControls({
  id,
  role,
  status,
  isSelf,
}: {
  id: string
  role: string
  status: string
  isSelf: boolean
}) {
  const router = useRouter()
  const [nextRole, setNextRole] = useState(role)
  const [nextStatus, setNextStatus] = useState(status)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function save() {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole, status: nextStatus }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not update the member')
      setSuccess('Saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {error ? <p className="w-full text-[10px] text-red-700">{error}</p> : null}
      {success ? <p className="w-full text-[10px] text-moss">{success}</p> : null}
      <select
        className="select !h-8 !w-auto text-[11px]"
        value={nextRole}
        onChange={(event) => setNextRole(event.target.value)}
        disabled={isSelf}
        aria-label="Role"
      >
        <option value="agent">Agent</option>
        <option value="team_leader">Leader</option>
        <option value="super_admin">Admin</option>
      </select>
      <select
        className="select !h-8 !w-auto text-[11px]"
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value)}
        disabled={isSelf}
        aria-label="Status"
      >
        <option value="invited">Invited</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
      <Button
        size="sm"
        variant="ghost"
        onClick={save}
        disabled={loading || isSelf || (nextRole === role && nextStatus === status)}
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Save
      </Button>
    </div>
  )
}
