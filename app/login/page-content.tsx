'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Shield, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { TurnstileCaptcha, verifyCaptcha } from '@/components/ui/turnstile'
import { Role, isAdminRole } from '@/lib/types/roles'
import { normalizeRole } from '@/lib/auth-utils'

export default function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaError, setCaptchaError] = useState(false)
  const [securityMessage, setSecurityMessage] = useState<{
    type: 'warning' | 'info'
    message: string
    icon: React.ReactNode
  } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  // No default here — when no explicit destination is requested, the redirect
  // is decided by role after sign-in (admin -> /admin, member -> /dashboard).
  const requestedPath = searchParams.get('from') || searchParams.get('redirect') || ''
  // Only allow same-site relative paths (prevents open redirects)
  const redirectTo = requestedPath.startsWith('/') && !requestedPath.startsWith('//') ? requestedPath : ''
  const reason = searchParams.get('reason')

  // Display security messages based on redirect reason
  useEffect(() => {
    if (reason === 'inactivity') {
      setSecurityMessage({
        type: 'warning',
        message: 'You have been logged out due to inactivity. Please sign in again to continue.',
        icon: <Clock className="h-5 w-5" />
      })
    } else if (reason === 'expired') {
      setSecurityMessage({
        type: 'warning',
        message: 'Your session has expired. Please sign in again for security.',
        icon: <Shield className="h-5 w-5" />
      })
    } else if (reason === 'security') {
      setSecurityMessage({
        type: 'warning',
        message: 'For your security, please sign in again to access this page.',
        icon: <AlertTriangle className="h-5 w-5" />
      })
    }
  }, [reason])

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Verify CAPTCHA first (if configured)
      if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && captchaToken) {
        const captchaValid = await verifyCaptcha(captchaToken)
        if (!captchaValid) {
          setError('CAPTCHA verification failed. Please try again.')
          setCaptchaError(true)
          setIsLoading(false)
          return
        }
      }

      console.log('Starting sign-in process for:', email)

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('Sign-in error:', signInError)
        // Check if the error is because user doesn't exist or wrong password
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else {
          setError(signInError.message)
        }
        setIsLoading(false)
        return
      }

      console.log('Sign-in successful, checking profile...')

      // Check if user is an awardee with appropriate access
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('User authenticated, ID:', user.id)

        // Use API endpoint to check profile (bypasses RLS issues)
        const response = await fetch('/api/auth/check-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Profile check failed:', response.status, errorData)

          if (response.status === 404) {
            setError('Top100 Awardee profile not found. Contact administrative team.')
          } else if (response.status === 403) {
            setError('Access denied. This account does not have Top100 Awardee privileges.')
          } else {
            setError('Authentication error. Please try again.')
          }
          // Sign out the user
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }

        const { profile } = await response.json()
        console.log('Profile loaded:', profile)

        const role = normalizeRole(profile.role)
        if (!role || role === Role.GUEST) {
          console.error('Invalid role:', profile.role)
          setError('Access denied. This account does not have Top100 Awardee privileges.')
          // Sign out unauthorized user
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }

        // Redirect based on user role
        let redirectPath = redirectTo

        console.log('📍 Redirect decision - Role:', role, 'From:', redirectTo)

        if (!redirectTo || redirectTo === '/') {
          // Default redirect based on role
          redirectPath = isAdminRole(role) ? '/admin' : '/dashboard'
          console.log('📍 No redirect specified, using default for role:', redirectPath)
        } else if (redirectTo.startsWith('/admin') && !isAdminRole(role)) {
          // Non-admin trying to access admin area
          redirectPath = '/dashboard'
          console.log('📍 Non-admin trying admin area, redirecting to dashboard')
        }

        console.log('✅ Final redirect path:', redirectPath)
        if (typeof document !== 'undefined') {
          console.log('🍪 Current cookies:', document.cookie)
        }

        // Verify session is actually stored
        const { data: verifySession } = await supabase.auth.getSession()
        console.log('✅ Session verification:', verifySession.session ? 'EXISTS' : 'MISSING')

        if (!verifySession.session) {
          console.error('❌ SESSION MISSING BEFORE REDIRECT!')
          setError('Session storage failed. Please clear cookies and try again.')
          setIsLoading(false)
          return
        }

        // For admin users, wait longer to ensure cookies are fully set
        const waitTime = isAdminRole(role) ? 1500 : 1000
        console.log(`⏳ Waiting ${waitTime}ms for session cookies to be set...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))

        console.log('🚀 Performing hard redirect to:', redirectPath)

        // Force a full page reload to ensure middleware can read the session
        window.location.href = redirectPath
      } else {
        // No user returned from auth.getUser()
        console.error('No user returned from auth.getUser()')
        setError('Authentication error. Please try again.')
        setIsLoading(false)
        return
      }
    } catch (err) {
      console.error('Unexpected error during sign-in:', err)
      setError('An unexpected error occurred. Please try again later.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only. The site enforces a light theme globally
          (see html.light rules in globals.css), so this stays a warm light
          surface rather than a dark slab that the cascade would flatten. */}
      <aside className="relative hidden overflow-hidden border-r border-zinc-100 p-14 lg:flex lg:flex-col lg:justify-between">
        {/* Single warm light source, upper left */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(110% 80% at 4% 2%, rgba(249,115,22,0.20) 0%, rgba(251,146,60,0.08) 40%, rgba(255,255,255,0) 72%), linear-gradient(180deg, #fffaf5 0%, #fdfdfd 100%)',
          }}
        />
        {/* Grain, to keep the surface from reading as flat vector */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E\")",
          }}
        />

        <Link href="/" className="relative w-fit transition-opacity hover:opacity-70">
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top100 Africa Future Leaders — back to home"
            width={160}
            height={160}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>

        <p className="relative max-w-[15ch] text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-zinc-950 xl:text-6xl">
          The network behind Africa&apos;s next generation of leaders.
        </p>

        <dl className="relative grid grid-cols-3 gap-6 border-t border-zinc-200/80 pt-8 tabular-nums">
          <div>
            <dt className="text-xs font-medium text-zinc-500">Awardees</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">400+</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Countries</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">31</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-zinc-500">Lives impacted</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">97,000</dd>
          </div>
        </dl>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-dvh flex-col px-6 py-8 sm:px-10 lg:min-h-0 lg:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <Image
              src="/Top100 Africa Future leaders Logo .png"
              alt="Top100 Africa Future Leaders — back to home"
              width={140}
              height={140}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <Link
            href="/"
            className="ml-auto rounded-lg text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2"
          >
            Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Sign in</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Use the email linked to your Top100 profile.
            </p>
          </div>

          <form onSubmit={handleSignIn} className="mt-8 space-y-5">
            {securityMessage && (
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-in slide-in-from-top-2',
                  securityMessage.type === 'warning'
                    ? 'border-amber-200/70 bg-amber-50 text-amber-800'
                    : 'border-orange-200/70 bg-orange-50 text-orange-800'
                )}
              >
                <span className="mt-0.5 flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4">{securityMessage.icon}</span>
                <span className="leading-snug">{securityMessage.message}</span>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm leading-snug text-rose-700"
              >
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 rounded-xl border-zinc-200 bg-white px-3.5 text-sm transition-colors placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
                    Password
                  </Label>
                  {/* Password reset is not built yet (no /auth/forgot-password route),
                      so this reads as disabled rather than linking to a 404.
                      Colour is explicit: globals.css darkens text-zinc-300 under html.light. */}
                  <span className="cursor-not-allowed text-xs font-medium text-[#a1a1aa]" title="Coming soon">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 rounded-xl border-zinc-200 bg-white px-3.5 pr-11 text-sm transition-colors placeholder:text-zinc-400 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg p-0 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="empty:hidden">
              <TurnstileCaptcha
                onVerify={(token) => {
                  setCaptchaToken(token)
                  setCaptchaError(false)
                }}
                onError={() => setCaptchaError(true)}
                onExpire={() => setCaptchaToken('')}
              />
              {captchaError && (
                <p className="mt-2 text-center text-xs text-rose-600">CAPTCHA verification required</p>
              )}
            </div>

            {/* globals.css forces `text-white` to dark slate under html.light,
                so the label colour is set explicitly here. orange-700 keeps the
                brand accent while clearing WCAG AA against white text. */}
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-orange-700 text-sm font-semibold text-[#fff] shadow-sm shadow-orange-700/20 transition-all hover:bg-orange-800 active:scale-[0.99] disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="mt-8 text-sm text-zinc-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-medium text-orange-600 underline-offset-4 transition-colors hover:text-orange-700 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
