'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function SignInContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('from') || '/'
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Check if the error is because user doesn't exist or wrong password
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else {
          setError(signInError.message)
        }
        return
      }

      // Check if user is an awardee with appropriate access
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          // If profile doesn't exist, this could be an issue with the profile creation or access
          setError('Top100 Awardee profile not found. Contact administrative team.')
          // Sign out the user
          await supabase.auth.signOut()
          return
        }
        
        // Allow users with either 'user' or 'admin' roles to access the dashboard
        // This allows both awardees and administrators to access their profiles
        if (profile.role !== 'admin' && profile.role !== 'user') {
          setError('Access denied. This account does not have Top100 Awardee privileges.')
          // Sign out unauthorized user
          await supabase.auth.signOut()
          return
        }
      } else {
        // No user returned from auth.getUser()
        setError('Authentication error. Please try again.')
        return
      }
      
      // Redirect to the intended destination or dashboard
      router.push(redirectTo.startsWith('/admin') ? redirectTo : '/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again later.')
      console.error(err)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
      <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
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
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90">
                  Sign In
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