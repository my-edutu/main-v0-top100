'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

export function SignOutControl() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      let demoSignedOut = false
      try {
        const response = await fetch('/api/dev/dashboard-session', { method: 'DELETE' })
        if (response.ok) {
          const payload = await response.json().catch(() => null)
          demoSignedOut = payload?.demo === true
        }
      } catch {
        // The development-only endpoint is absent in production.
      }
      if (!demoSignedOut) await supabase.auth.signOut()
    } catch (error) {
      console.error('Failed to sign out:', error)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full justify-start gap-2 rounded-[16px] border-[#E7DDCF] bg-white text-[#252B35] hover:border-orange-300 hover:bg-[#FFE7D5] hover:text-[#6C2600]"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      {isLoading ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
