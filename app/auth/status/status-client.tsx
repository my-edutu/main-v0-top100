'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthStatusClient() {
  const [status, setStatus] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    void checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const allCookies = document.cookie
      setCookies(allCookies || 'NO COOKIES FOUND')

      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) setError(error.message)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) setError(userError.message)

      setStatus({
        session: session ? {
          user: { id: session.user.id, email: session.user.email },
          expires: session.expires_at,
        } : null,
        user: user ? { id: user.id, email: user.email } : null,
        hasSession: !!session,
        hasUser: !!user,
      })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Auth &amp; Cookie Diagnostics</h1>
        <Card>
          <CardHeader><CardTitle>Browser Cookies</CardTitle></CardHeader>
          <CardContent>
            <div className="break-all rounded bg-gray-100 p-4 font-mono text-sm">{cookies || 'NO COOKIES'}</div>
            <p className="mt-4 text-sm text-gray-600">Looking for cookies starting with: <code>sb-</code></p>
            <p className="mt-2 text-sm">
              {cookies.includes('sb-') ? <span className="text-green-600">✅ Supabase cookies found!</span> : <span className="text-red-600">❌ No Supabase cookies found!</span>}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Session Status</CardTitle></CardHeader>
          <CardContent>
            {error && <div className="mb-4 rounded bg-red-100 p-4 text-red-700">{error}</div>}
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-sm">{JSON.stringify(status, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
