import { beforeEach, expect, it, vi } from 'vitest'
import { checkProfileLink } from '@/lib/admin/profile-link-probe'

const { resolve4, request } = vi.hoisted(() => ({ resolve4: vi.fn(), request: vi.fn() }))
vi.mock('node:dns/promises', () => ({ Resolver: class { resolve4 = resolve4 } }))
vi.mock('node:https', () => ({ request }))
vi.mock('node:http', () => ({ request }))

beforeEach(() => { resolve4.mockReset(); request.mockReset() })

it('blocks private DNS destinations before opening a connection', async () => {
  resolve4.mockResolvedValue(['169.254.169.254'])
  const result = await checkProfileLink({ label: 'Website', url: 'https://example.com', image: false }, AbortSignal.timeout(1000))
  expect(result.status).toBe('review')
  expect(request).not.toHaveBeenCalled()
})

it('pins the public DNS result and blocks a redirect to a private address', async () => {
  resolve4.mockResolvedValueOnce(['93.184.216.34']).mockResolvedValueOnce(['127.0.0.1'])
  request.mockImplementation((_url, options, callback) => {
    const lookup = vi.fn()
    options.lookup('example.com', { all: false }, lookup)
    expect(lookup).toHaveBeenCalledWith(null, '93.184.216.34', 4)
    callback({ statusCode: 302, headers: { location: 'https://private.example.com' }, destroy: vi.fn() })
    return { on: vi.fn(), end: vi.fn() }
  })
  const result = await checkProfileLink({ label: 'Website', url: 'https://example.com', image: false }, AbortSignal.timeout(1000))
  expect(result.status).toBe('review')
  expect(request).toHaveBeenCalledTimes(1)
})

it.each([[404, 'broken'], [410, 'broken'], [403, 'review'], [429, 'review'], [200, 'working']])(
  'classifies HTTP %s as %s',
  async (statusCode, expected) => {
    resolve4.mockResolvedValue(['93.184.216.34'])
    request.mockImplementation((_url, _options, callback) => {
      callback({ statusCode, headers: {}, destroy: vi.fn() })
      return { on: vi.fn(), end: vi.fn() }
    })
    expect((await checkProfileLink({ label: 'Website', url: 'https://example.com', image: false }, AbortSignal.timeout(1000))).status).toBe(expected)
  },
)
