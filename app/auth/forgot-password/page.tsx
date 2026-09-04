'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { getRecoveryRedirectUrl, type RecoveryArea } from '@/lib/auth/password-recovery'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const area: RecoveryArea = searchParams.get('area') === 'admin' ? 'admin' : 'member'
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getRecoveryRedirectUrl(window.location.origin, area),
      })

      // Keep this response generic so the form does not reveal whether an
      // account exists for a submitted email address.
      if (resetError) {
        setError('We could not send the reset email. Please try again shortly.')
      } else {
        setMessage('If an account matches that email, you will receive a password reset link shortly.')
        setEmail('')
      }
    } catch {
      setError('We could not send the reset email. Please try again shortly.')
    } finally {
      setIsLoading(false)
    }
  }

  const loginHref = area === 'admin' ? '/admin/login' : '/login'

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fcf9f4] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top100 Africa Future Leaders"
            width={220}
            height={73}
            priority
            className="h-16 w-auto object-contain"
          />
        </div>

        <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-950">Reset your password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-600">
          Enter the email linked to your {area === 'admin' ? 'operations' : 'Top100'} account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="recovery-email" className="text-slate-700">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-orange-400 focus-visible:ring-orange-200"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl bg-orange-700 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
            {isLoading ? 'Sending reset link…' : 'Email me a reset link'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href={loginHref} className="font-semibold text-orange-700 underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </main>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-[#fcf9f4] text-sm text-slate-600">Loading…</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
