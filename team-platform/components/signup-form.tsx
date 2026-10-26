'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Banner, Field } from '@/components/ui'

export function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, code, password }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not create your account.')
      setMessage(payload.message || 'Account created. Wait for admin approval.')
      setPassword('')
      setCode('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not create your account.')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {message ? <Banner tone="success">{message}</Banner> : null}
      <Field label="Full name"><input className="input" autoComplete="name" minLength={2} maxLength={120} required value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={loading} /></Field>
      <Field label="Work email"><input className="input" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} /></Field>
      <Field label="Admin access code" hint="Ask your Top100 administrator for a one-time code."><input className="input font-mono uppercase tracking-[0.12em]" autoComplete="one-time-code" minLength={20} maxLength={40} required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} disabled={loading} /></Field>
      <Field label="Create password" hint="Use at least 10 characters."><input className="input" type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} /></Field>
      <button type="submit" className="btn btn-primary mt-2 h-12 w-full" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {loading ? 'Creating account…' : 'Create rep account'}
      </button>
      <p className="text-center text-xs text-muted">Already have an account? <Link href="/login" className="font-medium text-ink underline decoration-ember/50 underline-offset-4">Sign in</Link></p>
    </form>
  )
}
