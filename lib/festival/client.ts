import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'

export async function festivalRequest<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithTimeout(endpoint, {
    ...init,
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body)
    throw new Error(
      body?.message ?? 'This request could not be completed. Please try again.',
    )
  return body as T
}
