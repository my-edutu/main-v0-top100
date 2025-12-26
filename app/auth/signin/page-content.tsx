'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Shield, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { TurnstileCaptcha, verifyCaptcha } from '@/components/ui/turnstile'

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
  const redirectTo = searchParams.get('from') || searchParams.get('redirect') || '/'
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

        // This check is now redundant since API already validates role, but keeping for clarity
        if (profile.role !== 'admin' && profile.role !== 'user') {
          console.error('Invalid role:', profile.role)
          setError('Access denied. This account does not have Top100 Awardee privileges.')
          // Sign out unauthorized user
          await supabase.auth.signOut()
          setIsLoading(false)
          return
        }

        // Redirect based on user role
        let redirectPath = redirectTo

        console.log('📍 Redirect decision - Role:', profile.role, 'From:', redirectTo)

        if (!redirectTo || redirectTo === '/') {
          // Default redirect based on role
          redirectPath = profile.role === 'admin' ? '/admin' : '/dashboard'
          console.log('📍 No redirect specified, using default for role:', redirectPath)
        } else if (redirectTo.startsWith('/admin') && profile.role !== 'admin') {
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
        const waitTime = profile.role === 'admin' ? 1500 : 1000
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
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#fdfdfd] overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-50 rounded-full blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[120px] opacity-60 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in duration-500">
        {/* Logo Section */}
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-4 bg-orange-100/50 rounded-full blur-2xl group-hover:bg-orange-200/50 transition-all duration-700" />
            <Image
              src="/Top100 Africa Future leaders Logo .png"
              alt="Logo"
              width={160}
              height={160}
              className="relative object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-500"
              priority
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">Awardee Portal</h1>
            <p className="text-zinc-400 text-xs font-medium tracking-wide">Enter your credentials to access the workspace</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-zinc-100 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_-12px_rgba(249,115,22,0.1)]">
          <form onSubmit={handleSignIn} className="space-y-6">
            {securityMessage && (
              <div className={cn(
                "rounded-2xl px-4 py-3 text-[11px] font-bold uppercase tracking-wider border flex items-center gap-3 animate-in slide-in-from-top-2",
                securityMessage.type === 'warning'
                  ? 'bg-amber-50/50 text-amber-700 border-amber-100'
                  : 'bg-orange-50/50 text-orange-700 border-orange-100'
              )}>
                <span className="flex-shrink-0">{securityMessage.icon}</span>
                <span>{securityMessage.message}</span>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-rose-50/50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-rose-600 border border-rose-100 animate-in shake-200 duration-500">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5 px-1">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Business Email</Label>
                <div className="relative group">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@top100afl.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-white/50 border-zinc-100 rounded-2xl px-4 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 px-1">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Security Key</Label>
                  <Link href="/auth/forgot-password" title="Coming soon!" className="text-[10px] font-black uppercase tracking-widest text-orange-500/60 hover:text-orange-500 transition-colors pointer-events-none">Lost Key?</Link>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-white/50 border-zinc-100 rounded-2xl px-4 text-sm tracking-widest focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 transition-all duration-300"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-zinc-50 rounded-lg transition-colors"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-zinc-300" />
                    ) : (
                      <Eye className="h-4 w-4 text-zinc-300" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* CAPTCHA */}
            <div className="pt-2">
              <TurnstileCaptcha
                onVerify={(token) => {
                  setCaptchaToken(token)
                  setCaptchaError(false)
                }}
                onError={() => setCaptchaError(true)}
                onExpire={() => setCaptchaToken('')}
              />
              {captchaError && (
                <p className="text-xs text-rose-500 text-center mt-2">CAPTCHA verification required</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 group overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Access Portal
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
            <span className="h-px w-8 bg-zinc-100" />
            Security Shield Active
            <span className="h-px w-8 bg-zinc-100" />
          </div>
          <p className="text-[10px] text-zinc-400 font-medium max-w-[280px] mx-auto leading-relaxed">
            Authorized access only. All sessions are monitored for security and compliance.
          </p>
        </div>
      </div>
    </div>
  )
}

