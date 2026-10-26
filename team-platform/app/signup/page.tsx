import Link from 'next/link'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { BrandMark } from '@/components/brand'
import { SignupForm } from '@/components/signup-form'

export const metadata = { title: 'Create rep account' }

export default function SignupPage() {
  const missingEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <section className="hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <BrandMark />
        <div className="max-w-lg">
          <p className="label text-cream/55">Sales representative access</p>
          <h1 className="display mt-3 text-5xl leading-tight">Join the follow-up team.</h1>
          <p className="mt-5 text-sm leading-6 text-cream/65">A one-time administrator code starts your account. A Top100 administrator approves workspace access after you confirm your email.</p>
        </div>
        <p className="text-xs text-cream/45">Authorized team members only</p>
      </section>
      <section className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><BrandMark /></div>
          <Link href="/login" className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" />Back to sign in</Link>
          <p className="label mb-3 mt-8">New rep account</p>
          <h2 className="display text-4xl leading-tight">Create your account.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Enter the details and access code provided by your administrator.</p>
          {missingEnv ? <div role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Account registration is unavailable because Supabase is not configured.</div> : null}
          <SignupForm />
          <p className="mt-7 flex items-center justify-center gap-2 text-[11px] text-muted"><LockKeyhole className="h-3.5 w-3.5" />Codes are single-use and expire after seven days.</p>
        </div>
      </section>
    </main>
  )
}
