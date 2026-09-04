'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { getPostRecoveryPath, type RecoveryArea } from '@/lib/auth/password-recovery'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const area: RecoveryArea = searchParams.get('area') === 'admin' ? 'admin' : 'member'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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

    setIsLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError('This reset link is invalid or has expired. Request a new one and try again.')
        return
      }

      await supabase.auth.signOut()
      router.replace(getPostRecoveryPath(area))
    } catch {
      setError('This reset link is invalid or has expired. Request a new one and try again.')
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
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-slate-700">New password</Label>
            <Input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-slate-700">Confirm password</Label>
            <Input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-11 rounded-xl border-slate-200 bg-white text-slate-900" />
          </div>
          <Button type="submit" disabled={isLoading} className="h-11 w-full rounded-xl bg-orange-700 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-60">
            {isLoading ? 'Updating password…' : 'Update password'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href={loginHref} className="font-semibold text-orange-700 underline-offset-4 hover:underline">Back to sign in</Link>
        </p>
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
