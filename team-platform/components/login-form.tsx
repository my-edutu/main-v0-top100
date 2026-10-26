'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { Banner, Field } from '@/components/ui'

export function LoginForm({ next, disabled }: { next: string; disabled?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createBrowserSupabase()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) {
        setError(
          /invalid login credentials/i.test(signInError.message)
            ? 'Email or password is incorrect.'
            : /email not confirmed/i.test(signInError.message)
              ? 'This account has not been activated yet. Ask your administrator for a new invite.'
              : signInError.message,
        )
        return
      }
      router.replace(next)
      router.refresh()
    } catch {
      setError('Could not reach the authentication service. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Field label="Work email">
        <input
          className="input"
          type="email"
          autoComplete="email"
          required
          placeholder="you@top100afl.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={disabled || loading}
        />
      </Field>
      <Field label="Password">
        <div className="relative">
          <input
            className="input pr-11"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={disabled || loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      <button type="submit" className="btn btn-primary mt-2 h-12 w-full" disabled={disabled || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {loading ? 'Signing in…' : 'Sign in to workspace'}
      </button>
    </form>
  )
}
