'use client'

import { useState, useEffect } from 'react'
import { useInactivityTimeout } from '@/app/hooks/useInactivityTimeout'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface SessionSecurityGuardProps {
  /**
   * Inactivity timeout in minutes
   * Default: 30 minutes
   */
  timeoutMinutes?: number

  /**
   * Warning time in minutes before logout
   * Default: 2 minutes
   */
  warningMinutes?: number

  /**
   * Whether to enable the security guard
   * Set to false to disable (e.g., for public pages)
   */
  enabled?: boolean
}

/**
 * Session Security Guard Component
 *
 * Implements comprehensive session security:
 * - Automatic logout after inactivity
 * - Warning dialog before logout
 * - Cross-tab activity synchronization
 * - Session expiration on device sleep/close
 *
 * Usage:
 * ```tsx
 * <SessionSecurityGuard timeoutMinutes={30} warningMinutes={2} />
 * ```
 */
export default function SessionSecurityGuard({
  timeoutMinutes = 30,
  warningMinutes = 2,
  enabled = true,
}: SessionSecurityGuardProps) {
  const [showWarning, setShowWarning] = useState(false)
  const [showLogoutNotification, setShowLogoutNotification] = useState(false)
  const [logoutReason, setLogoutReason] = useState<string>('security')
  const [countdown, setCountdown] = useState(warningMinutes * 60)

  const { logout, resetTimer } = useInactivityTimeout({
    timeout: timeoutMinutes * 60 * 1000,
    warningTime: warningMinutes * 60 * 1000,
    onWarning: () => {
      setShowWarning(true)
      setCountdown(warningMinutes * 60)
      toast.warning('Session about to expire', {
        description: `You will be logged out in ${warningMinutes} minutes due to inactivity`,
      })
    },
    onLogout: () => {
      toast.info('Logged out', {
        description: 'You have been logged out due to inactivity',
      })
    },
    enabled,
  })

  // Listen for logout events from other tabs
  useEffect(() => {
    if (!enabled) return

    // Method 1: BroadcastChannel API (modern browsers)
    let broadcastChannel: BroadcastChannel | null = null

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannel = new BroadcastChannel('auth-events')

      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'logout') {
          console.log('[Security] Logout detected from another tab via BroadcastChannel')
          setLogoutReason(event.data.reason || 'security')
          setShowLogoutNotification(true)
        }
      }
    }

    // Method 2: localStorage event (fallback for older browsers)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'logout-event' && e.newValue) {
        try {
          const logoutData = JSON.parse(e.newValue)
          console.log('[Security] Logout detected from another tab via localStorage')
          setLogoutReason(logoutData.reason || 'security')
          setShowLogoutNotification(true)

          // Clean up the event after detection
          setTimeout(() => {
            localStorage.removeItem('logout-event')
          }, 1000)
        } catch (error) {
          console.error('[Security] Error parsing logout event:', error)
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageEvent)
    }

    return () => {
      broadcastChannel?.close()
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageEvent)
      }
    }
  }, [enabled])

  // Countdown timer for warning dialog
  useEffect(() => {
    if (!showWarning || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showWarning, countdown])

  const handleStayLoggedIn = () => {
    setShowWarning(false)
    resetTimer()
    toast.success('Session extended', {
      description: 'Your session has been extended',
    })
  }

  const handleLogoutNow = () => {
    setShowWarning(false)
    logout()
  }

  const handleAcknowledgeLogout = () => {
    setShowLogoutNotification(false)
    // Redirect to sign-in page
    window.location.href = `/auth/signin?reason=${logoutReason}`
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLogoutMessage = (reason: string): string => {
    switch (reason) {
      case 'inactivity':
        return 'You have been logged out due to inactivity in another tab.'
      case 'expired':
        return 'Your session has expired in another tab.'
      case 'manual':
        return 'You have signed out in another tab.'
      default:
        return 'You have been signed out.'
    }
  }

  if (!enabled) return null

  return (
    <>
      {/* Inactivity Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              Session About to Expire
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You have been inactive for a while. For security reasons, you will be automatically
                logged out in:
              </p>
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-primary">{formatTime(countdown)}</div>
              </div>
              <p className="text-sm text-muted-foreground">
                Click "Stay Logged In" to continue your session, or you will be redirected to the
                sign-in page.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleLogoutNow}>Log Out Now</AlertDialogCancel>
            <AlertDialogAction onClick={handleStayLoggedIn}>Stay Logged In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Notification Dialog (from other tab) */}
      <AlertDialog open={showLogoutNotification} onOpenChange={setShowLogoutNotification}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              You Are Signed Out
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="text-base font-medium">{getLogoutMessage(logoutReason)}</p>
              <p className="text-sm text-muted-foreground">
                For security reasons, you have been signed out from all tabs. Please sign in again to continue.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAcknowledgeLogout} className="w-full">
              Go to Sign In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
