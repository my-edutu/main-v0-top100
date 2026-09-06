'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Menu } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'

export function SignOutControl({ menu = false }: { menu?: boolean }) {
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

  if (menu) return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Open account menu" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-neutral-900 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 bg-white text-neutral-900">
        <DropdownMenuItem disabled={isLoading} onSelect={() => void handleSignOut()} className="min-h-11 gap-2">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {isLoading ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

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
