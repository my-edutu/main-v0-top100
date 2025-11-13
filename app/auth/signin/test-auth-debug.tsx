'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function TestAuthDebug() {
  const [logs, setLogs] = useState<string[]>([])
  const router = useRouter()

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testAuth = async () => {
    setLogs([])
    addLog('🔍 Starting auth test for nwosupaul3@gmail.com')

    try {
      // Step 1: Check current session
      addLog('Step 1: Checking current session...')
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        addLog(`❌ Session error: ${sessionError.message}`)
      } else if (sessionData.session) {
        addLog('✅ Active session found!')
        addLog(`   User: ${sessionData.session.user.email}`)
        addLog(`   Expires: ${new Date(sessionData.session.expires_at! * 1000).toLocaleString()}`)
      } else {
        addLog('❌ No active session')
      }

      // Step 2: Check cookies
      addLog('\nStep 2: Checking cookies...')
      const cookies = document.cookie.split(';').filter(c => c.includes('supabase'))
      if (cookies.length > 0) {
        addLog(`✅ Found ${cookies.length} Supabase cookies`)
        cookies.forEach(c => addLog(`   ${c.trim().substring(0, 50)}...`))
      } else {
        addLog('❌ No Supabase cookies found')
      }

      // Step 3: Test sign in
      addLog('\nStep 3: Testing sign in...')
      const email = 'nwosupaul3@gmail.com'
      const password = prompt('Enter your password:')

      if (!password) {
        addLog('❌ Password not provided')
        return
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        addLog(`❌ Sign in failed: ${signInError.message}`)
        return
      }

      addLog('✅ Sign in successful!')
      addLog(`   User ID: ${signInData.user?.id}`)
      addLog(`   Email: ${signInData.user?.email}`)

      // Step 4: Verify session after signin
      addLog('\nStep 4: Verifying session after signin...')
      await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms

      const { data: newSessionData } = await supabase.auth.getSession()
      if (newSessionData.session) {
        addLog('✅ Session verified after signin')
      } else {
        addLog('❌ Session not found after signin!')
      }

      // Step 5: Check profile
      addLog('\nStep 5: Checking profile via API...')
      const response = await fetch('/api/auth/check-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: signInData.user?.id })
      })

      if (response.ok) {
        const { profile } = await response.json()
        addLog('✅ Profile check passed')
        addLog(`   Role: ${profile.role}`)

        if (profile.role === 'admin') {
          addLog('\n✅ Admin role confirmed!')
          addLog('🚀 Attempting redirect to /admin...')

          // Try redirect
          router.push('/admin')
          await new Promise(resolve => setTimeout(resolve, 1000))
          addLog('📍 Redirect called, checking location...')
          addLog(`   Current URL: ${window.location.pathname}`)
        }
      } else {
        const error = await response.json()
        addLog(`❌ Profile check failed: ${error.error}`)
      }

    } catch (error: any) {
      addLog(`❌ Unexpected error: ${error.message}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Tool</h1>
      <button
        onClick={testAuth}
        className="bg-blue-500 text-white px-6 py-3 rounded mb-4 hover:bg-blue-600"
      >
        Run Auth Test
      </button>

      <div className="bg-black text-green-400 p-4 rounded font-mono text-sm space-y-1 max-h-96 overflow-auto">
        {logs.length === 0 ? (
          <div>Click "Run Auth Test" to start debugging</div>
        ) : (
          logs.map((log, i) => <div key={i}>{log}</div>)
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click "Run Auth Test"</li>
          <li>Enter your password when prompted</li>
          <li>Watch the logs to see where the issue occurs</li>
          <li>If redirected, check if you end up on /admin or back here</li>
        </ol>
      </div>
    </div>
  )
}
