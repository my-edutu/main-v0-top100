'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

interface UseInactivityTimeoutOptions {
  /**
   * Timeout in milliseconds before user is logged out due to inactivity
   * Default: 30 minutes (1800000ms)
   */
  timeout?: number

  /**
   * Warning time in milliseconds before actual logout
   * Shows a warning dialog this many milliseconds before logout
   * Default: 2 minutes (120000ms)
   */
  warningTime?: number

  /**
   * Events to track for activity
   */
  events?: string[]

  /**
   * Callback when user is about to be logged out (warning phase)
   */
  onWarning?: () => void

  /**
   * Callback when user is logged out
   */
  onLogout?: () => void

  /**
   * Whether to enable this hook (useful for conditional activation)
   * Default: true
   */
  enabled?: boolean
}

/**
 * Security Hook: Automatic logout after inactivity
 *
 * This hook implements industry-standard session timeout practices:
 * - Tracks user activity (mouse, keyboard, touch)
 * - Automatically signs out after configured inactivity period
 * - Optionally warns user before logout
 * - Clears all session data and redirects to sign-in
 *
 * @example
 * ```tsx
 * useInactivityTimeout({
 *   timeout: 30 * 60 * 1000, // 30 minutes
 *   warningTime: 2 * 60 * 1000, // 2 minutes warning
 *   onWarning: () => toast.warning('You will be logged out soon'),
 * })
 * ```
 */
export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes default
    warningTime = 2 * 60 * 1000, // 2 minutes warning default
    events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
    onWarning,
    onLogout,
    enabled = true,
  } = options

  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningTimeoutRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  /**
   * Logout function - clears session and redirects
   * Broadcasts logout event to all tabs
   */
  const logout = useCallback(async (reason: string = 'inactivity') => {
    console.log('[Security] Logging out due to:', reason)

    try {
      // Broadcast logout to other tabs BEFORE actually signing out
      if (typeof window !== 'undefined') {
        // Use both localStorage event and BroadcastChannel for maximum compatibility
        localStorage.setItem('logout-event', JSON.stringify({
          timestamp: Date.now(),
          reason
        }))

        // BroadcastChannel for modern browsers
        if ('BroadcastChannel' in window) {
          const logoutChannel = new BroadcastChannel('auth-events')
          logoutChannel.postMessage({
            type: 'logout',
            reason,
            timestamp: Date.now()
          })
          logoutChannel.close()
        }
      }

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear any local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lastActivity')
        sessionStorage.clear()
      }

      // Call callback if provided
      onLogout?.()

      // Redirect to sign-in page
      router.push(`/auth/signin?reason=${reason}`)
    } catch (error) {
      console.error('[Security] Error during logout:', error)
      // Force redirect anyway for security
      router.push(`/auth/signin?reason=${reason}`)
    }
  }, [router, onLogout])

  /**
   * Reset the inactivity timer
   */
  const resetTimer = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now

    // Store last activity in localStorage for cross-tab sync
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastActivity', now.toString())
    }

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current)
    }

    // Set warning timer if warning is enabled
    if (warningTime > 0 && onWarning) {
      warningTimeoutRef.current = setTimeout(() => {
        console.log('[Security] Inactivity warning triggered')
        onWarning()
      }, timeout - warningTime)
    }

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      console.log('[Security] Inactivity timeout reached')
      logout()
    }, timeout)
  }, [timeout, warningTime, onWarning, logout])

  /**
   * Activity handler
   */
  const handleActivity = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  /**
   * Check for activity in other tabs (cross-tab synchronization)
   */
  const checkCrossTabActivity = useCallback(() => {
    if (typeof window === 'undefined') return

    const lastActivity = localStorage.getItem('lastActivity')
    if (lastActivity) {
      const lastActivityTime = parseInt(lastActivity, 10)
      const timeSinceActivity = Date.now() - lastActivityTime

      // If activity detected in another tab within timeout period, reset timer
      if (timeSinceActivity < timeout) {
        resetTimer()
      }
    }
  }, [timeout, resetTimer])

  useEffect(() => {
    if (!enabled) return

    console.log('[Security] Inactivity timeout enabled:', {
      timeout: `${timeout / 1000 / 60} minutes`,
      warningTime: `${warningTime / 1000 / 60} minutes`,
    })

    // Start the timer
    resetTimer()

    // Add activity event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Check for cross-tab activity every 10 seconds
    const crossTabInterval = setInterval(checkCrossTabActivity, 10000)

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastActivity') {
        checkCrossTabActivity()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(crossTabInterval)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [enabled, events, handleActivity, resetTimer, checkCrossTabActivity])

  return {
    logout,
    resetTimer,
  }
}
