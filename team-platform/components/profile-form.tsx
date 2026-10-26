'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

export function ProfileForm({
  fullName,
  phone,
  email,
}: {
  fullName: string
  phone: string | null
  email: string
}) {
  const router = useRouter()
  const [name, setName] = useState(fullName)
  const [phoneValue, setPhoneValue] = useState(phone ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: name, phone: phoneValue }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not update your profile')
      setSuccess('Profile updated.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <Field label="Full name">
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required />
      </Field>
      <Field label="Phone" hint="Used by administrators to reach you about payouts. Never shown to awardees.">
        <input className="input" value={phoneValue} onChange={(event) => setPhoneValue(event.target.value)} maxLength={40} placeholder="+234…" />
      </Field>
      <Field label="Sign-in email" hint="Contact an administrator to change the email tied to your account.">
        <input className="input bg-ink/[0.03]" value={email} readOnly />
      </Field>
      <Button type="submit" variant="ember" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
      </Button>
    </form>
  )
}
