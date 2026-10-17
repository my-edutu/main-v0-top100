import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { hasValidDemoSession, isLoopbackDevelopment } from '@/lib/dev-dashboard/auth'

/** Protect session materials on the server; client-side dashboard state is not an authorization boundary. */
export async function requireSessionsAccess(pathname: string): Promise<void> {
  const requestHeaders = await headers()
  const requestCookies = await cookies()
  const isLocalPreview = hasValidDemoSession({
    headers: requestHeaders,
    cookies: { get: (name: string) => requestCookies.get(name) },
  }) && isLoopbackDevelopment({ headers: requestHeaders })

  if (isLocalPreview) return

  const user = await getCurrentUser()
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(pathname)}`)

  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('membership_status')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error('Could not verify access to the session library.')
  if (profile?.membership_status !== 'approved') redirect('/dashboard')
}
