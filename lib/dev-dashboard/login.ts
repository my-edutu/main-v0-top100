import { sanitizeDashboardRedirect } from '@/lib/dashboard/redirect'

type LoginInput = { email: string; password: string }

export type LocalDashboardLoginResult =
  | { handled: false }
  | { handled: true; redirectTo: string }
  | { handled: true; error: string }

export async function attemptLocalDashboardLogin(
  fetcher: typeof fetch,
  input: LoginInput,
  requestedPath: string,
): Promise<LocalDashboardLoginResult> {
  try {
    const response = await fetcher('/api/dev/dashboard-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null)
    if (!payload || payload.demo !== true) return { handled: false }

    if (!response.ok) {
      return {
        handled: true,
        error: typeof payload.message === 'string' ? payload.message : 'Invalid email or password.',
      }
    }

    return { handled: true, redirectTo: sanitizeDashboardRedirect(requestedPath) }
  } catch {
    return { handled: false }
  }
}
