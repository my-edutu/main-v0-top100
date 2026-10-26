'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Banner, Field } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserSupabase()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/set-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
        <div className="card p-6 md:p-8">
          <p className="label mb-2">Account recovery</p>
          <h1 className="display text-3xl">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            We will email a secure reset link if this address belongs to a team member.
          </p>
          {sent ? (
            <div className="mt-6">
              <Banner tone="success">
                <span className="flex items-center gap-2">
                  <MailCheck className="h-4 w-4" /> If the address is registered, a reset link is on its way.
                </span>
              </Banner>
              <p className="mt-4 text-xs leading-5 text-muted">
                Didn't receive it? Check spam or ask your administrator to resend the invitation.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {error ? <Banner tone="error">{error}</Banner> : null}
              <Field label="Work email">
                <input
                  className="input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@top100afl.com"
                />
              </Field>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
