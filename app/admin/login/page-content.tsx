'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileCaptcha, verifyCaptcha } from '@/components/ui/turnstile'
import { supabase } from '@/lib/supabase/client'
import { isAdminRole } from '@/lib/types/roles'
import { normalizeRole } from '@/lib/auth-utils'

/**
 * Administrator sign-in. Deliberately separate from the member /login page:
 * different context, no signup path, and a hard admin-role gate — a valid
 * member account is rejected here instead of being forwarded to the hub.
 */
export default function AdminLoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')

  const searchParams = useSearchParams()
  const requestedPath = searchParams.get('redirect') || searchParams.get('from') || ''
  // Only ever land inside the console, and only on same-site paths.
  const redirectTo =
    requestedPath.startsWith('/admin') && !requestedPath.startsWith('//') ? requestedPath : '/admin'

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && captchaToken) {
        const captchaValid = await verifyCaptcha(captchaToken)
        if (!captchaValid) {
          setError('CAPTCHA verification failed. Please try again.')
          setIsLoading(false)
          return
        }
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(
          signInError.message.includes('Invalid login credentials')
            ? 'Invalid email or password.'
            : signInError.message
        )
        setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Authentication error. Please try again.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/auth/check-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const data = await response.json().catch(() => ({}))
      const role = normalizeRole(data?.profile?.role)

      if (!response.ok || !isAdminRole(role)) {
        await supabase.auth.signOut()
        setError('This console is restricted to administrators. Members can sign in at the member portal.')
        setIsLoading(false)
        return
      }

      // Give the auth cookies a moment to settle before the middleware
      // re-checks the session on the full page load.
      await new Promise((resolve) => setTimeout(resolve, 1200))
      window.location.href = redirectTo
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      {/* Console backdrop: faint grid + single amber glow, nothing decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-orange-500/10 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
              <LockKeyhole className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-100">Top100 AFL</p>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-400/90">Admin console</p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Restricted
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Administrator access</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Sign in with your operations account. Member accounts cannot access this area.
          </p>

          <form onSubmit={handleSignIn} className="mt-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@top100afl.org"
                className="h-11 rounded-xl border-zinc-700 bg-zinc-950/70 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-zinc-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 rounded-xl border-zinc-700 bg-zinc-950/70 pr-11 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="empty:hidden">
              <TurnstileCaptcha
                onVerify={(token) => setCaptchaToken(token)}
                onError={() => setCaptchaToken('')}
                onExpire={() => setCaptchaToken('')}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl bg-orange-500 text-sm font-semibold text-zinc-950 hover:bg-orange-400 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying access…
                </>
              ) : (
                'Sign in to console'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Not an administrator?{' '}
          <Link href="/login" className="font-semibold text-zinc-300 underline-offset-4 hover:underline">
            Member sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-[11px] text-zinc-600">
          Access attempts are logged. Sessions expire after 30 minutes of inactivity.
        </p>
      </div>
    </main>
  )
}
