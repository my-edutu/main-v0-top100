import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), fetch: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('server-only', () => ({}))
import { GET, POST } from '@/app/api/admin/afl-bot/route'

const token = 'test-only-bridge-token-at-least-32-characters'
function request(body?: unknown, origin = 'https://www.top100afl.com') {
  return new NextRequest('https://www.top100afl.com/api/admin/afl-bot', {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', mocks.fetch)
  mocks.fetch.mockReset()
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-one' } })
  vi.stubEnv('AFL_BOT_ADMIN_URL', 'http://afl-bot:8090')
  vi.stubEnv('AFL_BOT_ADMIN_TOKEN', token)
})

describe('AFL bot admin bridge', () => {
  it('requires existing admin authorization before any upstream request', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: NextResponse.json({ message: 'Denied' }, { status: 403 }) })
    expect((await GET(new NextRequest('https://www.top100afl.com/api/admin/afl-bot?resource=status'))).status).toBe(403)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('uses server-only credentials and an authenticated actor for fixed operations', async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ connected: true }), { status: 200 }))
    const response = await GET(new NextRequest('https://www.top100afl.com/api/admin/afl-bot?resource=status'))
    expect(await response.json()).toEqual({ connected: true })
    const [url, options] = mocks.fetch.mock.calls[0]
    expect(String(url)).toBe('http://afl-bot:8090/v1/admin/status')
    expect(options.headers.Authorization).toBe(`Bearer ${token}`)
    expect(options.headers['X-AFL-Actor']).toBe('web:admin-one')
    expect(options.redirect).toBe('error')
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('rejects cross-origin changes, unknown actions and forged actor fields', async () => {
    expect((await POST(request({ action: 'publishKnowledge', id: 'abcdef123456' }, 'https://evil.example'))).status).toBe(403)
    expect((await POST(request({ action: 'execute', command: 'stop' }))).status).toBe(400)
    expect((await POST(request({ action: 'createKnowledge', actor: 'another-admin', data: {} }))).status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('requires reviewed preview and explicit confirmation for an announcement send', async () => {
    expect((await POST(request({ action: 'sendAnnouncement', id: 'abcdef123456', data: {} }))).status).toBe(400)
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ status: 'sent' }), { status: 200 }))
    const response = await POST(request({ action: 'sendAnnouncement', id: 'abcdef123456',
      data: { preview_token: 'one-time-preview-token', confirmation: 'SEND' } }))
    expect(response.status).toBe(200)
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body)).toEqual({ preview_token: 'one-time-preview-token' })
  })
  it('never accepts a client-selected group target or arbitrary resource path', async () => {
    expect((await POST(request({ action: 'createAnnouncement', data: {
      title: 'Test', content: 'Text', request_id: 'one', target: 'other@g.us' } }))).status).toBe(400)
    expect((await GET(new NextRequest('https://www.top100afl.com/api/admin/afl-bot?resource=../../environment'))).status).toBe(400)
    expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('reports missing connection and network failures without exposing credentials', async () => {
    vi.stubEnv('AFL_BOT_ADMIN_TOKEN', '')
    const missing = await GET(new NextRequest('https://www.top100afl.com/api/admin/afl-bot?resource=status'))
    expect(missing.status).toBe(503)
    vi.stubEnv('AFL_BOT_ADMIN_TOKEN', token)
    mocks.fetch.mockRejectedValue(new Error(`connection failed with ${token}`))
    const failed = await POST(request({ action: 'sendAnnouncement', id: 'abcdef123456',
      data: { preview_token: 'one-time-preview-token', confirmation: 'SEND' } }))
    expect(failed.status).toBe(503)
    const text = await failed.text()
    expect(text).not.toContain(token)
    expect(text).toMatch(/status|confirm|retry/i)
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})


it('preserves the exact announcement text through the server bridge', async () => {
  const content = '\n  Reviewed announcement\n\n'
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ id: 'abcdef123456' }), { status: 201 }))
  expect((await POST(request({ action: 'createAnnouncement', data: {
    title: 'Title', content, request_id: 'literal-content',
  } }))).status).toBe(201)
  expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).content).toBe(content)
})
