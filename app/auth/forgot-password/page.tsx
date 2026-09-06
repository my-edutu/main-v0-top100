'use client'

import { FormEvent, Suspense, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, MailCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  recoverySignInPath,
  requestPasswordRecovery,
  type RecoverySource,
} from '@/lib/auth-recovery'
import { supabase } from '@/lib/supabase/client'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const source: RecoverySource = searchParams.get('source') === 'admin' ? 'admin' : 'member'
  const isAdmin = source === 'admin'
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const resetError = await requestPasswordRecovery(
        supabase.auth,
        email,
        window.location.origin,
        source,
      )

      if (resetError) {
        setError(
          resetError.status === 429
            ? 'Too many reset requests. Please wait a minute and try again.'
            : 'We could not send the reset email. Please try again shortly.',
        )
        return
      }

      setIsSent(true)
    } catch {
      setError('We could not send the reset email. Please try again shortly.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fcf9f4] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top100 Africa Future Leaders"
            width={220}
            height={73}
            priority
            className="h-14 w-auto object-contain"
          />
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-orange-700">
            {isAdmin ? 'Administrator recovery' : 'Member recovery'}
          </span>
        </div>

        {isSent ? (
          <div className="text-center" aria-live="polite">
            <MailCheck className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Check your email
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If that address belongs to an account, Supabase has sent a password-reset link. Open
              it in this browser, then choose a new password.
            </p>
            <Link
              href={recoverySignInPath(source)}
              className="mt-6 inline-flex text-sm font-semibold text-orange-700 underline-offset-4 hover:underline"
            >
              Return to {isAdmin ? 'admin' : 'member'} sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
              Reset your password
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">
              Enter the email address used for your {isAdmin ? 'administrator' : 'member'} account.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-slate-700">
                  {isAdmin ? 'Admin email' : 'Member email'}
                </Label>
                <Input
                  id="recovery-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={isAdmin ? 'admin@top100afl.org' : 'you@example.com'}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-orange-400 focus-visible:ring-orange-200"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-orange-500 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link…
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Remembered it?{' '}
              <Link
                href={recoverySignInPath(source)}
                className="font-semibold text-orange-700 underline-offset-4 hover:underline"
              >
                Return to {isAdmin ? 'admin' : 'member'} sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[#fcf9f4]">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" aria-label="Loading recovery" />
        </main>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}
