'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

export function InviteMemberForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('agent')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, role, phone }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not invite the team member')
      setSuccess(payload.message ?? 'Invitation sent.')
      setFullName('')
      setEmail('')
      setPhone('')
      setRole('agent')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite the team member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <Field label="Full name">
        <input className="input !h-10" value={fullName} onChange={(event) => setFullName(event.target.value)} required minLength={2} maxLength={120} />
      </Field>
      <Field label="Work email">
        <input className="input !h-10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Role">
          <select className="select !h-10" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="agent">Sales agent</option>
            <option value="team_leader">Team leader</option>
            <option value="super_admin">Super admin</option>
          </select>
        </Field>
        <Field label="Phone (optional)">
          <input className="input !h-10" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} />
        </Field>
      </div>
      <Button type="submit" variant="ember" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {loading ? 'Sending invitation…' : 'Send invitation'}
      </Button>
      <p className="text-[10px] leading-4 text-muted">
        The invitation is sent by Supabase Auth, not this app&apos;s SMTP. If delivery fails, the member is not created
        and the error is shown here.
      </p>
    </form>
  )
}
