'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthStatusPage() {
  const [status, setStatus] = useState<any>(null)
  const [cookies, setCookies] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    checkAuthStatus()
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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Auth & Cookie Diagnostics</h1>

        <Card>
          <CardHeader><CardTitle>Browser Cookies</CardTitle></CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-100 rounded font-mono text-sm break-all">
              {cookies || 'NO COOKIES'}
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">
                Looking for cookies starting with: <code>sb-</code>
              </p>
              <p className="text-sm mt-2">
                {cookies.includes('sb-') ? (
                  <span className="text-green-600">✅ Supabase cookies found!</span>
                ) : (
                  <span className="text-red-600">❌ No Supabase cookies found!</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Session Status</CardTitle></CardHeader>
          <CardContent>
            {error && <div className="p-4 mb-4 bg-red-100 text-red-700 rounded">{error}</div>}
            <pre className="p-4 bg-gray-100 rounded overflow-auto text-sm">
              {JSON.stringify(status, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Browser Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Cookie Enabled:</strong> {navigator.cookieEnabled ? '✅ Yes' : '❌ No'}</div>
            <div><strong>Protocol:</strong> {window.location.protocol}</div>
            <div><strong>Host:</strong> {window.location.host}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Troubleshooting</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Check if browser is blocking cookies (icon in address bar)</li>
              <li>Try in Incognito/Private mode</li>
              <li>Check browser: Settings → Privacy → Cookies</li>
              <li>Try http://127.0.0.1:3000 instead of localhost</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
