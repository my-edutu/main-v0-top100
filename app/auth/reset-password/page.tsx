'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPasswordRecoveryClient } from '@/lib/supabase/password-recovery-client'
import { getPostRecoveryPath, type RecoveryArea } from '@/lib/auth/password-recovery'

const INVALID_RECOVERY_MESSAGE = 'This reset link is invalid or has expired. Request a new one and try again.'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const area: RecoveryArea = searchParams.get('area') === 'admin' ? 'admin' : 'member'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingLink, setIsCheckingLink] = useState(true)
  const [isRecoveryReady, setIsRecoveryReady] = useState(false)
  const recoveryClientRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    let cancelled = false
    const recoveryClient = createPasswordRecoveryClient()
    recoveryClientRef.current = recoveryClient

    async function establishRecoverySession() {
      const { data, error: sessionError } = await recoveryClient.auth.getSession()
      if (cancelled) return

      if (sessionError || !data.session) {
        setError(INVALID_RECOVERY_MESSAGE)
      } else {
        setIsRecoveryReady(true)
      }
      setIsCheckingLink(false)
    }

    void establishRecoverySession()
    return () => {
      cancelled = true
      recoveryClientRef.current = null
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const recoveryClient = recoveryClientRef.current
    if (!isRecoveryReady || !recoveryClient) {
      setError(INVALID_RECOVERY_MESSAGE)
      return
    }

    setIsLoading(true)
    try {
      const { error: updateError } = await recoveryClient.auth.updateUser({ password })
      if (updateError) {
        setError(INVALID_RECOVERY_MESSAGE)
        return
      }

      await recoveryClient.auth.signOut({ scope: 'local' })
      router.replace(getPostRecoveryPath(area))
    } catch {
      setError(INVALID_RECOVERY_MESSAGE)
    } finally {
      setIsLoading(false)
    }
  }

  const loginHref = area === 'admin' ? '/admin/login' : '/login'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fcf9f4] px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">Choose a new password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">Use at least 8 characters, then sign in again.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {isCheckingLink && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Verifying your reset link…</div>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-700">New password</Label>
            <div className="relative">
              <Input id="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" disabled={!isRecoveryReady || isLoading} value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white pr-11 text-slate-900" />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={!isRecoveryReady || isLoading}
                aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-slate-700">Confirm password</Label>
            <div className="relative">
              <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" disabled={!isRecoveryReady || isLoading} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white pr-11 text-slate-900" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                disabled={!isRecoveryReady || isLoading}
                aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                aria-pressed={showConfirmPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={!isRecoveryReady || isLoading} className="h-11 w-full rounded-xl bg-orange-700 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
            {isLoading ? 'Updating password…' : 'Update password'}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
          {!isRecoveryReady && !isCheckingLink && (
            <Link href={`/auth/forgot-password?area=${area}`} className="font-semibold text-orange-700 underline-offset-4 hover:underline">Request a new link</Link>
          )}
          <Link href={loginHref} className="font-semibold text-orange-700 underline-offset-4 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-[#fcf9f4] text-sm text-slate-600">Loading…</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
