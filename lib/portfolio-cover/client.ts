import type { PortfolioCoverFields } from './types'

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(body.message || 'Portfolio cover request failed.')
  return body as T
}

export async function getCurrentPortfolioCover() {
  return readResponse<{ enabled: boolean; coverUrl: string | null }>(await fetch('/api/member/portfolio-cover/generations/current', { cache: 'no-store' }))
}

export async function startPortfolioCover(input: { file: File; fields: PortfolioCoverFields }) {
  const form = new FormData()
  form.set('portrait', input.file)
  form.set('consent', 'true')
  form.set('fields', JSON.stringify(input.fields))
  return readResponse<{ coverUrl: string }>(await fetch('/api/member/portfolio-cover/generations', { method: 'POST', body: form }))
}
