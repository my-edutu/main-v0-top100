import { afterEach, expect, it, vi } from 'vitest'
import { fetchPublicDirectory, peekPublicDirectory } from '@/lib/awardees/directory-client'
import { publicDirectoryCards } from '@/lib/awardees/directory-cards'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
it('projects public cards without large galleries or private record metadata', () => {
  const rows = [{ awardee_id: 'a', name: 'Member', slug: 'member', is_public: true, bio: 'BIO', phone: 'private', metadata: { code: 'secret' }, gallery: ['large'] }, { awardee_id: 'b', name: 'Hidden', slug: 'hidden', is_public: false }]
  const cards = publicDirectoryCards(rows as never)
  expect(cards).toHaveLength(1)
  expect(cards[0]).toMatchObject({ name: 'Member', bio: 'BIO' })
  expect(cards[0]).not.toHaveProperty('metadata')
  expect(cards[0]).not.toHaveProperty('phone')
  expect(cards[0]).not.toHaveProperty('gallery')
  expect(publicDirectoryCards([{ ...rows[0], bio: 'x'.repeat(10000) }] as never)[0].bio).toHaveLength(280)
})
it('shares and briefly reuses public reads, then supports an explicit refresh', async () => {
  vi.stubGlobal('window', {})
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ name: 'Member', slug: 'member' }])))
  vi.stubGlobal('fetch', fetchMock)
  const [a, b] = await Promise.all([fetchPublicDirectory(true), fetchPublicDirectory()])
  expect(a).toEqual(b)
  await fetchPublicDirectory()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(peekPublicDirectory()).toEqual(a)
  await fetchPublicDirectory(true)
  expect(fetchMock).toHaveBeenCalledTimes(2)
  vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000)
  expect(peekPublicDirectory()).toBeNull()
})
it('does not convert a failed or malformed response into an empty directory', async () => {
  vi.stubGlobal('window', {})
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response('[]'))
  vi.stubGlobal('fetch', fetchMock)
  await expect(fetchPublicDirectory(true)).rejects.toThrow()
  await expect(fetchPublicDirectory(true)).rejects.toThrow()
  expect(await fetchPublicDirectory(true)).toEqual([])
  expect(fetchMock).toHaveBeenCalledTimes(3)
})
