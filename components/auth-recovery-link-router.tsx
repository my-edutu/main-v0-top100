'use client'

import { useEffect } from 'react'

function recoveryAreaFromHash(hash: string): 'admin' | 'member' {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const accessToken = params.get('access_token')
  if (!accessToken) return 'member'

  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return 'member'
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(window.atob(normalized)) as {
      user_metadata?: { role?: string }
    }
    return claims.user_metadata?.role === 'admin' || claims.user_metadata?.role === 'superadmin'
      ? 'admin'
      : 'member'
  } catch {
    return 'member'
  }
}

/** Route Supabase recovery links that fall back to the site root into the reset form. */
export function AuthRecoveryLinkRouter() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    if (params.get('type') !== 'recovery' || !params.has('access_token')) return

    const area = recoveryAreaFromHash(hash)
    window.location.replace(`/auth/reset-password?area=${area}${hash}`)
  }, [])

  return null
}
