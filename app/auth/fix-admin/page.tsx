'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

const ALLOWED_ADMIN_EMAILS = ['nwosupaul3@gmail.com']

export default function FixAdminPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleFix = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/profiles/fix-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update profile')
        setMessage(data.message || '')
        return
      }

      setSuccess(true)
      setMessage(data.message)

      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin?message=admin-updated')
      }, 2000)

    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-green-700">Admin Access Fixed!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to sign in...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Fix Admin Access
          </CardTitle>
          <CardDescription>
            Update your existing profile to have admin role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Use this page if you got:</strong><br />
              "duplicate key value violates unique constraint" error
            </p>
          </div>

          <form onSubmit={handleFix} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                <p className="font-semibold">{error}</p>
                {message && <p className="mt-1 text-xs">{message}</p>}
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
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Allowed emails: {ALLOWED_ADMIN_EMAILS.join(', ')}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Fix Admin Access'}
            </Button>

            <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
              <p className="font-semibold">What this does:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Finds your existing profile in the database</li>
                <li>Updates the role to 'admin'</li>
                <li>Redirects you to sign in</li>
              </ol>
            </div>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <a href="/auth/signup" className="text-orange-600 hover:underline font-medium">
                Sign up first
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
