import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const guard = vi.fn()
const client = vi.fn()
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: (...args: unknown[]) => guard(...args) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => client() }))
import { GET, POST, PATCH } from '@/app/api/admin/programme-manager/route'

const request = (method: string, body?: unknown) => new NextRequest('http://localhost/api/admin/programme-manager', { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) })

describe('programme manager access', () => {
  beforeEach(() => { guard.mockReset(); client.mockReset() })
  it('rejects unauthorized reads and writes before accessing the database', async () => {
    guard.mockResolvedValue({ error: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) })
    for (const handler of [GET, POST, PATCH]) expect((await handler(request(handler === GET ? 'GET' : handler === POST ? 'POST' : 'PATCH'))).status).toBe(403)
    expect(client).not.toHaveBeenCalled()
  })
  it('rejects invalid tasks without writing', async () => {
    guard.mockResolvedValue({ user: { id: 'admin' } })
    const response = await POST(request('POST', { title: '' }))
    expect(response.status).toBe(400)
    expect(client).not.toHaveBeenCalled()
  })
})
