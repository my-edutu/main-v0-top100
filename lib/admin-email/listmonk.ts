import { emailSecret } from './secrets'
/** Server-only client for a private Listmonk service. Never expose credentials or upstream errors. */
export type ListmonkCampaign = { id: number; uuid: string; name: string; subject: string; status: string; send_at: string | null; sent: number; to_send: number; created_at: string }
export type ListmonkSubscriber = { id: number; uuid: string; email: string; name: string; status: string; lists?: Array<{ subscription_status?: string }> }
export type ListmonkList = { id: number; uuid: string }
async function call<T>(path: string, method = 'GET', input?: unknown): Promise<T> {
  const url = process.env.LISTMONK_URL?.replace(/\/+$/, '')
  const user = process.env.LISTMONK_API_USER
  const token = emailSecret('LISTMONK_API_TOKEN')
  if (!url || !user || !token) throw new Error('Email service is not configured')
  try {
    const response = await fetch(`${url}${path}`, {
      method, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Basic ${Buffer.from(`${user}:${token}`).toString('base64')}`, ...(input === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    })
    if (!response.ok) throw new Error('Upstream request failed')
    const body = await response.json() as { data?: T }
    if (!body || body.data === undefined) throw new Error('Invalid response')
    return body.data
  } catch { throw new Error('Email service is unavailable') }
}
export const listCampaigns = () => call<{ results: ListmonkCampaign[]; total: number }>('/api/campaigns?page=1&per_page=50')
export const createList = (name: string) => call<ListmonkList>('/api/lists', 'POST', { name, type: 'private', optin: 'single' })
export const createSubscriber = (email: string, name: string, listId: number) => call<ListmonkSubscriber>('/api/subscribers', 'POST', { email, name, status: 'enabled', lists: [listId] })
export async function listSubscribers(): Promise<ListmonkSubscriber[]> {
  const subscribers: ListmonkSubscriber[] = []
  for (let page = 1; page <= 500; page++) {
    const batch = await call<{ results: ListmonkSubscriber[]; total: number }>(`/api/subscribers?page=${page}&per_page=200`)
    if (!Array.isArray(batch.results) || !Number.isInteger(batch.total)) throw new Error('Email service is unavailable')
    subscribers.push(...batch.results)
    if (subscribers.length >= batch.total) return subscribers
    if (!batch.results.length) throw new Error('Email service is unavailable')
  }
  throw new Error('Email audience is too large to safely prepare')
}
export const addToList = (subscriberId: number, listId: number) => call<boolean>('/api/subscribers/lists', 'PUT', { ids: [subscriberId], action: 'add', target_list_ids: [listId], status: 'confirmed' })
export const createCampaign = (input: { name: string; subject: string; listId: number; templateId: number; sendAt: string }) => call<ListmonkCampaign>('/api/campaigns', 'POST', {
  name: input.name, subject: 'Top100 email', lists: [input.listId], from_email: 'gabriel@top100afl.com', content_type: 'plain', body: 'This campaign is delivered by the Top100 gateway.',
  messenger: 'email-top100-gateway', type: 'regular', template_id: input.templateId, send_at: input.sendAt,
})
export const updateCampaignStatus = (id: number, status: 'scheduled' | 'cancelled' | 'paused') => call<unknown>(`/api/campaigns/${id}/status`, 'PUT', { status })
