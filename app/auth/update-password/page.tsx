'use client'

import { FormEvent, Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  recoverySignInPath,
  updateRecoveredPassword,
  validateAdminPassword,
  type RecoverySource,
} from '@/lib/auth-recovery'
import { supabase } from '@/lib/supabase/client'

type RecoveryStatus = 'checking' | 'ready' | 'invalid'

function UpdatePasswordContent() {
  const searchParams = useSearchParams()
  const source: RecoverySource = searchParams.get('source') === 'admin' ? 'admin' : 'member'
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<RecoveryStatus>('checking')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let active = true

    const verifyRecoverySession = async () => {
      const { data, error: userError } = await supabase.auth.getUser()
      if (!active) return
      setStatus(!userError && data.user ? 'ready' : 'invalid')
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === 'PASSWORD_RECOVERY') setStatus('ready')
    })

    void verifyRecoverySession()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const validationError = validateAdminPassword(password, confirmation)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const updateError = await updateRecoveredPassword(supabase.auth, password)
      if (updateError) {
        setError('Your password could not be updated. Request a fresh reset link and try again.')
        return
      }

      window.location.href = recoverySignInPath(source, true)
    } catch {
      setError('Your password could not be updated. Request a fresh reset link and try again.')
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
          <ShieldCheck className="h-9 w-9 text-orange-600" />
        </div>

        {status === 'checking' && (
          <div className="py-8 text-center" aria-live="polite">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-500" />
            <p className="mt-4 text-sm text-slate-600">Verifying your reset link…</p>
          </div>
        )}

        {status === 'invalid' && (
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              Reset link unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This link is invalid, expired, or was opened in a different browser. Request a fresh
              link and open it in the same browser.
            </p>
            <Link
              href={`/auth/forgot-password${source === 'admin' ? '?source=admin' : ''}`}
              className="mt-6 inline-flex text-sm font-semibold text-orange-700 underline-offset-4 hover:underline"
            >
              Request another reset link
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <>
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
              Choose a new password
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-slate-600">
              Use at least 12 characters. You will sign in again after the password changes.
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
                <Label htmlFor="new-password" className="text-slate-700">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 focus-visible:border-orange-400 focus-visible:ring-orange-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-700">
                  Confirm new password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 focus-visible:border-orange-400 focus-visible:ring-orange-200"
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
                    Updating password…
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-[#fcf9f4]">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500" aria-label="Loading recovery" />
        </main>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  )
}
