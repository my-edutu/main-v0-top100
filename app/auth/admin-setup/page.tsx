'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'

// TEMPORARY ADMIN SETUP PAGE - REMOVE AFTER USE
const ALLOWED_ADMIN_EMAILS = ['nwosupaul3@gmail.com']

export default function AdminSetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate email is in allowed list
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
      setError('This email is not authorized for admin setup')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    try {
      // Sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (signUpError) {
        // If user already exists, try to sign in instead
        if (signUpError.message.includes('already registered')) {
          setError('Account exists. Please use the regular sign-in page or reset your password.')
          return
        }
        setError(signUpError.message)
        return
      }

      if (data.user) {
        // Now update the profile to admin role
        const response = await fetch('/api/profiles/set-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: data.user.id, email })
        })

        if (!response.ok) {
          const errorData = await response.json()
          setError(`Profile setup failed: ${errorData.error}`)
          return
        }

        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      }

    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">Admin Account Created!</h2>
            <p className="text-muted-foreground">Redirecting to sign in...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            Create your admin account (Temporary setup page)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/30">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nwosupaul3@gmail.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Create Admin Account
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/auth/signin" className="text-primary hover:underline">
                Sign in
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
