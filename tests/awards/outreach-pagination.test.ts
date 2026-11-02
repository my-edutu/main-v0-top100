import { createClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { readOutreachRows } from '@/lib/awards/outreach-server'
it('loads beyond 1,000 rows even when the API caps each response below the requested page size', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id: String(id) }))
  const db = createClient('https://example.supabase.co', 'fixture-key', { global: { fetch: async input => {
    const url = new URL(String(input)), offset = Number(url.searchParams.get('offset') ?? 0)
    return new Response(JSON.stringify(rows.slice(offset, offset + 200)), { headers: { 'Content-Type': 'application/json' } })
  } } })
  const result = await readOutreachRows<{ id: string }>(db, 'awardees', 'id')
  expect(result).toHaveLength(1201)
  expect(result[1200]).toEqual({ id: '1200' })
})
it('fails visibly when a later page cannot be loaded', async () => {
  const db = createClient('https://example.supabase.co', 'fixture-key', { global: { fetch: async input => {
    const url = new URL(String(input))
    return url.searchParams.get('offset') === '0' ? Response.json([{ id: 'first' }]) : Response.json({ code: '42501', message: 'Denied' }, { status: 403 })
  } } })
  await expect(readOutreachRows(db, 'awardees', 'id')).rejects.toThrow('Could not load awardees')
})
