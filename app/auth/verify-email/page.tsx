'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const email = useMemo(() => params?.get('email') ?? '', [params])

  const handleResendVerification = async () => {
    if (!email) {
      setError('Provide the email address you used during sign up to request a new link.')
      return
    }

    setSending(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/better-auth/send-verification-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          callbackURL: '/dashboard',
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const fallback =
          typeof payload?.message === 'string'
            ? payload.message
            : 'Unable to resend the verification email right now.'
        throw new Error(fallback)
      }

      setMessage('Verification email sent. Check your inbox and follow the link to continue.')
    } catch (err) {
      console.error('[verify-email] resend failed', err)
      setError(err instanceof Error ? err.message : 'Failed to resend the verification email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,140,0,0.12),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(252,211,77,0.1),transparent_45%)]" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          <Card className="border-white/10 bg-zinc-950/70 backdrop-blur">
            <CardHeader className="space-y-3 text-center">
              <CardTitle className="text-2xl font-semibold text-white">Verify your email</CardTitle>
              <CardDescription className="text-sm text-zinc-400">
                We sent a verification link to your inbox. Open the email to activate your account and sign in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-zinc-300">
              {email ? (
                <p className="rounded-md border border-white/15 bg-white/5 p-3 text-center text-sm text-white/80">
                  Verification email sent to <span className="font-medium text-white">{email}</span>.
                </p>
              ) : (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-200">
                  We could not detect an email address. Return to sign up and try again if needed.
                </p>
              )}

              <ul className="space-y-2 text-left text-sm text-zinc-400">
                <li>- Check your spam or promotions folder.</li>
                <li>- Add no-reply@top100afl.com to your contacts to avoid missing future updates.</li>
                <li>- The link expires after a short while. Request another email if needed.</li>
              </ul>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                  {message}
                </div>
              )}

              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full bg-orange-600 text-white hover:bg-orange-500"
                  onClick={handleResendVerification}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Resend verification email'}
                </Button>
                <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  <Link href={email ? `/auth/signin?prefill=${encodeURIComponent(email)}` : '/auth/signin'}>
                    Back to sign in
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
