import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/login-form'
import { BrandMark } from '@/components/brand'
import { Banner } from '@/components/ui'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const params = await searchParams
  const next = params.next?.startsWith('/') && !params.next.startsWith('//') ? params.next : '/dashboard'
  const missingEnv = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const linkError = params.error === 'link'

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-ink p-10 text-cream lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -right-40 top-[-10%] h-[34rem] w-[34rem] rounded-full bg-ember/25 blur-[130px]" />
        <div className="absolute -bottom-48 left-[-20%] h-[30rem] w-[30rem] rounded-full bg-moss/20 blur-[120px]" />
        <div className="relative">
          <BrandMark />
        </div>
        <div className="relative max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/60">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            Sales & Award Follow-Up
          </p>
          <h1 className="display text-[3.6rem] leading-[0.98] tracking-[-0.035em] xl:text-[4.5rem]">
            Every follow-up.
            <br />
            Every naira.
            <br />
            <span className="text-ember">Accounted for.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-cream/55">
            The internal workspace for the Top100 Africa Future Leaders team: awardee assignments,
            verified payments, commissions and payouts in one auditable place.
          </p>
          <div className="mt-10 grid max-w-md gap-3 text-[12px] text-cream/65">
            {[
              'Assignments are fair, owned and never duplicated.',
              'Commissions only follow verified award payments.',
              'Withdrawals are ledger-backed and reviewed by an administrator.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-cream/35">
          <ShieldCheck className="h-3.5 w-3.5" />
          Authorized team members only
        </div>
      </section>

      <section className="flex min-h-dvh flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="mx-auto w-full max-w-[400px] animate-rise">
          <div className="mb-10 text-ink lg:hidden">
            <BrandMark />
          </div>
          <p className="label mb-3">Team sign in</p>
          <h2 className="display text-4xl leading-[1.05]">Welcome back.</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Use the work email your administrator invited to the platform.
          </p>

          {missingEnv ? (
            <Banner tone="warning" className="mt-6">
              Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>.
            </Banner>
          ) : null}
          {linkError ? (
            <Banner tone="error" className="mt-6">
              That sign-in link is invalid or has expired. Ask an administrator for a new invitation.
            </Banner>
          ) : null}

          <LoginForm next={next} disabled={missingEnv} />

          <div className="mt-6 flex items-center justify-between text-xs">
            <Link href="/forgot-password" className="font-medium text-ink underline decoration-ember/50 underline-offset-4 hover:text-ember">
              Forgot password?
            </Link>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <LockKeyhole className="h-3 w-3" />
              Secure session
            </span>
          </div>

          <div className="mt-12 rounded-2xl border border-ink/[0.08] bg-cream p-4 text-[11px] leading-5 text-muted">
            <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-ink">
              <Mail className="h-3.5 w-3.5 text-ember" />
              New to the team?
            </div>
            Access is invitation-only. Contact your team administrator to receive a secure invite.
          </div>

          <p className="mt-8 text-[10px] leading-4 text-muted/70">
            Top100 Africa Future Leaders · team.top100afl.com
            <br />
            By signing in you agree to the internal data-handling policy.
          </p>
        </div>
      </section>
    </main>
  )
}
