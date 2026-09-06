import { fetchWithTimeout } from './fetch-with-timeout'

// Share only simultaneous browser reads. Never retain account data after a
// request settles, or share authenticated requests between server users.
const pending = new Map<string, Promise<Response>>()
export async function dashboardRead(url: string): Promise<Response> {
  if (typeof window === 'undefined') return fetchWithTimeout(url, { cache: 'no-store' })
  let request = pending.get(url)
  if (!request) {
    request = fetchWithTimeout(url, { cache: 'no-store' }).finally(() => pending.delete(url))
    pending.set(url, request)
  }
  return (await request).clone()
}
