import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const client = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => client() }))
import { POST } from '@/app/api/internal/programme-weekly-summary/route'
describe('weekly summary worker', () => {
 it('rejects missing or wrong secrets without reading data', async () => {
  const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = 'test-secret'
  try {
   const response = await POST(new NextRequest('http://localhost/api/internal/programme-weekly-summary',{method:'POST',headers:{authorization:'Bearer wrong-secret'}}))
   expect(response.status).toBe(401); expect(client).not.toHaveBeenCalled()
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous }
 })
})
