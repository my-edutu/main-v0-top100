import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getCurrentUser } from '@/lib/auth-server'
import { hasValidDemoSession, isLoopbackDevelopment } from '@/lib/dev-dashboard/auth'

/** Keep the library inside the authenticated dashboard; do not require award approval. */
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
}
