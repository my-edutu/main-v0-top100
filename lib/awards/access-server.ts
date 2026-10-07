import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'

import { getCurrentUser } from '@/lib/auth-server'
import { hasValidDemoSession, isLoopbackDevelopment } from '@/lib/dev-dashboard/auth'
import { getAwardPaymentView } from './payment-server'
import { awardAccessRedirect } from './access'

export async function hasConfirmedAwardPayment(userId: string): Promise<boolean> {
  const view = await getAwardPaymentView(userId)
  return awardAccessRedirect(view) === null
}

export async function requireConfirmedAwardAccess(pathname: string): Promise<void> {
  const requestHeaders = await headers()
  const requestCookies = await cookies()
  const localPreview = hasValidDemoSession({
    headers: requestHeaders,
    cookies: { get: (name: string) => requestCookies.get(name) },
  }) && isLoopbackDevelopment({ headers: requestHeaders })
  if (localPreview) return

  const user = await getCurrentUser()
  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`)
  }

  const view = await getAwardPaymentView(user.id)
  const destination = awardAccessRedirect(view)
  if (destination) redirect(destination)
}

// Covers are available to signed-in members independently of physical award fees.
export async function requireSignedInAwardeeAccess(pathname: string): Promise<void> {
  const requestHeaders = await headers()
  const requestCookies = await cookies()
  const localPreview = hasValidDemoSession({
    headers: requestHeaders,
    cookies: { get: (name: string) => requestCookies.get(name) },
  }) && isLoopbackDevelopment({ headers: requestHeaders })
  if (localPreview) return

  const user = await getCurrentUser()
  if (!user?.id) {
    redirect(`/login?next=${encodeURIComponent(pathname)}`)
  }

}
