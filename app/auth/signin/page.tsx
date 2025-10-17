'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { betterAuthClient } from '@/lib/better-auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const ADMIN_PREFIX = '/admin'

type BetterAuthError = { message?: string }

const resolveDestination = (requested: string, role: string) => {
  if (role === 'admin') {
    return requested.startsWith(ADMIN_PREFIX) ? requested : ADMIN_PREFIX
  }

  if (requested.startsWith(ADMIN_PREFIX)) {
    return '/dashboard'
  }

  return requested || '/dashboard'
}

export default function SignInPage() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showVerificationNotice, setShowVerificationNotice] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  const redirectHint = params?.get('from') ?? '/dashboard'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setInfo(null)
    setShowVerificationNotice(false)
    setLoading(true)

    try {
      const signInResult = await betterAuthClient.signIn.email({ email, password })

      if (!signInResult || signInResult.error || !signInResult.data) {
        const message =
          (signInResult?.error as BetterAuthError | undefined)?.message ?? 'Invalid email or password'
        throw new Error(message)
      }

      const sessionResult = await betterAuthClient.getSession()

      if (!sessionResult || sessionResult.error || !sessionResult.data) {
        const message =
          (sessionResult?.error as BetterAuthError | undefined)?.message ??
          'Unable to resolve session after sign in'
        throw new Error(message)
      }

      const { user } = sessionResult.data
      const role = (user as Record<string, unknown>)?.role ?? 'user'

      await fetch('/api/profiles/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          role,
        }),
      }).catch(() => {
        // Profile sync failures shouldn't block sign-in.
      })

      const destination = resolveDestination(redirectHint, role)

      setInfo('Signed in successfully! Redirecting...')
      router.push(destination)
      router.refresh()
    } catch (err) {
      console.error('[sign-in] failed', err)
      const message = err instanceof Error ? err.message : 'Failed to sign in'
      setError(message)
      if (message.toLowerCase().includes('verify')) {
        setShowVerificationNotice(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError('Enter the email address you used to sign up.')
      return
    }

    setResendLoading(true)
    setError(null)
    setInfo(null)

    try {
      const response = await fetch('/api/better-auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          callbackURL: redirectHint,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message =
          typeof payload?.message === 'string'
            ? payload.message
            : 'Unable to resend verification email.'
        throw new Error(message)
      }

      setInfo('Verification email sent. Check your inbox.')
      setShowVerificationNotice(false)
    } catch (err) {
      console.error('[sign-in] resend verification failed', err)
      setError(err instanceof Error ? err.message : 'Failed to resend verification email.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(255,140,0,0.12),transparent_40%),radial-gradient(circle_at_90%_10%,rgba(255,140,0,0.08),transparent_40%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="text-sm text-zinc-400">
              Sign in with your credentials to access the Top100 Africa Future Leaders workspace.
            </p>
          </div>
          <Card className="border-zinc-800/80 bg-zinc-950/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-white">Sign in</CardTitle>
              <CardDescription className="text-zinc-400">
                Enter your email and password to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}
                {info && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                    {info}
                  </div>
                )}
                {showVerificationNotice && (
                  <div className="space-y-3 rounded-md border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-100">
                    <p>
                      Your email address is not verified yet. Use the link we already sent or request a fresh
                      verification email below.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-orange-400/60 text-orange-100 hover:bg-orange-500/20"
                      onClick={handleResendVerification}
                      disabled={resendLoading}
                    >
                      {resendLoading ? 'Resending...' : 'Resend verification email'}
                    </Button>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
                      Password
                    </Label>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Your password"
                    className="w-full border-zinc-800 bg-zinc-900/70 text-white placeholder:text-zinc-500"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-600 text-white hover:bg-orange-500"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="text-center text-xs text-zinc-500">
                  Don&apos;t have an account yet?{' '}
                  <Link href="/auth/signup" className="text-orange-300 hover:text-orange-200">
                    Create one
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
