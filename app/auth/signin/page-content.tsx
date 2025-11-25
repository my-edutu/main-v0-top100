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
import { Eye, EyeOff, Shield, Clock, AlertTriangle } from 'lucide-react';

export default function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
        console.log('🍪 Current cookies:', document.cookie)

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10 pointer-events-none"></div>
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Top100 Awardee Portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to access your profile and dashboard</p>
          </div>
          
          <Card className="border-0 bg-background/80 backdrop-blur-sm shadow-xl">
            <CardContent className="p-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                {securityMessage && (
                  <div className={`rounded-lg px-4 py-3 text-sm border flex items-start gap-3 ${
                    securityMessage.type === 'warning'
                      ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800'
                  }`}>
                    <span className="flex-shrink-0 mt-0.5">{securityMessage.icon}</span>
                    <span>{securityMessage.message}</span>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="yourname@top100afl.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 text-lg tracking-widest"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={togglePasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Access exclusive to Top100 Africa Future Leaders awardees</p>
          </div>
        </div>
      </div>
    </div>
  )
}