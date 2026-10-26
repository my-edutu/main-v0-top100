'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Banner, Field } from '@/components/ui'

export default function SetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    async function checkUser() {
      const { data } = await supabase.auth.getUser()
      setReady(Boolean(data.user))
    }
    void checkUser()
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 10) {
      setError('Use at least 10 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const supabase = createBrowserSupabase()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[440px]">
        <div className="card p-6 md:p-8">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-soft text-moss">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="label mb-2">Secure your account</p>
          <h1 className="display text-3xl">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Choose a strong password you do not use anywhere else. Minimum 10 characters.
          </p>

          {ready === false ? (
            <Banner tone="error" className="mt-5">
              This link is invalid or expired. Ask an administrator to send a new invitation.
            </Banner>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {error ? <Banner tone="error">{error}</Banner> : null}
              <Field label="New password">
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              <Field label="Confirm password">
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </Field>
              <button className="btn btn-primary w-full" disabled={loading || ready === null}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save password & continue
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
