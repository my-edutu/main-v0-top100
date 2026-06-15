"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)

    try {
      await supabase.auth.signOut()
      router.push("/auth/signin")
      router.refresh()
    } catch (error) {
      console.error("Failed to sign out:", error)
      router.push("/auth/signin")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      disabled={isLoading}
      className="w-full justify-start gap-2 rounded-2xl border-orange-200 bg-white text-slate-700 hover:bg-orange-50 hover:text-orange-700"
    >
      <LogOut className="h-4 w-4" />
      {isLoading ? "Signing out..." : "Sign out"}
    </Button>
  )
}
