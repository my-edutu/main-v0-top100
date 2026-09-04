import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioTailoring, PortfolioVariant } from './types'

async function readResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(body.message || 'Portfolio cover request failed.')
  return body as T
}

export async function getCurrentPortfolioCover() {
  return readResponse<{ enabled: boolean; generation: PortfolioCoverGeneration | null }>(await fetch('/api/member/portfolio-cover/generations/current', { cache: 'no-store' }))
}

export async function startPortfolioCover(input: { file: File; tailoring: PortfolioTailoring; fields: PortfolioCoverFields }) {
  const form = new FormData()
  form.set('portrait', input.file)
  form.set('tailoring', input.tailoring)
  form.set('consent', 'true')
  form.set('fields', JSON.stringify(input.fields))
  return readResponse<{ generation: PortfolioCoverGeneration }>(await fetch('/api/member/portfolio-cover/generations', { method: 'POST', body: form }))
}

export async function selectPortfolioCover(id: string, variant: PortfolioVariant) {
  return readResponse<{ generation: PortfolioCoverGeneration }>(await fetch(`/api/member/portfolio-cover/generations/${id}/select`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variant }) }))
}

export async function rejectPortfolioCover(id: string) {
  return readResponse<{ generation: PortfolioCoverGeneration }>(await fetch(`/api/member/portfolio-cover/generations/${id}/reject`, { method: 'POST' }))
}
